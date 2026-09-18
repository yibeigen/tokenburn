import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class CursorAdapter {
  static name = 'Cursor';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const records = [];

    // 1. Check workspaceStorage in Cursor AppData
    const wsPath = path.join(appdata, 'Cursor', 'User', 'workspaceStorage');
    if (fs.existsSync(wsPath)) {
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
            const chatRow = db.prepare("SELECT value FROM ItemTable WHERE key LIKE '%aichat.chatdata%' OR key LIKE '%composer.composerData%' LIMIT 1").get();
            if (chatRow) {
              const stat = fs.statSync(dbFile);
              let totalTokens = 50000;
              let prompt = '';
              try {
                const parsed = JSON.parse(chatRow.value);
                const tabs = parsed.tabs || parsed.allComposers || [];
                if (tabs.length > 0) {
                  totalTokens = tabs.length * 25000;
                  prompt = tabs[0]?.chatTitle || tabs[0]?.name || '';
                }
              } catch (e) {}

              const inputTokens = Math.round(totalTokens * 0.85);
              const outputTokens = totalTokens - inputTokens;
              records.push({
                id: `cursor_${d.slice(0, 8)}`,
                tool: 'Cursor',
                sessionName: `Cursor: ${projectName} ${prompt ? `“${prompt.slice(0, 20)}...”` : ''}`.trim(),
                timestamp: stat.mtimeMs,
                inputTokens,
                outputTokens,
                totalTokens,
                model: 'Claude 3.5 Sonnet / GPT-4o (Cursor)',
                accuracy: 'estimated',
                estimateBasis: '按对话标签页数 × 25,000 tokens 模型估算',
                details: { project: projectName, prompt }
              });
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    // 2. Check ~/.cursor/chats
    const userChats = path.join(home, '.cursor', 'chats');
    if (fs.existsSync(userChats)) {
      try {
        const files = fs.readdirSync(userChats).filter(f => f.endsWith('.json'));
        for (const f of files) {
          const full = path.join(userChats, f);
          try {
            const content = JSON.parse(fs.readFileSync(full, 'utf8'));
            const stat = fs.statSync(full);
            const tokens = content.totalTokens || 15000;
            records.push({
              id: `cursor_file_${f}`,
              tool: 'Cursor',
              sessionName: `Cursor: ${content.title || f.slice(0, 16)}`,
              timestamp: stat.mtimeMs,
              inputTokens: Math.round(tokens * 0.85),
              outputTokens: Math.round(tokens * 0.15),
              totalTokens: tokens,
              model: content.model || 'Claude 3.5 Sonnet (Cursor)',
              accuracy: 'estimated',
              estimateBasis: '按本地会话文件字段折算，官方未暴露 usage 明细',
              details: { file: f }
            });
          } catch (e) {}
        }
      } catch (e) {}
    }

    return records;
  }
}
