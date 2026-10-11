#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// ---------------- Node 版本守卫与自动降级兼容（Node 22 LTS 自动附带实验标志） ----------------
function ensureNodeSupport() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  // Node 23.4+ 默认原生支持 node:sqlite
  if (major > 23 || (major === 23 && minor >= 4)) {
    return true;
  }
  // Node 22.5.0 ~ 23.3 需 --experimental-sqlite 标志
  if ((major === 22 && minor >= 5) || (major === 23 && minor < 4)) {
    if (!process.execArgv.includes('--experimental-sqlite')) {
      const result = spawnSync(process.execPath, ['--experimental-sqlite', ...process.execArgv, ...process.argv.slice(1)], {
        stdio: 'inherit',
        env: process.env
      });
      process.exit(result.status ?? 0);
    }
    return true;
  }
  console.error(`\x1b[31m❌ TokenBurn 依赖 node:sqlite，需要 Node.js >= 22.5.0 (当前 v${process.versions.node})。\x1b[0m\n请升级 Node.js: https://nodejs.org/`);
  process.exit(1);
}
ensureNodeSupport();

// ---------------- CLI 参数解析（零依赖） ----------------
function printHelp() {
  console.log(`
\x1b[1m\x1b[33m${pkg.name} v${pkg.version}\x1b[0m · ${pkg.description}

\x1b[1m用法:\x1b[0m tokenburn [选项]

\x1b[1m选项:\x1b[0m
  -h, --help       显示本帮助
  -v, --version    显示版本号
  --port <n>       服务端口 (默认 3000, 可用 PORT 环境变量)
  --host <addr>    监听地址 (默认 127.0.0.1, 可用 HOST 环境变量)
  --no-open        启动服务后不自动打开浏览器
  --scan-only      仅扫描并输出战绩表格, 不启动 Web 服务

\x1b[1m说明:\x1b[0m 扫描本机各 AI 编程工具的本地数据, 全程离线, 数据绝不上报。`);
}

function parseArgs(argv) {
  const opts = {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '127.0.0.1',
    open: true,
    scanOnly: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help': opts.help = true; break;
      case '-v': case '--version': opts.version = true; break;
      case '--port': {
        const n = Number(argv[++i]);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          console.error('\x1b[31m❌ --port 需为 1-65535 的整数\x1b[0m');
          process.exit(1);
        }
        opts.port = n;
        break;
      }
      case '--host': opts.host = argv[++i] || opts.host; break;
      case '--no-open': opts.open = false; break;
      case '--scan-only': opts.scanOnly = true; break;
      default:
        console.error(`\x1b[31m❌ 未知参数: ${a}\x1b[0m (使用 --help 查看用法)`);
        process.exit(1);
    }
  }
  return opts;
}

function printStatsTable(data, isFromCache = false) {
  const { overview, toolStats, meta } = data;
  if (!overview || !toolStats) return;

  const durationStr = meta?.durationMs ? ` (耗时 ${(meta.durationMs / 1000).toFixed(2)} 秒)` : '';
  const cacheTag = isFromCache ? ' [本地快照极速预载]' : '';
  console.log(`\n\x1b[32m✔ 战绩数据已就绪${cacheTag}${durationStr}，已覆盖 ${meta?.toolsScanned || Object.keys(toolStats).length} 款工具：\x1b[0m\n`);

  console.log('\x1b[1m' + '工具名称'.padEnd(16) + '会话数'.padEnd(12) + '消耗 Token'.padEnd(18) + '占比' + '\x1b[0m');
  console.log('\x1b[90m--------------------------------------------------------\x1b[0m');

  for (const [name, stats] of Object.entries(toolStats)) {
    if (stats.sessionCount > 0) {
      console.log(
        `\x1b[33m${name.padEnd(14)}\x1b[0m ` +
        `${stats.sessionCount.toString().padEnd(10)} ` +
        `\x1b[32m${stats.totalTokens.toLocaleString().padEnd(16)}\x1b[0m ` +
        `\x1b[36m${stats.percentage}%\x1b[0m`
      );
    }
  }

  console.log('\x1b[90m--------------------------------------------------------\x1b[0m');
  console.log(`\x1b[1m🔥 全生态累计消耗: \x1b[35m${overview.grandTotal.toLocaleString()}\x1b[0m \x1b[1mTOKENS\x1b[0m`);
  if (overview.rank) {
    console.log(`\x1b[1m🏆 获得战力段位: \x1b[33m${overview.rank.badge} ${overview.rank.title}\x1b[0m (${overview.rank.enTitle})`);
    console.log(`\x1b[90m   "${overview.rank.desc}"\x1b[0m\n`);
  }
}

