import fs from 'node:fs';
import path from 'node:path';

export class KiroAdapter {
  static name = 'Kiro';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const records = [];

    const wsSessionsDir = path.join(appdata, 'Kiro', 'User', 'globalStorage', 'kiro.kiroagent', 'workspace-sessions');
    if (!fs.existsSync(wsSessionsDir)) return records;

    let projectDirs;
    try {
      projectDirs = fs.readdirSync(wsSessionsDir);
    } catch (e) {
      return records;
    }

    for (const projDir of projectDirs) {
      const projPath = path.join(wsSessionsDir, projDir);
      if (!fs.statSync(projPath).isDirectory()) continue;

      let sessionIndex = [];
      const indexFile = path.join(projPath, 'sessions.json');
      if (fs.existsSync(indexFile)) {
        try {
          sessionIndex = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        } catch (e) {}
      }

      const sessionFiles = fs.readdirSync(projPath)
        .filter(f => f.endsWith('.json') && f !== 'sessions.json');

      for (const sf of sessionFiles) {
        const sessionFile = path.join(projPath, sf);
        let data;
        try {
          data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
        } catch (e) { continue; }

        if (!data.history || !Array.isArray(data.history) || data.history.length === 0) continue;

        const sessionId = data.sessionId || sf.replace('.json', '');
        const title = data.title || '';
        const model = data.selectedModel || data.defaultModelTitle || 'Kiro Agent';
        const workspaceDir = data.workspaceDirectory || data.workspacePath || '';

        let firstPrompt = '';
        let totalChars = 0;
        const turns = data.history.length;

        for (const msg of data.history) {
          const content = msg.message?.content;
          if (!content) continue;

          let text = '';
          if (typeof content === 'string') {
            text = content;
          } else if (Array.isArray(content)) {
            text = content
              .filter(c => c.type === 'text' && c.text)
              .map(c => c.text)
              .join('\n');
          }

          totalChars += text.length;

          if (msg.message?.role === 'user' && !firstPrompt && text.trim()) {
            firstPrompt = text.trim().slice(0, 45);
          }

          if (msg.promptLogs && Array.isArray(msg.promptLogs)) {
            for (const pl of msg.promptLogs) {
              if (pl.prompt) totalChars += pl.prompt.length;
              if (pl.completion) totalChars += pl.completion.length;
            }
          }
        }

        if (totalChars === 0 && !firstPrompt) continue;

        const contentTokens = Math.round(totalChars / 4);
        const overheadTokens = turns * 3000;
        const totalTokens = Math.max(contentTokens + overheadTokens, 5000);
        const inputTokens = Math.round(totalTokens * 0.7);
        const outputTokens = totalTokens - inputTokens;

        let timestamp = fs.statSync(sessionFile).mtimeMs;
        const indexEntry = sessionIndex.find(s => s.sessionId === sessionId);
        if (indexEntry && indexEntry.dateCreated) {
          const ts = parseInt(indexEntry.dateCreated);
          if (ts > 1700000000000 && ts < 2100000000000) timestamp = ts;
        }

        const singleLine = t => (t || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
        const cleanTitle = singleLine(title);
        const cleanFirst = singleLine(firstPrompt).slice(0, 40);
        const sessionName = cleanTitle && cleanTitle !== 'New Session'
          ? `Kiro: ${cleanTitle.slice(0, 40)}`
          : `Kiro: ${cleanFirst || `会话 #${sessionId.slice(0, 8)}`}`;

        const projectName = workspaceDir ? path.basename(workspaceDir) : projDir.slice(0, 12);

        records.push({
          id: `kiro_${sessionId.slice(0, 12)}`,
          tool: 'Kiro',
          sessionName,
          timestamp,
          inputTokens,
          outputTokens,
          totalTokens,
          model,
          cost: 0,
          accuracy: 'estimated',
          estimateBasis: '对话内容字符数÷4 + 轮数×3000 估算（Kiro 不存 token usage，生成内容不落本地）',
          details: {
            sessionId,
            project: projectName,
            workspaceDirectory: workspaceDir,
            turns,
            promptSnippet: cleanFirst
          }
        });
      }
    }

    return records;
  }
}