import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

function readVarint(buf, start) {
  let value = 0;
  let shift = 0;
  let j = start;
  while (j < buf.length && shift < 35) {
    const b = buf[j];
    value += (b & 0x7f) * Math.pow(2, shift);
    shift += 7;
    j++;
    if ((b & 0x80) === 0) break;
  }
  return { value, next: j };
}

/**
 * 从 Protobuf 二进制流中提取 Step 的真实创建时间戳。
 * 反重力 IDE 的 step_payload 头部 field 1 (tag 0x08) 为 Unix 秒级创建时刻。
 */
function extractTimestampFromPayload(buf) {
  if (!buf || buf.length < 10) return null;
  // Step protobuf 头部前 30 字节探测 field 1 (tag 0x08)
  for (let i = 0; i < Math.min(30, buf.length - 5); i++) {
    if (buf[i] === 0x08) {
      const { value } = readVarint(buf, i + 1);
      if (value >= 1700000000 && value <= 2200000000) {
        return value * 1000;
      }
    }
  }
  return null;
}

export class AntigravityAdapter {
  static name = '反重力 IDE';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME;
    const agyDir = path.join(home, '.gemini', 'antigravity-ide', 'conversations');
    const records = [];

    if (!fs.existsSync(agyDir)) {
      return records;
    }

