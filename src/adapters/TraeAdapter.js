import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export class TraeAdapter {
  static name = 'Trae';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const records = [];

    // Trae stores data in multiple product variants: Trae CN (mainland), Trae (global), TRAE SOLO CN
    const variantNames = ['Trae CN', 'Trae', 'TRAE SOLO CN'];

    for (const variant of variantNames) {
      const wsPath = path.join(appdata, variant, 'User', 'workspaceStorage');
      if (!fs.existsSync(wsPath)) continue;

      try {
        const dirs = fs.readdirSync(wsPath);

        for (const d of dirs) {
          const dbFile = path.join(wsPath, d, 'state.vscdb');
          if (!fs.existsSync(dbFile)) continue;

          // 1. Resolve human-readable workspace folder/project name
          let projectName = d.slice(0, 8);
          let projectPath = '';
          const wsJson = path.join(wsPath, d, 'workspace.json');
          if (fs.existsSync(wsJson)) {
            try {
              const parsed = JSON.parse(fs.readFileSync(wsJson, 'utf8'));
              if (parsed.folder) {
                projectPath = decodeURIComponent(parsed.folder.replace('file:///', ''));
                projectName = path.basename(projectPath);
              }
            } catch (e) {}
          }

          try {
            const db = new DatabaseSync(dbFile, { readOnly: true });

            let sessionList = [];
            let wsTurns = 0;
            let latestPrompt = '';
            const samplePrompts = [];

            // 2. Extract Agent session list from memento/icube-ai-agent-storage
            const rowAgent = db.prepare("SELECT value FROM ItemTable WHERE key = 'memento/icube-ai-agent-storage'").get();
            if (rowAgent) {
              try {
                const parsed = JSON.parse(rowAgent.value);
                if (parsed.list && Array.isArray(parsed.list)) {
                  sessionList = parsed.list;
                }
              } catch (e) {}
            }

            // 3. Extract interaction turns count from ChatStore turnsHeight
            const rowChat = db.prepare("SELECT value FROM ItemTable WHERE key = 'ChatStore'").get();
            if (rowChat) {
              try {
                const parsed = JSON.parse(rowChat.value);
                if (parsed.state?.turnsHeight) {
                  const keys = Object.keys(parsed.state.turnsHeight);
                  wsTurns += keys.length;
                }
              } catch (e) {}
            }

            // 4. Extract real user prompts from input-history
            const rowHistory = db.prepare("SELECT value FROM ItemTable WHERE key LIKE '%input-history%'").all();
            rowHistory.forEach(r => {
              try {
                const arr = JSON.parse(r.value);
                if (Array.isArray(arr)) {
                  arr.forEach(item => {
                    const text = typeof item === 'string' ? item : item?.inputText;
                    if (text && typeof text === 'string' && text.trim().length > 1) {
                      samplePrompts.push(text.trim());
                      latestPrompt = text.trim();
                    }
                  });
                }
              } catch (e) {}
            });

            const turnsCount = Math.max(wsTurns, sessionList.length, samplePrompts.length);
            if (turnsCount === 0) continue;

            // Trae Agent mode injects workspace file contexts, terminal tool runs, and multi-file diffs
            // NOTE: 对话正文存于 Trae 云端，本地数据库无 payload，"每轮≈6500 tokens"是唯一可行的估算模型
            const totalWsTokens = turnsCount * 6500;
            const stat = fs.statSync(dbFile);

            if (sessionList.length > 0) {
              const tokensPerSession = Math.round(totalWsTokens / sessionList.length);
              const inputPerSession = Math.round(tokensPerSession * 0.85);
              const outputPerSession = tokensPerSession - inputPerSession;

              sessionList.forEach((s, idx) => {
                let sessionTime = stat.mtimeMs;
                // BSON ObjectId first 8 hex chars represent Unix timestamp in seconds
                if (s.sessionId && s.sessionId.length >= 8) {
                  const hexSec = parseInt(s.sessionId.slice(0, 8), 16);
                  if (hexSec > 1700000000 && hexSec < 2000000000) {
                    sessionTime = hexSec * 1000;
                  }
                }

                const prompt = samplePrompts[idx] || (idx === sessionList.length - 1 ? latestPrompt : '');
                const cleanPrompt = prompt ? `“${prompt.slice(0, 24)}...”` : '';
                const title = `Trae: ${projectName} ${cleanPrompt || `#${idx + 1}`}`.trim();

                records.push({
                  id: `trae_${s.sessionId || `${d.slice(0, 8)}_${idx}`}`,
                  tool: 'Trae',
                  sessionName: title,
                  timestamp: sessionTime,
                  inputTokens: inputPerSession,
                  outputTokens: outputPerSession,
                  totalTokens: tokensPerSession,
                  model: 'Claude 3.5 Sonnet / GPT-4o (Trae)',
                  accuracy: 'estimated',
                  estimateBasis: '按每轮交互≈6,500 tokens 模型估算（对话正文存云端，本地无负载）',
                  details: {
                    variant: variant,
                    project: projectName,
                    sessionId: s.sessionId,
                    projectPath: projectPath,
                    promptSnippet: prompt
                  }
                });
              });
            } else {
              const inputTokens = Math.round(totalWsTokens * 0.85);
              const outputTokens = totalWsTokens - inputTokens;
              const cleanPrompt = latestPrompt ? `“${latestPrompt.slice(0, 24)}...”` : '';
              const title = `Trae工程: ${projectName} ${cleanPrompt}`.trim();

              records.push({
                id: `trae_${variant.replace(/\s+/g, '_')}_${d.slice(0, 8)}`,
                tool: 'Trae',
                sessionName: title,
                timestamp: stat.mtimeMs,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                totalTokens: totalWsTokens,
                model: 'Claude 3.5 Sonnet / GPT-4o (Trae)',
                accuracy: 'estimated',
                estimateBasis: '按每轮交互≈6,500 tokens 模型估算（对话正文存云端，本地无负载）',
                details: {
                  variant: variant,
                  project: projectName,
                  turns: turnsCount,
                  projectPath: projectPath,
                  promptSnippet: latestPrompt
                }
              });
            }
          } catch (e) {}
        }
      } catch (e) {
        console.error(`[TraeAdapter] 扫描 ${variant} 异常:`, e.message);
      }
    }

    return records;
  }
}
