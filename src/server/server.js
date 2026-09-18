import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { scanAllAdapters, aggregateRecords } from '../core/scanner.js';
import { startRealtimeMonitor } from '../core/watcher.js';
import { loadSnapshot, saveSnapshot } from '../core/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.join(__dirname, '..', 'web');

let cachedData = null;
let lastRecordsByAdapter = null;

// 服务端启动时优先从本地持久化快照中载入历史数据
cachedData = loadSnapshot();
if (cachedData) {
  console.log(`[TokenBurn] ⚡ 已优先从本地持久化快照载入历史数据 (快照时刻: ${cachedData.meta?.snapshotTime || '未知'})`);
}

// ---------------- SSE 实时推送 ----------------
const sseClients = new Set();
let heartbeatTimer = null;

function broadcast(type, data) {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch (e) { sseClients.delete(res); }
  }
}

function handleEventStream(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  res.write(`event: hello\ndata: ${JSON.stringify({ connected: true, snapshotTime: cachedData?.meta?.snapshotTime })}\n\n`);
  sseClients.add(res);

  if (!heartbeatTimer) {
    heartbeatTimer = setInterval(() => {
      for (const res of sseClients) {
        try { res.write(': ping\n\n'); } catch (e) { sseClients.delete(res); }
      }
    }, 25000);
  }

  req.on('close', () => sseClients.delete(res));
}

// ---------------- 数据聚合与落盘 ----------------
function applyRecords(recordsByAdapter, errorByAdapter, durationMs, realtime) {
  lastRecordsByAdapter = recordsByAdapter;
  const data = aggregateRecords(recordsByAdapter, errorByAdapter, durationMs);
  const saved = saveSnapshot(data);
  if (realtime) saved.meta.realtime = true;
  cachedData = saved;
  return saved;
}

export async function getStats(forceRefresh = false) {
  // 1. 如果已有持久化快照且非主动强制更新：毫秒级直接返回，零等待
  if (cachedData && !forceRefresh) {
    return {
      ...cachedData,
      meta: {
        ...cachedData.meta,
        fromCache: true
      }
    };
  }

  // 2. 初次启动无快照 或 用户主动点击“⚡ 同步最新数据”
  try {
    console.log('[TokenBurn] 正在执行全生态深度扫描...');
    const { recordsByAdapter, errorByAdapter, durationMs } = await scanAllAdapters();
    const saved = applyRecords(recordsByAdapter, errorByAdapter, durationMs, false);
    return {
      ...saved,
      meta: {
        ...saved.meta,
        fromCache: false,
        justUpdated: true
      }
    };
  } catch (err) {
    console.error('[TokenBurn] 同步扫描过程遇到异常:', err.message);
    // 3. 容灾安全防线：若扫描遇到任何报错，坚决不损坏已有历史数据，继续返回旧快照
    if (cachedData) {
      return {
        ...cachedData,
        meta: {
          ...cachedData.meta,
          warning: `同步扫描遇到异常: ${err.message}。已为您完整保留历史快照。`,
          updateFailed: true
        }
      };
    }
    throw err;
  }
}

// ---------------- 实时监控接入 ----------------
function startRealtime() {
  startRealtimeMonitor({
    getRecordsByAdapter: () => lastRecordsByAdapter,
    onScanning: (dirtyNames) => {
      console.log(`[Watcher] 🔍 侦测到变化: ${dirtyNames.join(', ')} · 增量重扫中...`);
      broadcast('scanning', { tools: dirtyNames });
    },
    applyUpdate: (recordsByAdapter, errorByAdapter, durationMs, dirtyNames) => {
      const saved = applyRecords(recordsByAdapter, errorByAdapter, durationMs, true);
      console.log(`[Watcher] ✅ 实时更新已推送 · 总量 ${saved.overview.grandTotal.toLocaleString()} tokens (变化源: ${dirtyNames.join(', ')})`);
      broadcast('update', saved);
    }
  });
}

export function startServer(port = 3000, autoOpen = true, host = '127.0.0.1') {
  // 若初次启动且本地无快照，触发后台初次扫描并落盘
  if (!cachedData) {
    getStats(true).catch(e => console.error('[TokenBurn] 初次预热扫描异常:', e.message));
  }

  startRealtime();

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);


    if (url.pathname === '/api/events') {
      return handleEventStream(req, res);
    }

    if (url.pathname === '/api/stats') {
      try {
        const force = url.searchParams.get('refresh') === 'true';
        const data = await getStats(force);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        return res.end(JSON.stringify(data));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    // Static files: normalize and strictly confine within webDir
    let requested;
    try {
      requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname);
    } catch {
      requested = '\u0000-invalid';
    }
    let filePath = path.normalize(path.join(webDir, requested));
    const rel = path.relative(webDir, filePath);
    if (rel.startsWith('..') || path.isAbsolute(rel)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Forbidden');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };

    try {
      const content = await fs.promises.readFile(filePath);
      const headers = { 'Content-Type': mimeTypes[ext] || 'text/plain' };
      if (['.html', '.css', '.js'].includes(ext)) {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
        headers['Pragma'] = 'no-cache';
        headers['Expires'] = '0';
      }
      res.writeHead(200, headers);
      res.end(content);
    } catch (e) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[TokenBurn] 端口 ${port} 已被占用，尝试 ${port + 1}...`);
      startServer(port + 1, autoOpen, host);
    } else {
      console.error('[TokenBurn] 服务启动失败:', err);
    }
  });

  server.listen(port, host, () => {
    const displayHost = host === '127.0.0.1' ? 'localhost' : host;
    const url = `http://${displayHost}:${port}`;
    console.log(`\n🔥 [TokenBurn] 战绩中心服务已就绪: ${url} (仅本机可访问)`);
    if (autoOpen) {
      const openCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
      exec(openCmd);
    }
  });

  return server;
}
