import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class CodeArtsAdapter {
  static name = '华为码道云';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME;
    const dbPath = path.join(home, '.codeartsdoer', 'codearts-data', 'opencode.db');
    const records = [];

    if (!fs.existsSync(dbPath)) {
      return records;
    }

    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });

      // Fetch sessions map for human-readable titles
      const sessionMap = new Map();
      try {
        const sessions = db.prepare('SELECT id, title, time_created FROM session').all();
        sessions.forEach(s => {
          let cleanTitle = s.title || '';
          // Clean markdown headers, newlines, and truncate
          cleanTitle = cleanTitle.split('\n')[0].replace(/^[#\s\-*]+/, '').trim();
          if (cleanTitle.length > 45) cleanTitle = cleanTitle.slice(0, 45) + '...';
          sessionMap.set(s.id, cleanTitle || s.title);
        });
      } catch (e) {}

      const messages = db.prepare('SELECT id, session_id, time_created, data FROM message').all();

      // Aggregate tokens by session
      const aggregated = new Map();

      for (const msg of messages) {
        if (!msg.data) continue;
        try {
          const parsed = JSON.parse(msg.data);
          if (parsed.tokens) {
            const sid = msg.session_id || 'default_session';
            const cur = aggregated.get(sid) || {
              sessionId: sid,
              totalTokens: 0,
              inputTokens: 0,
              outputTokens: 0,
              reasoningTokens: 0,
              cost: 0,
              model: parsed.modelID || 'GLM / CodeArts Model',
              firstTime: msg.time_created || Date.now(),
              lastTime: msg.time_created || Date.now(),
              messageCount: 0
            };

            const t = parsed.tokens;
            cur.totalTokens += (t.total || 0);
            cur.inputTokens += (t.input || 0);
            cur.outputTokens += (t.output || 0);
            cur.reasoningTokens += (t.reasoning || 0);
            cur.cost += (parsed.cost || 0);
            cur.messageCount++;
            if (msg.time_created && msg.time_created > cur.lastTime) {
              cur.lastTime = msg.time_created;
            }
            if (parsed.modelID) {
              cur.model = parsed.modelID;
            }

            aggregated.set(sid, cur);
          }
        } catch (e) {}
      }

      for (const [sid, item] of aggregated.entries()) {
        const title = sessionMap.get(sid) || `CodeArts 任务 #${sid.slice(0, 8)}`;

        records.push({
          id: `codearts_${sid}`,
          tool: '华为码道云',
          sessionName: title,
          timestamp: item.lastTime || Date.now(),
          inputTokens: item.inputTokens,
          outputTokens: item.outputTokens,
          totalTokens: item.totalTokens,
          model: item.model,
          cost: item.cost,
          accuracy: 'exact',
          details: {
            reasoningTokens: item.reasoningTokens,
            messages: item.messageCount
          }
        });
      }
    } catch (e) {
      console.error('[CodeArtsAdapter] 扫描异常:', e.message);
    }

    return records;
  }
}
