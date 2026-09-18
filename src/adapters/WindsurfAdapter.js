import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class WindsurfAdapter {
  static name = 'Windsurf';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const records = [];

    const wsPath = path.join(appdata, 'Windsurf', 'User', 'workspaceStorage');
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
          } catch (e) {}
        }

        try {
          const db = new DatabaseSync(dbFile, { readOnly: true });
          const cascadeRow = db.prepare("SELECT value FROM ItemTable WHERE key LIKE '%cascade%' LIMIT 1").get();
          if (cascadeRow) {
            const stat = fs.statSync(dbFile);
            let sessionCount = 1;
            let prompt = '';
            try {
              const parsed = JSON.parse(cascadeRow.value);
              if (parsed.sessions && Array.isArray(parsed.sessions)) {
                sessionCount = parsed.sessions.length;
                prompt = parsed.sessions[0]?.title || '';
              }
            } catch (e) {}

            const totalTokens = sessionCount * 30000;
            const inputTokens = Math.round(totalTokens * 0.85);
            const outputTokens = totalTokens - inputTokens;

            records.push({
              id: `windsurf_${d.slice(0, 8)}`,
              tool: 'Windsurf',
              sessionName: `Windsurf Cascade: ${projectName} ${prompt ? `“${prompt.slice(0, 20)}...”` : ''}`.trim(),
              timestamp: stat.mtimeMs,
              inputTokens,
              outputTokens,
              totalTokens,
              model: 'Cascade (Claude 3.5 Sonnet / Codeium)',
              accuracy: 'estimated',
              estimateBasis: '按 Cascade 会话数 × 30,000 tokens 模型估算',
              details: { project: projectName, sessions: sessionCount }
            });
          }
        } catch (e) {}
      }
    } catch (e) {}

    return records;
  }
}
