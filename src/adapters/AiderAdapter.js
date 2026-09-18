import fs from 'node:fs';
import path from 'node:path';

export class AiderAdapter {
  static name = 'Aider';

  static async scan() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const records = [];

    // Check ~/.aider or ~/.aider.input.history
    const aiderHome = path.join(home, '.aider');
    const aiderHistory = path.join(home, '.aider.input.history');

    if (fs.existsSync(aiderHistory)) {
      try {
        const content = fs.readFileSync(aiderHistory, 'utf8');
        const lines = content.split('\n').filter(l => l.trim().length > 0);
        if (lines.length > 0) {
          const stat = fs.statSync(aiderHistory);
          const totalTokens = lines.length * 6000;
          const inputTokens = Math.round(totalTokens * 0.85);
          const outputTokens = totalTokens - inputTokens;

          records.push({
            id: 'aider_global_history',
            tool: 'Aider',
            sessionName: `Aider CLI: “${lines[lines.length - 1].slice(0, 24)}...”`,
            timestamp: stat.mtimeMs,
            inputTokens,
            outputTokens,
            totalTokens,
            model: 'Claude 3.5 Sonnet / GPT-4o (Aider)',
            accuracy: 'estimated',
            estimateBasis: '按历史命令行数 × 6,000 tokens 模型估算',
            details: { commandCount: lines.length }
          });
        }
      } catch (e) {}
    }

    return records;
  }
}
