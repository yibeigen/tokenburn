# TokenBurn

TokenBurn 是一款本地优先的 AI 编程算力聚合与战绩看板工具。

它可以自动盘点本机安装的各类 AI 编程助手（如 Claude Code、反重力 IDE、Trae、华为码道、Workbuddy、通义灵码、GitHub Copilot、Cursor 等），一键汇总各个工具的会话数与 Token 消耗，并基于真实代码产出模型进行去水换算，生成直观的可视化数据看板与战绩海报。

软件采用 100% 纯本地运行架构，不依赖任何第三方 npm 包，不上传任何代码或对话数据，零配置开箱即用。

---

## 作者信息

- **作者**：艺杯羹 ([@yibeigen](https://github.com/yibeigen))
- **CSDN 博客**：[https://blog.csdn.net/qq_46987323](https://blog.csdn.net/qq_46987323)（分享 AI 提效工具、自主 Agent 架构与全栈开发实战）
- **GitHub 仓库**：[https://github.com/yibeigen/tokenburn](https://github.com/yibeigen/tokenburn)
- **微信公众号**：**艺杯羹**

<div align="center">
  <table style="border: none; background: transparent;">
    <tr style="border: none; background: transparent;">
      <td align="center" style="border: none; padding: 12px 24px;">
        <img src="assets/wechat_qr.png" width="300" alt="微信公众号【艺杯羹】" style="border-radius: 10px;" />
        <br/><br/>
        <b>微信公众号【艺杯羹】</b>
        <br/>
        <sub>扫码关注，第一时间获取最新版本与极客提效工具</sub>
      </td>
      <td align="center" style="border: none; padding: 12px 24px;">
        <img src="assets/reward_qr.png" width="210" alt="微信赞赏支持码" style="border-radius: 10px;" />
        <br/><br/>
        <b>请作者喝杯咖啡</b>
        <br/>
        <sub>纯净开源无广告，支持作者持续适配更多 AI 工具</sub>
      </td>
    </tr>
  </table>
</div>

---

## 视觉预览

### 暗色看板
采用深色极客风格，直观呈现算力总览、去水产出换算、各工具消耗占比、活跃热力图与里程碑勋章。

![TokenBurn 暗色看板预览](assets/preview-dark.png)

### 亮色看板
支持一键切换亮色模式，适配白天高亮办公环境。

![TokenBurn 亮色看板预览](assets/preview-light.png)

---

## 版本更新记录

后续所有版本更新均在此记录，顺序按时间从新到旧排列。

### v1.1.0 (2026-10-11)
- **战力等效换算重构（严谨去水模型）**：
  - 剔除 85%+ 重复上下文输入（Input Tokens）水分，仅提取模型净输出（Net Output）作为计算基数；
  - 引入代码留存率（Code Yield Rate），折算出经得起推敲的 36 万行净代码产出（交付 14 套工程系统当量）；
  - 按照资深工程师 80行/小时标准人效与 ¥100/时企业用人成本底线，折算出 4,497 研发工时（2.2人年当量）与 45 万元企业研发人力成本。
- **新增推导公式透明弹窗**：在战力卡片上提供“严谨去水折算”与“算法公式”入口，可一键展开 4 步推导细节，透明可审计。
- **品牌 Logo 升级**：重新设计双旋赛博烈焰 (Cyber Flame) 与悬浮 Token 晶核矢量徽标，同步更新 SVG Favicon。
- **文档与排版优化**：
  - 修复战力卡片底部提示语在窄屏下的折行问题；
  - 补充完整微信公众号二维码、赞赏码与 CSDN 博客主页链接；
  - 重构 README 文档，规范版本更新日志。

### v1.0.1 (2026-10-10)
- **新增跨平台双击脚本**：提供 `start.bat`（Windows）、`start.command`（macOS）与 `start.sh`（Linux），支持免命令行双击秒开。
- **编码与兼容性修复**：优化 Windows cmd 环境下的字符编码，避免中文输出乱码。
- **文件监控优化**：提升本地文件增量监听器的防抖稳定性，降低系统资源占用。

### v1.0.0 (2026-10-09)
- **正式版本发布**：
  - 支持 Claude Code、反重力 IDE、Trae、华为码道、Workbuddy、通义灵码、GitHub Copilot、Codex、Cursor、Windsurf 等 16 款主流 AI 编程工具会话自动扫描；
  - 纯原生 Node.js（>= 22.5.0）架构，零外部 npm 依赖；
  - 极客双模（暗色/亮色）可视化看板，内嵌轻量 ECharts 图表引擎；
  - 提供 E1~E11 工程师段位天梯体系与动态里程碑勋章墙；
  - 100% 离线只读扫描，零网络数据上报。

---

## 使用说明

### 环境要求
- **Node.js**：版本需 >= 22.5.0（推荐 23.4+，原生内置 SQLite；Node 22 LTS 运行脚本会自动附加兼容参数）。如果未安装，请前往 [nodejs.org](https://nodejs.org/) 下载。

### 方式 1：双击运行（推荐，免敲命令）
克隆或下载本项目后，双击根目录下对应操作系统的启动脚本即可：

| 操作系统 | 启动文件 | 说明 |
| :--- | :--- | :--- |
| **Windows** | `start.bat` | 双击启动服务，并自动调用系统默认浏览器打开看板 |
| **macOS** | `start.command` | 在 Terminal 中启动并打开浏览器（首次若提示安全，右键选择“打开”即可） |
| **Linux** | `start.sh` | 终端执行 `./start.sh` 即可启动 |

### 方式 2：使用 npx 运行（免克隆源码）
在终端中执行以下命令：
```bash
npx tokenburn
```

### 方式 3：源码运行
```bash
# 1. 克隆代码仓库
git clone https://github.com/yibeigen/tokenburn.git
cd tokenburn

# 2. 启动服务（自动扫描并打开浏览器看板）
npm start
```

---

## 命令行参数

```bash
tokenburn [选项]

选项:
  -h, --help       显示帮助信息
  -v, --version    显示版本号
  --port <n>       自定义 Web 服务端口（默认 3000）
  --host <addr>    自定义监听地址（默认 127.0.0.1，仅本机可访问）
  --no-open        启动 Web 服务后不自动打开浏览器
  --scan-only      仅在终端控制台输出纯文本战绩表格，不启动 Web 服务
```

### 纯控制台模式输出示例 (`tokenburn --scan-only`)
```text
TokenBurn v1.1.0 · 全生态 AI Token 战绩聚合与极客看板
--------------------------------------------------------

战绩数据已就绪，已覆盖 16 款工具：

工具名称            会话数         消耗 Token          占比
--------------------------------------------------------
Claude Code    99         271,084,793      38.4%
反重力 IDE        285        297,875,958      42.2%
华为码道云          12         100,466,771      14.2%
Trae           213        22,711,005       3.2%
Workbuddy      110        12,469,336       1.8%
Qoder          13         342,201          0.0%
GitHub Copilot 18         252,000          0.0%
Kiro           15         213,586          0.0%
Codex          3          62,729           0.0%
通义灵码           4          41,021           0.0%
--------------------------------------------------------
全生态累计消耗: 705,533,512 TOKENS
获得战力段位: E7 首席工程架构师 (Chief Architect // E-7)
"全域智能体工程集群总控，算力吞吐突破 5 亿大关。"
```

---

## 支持的工具生态

| 工具分类 | 工具名称 | 本地数据源 | 统计方式 |
| :--- | :--- | :--- | :--- |
| **CLI / 终端工具** | **Claude Code** | `~/.claude/projects` JSONL 日志 | 官方精确统计 |
| **全自主 Agent** | **反重力 IDE (Antigravity)** | Protobuf / SQLite 会话状态库 | 负载模型折算 |
| **字节跳动** | **Trae (国内版 / 海外版)** | workspaceStorage SQLite 数据库 | 交互轮数折算 |
| **华为云** | **华为码道 (CodeArts)** | `opencode.db` SQLite 官方流水 | 官方精确统计 |
| **腾讯云** | **Workbuddy (企业版)** | `db.sqlite` 本地数据库流水 | 官方精确统计 |
| **阿里云** | **通义灵码** | 本地流水数据库 | 轮数模型折算 |
| **微软 / OpenAI** | **GitHub Copilot** | 插件本地 Telemetry 日志 | 轮数模型估算 |
| **OpenAI** | **Codex CLI** | `archived_sessions` 历史存储 | 官方精确统计 |
| **流式智能 IDE** | **Cursor / Windsurf** | workspaceStorage SQLite 库 | 会话模型折算 |
| **自主编码扩展** | **Cline / Roo Code** | VS Code 插件全局状态存储 | 官方精确 / 估算 |
| **开源结对工具** | **Continue / Aider** | 本地会话记录 / `.aider.chat.history` | 交互记录折算 |
| **Spec-driven / 阿里** | **Kiro / Qoder** | 本地 SQLite / Quest 会话存储 | 轮数模型折算 |

注：未安装的工具会自动处于“待侦测”状态，本机只要一开启使用，即可被热监控自动纳入统计。

---

## 安全与隐私说明

- **100% 离线只读**：扫描范围严格限定于本机各 AI 工具的历史会话目录（只读读取），绝不修改或触碰任何工程源码。
- **零网络数据上报**：整个项目无任何数据上传接口、无三方遥测 SDK、无任何埋点。
- **本地落盘保护**：战绩归档仅保存在本机 `data/snapshot.json`；该文件已加入 `.gitignore`，绝不随代码入库。
- **默认本地监听**：Web 服务默认仅监听 `127.0.0.1`，同一局域网下的其他设备无法访问。

---

## 开源协议

本项目基于 [MIT License](./LICENSE) 协议开源。