    try {
      const dbFiles = fs.readdirSync(agyDir).filter(f => f.endsWith('.db'));

      for (const file of dbFiles) {
        const fullPath = path.join(agyDir, file);
        try {
          const db = new DatabaseSync(fullPath, { readOnly: true });
          const stat = fs.statSync(fullPath);

          let cascadeId = path.basename(file, '.db');
          try {
            const meta = db.prepare('SELECT cascade_id, trajectory_id FROM trajectory_meta LIMIT 1').get();
            if (meta?.cascade_id) cascadeId = meta.cascade_id;
          } catch (e) {}

          // 1. Extract official Antigravity IDE title (matching sidebar 1:1) and initial prompt
          let officialTitle = null;
          let userPromptSnippet = null;
          let workspaceTag = null;

          try {
            // First check step_type = 23 which houses conversation metadata & title
            const metaStep = db.prepare('SELECT idx, step_payload FROM steps WHERE step_type = 23 LIMIT 1').get();
            if (metaStep?.step_payload) {
              const buf = Buffer.from(metaStep.step_payload);
              for (let i = 0; i < buf.length - 6; i++) {
                if (buf[i] === 0x22) {
                  const len = buf[i + 1];
                  if (len >= 3 && len <= 120 && i + 2 + len + 2 <= buf.length) {
                    if (buf[i + 2 + len] === 0x48 && buf[i + 2 + len + 1] === 0x01) {
                      officialTitle = buf.subarray(i + 2, i + 2 + len).toString('utf8');
                      break;
                    }
                  }
                }
              }

              const str = buf.toString('utf8');
              if (officialTitle) {
                const afterTitle = str.slice(str.indexOf(officialTitle) + officialTitle.length);
                const match = afterTitle.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5a-zA-Z0-9，。？！、\s]{3,60}/);
                if (match) {
                  userPromptSnippet = match[0].trim();
                }
              }
            }

            // Fallback for official title: check early steps
            if (!officialTitle) {
              const earlySteps = db.prepare('SELECT idx, step_payload FROM steps ORDER BY idx ASC LIMIT 30').all();
              for (const r of earlySteps) {
                if (!r.step_payload) continue;
                const buf = Buffer.from(r.step_payload);
                for (let i = 0; i < buf.length - 6; i++) {
                  if (buf[i] === 0x22) {
                    const len = buf[i + 1];
                    if (len >= 3 && len <= 120 && i + 2 + len + 2 <= buf.length) {
                      if (buf[i + 2 + len] === 0x48 && buf[i + 2 + len + 1] === 0x01) {
                        officialTitle = buf.subarray(i + 2, i + 2 + len).toString('utf8');
                        break;
                      }
                    }
                  }
                }
                if (officialTitle) break;
              }
            }

            // Fallback for user prompt snippet
            if (!userPromptSnippet) {
              const early = db.prepare('SELECT step_payload FROM steps ORDER BY idx ASC LIMIT 10').all();
              for (const s of early) {
                if (!s.step_payload) continue;
                const text = Buffer.from(s.step_payload).toString('utf8');
                const matches = text.match(/[\u4e00-\u9fa5][\u4e00-\u9fa5a-zA-Z0-9，。？！、\s]{3,60}/g);
                if (matches) {
                  const valid = matches.filter(w => 
                    !w.includes('系统提示') && 
                    !w.includes('当前工作区') && 
                    !w.includes('antigravity') &&
                    !w.includes('markdown')
                  );
                  if (valid.length > 0) {
                    userPromptSnippet = valid[0].trim();
                    break;
                  }
                }
              }
            }

            // Extract workspace directory tag from metadata blob
            const metaBlob = db.prepare('SELECT data FROM trajectory_metadata_blob LIMIT 1').get();
            if (metaBlob?.data) {
              const blobStr = Buffer.from(metaBlob.data).toString('utf8');
              const fileMatch = blobStr.match(/file:\/\/\/[^ \n\r\t\x00-\x1F]+/);
              if (fileMatch) {
                try {
                  const decoded = decodeURIComponent(fileMatch[0]);
                  workspaceTag = path.basename(decoded);
                } catch (e) {}
              }
            }
          } catch (e) {}

          const steps = db.prepare('SELECT idx, length(step_payload) as bytes, step_payload FROM steps').all();
          if (!steps || steps.length === 0) continue;

          // 基础会话启动时间
          let sessionTime = (stat.birthtimeMs && stat.birthtimeMs > 0) ? stat.birthtimeMs : stat.mtimeMs;
          for (const s of steps.slice(0, 5)) {
            if (!s.step_payload) continue;
            const ts = extractTimestampFromPayload(Buffer.from(s.step_payload));
            if (ts) {
              sessionTime = ts;
              break;
            }
          }

          // 将 steps 按真实发生的日期精准归档，杜绝跨天长会话将算力全部堆叠在起点日导致后续活跃日空白
          const stepsByDate = new Map();
          let totalBytesAll = 0;
          for (const s of steps) {
            const b = s.bytes || 0;
            totalBytesAll += b;
            const buf = s.step_payload ? Buffer.from(s.step_payload) : null;
            const ts = buf ? extractTimestampFromPayload(buf) : null;
            const stepTime = ts || sessionTime;
            const dateStr = new Date(stepTime).toISOString().slice(0, 10);

            if (!stepsByDate.has(dateStr)) {
              stepsByDate.set(dateStr, { count: 0, bytes: 0, earliestTs: stepTime });
            }
            const dObj = stepsByDate.get(dateStr);
            dObj.count++;
            dObj.bytes += b;
            if (stepTime < dObj.earliestTs) dObj.earliestTs = stepTime;
          }

          const displayName = officialTitle || userPromptSnippet || (workspaceTag ? `项目: ${workspaceTag}` : `任务 #${cascadeId.slice(0, 6)}`);

          if (stepsByDate.size <= 1) {
            if (totalBytesAll > 0) {
              const totalTokens = Math.round(totalBytesAll / 3.2);
              const inputTokens = Math.round(totalTokens * 0.88);
              const outputTokens = totalTokens - inputTokens;

              records.push({
                id: `antigravity_${cascadeId}`,
                tool: '反重力 IDE',
                sessionName: displayName,
                timestamp: sessionTime,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                totalTokens: totalTokens,
                model: 'Gemini 3.8 / Antigravity Agent',
                accuracy: 'estimated',
                estimateBasis: '按会话负载字节 ÷3.2 折算，官方未暴露精确 token 计数',
                details: {
                  steps: steps.length,
                  payloadSizeKB: Math.round(totalBytesAll / 1024),
                  officialTitle: officialTitle,
                  workspaceTag: workspaceTag,
                  promptSnippet: userPromptSnippet
                }
              });
            }
          } else {
            // 跨天会话按真实活跃日精确分流
            let dayIndex = 1;
            for (const [dateStr, dObj] of stepsByDate.entries()) {
              if (dObj.bytes <= 0) continue;
              const totalTokens = Math.round(dObj.bytes / 3.2);
              const inputTokens = Math.round(totalTokens * 0.88);
              const outputTokens = totalTokens - inputTokens;
              const sessionSuffix = stepsByDate.size > 1 ? ` (第${dayIndex}日活跃)` : '';

              records.push({
                id: `antigravity_${cascadeId}_${dateStr}`,
                tool: '反重力 IDE',
                sessionName: displayName + sessionSuffix,
                timestamp: dObj.earliestTs,
                inputTokens: inputTokens,
                outputTokens: outputTokens,
                totalTokens: totalTokens,
                model: 'Gemini 3.8 / Antigravity Agent',
                accuracy: 'estimated',
                estimateBasis: '按会话负载字节 ÷3.2 折算 (跨天会话精准按日分流)',
                details: {
                  steps: dObj.count,
                  payloadSizeKB: Math.round(dObj.bytes / 1024),
                  officialTitle: officialTitle,
                  workspaceTag: workspaceTag,
                  promptSnippet: userPromptSnippet,
                  subDay: dateStr
                }
              });
              dayIndex++;
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('[AntigravityAdapter] 扫描异常:', e.message);
    }

    return records;
  }
}
