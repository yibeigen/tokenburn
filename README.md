<div align="center">

# ⚡ TokenBurn

**全网首款全生态 AI Token 战绩聚合与赛博看板系统**

一键盘点本机所有 AI 编程工具的真实算力消耗，赛博看板实时呈现你的"燃烧总量"。

</div>

---

## ✨ 特性

- 🔍 **全生态接入** — 内置 16 款 AI 编程工具适配器，装过即扫，开箱即用
- 📊 **赛博看板** — 工具排行 / 模型分布 / 月历燃烧图 / 战力段位，一屏尽览
- ⚡ **实时监控** — 基于 `fs.watch` 的增量侦测：AI 工具一产生新会话，看板秒级跳动
- 🎯 **精确 + 估算双轨** — 官方暴露 usage 的工具取精确值，未暴露的按负载模型折算并明确标注 `≈ 估`
- 🔒 **绝对本地** — 全程离线运行，零上报、零遥测、零 npm 依赖
- 🛡 **容错架构** — 单款工具数据损坏不影响整体，快照原子落盘 + 自动备份恢复

## 📦 支持工具

| 工具 | 数据源 | 精度 |
|---|---|---|
| Claude Code | `~/.claude/projects` JSONL | 精确 |
| 反重力 IDE (Antigravity) | Protobuf / SQLite 会话流水 | 估算 |
| Trae | workspaceStorage SQLite | 估算 |
| 华为码道云 (CodeArts) | opencode.db | 精确 |
| Workbuddy | 会话 SQLite | 精确 |
| 通义灵码 | 本地流水数据库 | 估算 |
| GitHub Copilot | 插件本地 Telemetry | 估算 |
| Codex | archived_sessions | 精确 |
| Cursor / Windsurf / Cline / Roo Code / Continue / Aider / Kiro / Qoder | 各自本地存储 | 混合 |

> 未安装的工具自动进入"待侦测"状态，本地一旦使用即自动纳入统计。

## 🚀 安装使用

**系统要求**: Node.js **>= 22.5.0**（依赖内置 `node:sqlite`；22.5~23.3 需附加 `--experimental-sqlite` 标志，推荐 23.4+）

### 双击运行（零命令行）

下载本项目后，双击根目录对应的启动脚本即可，无需打开命令行：

| 系统 | 双击文件 | 说明 |
|---|---|---|
| Windows | `start.bat` | 弹出控制台窗口运行，关闭窗口即停止 |
| macOS | `start.command` | 在 Terminal 中运行（首次需右键→打开绕过 Gatekeeper） |
| Linux | `start.sh` | 命令行执行 `./start.sh`（双击行为依桌面环境而定） |

脚本会自动检测 Node.js 是否安装，未装则提示去 https://nodejs.org/ 下载。

### 源码运行

```bash
git clone <repo-url> tokenburn && cd tokenburn
npm start          # 全盘扫描 + 启动看板服务 + 自动打开浏览器
```

### CLI 参数

```bash
tokenburn [选项]

-h, --help       显示帮助
-v, --version    显示版本号
--port <n>       服务端口（默认 3000，可用 PORT 环境变量）
--host <addr>    监听地址（默认 127.0.0.1，仅本机可访问）
--no-open        启动后不自动打开浏览器
--scan-only      仅扫描输出战绩表格，不启动 Web 服务
```

### 命令行战绩示例

```
✔ 扫描完成！耗时 15.48 秒，已成功接入 16 款工具：

工具名称          会话数        消耗 Token         占比
Claude Code       99            271,084,793        46.5%
反重力 IDE        209           215,890,547        37.1%
...

🔥 全生态累计消耗: 582,598,664 TOKENS
🏆 获得战力段位: E7 首席工程架构师
```

## 🔒 隐私承诺

- 扫描范围仅限各 AI 工具在**本机**的历史数据目录（详见 `src/core/watcher.js`）
- 统计结果默认只持久化到项目目录 `data/snapshot.json`，不产生任何网络出站请求
- 看板服务默认绑定 `127.0.0.1`，局域网设备无法访问
- `data/` 已被 `.gitignore` 排除，发布包（`files` 白名单）亦不包含

## 🏗 项目结构

```
bin/tokenburn.js          CLI 入口（版本守卫 + 参数解析）
src/adapters/          16 款工具适配器（统一 scan() 接口）
src/core/scanner.js    并行扫描 + 聚合
src/core/watcher.js    实时监控（防抖 + 增量重扫）
src/core/storage.js    快照原子落盘 + 备份恢复
src/server/server.js   HTTP 服务（API + SSE + 静态资源）
src/web/               赛博看板前端（零构建）
```

## 📄 License

[MIT](./LICENSE)