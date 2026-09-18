import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class CopilotAdapter {
  static name = 'GitHub Copilot';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const records = [];

    const wsPath = path.join(appdata, 'Code', 'User', 'workspaceStorage');
    if (!fs.existsSync(wsPath)) {
      return records;
    }

    try {
      const dirs = fs.readdirSync(wsPath);
      for (const d of dirs) {
        const dbFile = path.join(wsPath, d, 'state.vscdb');
        if (!fs.existsSync(dbFile)) continue;

        let projectName = d.slice(0, 8);
        const wsJson = path.join(wsPath, d, 'workspace.json');
        if (fs.existsSync(wsJson)) {
          try {
            const parsed = JSON.parse(fs.readFileSync(wsJson, 'utf8'));
            if (parsed.folder) {
              projectName = path.basename(decodeURIComponent(parsed.folder.replace('file:///', '')));
            }
          } catch(e) {}
        }

        try {
          const db = new DatabaseSync(dbFile, { readOnly: true });
          const row = db.prepare("SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index' OR key LIKE '%interactive-session%' LIMIT 1").get();
          if (row && row.value) {
            let sessionCount = 1;
            try {
              const parsed = JSON.parse(row.value);
              if (Array.isArray(parsed)) sessionCount = parsed.length;
              else if (parsed.entries) sessionCount = Object.keys(parsed.entries).length;
            } catch(e) {}

            const stat = fs.statSync(dbFile);
            // Average per VS Code Copilot session turn ~12,000 tokens
            const totalTokens = Math.max(sessionCount * 12000, 8000);
            const inputTokens = Math.round(totalTokens * 0.85);
            const outputTokens = totalTokens - inputTokens;

            records.push({
              id: `copilot_${d.slice(0, 8)}`,
              tool: 'GitHub Copilot',
              sessionName: `Copilot: ${projectName} 编码对话`,
              timestamp: stat.mtimeMs,
              inputTokens,
              outputTokens,
              totalTokens,
              model: 'GPT-4o / Claude 3.5 Sonnet (Copilot)',
              accuracy: 'estimated',
              estimateBasis: '按会话数 × 12,000 tokens 模型估算（本地无 usage 明细）',
              details: {
                project: projectName,
                sessions: sessionCount
              }
            });
          }
        } catch(e) {}
      }
    } catch(e) {
      console.error('[CopilotAdapter] 扫描异常:', e.message);
    }

    return records;
  }
}
