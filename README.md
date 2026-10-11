<div align="center">

# ⚡ TokenBurn

**全网首款全生态 AI Token 战绩聚合与赛博看板系统**

*一键盘点本机所有 AI 编程工具的真实算力消耗 · 赛博看板实时呈现你的"算力燃烧总量"*

[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D22.5.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Native)-0284c7?style=flat-square)](https://github.com/yibeigen/tokenburn)
[![Privacy First](https://img.shields.io/badge/Privacy-100%25%20Offline-10b981?style=flat-square)](https://github.com/yibeigen/tokenburn)
[![Adapters Supported](https://img.shields.io/badge/AI%20IDEs-16%20Engines-8b5cf6?style=flat-square)](https://github.com/yibeigen/tokenburn)
[![License: MIT](https://img.shields.io/badge/License-MIT-f97316?style=flat-square)](./LICENSE)

<br/>

<p align="center">
  <a href="#-快速开始">快速体验</a> •
  <a href="#-支持工具生态">支持工具</a> •
  <a href="#-战力段位体系">段位天梯</a> •
  <a href="#-设计与隐私承诺">隐私承诺</a> •
  <a href="#-关于作者">关于作者</a>
</p>

</div>

---

## 📸 视觉预览 (Visual Preview)

### 🌙 暗色极客看板 (Engineering Dark Deck)
> 深度冷峻暗黑工业风，实时呈现全域算力吞吐、去水战力当量折算与精致 Bento 里程碑勋章墙。

![TokenBurn 暗色赛博看板](assets/preview-dark.png)

<br/>

### ☀️ 亮色极客大屏 (Clean Light Deck)
> 明亮高透工程风，优雅呈现各 IDE 算力消耗占比、模型吞吐与工时换算。

![TokenBurn 亮色极客看板](assets/preview-light.png)

---

## ✨ 核心特性

- 🔍 **全生态 16 款工具深度接入**：覆盖 Claude Code、反重力 IDE、Trae、华为码道、Workbuddy、通义灵码、GitHub Copilot、Codex、Cursor、Windsurf 等主流 AI 编程助手，装过即扫，开箱即用。
- ⚡ **毫秒级秒开 + 静默增量侦测**：本地快照原子预载，毫秒级直接呈现看板；后台静默侦测，一旦产生新会话通过 SSE 实时秒级跳动。
- 🏆 **E1 ~ E11 战力段位天梯**：独家极客段位体系，从入门探索成员一路进阶至千亿级「奇点执政架构师」；战绩突破百亿、千亿亦能完美自适应。
- 🎖 **动态进阶里程碑勋章**：首燃之芯、百日筑基、破亿熔炉、双核驱动、一腔狂热以及随算力动态升级的十亿/百亿/千亿终极奖杯。
- ⏱ **严谨工程级战力等效换算 (去水真实产出)**：剔除 85%+ 上下文重复注入水分，基于模型纯净 Net Output 与软件工程代码留存率 (Code Yield Rate) 严谨折算有效交付代码行数（对应交付中大型工程系统套数）、节约人类工时（深度换算为**工作日、研发人月、人年当量**）以及企业级研发人力投资价值，真实严谨、拒绝虚胖自嗨。
- 🎯 **精确 + 估算双轨透明标注**：官方暴露 usage 的工具取精确值，未暴露的按会话轮数与负载模型折算并明确标注 `≈ 估`。
- 🔒 **100% 绝对本地与隐私安全**：纯离线运行，零外联、零上报、零云端依赖；数据仅保存在本机 `data/snapshot.json`。
- 📦 **零 npm 依赖与跨平台免安装**：基于原生 Node 22+ 标准库与内嵌轻量 ECharts 构建，Windows / macOS / Linux 均提供**双击即开**脚本。

---

## 📦 支持工具生态

| 工具分类 | 工具名称 | 本地数据源 | 统计精度 |
| :--- | :--- | :--- | :--- |
| **CLI / 终端智能体** | **Claude Code** | `~/.claude/projects` JSONL 流水 | 官方精确 |
| **全能自主 Agent** | **反重力 IDE (Antigravity)** | Protobuf / SQLite 会话状态库 | 负载模型折算 |
| **字节跳动** | **Trae (CN / Global)** | workspaceStorage SQLite 库 | 交互轮数折算 |
| **华为云** | **华为码道 (CodeArts)** | `opencode.db` SQLite 官方流水 | 官方精确 |
| **腾讯云** | **Workbuddy (企业版)** | `db.sqlite` 数据库官方账单 | 官方精确 |
| **阿里云** | **通义灵码** | 本地流水数据库 | 轮数折算 |
| **微软 / OpenAI** | **GitHub Copilot** | 插件本地 Telemetry 日志 | 轮数模型估算 |
| **OpenAI** | **Codex CLI** | `archived_sessions` 历史存储 | 官方精确 |
| **智能流式 IDE** | **Cursor / Windsurf** | workspaceStorage SQLite 状态库 | 会话模型折算 |
| **自主编码扩展** | **Cline / Roo Code** | VS Code 插件全局状态库 | 官方精确 / 估算 |
| **开源补全 / 结对** | **Continue / Aider** | 本地历史会话 / `.aider.chat.history` | 交互记录折算 |
| **Spec-driven / 阿里**| **Kiro / Qoder** | 本地 SQLite / Quest 会话存储 | 轮数模型折算 |

> 💡 **智能待机**：未安装的工具自动处于“待侦测”状态，本机只要一开启使用，即可被热监控自动纳入统计。

---

## 🏆 战力段位体系 (Rank System)

系统根据你的全域总算力（Grand Total Tokens），智能赋予专属工程师段位称号：

| 段位代码 | 段位称号 | 英文代号 | 算力门槛 | 核心定位与评价 |
| :---: | :--- | :--- | :---: | :--- |
| **E11** | **奇点执政架构师** | `Singularity Consul` | **1000 亿+** | 千亿级极值算力主宰，自主智能体集群全面覆盖。 |
| **E10** | **星系级算力总督** | `Galactic Governor` | **500 亿+** | 五百亿级超大规模工程，工业代码吞吐达人类巅峰。 |
| **E9** | **超算集群总工程师** | `Hyperscale Director` | **100 亿+** | 百亿级算力巨型系统总控，多机协同生成全自动运转。 |
| **E8** | **资深首席架构师** | `Distinguished Fellow`| **20 亿+** | 二十亿级工业吞吐，开辟全自动多智能体研发生态。 |
| **E7** | **首席工程架构师** | `Chief Architect` | **5 亿+** | 全域智能体工程集群总控，算力吞吐突破 5 亿大关。 |
| **E6** | **资深主任架构师** | `Principal Engineer` | **1 亿+** | 亿级工业级代码吞吐主力，复杂系统自主生成枢纽。 |
| **E5** | **核心参谋工程师** | `Staff Engineer` | **5000 万+** | 多智能体协同常态化推进，单兵研发效能极限发挥。 |
| **E4** | **高级系统工程师** | `Senior Engineer` | **1000 万+** | 千万级实战任务密集推进，AI 辅助编码实现深度闭环。 |
| **E3** | **专职研发工程师** | `Development Engineer`| **100 万+** | 跨越百万级工程量门槛，日常全场景 AI 原生交付。 |
| **E2** | **初阶工程专家** | `Associate Engineer` | **10 万+** | 人机协同流水线已规范成型，高质量推进交付。 |
| **E1** | **工程探索成员** | `Engineering Fellow` | **0+** | 工程化协作已起步，正在构建自动化生产流程。 |

---

## 🚀 快速开始

**运行环境要求**：Node.js **>= 22.5.0**（推荐 23.4+ 原生支持内置 SQLite，Node 22 LTS 脚本会自动附加兼容参数）。如果未安装，请前往 [nodejs.org](https://nodejs.org/) 下载。

### 方式 1：双击运行（推荐 · 零命令行）

直接下载或克隆本项目后，双击根目录对应的启动脚本：

| 操作系统 | 双击运行文件 | 特性说明 |
| :--- | :--- | :--- |
| **Windows** | `start.bat` | 弹出纯文本控制台秒启服务，并自动调起默认浏览器打开看板 |
| **macOS** | `start.command` | 在 Terminal 中运行（首次运行若提示安全，右键点击“打开”即可） |
| **Linux** | `start.sh` | 终端执行 `./start.sh`，自动扫描并打开看板 |

---

### 方式 2：npx 一键开箱即用（免克隆）

无需下载代码，在终端中直接运行：

```bash
npx tokenburn
```

---

### 方式 3：源码克隆运行

```bash
# 1. 克隆代码仓库
git clone https://github.com/yibeigen/tokenburn.git
cd tokenburn

# 2. 启动服务 (自动全盘扫描 + 启动看板 + 自动打开浏览器)
npm start
```

---

### 💻 CLI 命令行参数

```bash
tokenburn [选项]

选项:
  -h, --help       显示帮助信息
  -v, --version    显示版本号
  --port <n>       自定义 Web 服务端口 (默认 3000, 亦支持 PORT 环境变量)
  --host <addr>    自定义监听地址 (默认 127.0.0.1, 仅本机可访问)
  --no-open        启动 Web 服务后不自动打开浏览器
  --scan-only      仅在控制台扫描并输出纯文本战绩表格，不启动 Web 服务
```

#### 控制台战绩输出示例 (`tokenburn --scan-only`)

```text
⚡ TokenBurn v1.1.0 · 全生态 AI Token 战绩聚合与赛博看板 ⚡
--------------------------------------------------------

✔ 战绩数据已就绪，已覆盖 16 款工具：

工具名称            会话数         消耗 Token          占比
--------------------------------------------------------
Claude Code    99         271,084,793      38.9%
反重力 IDE        281        288,864,094      41.5%
华为码道云          12         100,466,771      14.4%
Trae           213        22,711,005       3.3%
Workbuddy      109        12,374,056       1.8%
Qoder          13         342,201          0.0%
GitHub Copilot 18         252,000          0.0%
Kiro           15         213,586          0.0%
Codex          3          62,729           0.0%
通义灵码           4          41,021           0.0%
--------------------------------------------------------
🔥 全生态累计消耗: 696,412,256 TOKENS
🏆 获得战力段位: E7 首席工程架构师 (Chief Architect // E-7)
   "全域智能体工程集群总控，算力吞吐突破 5 亿大关。"
```

---

## 🔒 隐私与安全性承诺

- **100% 离线只读**：扫描范围严格限定于本机各 AI 工具的历史会话文件（只读模式读取），绝不修改或触碰您的工程源码。
- **零网络上报**：整个系统不包含任何数据上传接口、无三方遥测 SDK、无广告打点。
- **本地落盘安全**：战绩归档仅保存在本机 `data/snapshot.json`；该文件已被 `.gitignore` 排除，绝不入库。
- **默认回环保护**：看板服务默认仅监听 `127.0.0.1`，同一局域网下的其他设备无法窥探。

---

## 🏗 工程架构

```text
tokenburn/
├── bin/
│   └── tokenburn.js          # CLI 启动入口 (版本守卫 + 参数解析 + 控制台表格)
├── src/
│   ├── adapters/             # 16 款独立 AI IDE 适配器 (统一 scan() 接口)
│   ├── core/
│   │   ├── scanner.js        # 并行全量扫描与聚合引擎 (时区校准 + 统计换算)
│   │   ├── storage.js        # 快照原子落盘与容灾备份机制
│   │   ├── watcher.js        # 本地数据源增量变化监听器 (防抖重扫)
│   │   └── types.js          # E1~E11 段位配置与调色板定义
│   ├── server/
│   │   └── server.js         # 原生 HTTP 服务 (零依赖 API + SSE 推送 + 静态分发)
│   └── web/
│       ├── index.html        # 赛博看板主界面
│       ├── style.css         # 极客双模设计系统 (Light / Dark 主题)
│       ├── app.js            # 看板渲染交互与战报海报生成引擎
│       └── vendor/           # 轻量内嵌 ECharts
├── assets/                   # README 视觉预览截图
├── start.bat                 # Windows 双击秒启脚本
├── start.command             # macOS 双击秒启脚本
├── start.sh                  # Linux / macOS 终端启动脚本
└── package.json
```

---

## ☕ 关于作者与支持

TokenBurn 是一款 100% 免费开源、无任何广告的纯净效率工具。

由 **[@yibeigen (艺杯羹)](https://github.com/yibeigen)** 独立设计与开发。如果您喜欢这个项目，或者它帮您盘点了珍贵的 AI 算力资产，欢迎在 GitHub 点亮一颗 **Star ⭐** 支持持续迭代！

- 📝 **CSDN 技术博客**：[https://blog.csdn.net/qq_46987323](https://blog.csdn.net/qq_46987323)（深度解析 AI 提效工具、自主 Agent 架构与全栈大模型实战）
- 📢 **微信公众号**：**【艺杯羹】**（持续分享 AI 编程实战、提效工具集与极客心得）
- 🌐 **独立个人站点**：[https://yibeigen.pages.dev](https://yibeigen.pages.dev)

<br/>

<div align="center">
  <table style="border: none; background: transparent;">
    <tr style="border: none; background: transparent;">
      <td align="center" style="border: none; padding: 12px 24px;">
        <img src="assets/wechat_qr.png" width="320" alt="微信搜一搜【艺杯羹】" style="border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.12);" />
        <br/><br/>
        <b>📢 官方微信公众号【艺杯羹】</b>
        <br/>
        <sub>微信搜一搜【艺杯羹】，第一时间获取最新版内测与极客提效教程</sub>
      </td>
      <td align="center" style="border: none; padding: 12px 24px;">
        <img src="assets/reward_qr.png" width="220" alt="微信赞赏支持码" style="border-radius: 12px; box-shadow: 0 4px 18px rgba(0,0,0,0.12);" />
        <br/><br/>
        <b>☕ 请作者喝杯热咖啡</b>
        <br/>
        <sub>100% 纯净开源 · 鼓励作者持续维护并适配更多 AI IDE 生态</sub>
      </td>
    </tr>
  </table>
</div>

---

## 📄 开源许可证

本项目基于 [MIT License](./LICENSE) 协议开源。