// ---------------- 主流程 ----------------
const opts = parseArgs(process.argv.slice(2));

if (opts.help) { printHelp(); process.exit(0); }
if (opts.version) { console.log(`tokenburn v${pkg.version}`); process.exit(0); }

const banner = `
\x1b[35m _____   ___   _  __  _____  _ __ \x1b[0m\x1b[36m    ____\x1b[0m
\x1b[35m|_   _| / _ \\ | |/ / | ____|| '_ \\ \x1b[0m\x1b[36m| __ ) _   _ _ __ _ __\x1b[0m
\x1b[35m  | |  | | | || ' /  |  _|  | | | |\x1b[0m\x1b[36m|  _ \\| | | | '__| '_ \\\x1b[0m
\x1b[35m  | |  | |_| || . \\  | |___ | |_| |\x1b[0m\x1b[36m| |_) | |_| | |  | | | |\x1b[0m
\x1b[35m  |_|   \\___/ |_|\\_\\ |_____||_| |_|\x1b[0m\x1b[36m|____/ \\__,_|_|  |_| |_|\x1b[0m

\x1b[1m\x1b[33m⚡ TokenBurn v${pkg.version} · 全生态 AI Token 战绩聚合与赛博看板 ⚡\x1b[0m
\x1b[90m--------------------------------------------------------\x1b[0m
`;

console.log(banner);

if (opts.scanOnly) {
  console.log('\x1b[36m🔍 正在全盘扫描本地所有 AI 编程 IDE 战绩...\x1b[0m');
  try {
    const { runFullScan } = await import('../src/core/scanner.js');
    const { saveSnapshot } = await import('../src/core/storage.js');
    const data = await runFullScan();
    saveSnapshot(data);
    printStatsTable(data);
    console.log('\x1b[90m(--scan-only 模式: 扫描完成并已保存快照，不启动 Web 服务)\x1b[0m');
    process.exit(0);
  } catch (e) {
    console.error('\x1b[31m❌ 扫描失败:\x1b[0m', e);
    process.exit(1);
  }
}

// ---------------- Web 服务启动模式 ----------------
try {
  const { loadSnapshot, hasSnapshot } = await import('../src/core/storage.js');
  const { startServer, syncFreshStats, getCachedData } = await import('../src/server/server.js');

  const hasCached = hasSnapshot();
  if (hasCached) {
    const cached = getCachedData() || loadSnapshot();
    if (cached) {
      printStatsTable(cached, true);
    }
  }

  // 立即启动 Web 服务并拉起浏览器（毫秒级秒开，绝不让用户在控制台等待 20 秒）
  startServer(opts.port, opts.open, opts.host);

  if (hasCached) {
    console.log('\x1b[36m⚡ 服务已就绪！将在 2 秒后后台静默检查增量战绩 (更新后通过 SSE 自动刷新)...\x1b[0m');
    setTimeout(() => {
      syncFreshStats()
        .then(data => {
          console.log(`\x1b[32m✔ 最新战绩已无缝同步完成 (累计: ${data.overview.grandTotal.toLocaleString()} TOKENS)，前端已实时刷新。\x1b[0m`);
        })
        .catch(err => {
          console.log(`\x1b[33m⚠ 后台同步提示: ${err.message} (继续呈现已有历史数据)\x1b[0m`);
        });
    }, 2000);
  } else {
    console.log('\x1b[36m🔍 首次启动，正在全盘深扫本地所有 AI 编程 IDE 战绩...\x1b[0m');
    syncFreshStats()
      .then(data => {
        printStatsTable(data);
      })
      .catch(err => {
        console.error('\x1b[31m❌ 首次扫描失败:\x1b[0m', err.message);
      });
  }
} catch (e) {
  console.error('\x1b[31m❌ 启动失败:\x1b[0m', e);
  process.exit(1);
}
