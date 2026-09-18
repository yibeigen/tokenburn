import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { DatabaseSync } from 'node:sqlite';

export class QoderAdapter {
  static name = 'Qoder';

  static async scan() {
    const home = os.homedir();
    const records = [];
    const seen = new Set();

    // 数据源 A: Qoder CN local.db (chat_session 明文元数据 + chat_record 问答轮)
    // 注: chat_message/chat_record 的 content 为密文, token_info 为 NULL, 只能按轮数估算
    const localDbPath = path.join(home, '.qoder-cn', 'shared_client', 'cache', 'db', 'local.db');
    if (fs.existsSync(localDbPath)) {
      try {
        const db = new DatabaseSync(localDbPath, { readOnly: true });
        const sessions = db.prepare('SELECT session_id, session_title, project_name, gmt_create, gmt_modified, mode FROM chat_session').all();
        const sessionMeta = new Map(sessions.map(s => [s.session_id, s]));

        const turnRows = db.prepare("SELECT session_id, COUNT(*) as turns, MIN(gmt_create) as firstAt, MAX(gmt_create) as lastAt FROM chat_record WHERE chat_task != 'SESSION_HISTORY_CLEAR' GROUP BY session_id").all();

        for (const t of turnRows) {
          const meta = sessionMeta.get(t.session_id);
          const projectName = meta?.project_name || `session-${t.session_id.slice(0, 8)}`;
          const title = meta?.session_title || '';
          const turns = t.turns;
          if (turns <= 0) continue;

          const totalTokens = turns * 6500;
          const inputTokens = Math.round(totalTokens * 0.85);
          const outputTokens = totalTokens - inputTokens;
          const timestamp = (meta?.gmt_create || t.firstAt) && Number(meta?.gmt_create || t.firstAt) > 1700000000000
            ? Number(meta?.gmt_create || t.firstAt)
            : t.firstAt;

          const singleTitle = (title || '').replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
          const cleanTitle = singleTitle ? `“${singleTitle.slice(0, 28)}${singleTitle.length > 28 ? '...' : ''}”` : `#${t.session_id.slice(0, 8)}`;
          records.push({
            id: `qoder_${t.session_id.slice(0, 12)}`,
            tool: 'Qoder',
            sessionName: `Qoder: ${projectName} ${cleanTitle}`,
            timestamp,
            inputTokens,
            outputTokens,
            totalTokens,
            model: 'Qoder Agent (阿里)',
            cost: 0,
            accuracy: 'estimated',
            estimateBasis: '按每轮交互≈6,500 tokens 模型估算（对话正文密文存储，本地无明文与 usage）',
            details: {
              sessionId: t.session_id,
              project: projectName,
              mode: meta?.mode || 'chat',
              turns,
              promptSnippet: singleTitle
            }
          });
          seen.add(t.session_id);
        }
      } catch (e) {}
    }

    // 数据源 B: Quest 模式 conversation-history (明文 JSONL)
    const projectsDir = path.join(home, '.qoder', 'cache', 'projects');
    if (fs.existsSync(projectsDir)) {
      try {
        for (const proj of fs.readdirSync(projectsDir)) {
          const histRoot = path.join(projectsDir, proj, 'conversation-history');
          if (!fs.existsSync(histRoot)) continue;

          for (const sessId of fs.readdirSync(histRoot)) {
            const sessDir = path.join(histRoot, sessId);
            if (!fs.statSync(sessDir).isDirectory()) continue;

            const jsonlFiles = fs.readdirSync(sessDir).filter(f => f.endsWith('.jsonl'));
            for (const jf of jsonlFiles) {
              const jsonlPath = path.join(sessDir, jf);
              let lines;
              try {
                lines = fs.readFileSync(jsonlPath, 'utf8').trim().split('\n');
              } catch (e) { continue; }

              let totalChars = 0;
              let firstPrompt = '';
              for (const line of lines) {
                let obj;
                try { obj = JSON.parse(line); } catch (e) { continue; }
                const content = obj.message?.content;
                if (!content) continue;
                let text = '';
                if (typeof content === 'string') {
                  text = content;
                } else if (Array.isArray(content)) {
                  text = content.filter(c => c.type === 'text' && c.text).map(c => c.text).join('\n');
                }
                totalChars += text.length;
                if (obj.role === 'user' && !firstPrompt && text.trim()) {
                  const m = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/);
                  firstPrompt = (m ? m[1] : text).trim().slice(0, 45);
                }
              }

              if (totalChars === 0 || seen.has(sessId)) continue;

              const turns = lines.length;
              const totalTokens = Math.max(Math.round(totalChars / 4) + turns * 3000, 5000);
              const inputTokens = Math.round(totalTokens * 0.7);
              const outputTokens = totalTokens - inputTokens;
              const timestamp = fs.statSync(jsonlPath).mtimeMs;

              records.push({
                id: `qoderq_${sessId.slice(0, 12)}`,
                tool: 'Qoder',
                sessionName: `Qoder Quest: ${proj.split('-')[0]} ${firstPrompt ? `“${firstPrompt.slice(0, 28)}...”` : `#${sessId.slice(0, 8)}`}`,
                timestamp,
                inputTokens,
                outputTokens,
                totalTokens,
                model: 'Qoder Quest (阿里)',
                cost: 0,
                accuracy: 'estimated',
                estimateBasis: '对话内容字符数÷4 + 轮数×3000 估算（Quest 模式本地明文 JSONL）',
                details: {
                  sessionId: sessId,
                  project: proj,
                  mode: 'quest',
                  turns,
                  promptSnippet: firstPrompt
                }
              });
            }
          }
        }
      } catch (e) {}
    }

    return records;
  }
}