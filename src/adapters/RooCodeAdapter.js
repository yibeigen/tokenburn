import fs from 'node:fs';
import path from 'node:path';

export class RooCodeAdapter {
  static name = 'Roo Code';

  static async scan() {
    const appdata = process.env.APPDATA || '';
    const records = [];

    const possiblePaths = [
      path.join(appdata, 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'tasks'),
      path.join(appdata, 'Code - Insiders', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline', 'tasks')
    ];

    for (const tasksDir of possiblePaths) {
      if (!fs.existsSync(tasksDir)) continue;

      try {
        const taskDirs = fs.readdirSync(tasksDir);
        for (const tid of taskDirs) {
          const taskDirPath = path.join(tasksDir, tid);
          if (!fs.statSync(taskDirPath).isDirectory()) continue;

          const uiMsgFile = path.join(taskDirPath, 'ui_messages.json');
          if (!fs.existsSync(uiMsgFile)) continue;

          try {
            const raw = fs.readFileSync(uiMsgFile, 'utf8');
            const messages = JSON.parse(raw);

            let totalIn = 0;
            let totalOut = 0;
            let totalCacheRead = 0;
            let totalCacheWrite = 0;
            let cost = 0;
            let firstPrompt = '';
            let model = 'claude-3-5-sonnet';
            let timestamp = fs.statSync(uiMsgFile).mtimeMs;

            for (const msg of messages) {
              if (msg.ts && !firstPrompt) timestamp = msg.ts;
              if (msg.say === 'task' && !firstPrompt && msg.text) {
                firstPrompt = msg.text.trim().slice(0, 45);
              }
              if (msg.tokensIn) totalIn += msg.tokensIn;
              if (msg.tokensOut) totalOut += msg.tokensOut;
              if (msg.cacheReads) totalCacheRead += msg.cacheReads;
              if (msg.cacheWrites) totalCacheWrite += msg.cacheWrites;
              if (msg.totalCost) cost = Math.max(cost, msg.totalCost);
              if (msg.model) model = msg.model;
            }

            const totalTokens = totalIn + totalOut + totalCacheRead + totalCacheWrite;
            if (totalTokens > 0 || firstPrompt) {
              records.push({
                id: `roo_${tid.slice(0, 12)}`,
                tool: 'Roo Code',
                sessionName: `Roo Code: ${firstPrompt || `任务 #${tid.slice(0, 8)}`}`,
                timestamp,
                inputTokens: totalIn + totalCacheRead + totalCacheWrite,
                outputTokens: totalOut,
                totalTokens: Math.max(totalTokens, 5000),
                model,
                cost,
                accuracy: 'exact',
                details: { taskId: tid, prompt: firstPrompt }
              });
            }
          } catch (e) {}
        }
      } catch (e) {}
    }

    return records;
  }
}
