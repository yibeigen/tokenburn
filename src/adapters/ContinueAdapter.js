import fs from 'node:fs';
import path from 'node:path';

export class ContinueAdapter {
  static name = 'Continue';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const records = [];

    const sessionsDir = path.join(home, '.continue', 'sessions');
    if (!fs.existsSync(sessionsDir)) {
      return records;
    }

    try {
      const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const filePath = path.join(sessionsDir, file);
        try {
          const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const stat = fs.statSync(filePath);
          const title = content.title || path.basename(file, '.json');
          const history = content.history || [];
          
          let totalTokens = 0;
          let model = 'Continue Model';

          for (const item of history) {
            if (item.model) model = item.model;
            // Estimate tokens from prompt and completion text
            const promptLen = (item.message?.content?.length || 0) + (item.prompt?.length || 0);
            const completionLen = item.completion?.length || 0;
            totalTokens += Math.round((promptLen + completionLen) / 3.5);
          }

          if (totalTokens === 0) {
            totalTokens = Math.max(history.length * 4000, 3000);
          }

          const inputTokens = Math.round(totalTokens * 0.82);
          const outputTokens = totalTokens - inputTokens;

          records.push({
            id: `continue_${path.basename(file, '.json').slice(0, 12)}`,
            tool: 'Continue',
            sessionName: `Continue: ${title.slice(0, 35)}`,
            timestamp: content.dateCreated ? new Date(content.dateCreated).getTime() : stat.mtimeMs,
            inputTokens,
            outputTokens,
            totalTokens,
            model,
            accuracy: 'estimated',
            estimateBasis: '按会话字符数 ÷3.5 折算（本地 session JSON 无 usage 明细）',
            details: { turns: history.length, title }
          });
        } catch (e) {}
      }
    } catch (e) {}

    return records;
  }
}
