import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class WorkbuddyAdapter {
  static name = 'Workbuddy';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME;
    const dbPath = path.join(home, '.workbuddy', 'workbuddy.db');
    const records = [];

    if (!fs.existsSync(dbPath)) {
      return records;
    }

    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });

      // Get sessions mapping with real schema (title, custom_title, cwd, model)
      const sessionMap = new Map();
      try {
        const sessions = db.prepare('SELECT id, title, custom_title, cwd, model, created_at, updated_at FROM sessions').all();
        sessions.forEach(s => {
          let cleanTitle = (s.custom_title || s.title || '').trim();
          // Remove Workbuddy scene tag like @scene#30:"网站设计"
          cleanTitle = cleanTitle.replace(/^@scene#\d+:"[^"]*"\s*/, '');
          // Keep first sentence / first line
          const firstLine = cleanTitle.split(/[\r\n]+/)[0].trim();
          const wsName = s.cwd ? path.basename(s.cwd) : '';

          sessionMap.set(s.id, {
            title: firstLine || (wsName ? `项目: ${wsName}` : `Workbuddy 会话 ${s.id.slice(0, 8)}`),
            fullTitle: cleanTitle,
            model: s.model || 'Workbuddy Multi-Agent',
            workspaceTag: wsName,
            createdAt: s.created_at
          });
        });
      } catch (e) {}

      const usages = db.prepare('SELECT session_id, used, size, updated_at, credit_json FROM session_usage WHERE used > 0').all();

      for (const u of usages) {
        const meta = sessionMap.get(u.session_id) || {};
        const title = meta.title || `Workbuddy 会话 ${u.session_id.slice(0, 8)}`;
        
        let cost = 0;
        if (u.credit_json) {
          try {
            const credits = JSON.parse(u.credit_json);
            cost = Object.values(credits).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
          } catch (e) {}
        }

        // Workbuddy tracks total used tokens in 'used' field
        const total = u.used || 0;
        const inputEst = Math.round(total * 0.85);
        const outputEst = total - inputEst;

        records.push({
          id: `workbuddy_${u.session_id}`,
          tool: 'Workbuddy',
          sessionName: title,
          timestamp: u.updated_at || meta.createdAt || Date.now(),
          inputTokens: inputEst,
          outputTokens: outputEst,
          totalTokens: total,
          model: meta.model || 'Workbuddy Multi-Agent',
          cost: cost,
          accuracy: 'exact',
          details: {
            workspaceTag: meta.workspaceTag || '',
            promptSnippet: meta.fullTitle || '',
            contextWindow: u.size,
            credit: cost
          }
        });
      }
    } catch (e) {
      console.error('[WorkbuddyAdapter] 扫描异常:', e.message);
    }

    return records;
  }
}
