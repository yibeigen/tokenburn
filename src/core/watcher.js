import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADAPTERS, scanAllAdapters } from './scanner.js';

const DEBOUNCE_MS = 3500;

/**
 * 实时监控引擎（零依赖）：
 * fs.watch 监听各工具本地数据目录 → 防抖 → 只重扫受影响的适配器 → 回调聚合结果。
 * 对话密集时 SQLite/JSONL 会高频写入，防抖窗口内的事件合并为一次重扫。
 */
const WATCH_TARGETS = [
  { name: 'Claude Code', paths: () => [path.join(os.homedir(), '.claude', 'projects')], recursive: true },
  { name: '反重力 IDE', paths: () => [path.join(os.homedir(), '.gemini', 'antigravity-ide', 'conversations')] },
  {
    name: 'Trae',
    paths: () => ['Trae CN', 'Trae', 'TRAE SOLO CN']
      .map(v => path.join(process.env.APPDATA || '', v, 'User', 'workspaceStorage')),
    recursive: true
  },
  { name: '华为码道云', paths: () => [path.join(os.homedir(), '.codeartsdoer', 'codearts-data')] },
  { name: 'Workbuddy', paths: () => [path.join(os.homedir(), '.workbuddy')] },
  { name: '通义灵码', paths: () => [path.join(os.homedir(), '.lingma', 'cache', 'db')] },
  { name: 'GitHub Copilot', paths: () => [path.join(process.env.APPDATA || '', 'Code', 'User', 'workspaceStorage')], recursive: true },
  { name: 'Codex', paths: () => [path.join(os.homedir(), '.codex', 'archived_sessions')] },
  {
    name: 'Cursor',
    paths: () => [path.join(process.env.APPDATA || '', 'Cursor', 'User', 'workspaceStorage'), path.join(os.homedir(), '.cursor', 'chats')],
    recursive: true
  },
  { name: 'Windsurf', paths: () => [path.join(process.env.APPDATA || '', 'Windsurf', 'User', 'workspaceStorage')], recursive: true },
  {
    name: 'Cline',
    paths: () => [path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev')],
    recursive: true
  },
  {
    name: 'Roo Code',
    paths: () => [path.join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage', 'rooveterinaryinc.roo-cline')],
    recursive: true
  },
  { name: 'Continue', paths: () => [path.join(os.homedir(), '.continue', 'sessions')] },
  { name: 'Aider', paths: () => [path.join(os.homedir(), '.aider.input.history')] },
  {
    name: 'Kiro',
    paths: () => [path.join(process.env.APPDATA || '', 'Kiro', 'User', 'globalStorage', 'kiro.kiroagent', 'workspace-sessions')],
    recursive: true
  },
  {
    name: 'Qoder',
    paths: () => [
      path.join(os.homedir(), '.qoder-cn', 'shared_client', 'cache', 'db'),
      path.join(os.homedir(), '.qoder', 'cache', 'projects')
    ],
    recursive: true
  }
];

export function startRealtimeMonitor({ getRecordsByAdapter, applyUpdate, onScanning }) {
  const watchers = [];
  const dirty = new Set();
  let debounceTimer = null;
  let scanning = false;
  let pendingAgain = false;

  function markDirty(name) {
    dirty.add(name);
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerScan, DEBOUNCE_MS);
  }

  async function triggerScan() {
    if (scanning) {
      pendingAgain = true;
      return;
    }
    scanning = true;
    const dirtyNames = [...dirty];
    dirty.clear();

    try {
      if (onScanning) onScanning(dirtyNames);

      let recordsByAdapter = getRecordsByAdapter();
      let errorByAdapter = {};
      let durationMs;

      if (!recordsByAdapter) {
        // 无基准数据（如服务直接从旧快照载入）：退化为全量扫描
        const full = await scanAllAdapters();
        recordsByAdapter = full.recordsByAdapter;
        errorByAdapter = full.errorByAdapter;
        durationMs = full.durationMs;
      } else {
        // 增量：只重扫发生变化的适配器
        const inc = await scanAllAdapters(dirtyNames);
        recordsByAdapter = { ...recordsByAdapter, ...inc.recordsByAdapter };
        errorByAdapter = { ...errorByAdapter, ...inc.errorByAdapter };
        durationMs = inc.durationMs;
      }

      applyUpdate(recordsByAdapter, errorByAdapter, durationMs, dirtyNames);
    } catch (e) {
      console.error('[Watcher] 实时重扫异常:', e.message);
    } finally {
      scanning = false;
      if (pendingAgain) {
        pendingAgain = false;
        debounceTimer = setTimeout(triggerScan, 1000);
      }
    }
  }

  let activeTargets = 0;
  for (const target of WATCH_TARGETS) {
    let targetPaths = [];
    try {
      targetPaths = target.paths().filter(p => fs.existsSync(p));
    } catch (e) { continue; }

    for (const p of targetPaths) {
      try {
        const watcher = fs.watch(p, { recursive: !!target.recursive }, (_event, filename) => {
          // SQLite -wal/-shm/journal 等临时文件同样代表真实写入，统一视为该工具变化
          markDirty(target.name);
          void filename;
        });
        watcher.on('error', () => { try { watcher.close(); } catch (e) {} });
        watchers.push(watcher);
        activeTargets++;
      } catch (e) {}
    }
  }

  console.log(`[Watcher] 🟢 实时监控已启动 · 正在监听 ${activeTargets} 个本地数据源`);

  return function stop() {
    if (debounceTimer) clearTimeout(debounceTimer);
    watchers.forEach(w => { try { w.close(); } catch (e) {} });
  };
}