import { ClaudeCodeAdapter } from '../adapters/ClaudeCodeAdapter.js';
import { CodexAdapter } from '../adapters/CodexAdapter.js';
import { CodeArtsAdapter } from '../adapters/CodeArtsAdapter.js';
import { WorkbuddyAdapter } from '../adapters/WorkbuddyAdapter.js';
import { AntigravityAdapter } from '../adapters/AntigravityAdapter.js';
import { TraeAdapter } from '../adapters/TraeAdapter.js';
import { LingmaAdapter } from '../adapters/LingmaAdapter.js';
import { CursorAdapter } from '../adapters/CursorAdapter.js';
import { WindsurfAdapter } from '../adapters/WindsurfAdapter.js';
import { ClineAdapter } from '../adapters/ClineAdapter.js';
import { RooCodeAdapter } from '../adapters/RooCodeAdapter.js';
import { ContinueAdapter } from '../adapters/ContinueAdapter.js';
import { AiderAdapter } from '../adapters/AiderAdapter.js';
import { CopilotAdapter } from '../adapters/CopilotAdapter.js';
import { KiroAdapter } from '../adapters/KiroAdapter.js';
import { QoderAdapter } from '../adapters/QoderAdapter.js';
import { getRankInfo } from './types.js';

export const ADAPTERS = [
  ClaudeCodeAdapter,
  AntigravityAdapter,
  TraeAdapter,
  CodeArtsAdapter,
  WorkbuddyAdapter,
  LingmaAdapter,
  CopilotAdapter,
  CursorAdapter,
  WindsurfAdapter,
  ClineAdapter,
  RooCodeAdapter,
  ContinueAdapter,
  AiderAdapter,
  CodexAdapter,
  KiroAdapter,
  QoderAdapter
];

/**
 * 阶段一：并行执行适配器扫描，产出原始记录。
 * recordsByAdapter[name] = records[] | null (null 表示该适配器扫描失败)
 * onlyNames: 只重扫指定适配器（实时监控增量模式），null 表示全量。
 */
export async function scanAllAdapters(onlyNames = null) {
  const startTime = Date.now();
  const targets = onlyNames ? ADAPTERS.filter(a => onlyNames.includes(a.name)) : ADAPTERS;
  const results = await Promise.allSettled(targets.map(a => a.scan()));

  const recordsByAdapter = {};
  const errorByAdapter = {};
  targets.forEach((adapter, idx) => {
    const res = results[idx];
    if (res.status === 'fulfilled') {
      recordsByAdapter[adapter.name] = res.value || [];
    } else {
      recordsByAdapter[adapter.name] = null;
      errorByAdapter[adapter.name] = res.reason?.message || String(res.reason);
    }
  });

  return { recordsByAdapter, errorByAdapter, durationMs: Date.now() - startTime };
}

/**
 * 阶段二：纯聚合。从原始记录计算 toolStats/热力图/模型分布/段位等全部派生数据。
 * 供全量扫描与实时监控共用，输入输出均为可 JSON 序列化的普通对象。
 */
