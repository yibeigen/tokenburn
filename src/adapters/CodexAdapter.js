import fs from 'node:fs';
import path from 'node:path';

export class CodexAdapter {
  static name = 'Codex';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME;
    const codexDir = path.join(home, '.codex', 'archived_sessions');
    const records = [];

    if (!fs.existsSync(codexDir)) {
      return records;
    }

    try {
      const files = fs.readdirSync(codexDir).filter(f => f.endsWith('.jsonl'));
      for (const file of files) {
        const filePath = path.join(codexDir, file);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n');

        let lastUsage = null;
        let timestamp = null;
        let model = 'gpt-4o / codex';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line);
            if (obj.timestamp && !timestamp) {
              timestamp = new Date(obj.timestamp).getTime();
            }
            if (obj.payload?.model) {
              model = obj.payload.model;
            }
            if (obj.payload?.type === 'token_count' && obj.payload?.info?.total_token_usage) {
              lastUsage = obj.payload.info.total_token_usage;
            }
          } catch(e) {}
        }

        if (lastUsage && (lastUsage.total_tokens > 0 || lastUsage.input_tokens > 0)) {
          records.push({
            id: `codex_${file}`,
            tool: 'Codex',
            sessionName: file.replace('rollout-', '').slice(0, 16),
            timestamp: timestamp || fs.statSync(filePath).mtimeMs,
            inputTokens: lastUsage.input_tokens || 0,
            outputTokens: lastUsage.output_tokens || 0,
            totalTokens: lastUsage.total_tokens || ((lastUsage.input_tokens || 0) + (lastUsage.output_tokens || 0)),
            model: model,
            accuracy: 'exact',
            details: lastUsage
          });
        }
      }
    } catch(e) {}

    return records;
  }
}
