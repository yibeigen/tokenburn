import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class LingmaAdapter {
  static name = '通义灵码';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const dbPath = path.join(home, '.lingma', 'cache', 'db', 'local.db');
    const records = [];

    if (!fs.existsSync(dbPath)) {
      return records;
    }

    try {
      const db = new DatabaseSync(dbPath, { readOnly: true });

      // 1. Check table existence
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
      if (!tables.includes('chat_session')) {
        return records;
      }

      // 2. Fetch sessions
      const sessions = db.prepare(`
        SELECT 
          session_id, 
          session_title, 
          project_name, 
          project_uri, 
          gmt_create, 
          gmt_modified,
          preferred_model_info
        FROM chat_session
      `).all();

      // 3. Aggregate message characters by session
      const charMap = new Map();
      if (tables.includes('chat_message')) {
        try {
          const charStats = db.prepare(`
            SELECT 
              session_id, 
              count(*) as msgCount, 
              sum(length(content)) as totalChars 
            FROM chat_message 
            GROUP BY session_id
          `).all();
          charStats.forEach(c => charMap.set(c.session_id, c));
        } catch (e) {}
      }

      for (const s of sessions) {
        const stats = charMap.get(s.session_id) || { msgCount: 1, totalChars: 5000 };
        const totalChars = stats.totalChars || 5000;

        // Base64 encrypted message content + system prompt + code context:
        // ~3.5 chars per token average
        const totalTokens = Math.max(Math.round(totalChars / 3.5), 1800);
        const inputTokens = Math.round(totalTokens * 0.85);
        const outputTokens = totalTokens - inputTokens;

        let cleanTitle = (s.session_title || '').split('\n')[0].replace(/[`#]+/g, '').trim();
        if (!cleanTitle || cleanTitle.length < 2) {
          cleanTitle = s.project_name ? `项目开发: ${s.project_name}` : '日常代码问答与修复';
        }

        const projectName = s.project_name || (s.project_uri ? path.basename(decodeURIComponent(s.project_uri)) : '');
        const displayName = `灵码: ${projectName ? `[${projectName}] ` : ''}${cleanTitle.slice(0, 32)}`;

        let model = 'Qwen 2.5 / 通义灵码专属模型';
        if (s.preferred_model_info) {
          try {
            const m = JSON.parse(s.preferred_model_info);
            if (m.modelName || m.name) model = m.modelName || m.name;
          } catch(e) {}
        }

        records.push({
          id: `lingma_${s.session_id}`,
          tool: '通义灵码',
          sessionName: displayName,
          timestamp: s.gmt_modified || s.gmt_create || Date.now(),
          inputTokens,
          outputTokens,
          totalTokens,
          model,
          accuracy: 'estimated',
          estimateBasis: '按会话字符数 ÷3.5 折算（消息内容 Base64 加密，无法精确解析）',
          details: {
            project: projectName,
            messages: stats.msgCount,
            chars: totalChars,
            title: cleanTitle
          }
        });
      }
    } catch (e) {
      console.error('[LingmaAdapter] 扫描异常:', e.message);
    }

    return records;
  }
}