export function aggregateRecords(recordsByAdapter, errorByAdapter = {}, durationMs = 0, scanTime = new Date().toISOString()) {
  const allRecords = [];
  const toolStats = {};
  const scanSummary = [];

  for (const adapter of ADAPTERS) {
    const name = adapter.name;
    const records = recordsByAdapter[name];

    if (records === null || records === undefined) {
      const errMsg = errorByAdapter[name] || '未执行扫描';
      toolStats[name] = { name, sessionCount: 0, totalTokens: 0, error: errMsg };
      scanSummary.push({ name, count: 0, tokens: 0, status: 'error', error: errMsg });
      continue;
    }

    const toolTotal = records.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
    const hasEstimated = records.some(r => r.accuracy === 'estimated');
    const estimatedRecord = records.find(r => r.accuracy === 'estimated');
    toolStats[name] = {
      name,
      sessionCount: records.length,
      totalTokens: toolTotal,
      inputTokens: records.reduce((sum, r) => sum + (r.inputTokens || 0), 0),
      outputTokens: records.reduce((sum, r) => sum + (r.outputTokens || 0), 0),
      accuracy: hasEstimated ? 'estimated' : 'exact',
      estimateBasis: estimatedRecord?.estimateBasis || ''
    };
    scanSummary.push({ name, count: records.length, tokens: toolTotal, status: 'ok' });
    allRecords.push(...records);
  }

  // Sort records by timestamp descending
  allRecords.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const grandTotal = allRecords.reduce((sum, r) => sum + (r.totalTokens || 0), 0);
  const totalInput = allRecords.reduce((sum, r) => sum + (r.inputTokens || 0), 0);
  const totalOutput = allRecords.reduce((sum, r) => sum + (r.outputTokens || 0), 0);
  const exactTotal = allRecords
    .filter(r => r.accuracy !== 'estimated')
    .reduce((sum, r) => sum + (r.totalTokens || 0), 0);
  const estimatedTotal = grandTotal - exactTotal;

  // Compute percentages
  for (const key in toolStats) {
    toolStats[key].percentage = grandTotal > 0 ? ((toolStats[key].totalTokens / grandTotal) * 100).toFixed(1) : 0;
  }

  // Daily activity map for heatmap (YYYY-MM-DD -> tokens)
  const dailyMap = {};
  const monthlyMap = {};
  const dailyMapByTool = {};
  const monthlyMapByTool = {};
  const dailyTasksMap = {};

  for (const r of allRecords) {
    if (!r.timestamp) continue;
    const date = new Date(r.timestamp);
    const dateStr = date.toISOString().slice(0, 10);
    const monthStr = date.toISOString().slice(0, 7);
    const tool = r.tool || 'Other';
    const tokens = r.totalTokens || 0;

    dailyMap[dateStr] = (dailyMap[dateStr] || 0) + tokens;
    monthlyMap[monthStr] = (monthlyMap[monthStr] || 0) + tokens;

    if (!dailyMapByTool[tool]) dailyMapByTool[tool] = {};
    dailyMapByTool[tool][dateStr] = (dailyMapByTool[tool][dateStr] || 0) + tokens;

    if (!monthlyMapByTool[tool]) monthlyMapByTool[tool] = {};
    monthlyMapByTool[tool][monthStr] = (monthlyMapByTool[tool][monthStr] || 0) + tokens;

    if (!dailyTasksMap[dateStr]) dailyTasksMap[dateStr] = [];
    if (dailyTasksMap[dateStr].length < 6) {
      dailyTasksMap[dateStr].push({
        tool: tool,
        title: r.sessionName || '日常编码与交互',
        tokens: tokens,
        workspaceTag: r.details?.workspaceTag || r.details?.project || ''
      });
    }
  }

  // Model breakdown
  const modelStats = {};
  for (const r of allRecords) {
    const m = r.model || 'Unknown';
    modelStats[m] = (modelStats[m] || 0) + (r.totalTokens || 0);
  }

  const rank = getRankInfo(grandTotal);

  return {
    meta: {
      scanTime,
      durationMs,
      toolsScanned: ADAPTERS.length,
      summary: scanSummary
    },
    overview: {
      grandTotal,
      totalInput,
      totalOutput,
      sessionCount: allRecords.length,
      rank,
      exactTotal,
      estimatedTotal,
      estimatedLinesOfCode: Math.round(grandTotal * 0.005),
      estimatedHoursSaved: Math.round((grandTotal / 10000) * 1.8)
    },
    toolStats,
    dailyMap,
    monthlyMap,
    dailyMapByTool,
    monthlyMapByTool,
    dailyTasksMap,
    modelStats,
    topSessions: allRecords.slice(0, 30)
  };
}

/**
 * 全量扫描（兼容入口）：扫描 + 聚合一步到位。
 */
export async function runFullScan() {
  const { recordsByAdapter, errorByAdapter, durationMs } = await scanAllAdapters();
  return aggregateRecords(recordsByAdapter, errorByAdapter, durationMs);
}
