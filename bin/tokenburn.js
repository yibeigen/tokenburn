#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

// ---------------- Node 版本守卫（node:sqlite 需 >= 22.5.0） ----------------
function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);

  if (major > 23 || (major === 23 && minor >= 4)) return { ok: true };
  if (major === 22 && minor >= 5) {
    return {
      ok: false,
      msg: `\x1b[33m⚠ 当前 Node v${process.versions.node} 需附加实验标志运行:\x1b[0m
   node --experimental-sqlite ${path.join(__dirname, 'tokenburn.js')}
   或升级至 Node.js >= 23.4 (node:sqlite 默认启用)。`
    };
  }
  return {
    ok: false,
    msg: `\x1b[31m❌ TokenBurn 依赖 node:sqlite，需要 Node.js >= 22.5.0 (当前 v${process.versions.node})。\x1b[0m
   请升级: https://nodejs.org/`
  };
}

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

// ---------------- 主流程 ----------------
const opts = parseArgs(process.argv.slice(2));

if (opts.help) { printHelp(); process.exit(0); }
if (opts.version) { console.log(`tokenburn v${pkg.version}`); process.exit(0); }

const ver = checkNodeVersion();
if (!ver.ok) {
  console.log(ver.msg);
  process.exit(1);
}

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
console.log('\x1b[36m🔍 正在全盘秒扫本地所有 AI 编程 IDE 战绩...\x1b[0m');

try {
  const { runFullScan } = await import('../src/core/scanner.js');
  const data = await runFullScan();
  const { overview, toolStats, meta } = data;

  console.log(`\n\x1b[32m✔ 扫描完成！耗时 ${(meta.durationMs / 1000).toFixed(2)} 秒，已成功接入 ${meta.toolsScanned} 款工具：\x1b[0m\n`);

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
  console.log(`\x1b[1m🏆 获得战力段位: \x1b[33m${overview.rank.badge} ${overview.rank.title}\x1b[0m (${overview.rank.enTitle})`);
  console.log(`\x1b[90m   "${overview.rank.desc}"\x1b[0m\n`);

  if (opts.scanOnly) {
    console.log('\x1b[90m(--scan-only 模式: 不启动 Web 服务)\x1b[0m');
    process.exit(0);
  }

  const { startServer } = await import('../src/server/server.js');
  startServer(opts.port, opts.open, opts.host);
} catch (e) {
  console.error('\x1b[31m❌ 扫描启动失败:\x1b[0m', e);
  process.exit(1);
}
