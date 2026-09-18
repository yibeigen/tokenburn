import fs from 'node:fs';
import path from 'node:path';

export class ClaudeCodeAdapter {
  static name = 'Claude Code';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME;
    const projectsDir = path.join(home, '.claude', 'projects');
    const records = [];

    if (!fs.existsSync(projectsDir)) {
      return records;
    }

    function walkDir(dir) {
      let files = [];
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            files = files.concat(walkDir(fullPath));
          } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
            files.push(fullPath);
          }
        }
      } catch (e) {}
      return files;
    }

    const jsonlFiles = walkDir(projectsDir);

    for (const filePath of jsonlFiles) {
      const fileName = path.basename(filePath, '.jsonl');
      const projectName = path.basename(path.dirname(filePath)).replace(/^[A-Za-z]--/, '').replace(/-/g, '/');
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        let sessionInput = 0;
        let sessionOutput = 0;
        let sessionCacheRead = 0;
        let sessionCacheWrite = 0;
        let latestTimestamp = null;
        let model = 'claude-3-5-sonnet';
        let firstUserPrompt = null;

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.timestamp && !latestTimestamp) {
              latestTimestamp = new Date(obj.timestamp).getTime();
            }
            if (obj.message?.model) {
              model = obj.message.model;
            }

            // Extract first user question
            if (!firstUserPrompt) {
              if (obj.type === 'user' && typeof obj.message?.content === 'string') {
                firstUserPrompt = obj.message.content.trim().slice(0, 45);
              } else if (obj.message && typeof obj.message === 'string') {
                firstUserPrompt = obj.message.trim().slice(0, 45);
              }
            }

            const usage = obj.usage || obj.message?.usage;
            if (usage) {
              sessionInput += (usage.input_tokens || 0);
              sessionOutput += (usage.output_tokens || 0);
              sessionCacheRead += (usage.cache_read_input_tokens || 0);
              sessionCacheWrite += (usage.cache_creation_input_tokens || 0);
            }
          } catch (e) {}
        }

        const totalTokens = sessionInput + sessionOutput + sessionCacheRead + sessionCacheWrite;
        if (totalTokens > 0) {
          const displayName = firstUserPrompt 
            ? `${firstUserPrompt}` 
            : `${projectName || 'Claude 会话'}`;

          records.push({
            id: `claude_${fileName}`,
            tool: 'Claude Code',
            sessionName: displayName,
            timestamp: latestTimestamp || fs.statSync(filePath).mtimeMs,
            inputTokens: sessionInput + sessionCacheRead + sessionCacheWrite,
            outputTokens: sessionOutput,
            totalTokens: totalTokens,
            model: model,
            accuracy: 'exact',
            details: {
              cacheRead: sessionCacheRead,
              cacheWrite: sessionCacheWrite,
              rawInput: sessionInput,
              prompt: firstUserPrompt
            }
          });
        }
      } catch (e) {}
    }

    return records;
  }
}
