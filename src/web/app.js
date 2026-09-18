/**
 * TokenBurn 前端应用逻辑与海报渲染引擎 (双主题支持：默认亮色 Light Mode + 暗色 Dark Mode)
 */

const TOOL_COLORS = {
  "Claude Code": "#f97316",
  "反重力 IDE": "#8b5cf6",
  "Trae": "#06b6d4",
  "华为码道云": "#ef4444",
  "Workbuddy": "#6366f1",
  "通义灵码": "#ff6a00",
  "GitHub Copilot": "#6e40c9",
  "Cursor": "#00d2ff",
  "Windsurf": "#14b8a6",
  "Cline": "#22c55e",
  "Roo Code": "#f59e0b",
  "Continue": "#ec4899",
  "Aider": "#6366f1",
  "Codex": "#10b981",
  "Kiro": "#ff9900",
  "Qoder": "#2563eb",
  "Other": "#94a3b8"
};

const TOOL_VENDORS = {
  "Claude Code": "Anthropic 终端自主 Agent",
  "反重力 IDE": "Google Antigravity 全能智能体",
  "Trae": "字节跳动 原生 AI IDE (全量版本)",
  "华为码道云": "Huawei CloudCode 智能研发助手",
  "Workbuddy": "腾讯智能研发助手 (企业版)",
  "通义灵码": "阿里云 智能编码助手",
  "GitHub Copilot": "Microsoft / OpenAI 结对编程",
  "Codex": "OpenAI 代码智能生态",
  "Cursor": "Anysphere AI 编程 IDE",
  "Windsurf": "Codeium 智能流式编程 IDE",
  "Cline": "VS Code 自主编码 Agent",
  "Roo Code": "VS Code 智能 Agent 扩展",
  "Continue": "开源代码补全 Continue.dev",
  "Aider": "终端 AI 结对编程神器",
  "Kiro": "AWS Spec-driven AI IDE",
  "Qoder": "阿里云 AI IDE (Quest 智能体)"
};

let currentStats = null;

// -------------------------------------------------------------
// 主题管理模块 (默认亮色模式)
// -------------------------------------------------------------
function initTheme() {
  const savedTheme = localStorage.getItem('tokenburn_theme') || 'light';
  applyTheme(savedTheme);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next);
      localStorage.setItem('tokenburn_theme', next);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  if (text) {
    if (theme === 'light') {
      text.innerText = '暗色模式';
    } else {
      text.innerText = '亮色模式';
    }
  }
  // Re-render ECharts with correct theme palette
  reThemeCharts();
}

// -------------------------------------------------------------
// 数据拉取与主看板渲染 (支持本地持久化快照与安全容灾同步)
// -------------------------------------------------------------
function showToast(message, type = 'success', duration = 4000) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✓' : type === 'warning' ? '!' : 'i'}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function updateSnapshotBadge(meta) {
  const badgeText = document.getElementById('snapshot-status-text');
  const pill = document.getElementById('snapshot-pill');
  if (!badgeText || !pill) return;
  if (meta?.snapshotTime) {
    const timeStr = new Date(meta.snapshotTime).toLocaleString('zh-CN', { hour12: false });
    badgeText.innerText = `快照: ${timeStr} · 已归档`;
  } else {
    badgeText.innerText = '最新数据已落盘 · 持久化快照';
  }
}

async function fetchStats(force = false) {
  const btnRefresh = document.getElementById('btn-refresh');
  const btnText = document.getElementById('btn-sync-text');
  const syncIcon = document.getElementById('sync-icon');
  const pill = document.getElementById('snapshot-pill');

  if (force && btnRefresh) {
    btnRefresh.classList.add('loading');
    if (btnText) btnText.innerText = '正在扫描最新数据...';
    if (syncIcon) syncIcon.innerText = '↻';
    if (pill) pill.classList.add('syncing');
  }

  try {
    const res = await fetch(`/api/stats${force ? '?refresh=true' : ''}`);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error);
    }

    currentStats = data;
    renderDashboard(data);
    updateSnapshotBadge(data.meta);

    if (force) {
      if (data.meta?.warning) {
        showToast(data.meta.warning, 'warning', 6000);
      } else {
        showToast(`✔ 战绩已同步至最新并已落盘保存！(共 ${data.overview.sessionCount} 场会话，耗时 ${(data.meta.durationMs / 1000).toFixed(1)}s)`, 'success', 4500);
      }
    }
  } catch (e) {
    console.error('获取数据失败:', e);
    if (pill) pill.classList.add('error');
    showToast(`同步数据受阻 (${e.message})，已为您安全保留原有历史战绩！`, 'warning', 6000);
  } finally {
    if (btnRefresh) {
      btnRefresh.classList.remove('loading');
      if (btnText) btnText.innerText = '同步最新数据';
      if (syncIcon) syncIcon.innerText = '⟳';
      if (pill) pill.classList.remove('syncing');
    }
  }
}

function renderDashboard(data) {
  const { overview, toolStats, dailyMap, monthlyMap, modelStats, topSessions, meta } = data;

  // 1. Hero Rank & Counters
  const rank = overview.rank;
  document.getElementById('hero-badge').innerText = rank.badge;
  document.getElementById('hero-rank-title').innerText = rank.title;
  document.getElementById('hero-rank-en').innerText = rank.enTitle.toUpperCase();
  document.getElementById('hero-rank-desc').innerText = rank.desc;

  animateNumber('total-tokens-num', overview.grandTotal);
  document.getElementById('stat-input-tokens').innerText = (overview.totalInput || 0).toLocaleString();
  document.getElementById('stat-output-tokens').innerText = (overview.totalOutput || 0).toLocaleString();
  document.getElementById('stat-session-count').innerText = (overview.sessionCount || 0).toLocaleString() + ' 个会话';

  const accEl = document.getElementById('stat-accuracy');
  if (accEl) {
    if (overview.exactTotal === undefined) {
      accEl.innerText = '旧快照 · 点击同步后显示';
    } else {
      const exact = overview.exactTotal || 0;
      const est = overview.estimatedTotal || 0;
      if (est === 0) {
        accEl.innerHTML = `全部为官方精确统计`;
      } else {
        const pctExact = overview.grandTotal > 0 ? Math.round((exact / overview.grandTotal) * 100) : 0;
        accEl.innerHTML = `精确 ${formatShort(exact)} (${pctExact}%) · <span title="估算依据：本地无官方 token 计数，按负载/轮数模型折算">≈ 估算 ${formatShort(est)}</span>`;
      }
    }
  }

  document.getElementById('stat-lines-code').innerText = (overview.estimatedLinesOfCode || 0).toLocaleString();
  document.getElementById('stat-hours-saved').innerText = (overview.estimatedHoursSaved || 0).toLocaleString();

  const scanTag = document.getElementById('stat-scan-time');
  if (scanTag) {
    if (meta?.realtime) {
      scanTag.innerText = `实时监控中 · 本地数据源变化自动同步`;
    } else if (meta?.fromCache) {
      scanTag.innerText = `毫秒级自本地快照载入 · 随时点击同步刷新`;
    } else {
      scanTag.innerText = `耗时 ${(meta.durationMs / 1000).toFixed(2)}s 自动完成全盘侦测并落盘保存`;
    }
  }

  // 1.5 Milestone Trophy Wall + Breakthrough Celebration
  renderMilestones(overview, dailyMap, monthlyMap, toolStats);

  // 2. Tools Breakdown
  renderTools(toolStats, overview.grandTotal);

  // 3. Models
  renderModels(modelStats);

  // 4. Monthly Trend (rendered inside renderCharts via ECharts area chart)
  // 4.5 ECharts Visualization Suite
  renderCharts(data);

  // 5. Dual-Mode Heatmap (365 Days Panoramic & Month-by-Month Calendar)
  window.currentStatsData = data;
  initHeatmapControls();
  renderHeatmapFilterPills(toolStats);
  renderHeatmapView();

  // 6. Top Sessions Table
  renderSessions(topSessions);
}

function animateNumber(elementId, target) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const duration = 1200;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = Math.floor(start + (target - start) * ease);
    el.innerText = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      el.innerText = target.toLocaleString();
    }
  }
  requestAnimationFrame(update);
}

// -------------------------------------------------------------
// 里程碑勋章墙 + 突破庆祝动效（成就感 / 自豪感核心）
// -------------------------------------------------------------
const MILESTONES = [
  { key: 'first',   emoji: '🔥', name: '首燃之芯',   desc: '完成你的第一场 AI 会话',        goal: null,         metric: 'sessionCount', threshold: 1,   leveled: [], _target: () => '开启第一场 AI 会话' },
  { key: 'weeks',   emoji: '📅', name: '百日筑基',   desc: '累计活跃燃烧满 100 天',        goal: null,         metric: 'activeDays',   threshold: 100, leveled: [], _target: () => `累计活跃 ${100} 天` },
  { key: 'billion', emoji: '🌋', name: '破亿熔炉',   desc: '单月算力突破 1 亿 Token',      goal: null,         metric: 'peakMonth',    threshold: 1e8,  leveled: [], _target: () => `单月突破 ${formatShort(1e8)}` },
  { key: 'dual',    emoji: '⚡', name: '双核驱动',   desc: '同时驾驭 2 款以上 AI Agent',   goal: null,         metric: 'toolCount',    threshold: 2,   leveled: [], _target: () => '同时使用 2+ 款工具' },
  { key: 'fury',    emoji: '💥', name: '一腔狂热',   desc: '单日算力爆表破 1000 万',       goal: null,         metric: 'peakDay',      threshold: 1e7,  leveled: [], _target: () => `单日突破 ${formatShort(1e7)}` },
  { key: 'monster', emoji: '🐉', name: '五亿神话',   desc: '累计算力冲破 5 亿 Token 大关', goal: null,         metric: 'grandTotal',   threshold: 5e8, leveled: [], _target: () => `累计突破 ${formatShort(5e8)}` }
];

function computeMilestoneMetrics(overview, dailyMap, monthlyMap, toolStats) {
  let activeDays = 0;
  let peakDay = 0;
  for (const k in dailyMap) {
    if ((dailyMap[k] || 0) > 0) { activeDays++; if (dailyMap[k] > peakDay) peakDay = dailyMap[k]; }
  }
  let peakMonth = 0;
  for (const k in monthlyMap) { if (monthlyMap[k] > peakMonth) peakMonth = monthlyMap[k]; }
  const toolStatList = toolStats ? Object.values(toolStats) : [];
  const toolCount = toolStatList.filter(t => (t.sessionCount || 0) > 0 || (t.totalTokens || 0) > 0).length
    || (toolStatList.length ? toolStatList.length : 0);
  return {
    sessionCount: overview.sessionCount || 0,
    grandTotal: overview.grandTotal || 0,
    activeDays,
    peakDay,
    peakMonth,
    toolCount
  };
}

function renderMilestones(overview, dailyMap, monthlyMap, toolStats) {
  const wall = document.getElementById('milestone-wall');
  if (!wall) return;
  const m = computeMilestoneMetrics(overview, dailyMap, monthlyMap, toolStats);
  const earned = MILESTONES.filter(s => m[s.metric] >= s.threshold).length;

  wall.innerHTML = '';
  MILESTONES.forEach((s, i) => {
    const achieved = m[s.metric] >= s.threshold;
    const progress = s.metric === 'activeDays' || s.metric === 'grandTotal'
      ? Math.min(1, m[s.metric] / s.threshold)
      : Math.min(1, m[s.metric] / s.threshold);
    const currentVal = m[s.metric];
    let progressText = s._target();
    if (achieved) progressText = '已达成 ✦';
    else {
      const need = Math.max(1, s.threshold - m[s.metric]);
      if (s.metric === 'activeDays') progressText = `还差 ${need} 天`;
      else if (s.metric === 'grandTotal') progressText = `还差 ${formatShort(need)}`;
      else if (s.metric === 'peakDay') progressText = `还差 ${formatShort(Math.max(0, s.threshold - m[s.metric]))}`;
      else if (s.metric === 'peakMonth') progressText = `还差 ${formatShort(Math.max(0, s.threshold - m[s.metric]))}`;
      else if (s.metric === 'sessionCount') progressText = `还差 ${need} 场`;
      else if (s.metric === 'toolCount') progressText = `还差 ${need} 款`;
    }
    const el = document.createElement('div');
    el.className = `milestone-badge ${achieved ? 'earned' : 'locked'}`;
    el.innerHTML = `
      <div class="milestone-emoji">${s.emoji}</div>
      <div class="milestone-name">${s.name}</div>
      <div class="milestone-desc">${s.desc}</div>
      <div class="milestone-progress-bar"><div class="milestone-progress-fill" style="width:${Math.round(progress * 100)}%"></div></div>
      <div class="milestone-progress-text">${progressText}</div>
    `;
    wall.appendChild(el);
  });

  // Track breakthrough for celebration (first load uses grandTotal; only fire when crossing threshold)
  const prev = window._prevGrandTotal;
  if (prev != null && overview.grandTotal > prev && currentStats?.overview?.rank) {
    // Only celebrate when actually crossing a monster 5e8 / 1e9 boundary
    const boundaries = [5e8, 1e9, 2e9, 5e9, 1e10];
    for (const b of boundaries) {
      if (prev < b && overview.grandTotal >= b) { triggerBreakthrough(b, earned); break; }
    }
  }
  window._prevGrandTotal = overview.grandTotal;
}

function triggerBreakthrough(boundary, earnedCount) {
  const num = formatShort(boundary);
  const overlay = document.createElement('div');
  overlay.className = 'breakthrough-overlay';
  overlay.innerHTML = `
    <div class="breakthrough-burst"></div>
    <div class="breakthrough-inner">
      <div class="breakthrough-crown">👑</div>
      <div class="breakthrough-title">算力突破！</div>
      <div class="breakthrough-num">${num}</div>
      <div class="breakthrough-tokens">TOKENS · ${earnedCount}/${MILESTONES.length} 勋章已点亮</div>
      <div class="breakthrough-sub">你的每一份燃烧都值得被铭记，继续冲 🚀</div>
    </div>
  `;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('show'), 20);
  setTimeout(() => { overlay.classList.remove('show'); setTimeout(() => overlay.remove(), 500); }, 3600);
}

function renderTools(toolStats, grandTotal) {
  const container = document.getElementById('tools-container');
  container.innerHTML = '';

  const allTools = Object.values(toolStats);
  const activeTools = allTools
    .filter(t => (t.sessionCount || 0) > 0 || (t.totalTokens || 0) > 0)
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const standbyTools = allTools
    .filter(t => (t.sessionCount || 0) === 0 && (t.totalTokens || 0) === 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  // 1. Tag in header
  const countTag = document.getElementById('tool-count-tag');
  if (countTag) {
    countTag.innerText = `本机侦测到 ${activeTools.length} 款运行 · 支持 16 款全生态`;
  }

  // 2. Only render ACTIVE tools in the main battle progress list!
  activeTools.forEach(tool => {
    const color = TOOL_COLORS[tool.name] || TOOL_COLORS.Other;
    const pct = tool.percentage || (grandTotal > 0 ? ((tool.totalTokens / grandTotal) * 100).toFixed(1) : 0);
    const isEst = tool.accuracy === 'estimated';
    const estTip = (isEst ? ` 估算数据：${tool.estimateBasis || '本地无官方 token 计数，按模型折算'}` : ' 官方 usage 精确统计')
      + `　精确值：${(tool.totalTokens || 0).toLocaleString()} Tokens`;

    const item = document.createElement('div');
    item.className = 'tool-item';
    item.title = estTip;
    item.innerHTML = `
      <div class="tool-item-top">
        <div class="tool-name-box">
          <span class="tool-color-dot" style="background-color: ${color}"></span>
          <span class="tool-name">${tool.name}</span>
          ${isEst ? '<span class="est-badge" title="该工具官方未暴露精确 token，数值为模型估算">估</span>' : ''}
          <span class="tool-session-pill">${tool.sessionCount} 会话</span>
        </div>
        <div>
          <span class="tool-token-val">${isEst ? '≈ ' : ''}${formatShort(tool.totalTokens || 0)}</span>
          <span class="tool-percent">${pct}%</span>
        </div>
      </div>
      <div class="tool-progress-bg">
        <div class="tool-progress-bar" style="width: ${pct}%; background: ${color}"></div>
      </div>
    `;
    container.appendChild(item);
  });

  // 3. Render supported tools breakdown below
  const summaryText = document.getElementById('supported-summary-text');
  if (summaryText) {
    summaryText.innerText = `本机激活 ${activeTools.length} 款 · 点击展开查看系统支持的全部 ${allTools.length} 款 AI Agent 状态清单`;
  }

  const grid = document.getElementById('supported-tools-grid');
  if (grid) {
    grid.innerHTML = '';
    // Put active first, then standby
    [...activeTools, ...standbyTools].forEach(tool => {
      const isActive = (tool.sessionCount || 0) > 0 || (tool.totalTokens || 0) > 0;
      const color = TOOL_COLORS[tool.name] || '#94a3b8';
      const vendorDesc = TOOL_VENDORS[tool.name] || '主流 AI 编程 Agent';
      const chip = document.createElement('div');
      chip.className = `supported-chip ${isActive ? 'active' : 'standby'}`;
      chip.title = isActive 
        ? `${tool.name} (${vendorDesc})：已在您的电脑上检测到 ${tool.sessionCount} 场会话，累计消耗 ${(tool.totalTokens || 0).toLocaleString()} Tokens`
        : `${tool.name} (${vendorDesc})：适配引擎已就绪，本地一旦安装使用将自动侦测`;
      chip.innerHTML = `
        <div class="supported-chip-left">
          <span class="tool-color-dot" style="background-color: ${color}"></span>
          <div class="supported-chip-info">
            <span class="supported-chip-name">${tool.name}</span>
            <span class="supported-chip-vendor">${vendorDesc}</span>
          </div>
        </div>
        <span class="supported-chip-status">${isActive ? `✔ 已激活 (${tool.sessionCount})` : '待侦测'}</span>
      `;
      grid.appendChild(chip);
    });
  }
}

function renderModels(modelStats) {
  const container = document.getElementById('models-list');
  container.innerHTML = '';

  const models = Object.entries(modelStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = models.length ? models[0][1] : 1;

  models.forEach(([name, tokens], idx) => {
    const friendly = name === '<synthetic>' ? 'Claude 系统消息' : name;
    const display = escapeHtml(friendly.replace('claude-3-5-', '').replace('-20241022', ''));
    const row = document.createElement('div');
    row.className = 'model-row';
    row.title = `${friendly} · 精确值 ${tokens.toLocaleString()} Tokens`;
    row.innerHTML = `
      <span class="model-rank">${String(idx + 1).padStart(2, '0')}</span>
      <span class="model-name">${display}</span>
      <div class="model-bar"><div class="model-bar-fill" style="width:${Math.max(2, (tokens / max) * 100).toFixed(1)}%"></div></div>
      <span class="model-tokens">${formatShort(tokens)}</span>
    `;
    container.appendChild(row);
  });
}

// =============================================================
// ECharts Visualization Suite (战绩可视化图表)
//   1. 工具算力占比环形图   2. 综合战力雷达图
//   3. 输入/输出构成条       4. 月度消耗面积图
// =============================================================
const _echartsInstances = {};
function getChart(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (_echartsInstances[id]) {
    _echartsInstances[id].dispose();
  }
  const inst = echarts.getInstanceByDom(el) || echarts.init(el);
  _echartsInstances[id] = inst;
  return inst;
}

function chartThemeColors() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    text: dark ? '#cbd5e1' : '#475569',
    sub: dark ? '#7d8ba1' : '#8b98ab',
    axis: dark ? '#334155' : '#e2e8f0',
    split: dark ? 'rgba(148,163,184,0.14)' : 'rgba(148,163,184,0.18)',
    tooltipBg: dark ? '#131a2a' : '#ffffff'
  };
}

function renderCharts(data) {
  if (typeof echarts === 'undefined') return;
  const { overview, toolStats, monthlyMap, modelStats } = data;
  const T = chartThemeColors();

  // ---- 1. 工具算力占比环形图 ----
  const donutEl = document.getElementById('chart-tools-donut');
  if (donutEl) {
    const tools = Object.values(toolStats)
      .filter(t => (t.totalTokens || 0) > 0)
      .sort((a, b) => b.totalTokens - a.totalTokens);
    const grand = tools.reduce((s, t) => s + (t.totalTokens || 0), 0) || 1;
    // 占比不足 3% 的少量工具合并为「其他」，避免碎片色块
    const main = tools.filter(t => (t.totalTokens / grand) >= 0.03);
    const rest = tools.filter(t => (t.totalTokens / grand) < 0.03);
    const restSum = rest.reduce((s, t) => s + (t.totalTokens || 0), 0);
    const slices = main.map(t => ({
      name: t.name,
      value: t.totalTokens,
      itemStyle: { color: TOOL_COLORS[t.name] || TOOL_COLORS.Other }
    }));
    if (rest.length) slices.push({ name: '其他', value: restSum, itemStyle: { color: '#94a3b8' } });

    const donutChart = getChart('chart-tools-donut');
    donutChart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: T.tooltipBg,
        borderColor: 'rgba(148,163,184,0.2)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: T.text, fontSize: 12 },
        formatter: p => `${p.name}<br/><b>${p.value.toLocaleString()}</b> Tokens · ${p.percent}%`
      },
      legend: {
        orient: 'vertical',
        right: 6,
        top: 'middle',
        icon: 'circle',
        itemWidth: 9,
        itemHeight: 9,
        itemGap: 12,
        textStyle: { color: T.text, fontSize: 12 },
        formatter: name => {
          const hit = slices.find(s => s.name === name);
          const pct = hit ? Math.round((hit.value / grand) * 1000) / 10 : 0;
          return `${name}  ${pct}%`;
        }
      },
      title: {
        text: formatShort(grand),
        subtext: '累计 Tokens',
        left: '31%',
        top: '43%',
        textAlign: 'center',
        textStyle: { color: T.text, fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace' },
        subtextStyle: { color: T.sub, fontSize: 11, lineHeight: 16 }
      },
      series: [{
        type: 'pie',
        radius: ['46%', '68%'],
        center: ['34%', '50%'],
        minAngle: 3,
        avoidLabelOverlap: true,
        itemStyle: { borderColor: 'transparent', borderWidth: 1 },
        label: { show: false },
        emphasis: {
          scaleSize: 3,
          itemStyle: { borderColor: T.tooltipBg, borderWidth: 2 }
        },
        data: slices
      }]
    }, true);
  }

  // ---- 2. 综合战力雷达图 ----
  const radarEl = document.getElementById('chart-power-radar');
  if (radarEl) {
    let activeDays = 0, peakDay = 0;
    for (const k in data.dailyMap) { if ((data.dailyMap[k]||0) > 0) activeDays++; if ((data.dailyMap[k]||0) > peakDay) peakDay = data.dailyMap[k]; }
    let peakMonth = 0;
    for (const k in monthlyMap) if (monthlyMap[k] > peakMonth) peakMonth = monthlyMap[k];
    // normalize each dimension to 0..100 for a coherent radar
    const radar = [
      { name: '会话规模', max: Math.max(overview.sessionCount||1, 10), val: overview.sessionCount||0 },
      { name: '活跃天数', max: Math.max(activeDays||1, 10), val: activeDays },
      { name: '单日峰值', max: Math.max(peakDay||1, 1e6), val: peakDay||0 },
      { name: '单月峰值', max: Math.max(peakMonth||1, 1e7), val: peakMonth||0 },
      { name: '生态广度', max: 10, val: Object.values(toolStats).filter(t=>(t.totalTokens||0)>0).length }
    ];
    const radarChart = getChart('chart-power-radar');
    radarChart.setOption({
      tooltip: {
        trigger: 'item',
        backgroundColor: T.tooltipBg,
        borderColor: 'rgba(148,163,184,0.2)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: T.text },
        formatter: p => {
          const lines = p.value.map((v, i) => `${radar[i].name}：<b>${p.name === '综合战力' ? v.toLocaleString() : v}</b>`);
          return p.name + '<br/>' + lines.join('<br/>');
        }
      },
      radar: {
        indicator: radar.map(r => ({ name: r.name, max: r.max })),
        radius: '68%',
        center: ['50%', '54%'],
        axisName: { color: T.text, fontSize: 12, fontWeight: 600 },
        splitNumber: 4,
        splitLine: { lineStyle: { color: T.split, width: 1 } },
        splitArea: { areaStyle: { color: 'transparent' } },
        axisLine: { lineStyle: { color: T.axis, width: 1 } },
        axisTick: { show: false }
      },
      series: [{
        type: 'radar',
        symbol: 'circle',
        symbolSize: 4,
        data: [{
          value: radar.map(r => r.val),
          name: '综合战力',
          areaStyle: { color: 'rgba(139, 92, 246, 0.16)' },
          lineStyle: { color: '#8b5cf6', width: 2 },
          itemStyle: { color: '#8b5cf6' }
        }]
      }]
    }, true);
  }

  // ---- 3. 输入/输出构成条 ----
  const ioEl = document.getElementById('chart-io-bar');
  if (ioEl) {
    const total = overview.grandTotal || 1;
    const inp = overview.totalInput || 0;
    const out = overview.totalOutput || 0;
    const inpPct = Math.round(inp / total * 100);
    const outPct = Math.round(out / total * 100);
    ioEl.innerHTML = `
      <div class="io-row">
        <span class="io-label">输入算力 Input</span>
        <div class="io-track"><div class="io-fill io-in" style="width:${inpPct}%"></div></div>
        <span class="io-val">${formatShort(inp)} <small>(${inpPct}%)</small></span>
      </div>
      <div class="io-row">
        <span class="io-label">输出生成 Output</span>
        <div class="io-track"><div class="io-fill io-out" style="width:${outPct}%"></div></div>
        <span class="io-val">${formatShort(out)} <small>(${outPct}%)</small></span>
      </div>
      <div class="io-ratio-tip">输入 : 输出 ≈ <b>${(inp/ (out||1)).toFixed(1)} : 1</b>，你的 AI 更依赖「喂料思考」还是「吐稿」一目了然</div>
    `;
  }

  // ---- 4. 月度消耗面积图 ----
  const areaEl = document.getElementById('chart-monthly-area');
  if (areaEl) {
    // 生成连续的月份轴：最近 12 个自然月，空置月份补 0，避免横轴断裂跳跃
    const monthKeys = Object.keys(monthlyMap);
    let recent = [];
    if (monthKeys.length) {
      const [maxY, maxM] = monthKeys.slice().sort().pop().split('-').map(Number);
      const end = new Date(maxY, maxM - 1, 1);
      let start = new Date(maxY, maxM - 1 - 11, 1);
      const [minY, minM] = monthKeys.slice().sort()[0].split('-').map(Number);
      const earliest = new Date(minY, minM - 1, 1);
      if (start < earliest) start = earliest;
      for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
        recent.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
    }
    const vals = recent.map(m => monthlyMap[m] || 0);
    const areaChart = getChart('chart-monthly-area');
    const maxVal = Math.max(...vals);
    areaChart.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: T.tooltipBg,
        borderColor: 'rgba(148,163,184,0.2)',
        borderWidth: 1,
        padding: [8, 12],
        textStyle: { color: T.text },
        axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(139,92,246,0.08)' } },
        formatter: p => `${p[0].name}<br/><b>${(p[0].value/1e6).toFixed(1)}M</b> Tokens (${p[0].value.toLocaleString()})`
      },
      grid: { left: 8, right: 14, top: 24, bottom: 6, containLabel: true },
      xAxis: {
        type: 'category',
        data: recent.map(m => m.slice(5) + '月'),
        boundaryGap: true,
        axisLine: { lineStyle: { color: T.axis } },
        axisLabel: { color: T.sub, fontSize: 11 },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: T.sub, fontSize: 11, formatter: v => (v/1e6).toFixed(0) + 'M' },
        splitLine: { lineStyle: { color: T.split } }
      },
      series: [{
        name: 'Token 消耗',
        type: 'bar',
        barMaxWidth: 34,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: vals.map(v => ({
          value: v,
          itemStyle: {
            color: v === maxVal && v > 0 ? '#8b5cf6' : 'rgba(139, 92, 246, 0.32)'
          }
        })),
        emphasis: { itemStyle: { color: '#7c3aed' } }
      }]
    }, true);
  }
}

// Re-theme existing chart instances when theme toggled
function reThemeCharts() {
  if (typeof echarts === 'undefined' || !currentStats) return;
  renderCharts(currentStats);
}

// =============================================================
// Dual-Mode Heatmap Engine (365天全景年历 & 12个月真实月历卡片)
// =============================================================

let currentHeatmapTool = 'ALL';
let currentHeatmapView = 'panoramic'; // 'panoramic' | 'monthly'
let heatmapControlsInitialized = false;

const TOOL_THEME_CLASS = {
  'ALL': 'tool-theme-all',
  'Claude Code': 'tool-theme-claude',
  '反重力 IDE': 'tool-theme-antigravity',
  'Trae': 'tool-theme-trae',
  '华为码道云': 'tool-theme-codearts',
  'Workbuddy': 'tool-theme-workbuddy',
  '通义灵码': 'tool-theme-lingma',
  'GitHub Copilot': 'tool-theme-copilot',
  'Cursor': 'tool-theme-cursor',
  'Windsurf': 'tool-theme-windsurf',
  'Cline': 'tool-theme-cline',
  'Roo Code': 'tool-theme-roo',
  'Continue': 'tool-theme-continue',
  'Aider': 'tool-theme-aider',
  'Codex': 'tool-theme-codex'
};

function renderHeatmapFilterPills(toolStats) {
  const container = document.getElementById('heatmap-tool-filters');
  if (!container) return;
  container.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.className = `filter-pill ${currentHeatmapTool === 'ALL' ? 'active' : ''}`;
  allBtn.dataset.tool = 'ALL';
  allBtn.innerText = '全部工具';
  allBtn.addEventListener('click', () => {
    container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    allBtn.classList.add('active');
    currentHeatmapTool = 'ALL';
    renderHeatmapView();
  });
  container.appendChild(allBtn);

  // Show tools with sessions or tokens
  const activeTools = Object.values(toolStats).filter(t => t.sessionCount > 0 || t.totalTokens > 0);
  activeTools.forEach(tool => {
    const pill = document.createElement('button');
    pill.className = `filter-pill ${currentHeatmapTool === tool.name ? 'active' : ''}`;
    pill.dataset.tool = tool.name;
    pill.innerText = tool.name;
    pill.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentHeatmapTool = tool.name;
      renderHeatmapView();
    });
    container.appendChild(pill);
  });
}

function initHeatmapControls() {
  if (heatmapControlsInitialized) return;
  heatmapControlsInitialized = true;

  // 2. View Mode Switcher
  const viewBtns = document.querySelectorAll('#view-mode-switcher .view-btn');
  viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      viewBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentHeatmapView = btn.dataset.view;

      const panoramicPane = document.getElementById('view-panoramic');
      const monthlyPane = document.getElementById('view-monthly');
      if (currentHeatmapView === 'panoramic') {
        panoramicPane.style.display = 'block';
        monthlyPane.style.display = 'none';
      } else {
        panoramicPane.style.display = 'none';
        monthlyPane.style.display = 'block';
      }
      renderHeatmapView();
    });
  });

  // 3. Hide tooltip on leaving section
  const sec = document.getElementById('section-heatmap');
  if (sec) sec.addEventListener('mouseleave', hideHeatmapTooltip);
}

function renderHeatmapView() {
  const data = window.currentStatsData;
  if (!data) return;

  // Resolve daily dataset
  let dailyMap = {};
  if (currentHeatmapTool === 'ALL') {
    dailyMap = data.dailyMap || {};
  } else {
    dailyMap = data.dailyMapByTool?.[currentHeatmapTool] || {};
  }

  const tasksMap = data.dailyTasksMap || {};
  const values = Object.values(dailyMap);
  const activeDays = values.filter(v => v > 0).length;
  const maxDay = values.length > 0 ? Math.max(...values) : 0;

  // Update theme class on container for brand-specific colors
  const themeClass = TOOL_THEME_CLASS[currentHeatmapTool] || 'tool-theme-all';
  const sectionHeatmap = document.getElementById('section-heatmap');
  Object.values(TOOL_THEME_CLASS).forEach(cls => sectionHeatmap.classList.remove(cls));
  sectionHeatmap.classList.add(themeClass);

  // Update footer statistics
  document.getElementById('active-days-stat').innerText = `活跃天数: ${activeDays} 天`;
  document.getElementById('max-day-stat').innerText = `单日最高消耗: ${maxDay.toLocaleString()} Tokens`;

  const toolLabel = currentHeatmapTool === 'ALL' ? '全部 AI 工具' : currentHeatmapTool;
  const viewLabel = currentHeatmapView === 'panoramic' ? '全景年历' : '月度日历';
  document.getElementById('current-filter-stat').innerText = `当前透视: ${toolLabel} · ${viewLabel}`;
  document.getElementById('heatmap-active-indicator').innerText = `${toolLabel} · ${viewLabel}`;

  if (currentHeatmapView === 'panoramic') {
    renderPanoramicHeatmap(dailyMap, maxDay, tasksMap);
  } else {
    renderMonthlyHeatmap(dailyMap, maxDay, tasksMap);
  }
}

function renderPanoramicHeatmap(dailyMap, maxDay, tasksMap) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  const dayCount = 52 * 7;

  // Build date list (oldest first) so we can compute the current active streak
  const dateKeys = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateKeys.push(d.toISOString().slice(0, 10));
  }

  // Current streak: consecutive active days counting back from today (or yesterday if today is idle)
  const isActive = (key) => (dailyMap[key] || 0) > 0;
  let streak = 0;
  let cursor = dateKeys.length - 1;
  // allow streak to start today; if today idle, allow yesterday to still count
  if (!isActive(dateKeys[cursor]) && cursor > 0 && isActive(dateKeys[cursor - 1])) cursor = cursor - 1;
  while (cursor >= 0 && isActive(dateKeys[cursor])) { streak++; cursor--; }

  const streakSet = new Set(dateKeys.slice(dateKeys.length - 1 - streak + 1));

  for (let i = dateKeys.length - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const tokens = dailyMap[dateKey] || 0;

    let level = 'lvl-0';
    if (tokens > 0) {
      const ratio = tokens / (maxDay || 1);
      if (ratio > 0.6) level = 'lvl-4';
      else if (ratio > 0.3) level = 'lvl-3';
      else if (ratio > 0.1) level = 'lvl-2';
      else level = 'lvl-1';
    }

    const inStreak = streakSet.has(dateKey) && tokens > 0;
    const cell = document.createElement('div');
    cell.className = `heat-cell ${level}${inStreak ? ' streak-active' : ''}`;
    cell.dataset.date = dateKey;
    cell.dataset.tokens = tokens;

    cell.addEventListener('mouseenter', (e) => showHeatmapTooltip(e, dateKey, tokens, tasksMap[dateKey]));
    cell.addEventListener('mousemove', (e) => positionHeatmapTooltip(e));
    cell.addEventListener('mouseleave', hideHeatmapTooltip);

    grid.appendChild(cell);
  }

  // Update the streak stat summary
  const streakEl = document.getElementById('streak-stat');
  if (streakEl) {
    streakEl.innerHTML = streak > 0
      ? `<span class="streak-flame">🔥</span> 连续燃烧: <strong>${streak}</strong> 天 <span class="streak-lived">· 正在燃烧</span>`
      : `<span class="streak-flame">🔥</span> 连续燃烧: - 天 <span class="streak-lived dim">· 今日留白,明日再战</span>`;
  }
}

function renderMonthlyHeatmap(dailyMap, maxDay, tasksMap) {
  const container = document.getElementById('monthly-calendar-grid');
  if (!container) return;
  container.innerHTML = '';

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  // Generate months from the earliest recorded month in dailyMap up to current month
  const startMonth = Object.keys(dailyMap || {}).sort()[0];
  const startY = startMonth ? parseInt(startMonth.slice(0, 4), 10) : currentYear;
  const startM = startMonth ? parseInt(startMonth.slice(5, 7), 10) - 1 : 0;

  const months = [];
  for (let y = startY, m = startM; y < currentYear || (y === currentYear && m <= currentMonth);) {
    months.push({ year: y, month: m });
    m++;
    if (m > 11) { m = 0; y++; }
  }

  months.forEach(({ year, month }) => {
    const monthNumber = month + 1;
    const monthKey = `${year}-${monthNumber.toString().padStart(2, '0')}`;
    
    // First day of month (Monday = 0, Sunday = 6 in China/ISO)
    const firstDay = new Date(year, month, 1);
    const startDayIndex = (firstDay.getDay() + 6) % 7;
    // Total days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Calculate month stats
    let monthTokens = 0;
    let monthActiveDays = 0;
    let monthPeak = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${monthNumber.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const tok = dailyMap[dateStr] || 0;
      if (tok > 0) {
        monthTokens += tok;
        monthActiveDays++;
        if (tok > monthPeak) monthPeak = tok;
      }
    }

    const card = document.createElement('div');
    card.className = 'calendar-month-card';

    let monthTokenStr = '';
    if (monthTokens >= 100000000) monthTokenStr = `${(monthTokens / 100000000).toFixed(2)} 亿`;
    else if (monthTokens >= 10000) monthTokenStr = `${(monthTokens / 10000).toFixed(1)} 万`;
    else monthTokenStr = `${monthTokens.toLocaleString()}`;

    card.innerHTML = `
      <div class="cal-card-header">
        <div class="cal-month-title">
          <span style="font-size:14px;opacity:0.7">-</span>
          <span>${year}年 ${monthNumber}月</span>
        </div>
        <div class="cal-month-token-badge">${monthTokenStr} Tokens</div>
      </div>
      <div class="cal-weekdays">
        <span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span>
      </div>
      <div class="cal-days-matrix" id="cal-matrix-${monthKey}"></div>
      <div class="cal-card-footer">
        <span>活跃 ${monthActiveDays} 天</span>
        <span>单日峰值 ${monthPeak > 10000 ? (monthPeak / 10000).toFixed(1) + '万' : monthPeak.toLocaleString()}</span>
      </div>
    `;

    container.appendChild(card);

    const matrix = card.querySelector(`#cal-matrix-${monthKey}`);

    // Empty offset cells before day 1
    for (let i = 0; i < startDayIndex; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day-cell empty';
      matrix.appendChild(empty);
    }

    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${monthNumber.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const tok = dailyMap[dateStr] || 0;

      let level = 'lvl-0';
      if (tok > 0) {
        const ratio = tok / (maxDay || 1);
        if (ratio > 0.6) level = 'lvl-4';
        else if (ratio > 0.3) level = 'lvl-3';
        else if (ratio > 0.1) level = 'lvl-2';
        else level = 'lvl-1';
      }

      const cell = document.createElement('div');
      cell.className = `cal-day-cell ${level}`;
      cell.dataset.date = dateStr;
      cell.dataset.tokens = tok;
      cell.innerHTML = `<span>${day}</span>`;

      cell.addEventListener('mouseenter', (e) => showHeatmapTooltip(e, dateStr, tok, tasksMap[dateStr]));
      cell.addEventListener('mousemove', (e) => positionHeatmapTooltip(e));
      cell.addEventListener('mouseleave', hideHeatmapTooltip);

      matrix.appendChild(cell);
    }
  });
}

function showHeatmapTooltip(e, dateStr, tokens, tasks) {
  const tooltip = document.getElementById('heatmap-tooltip');
  if (!tooltip) return;

  const dateObj = new Date(dateStr);
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekDayStr = weekDays[dateObj.getDay()];

  let tokenStr = '';
  if (tokens >= 10000) {
    tokenStr = `${(tokens / 10000).toFixed(1)} 万 (${tokens.toLocaleString()} Tokens)`;
  } else {
    tokenStr = `${tokens.toLocaleString()} Tokens`;
  }

  const estWords = Math.round(tokens * 0.5);
  const estLines = Math.round(tokens * 0.005);

  let tasksHtml = '';
  const taskCount = Array.isArray(tasks) ? tasks.length : 0;
  if (taskCount > 0) {
    tasksHtml = `
      <div class="popover-tasks-title">当日重点任务 / 会话:</div>
      <div class="popover-sub" style="margin-top: 4px;">共 ${taskCount} 场实战任务，含多轮 AI 自动化编码与深度推理</div>
    `;
  } else if (tokens > 0) {
    tasksHtml = `<div class="popover-sub" style="margin-top: 4px;">当日为后台工程聚合增量沉淀，未提取到单场会话标题</div>`;
  } else {
    tasksHtml = `<div class="popover-sub" style="margin-top: 4px;">算力静默中，未检测到编码任务</div>`;
  }

  tooltip.innerHTML = `
    <div class="popover-header">
      <span class="popover-date">${dateStr} (${weekDayStr})</span>
      <span class="popover-badge">${tokens > 0 ? '活跃' : '休眠'}</span>
    </div>
    <div class="popover-tokens">${tokenStr}</div>
    ${tokens > 0 ? `<div class="popover-sub">≈ 约 ${estWords.toLocaleString()} 字 · 辅助代码约 ${estLines.toLocaleString()} 行</div>` : ''}
    ${tasksHtml}
  `;

  tooltip.style.display = 'block';
  tooltip.style.opacity = '1';
  positionHeatmapTooltip(e);
}

function positionHeatmapTooltip(e) {
  const tooltip = document.getElementById('heatmap-tooltip');
  if (!tooltip || tooltip.style.display === 'none') return;
  const x = e.clientX;
  const y = e.clientY;
  const tooltipWidth = tooltip.offsetWidth || 260;
  const tooltipHeight = tooltip.offsetHeight || 120;

  let left = x;
  let top = y - 12;

  if (left - tooltipWidth / 2 < 10) {
    left = 10 + tooltipWidth / 2;
  } else if (left + tooltipWidth / 2 > window.innerWidth - 10) {
    left = window.innerWidth - 10 - tooltipWidth / 2;
  }

  if (top - tooltipHeight < 10) {
    top = y + tooltipHeight + 24;
    tooltip.style.transform = 'translate(-50%, -100%) translateY(0px)';
  } else {
    tooltip.style.transform = 'translate(-50%, -100%) translateY(-10px)';
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
}

function hideHeatmapTooltip() {
  const tooltip = document.getElementById('heatmap-tooltip');
  if (tooltip) {
    tooltip.style.opacity = '0';
    tooltip.style.display = 'none';
  }
}

function renderSessions(sessions) {
  const tbody = document.getElementById('session-table-body');
  tbody.innerHTML = '';

  sessions.forEach(s => {
    const color = TOOL_COLORS[s.tool] || TOOL_COLORS.Other;
    const tokens = s.totalTokens || 0;

    // Human readable token formatting: e.g. 42.3 万 (423,293 Tokens)
    const isEst = s.accuracy === 'estimated';
    const estPrefix = isEst ? '≈ ' : '';
    const estTip = isEst ? (s.estimateBasis || '模型估算值') : '官方 usage 精确统计';
    let tokenStr = '';
    if (tokens >= 10000) {
      tokenStr = `${estPrefix}${(tokens / 10000).toFixed(1)} 万`;
    } else {
      tokenStr = `${estPrefix}${tokens.toLocaleString()}`;
    }

    // Equivalent estimation: ~1 token = 0.5 chinese characters or 0.005 code lines
    const estWords = Math.round(tokens * 0.5);
    const estLines = Math.round(tokens * 0.005);

    const relativeTime = s.timestamp ? formatRelativeTime(s.timestamp) : '-';
    const fullDateStr = s.timestamp ? new Date(s.timestamp).toLocaleString('zh-CN') : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge-tool" style="background: ${color}15; color: ${color}; border: 1px solid ${color}35">${escapeHtml(s.tool)}</span></td>
      <td>
        <div class="session-title-main" title="${escapeHtml(s.sessionName || '')}">
          <span>${escapeHtml(s.sessionName || '日常问答与编码')}</span>
          ${s.details?.workspaceTag ? `<span class="session-ws-tag" style="font-size: 11px; padding: 1px 6px; border-radius: 4px; background: var(--bg-hover); color: var(--text-dim); margin-left: 6px; font-weight: 500;">${escapeHtml(s.details.workspaceTag)}</span>` : ''}
        </div>
        ${s.details?.promptSnippet && s.details.promptSnippet !== s.sessionName ? `<div class="session-prompt-hint" style="font-size: 11.5px; color: var(--text-muted); margin-top: 3px; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="提问原话: ${escapeHtml(s.details.promptSnippet)}">原话: "${escapeHtml(s.details.promptSnippet)}"</div>` : ''}
        ${s.details?.steps ? `<div class="session-sub-tag">包含 ${s.details.steps} 轮 Agent 自动操作步骤</div>` : ''}
      </td>
      <td>
        <div class="token-val-box" title="${escapeHtml(estTip)}">
          <span class="token-main-num">${tokenStr}</span>
          <span class="token-exact-num">(${tokens.toLocaleString()} Tokens)</span>
          ${isEst ? '<span class="est-badge">估</span>' : ''}
        </div>
        <div class="token-human-tip">≈ 约 ${estWords.toLocaleString()} 字 · 辅助代码约 ${estLines.toLocaleString()} 行</div>
      </td>
      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted)">${escapeHtml(s.model || '-')}</td>
      <td style="font-family: var(--font-mono); font-size: 12px; color: var(--text-dim)" title="${fullDateStr}">
        <div style="font-weight: 600; color: var(--text-main)">${relativeTime}</div>
        <div style="font-size: 11px; opacity: 0.7">${fullDateStr.slice(5, 16)}</div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatRelativeTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return `今天 ${d.toTimeString().slice(0, 5)}`;
  }
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
}

function formatShort(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// -------------------------------------------------------------
// Poster Generation Engine (支持明亮与暗夜双模战报)
// -------------------------------------------------------------
function generatePoster() {
  if (!currentStats) return;
  const canvas = document.getElementById('poster-canvas');
  const ctx = canvas.getContext('2d');
  const { overview, toolStats } = currentStats;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  const w = 1200;
  const h = 675;

  // Background
  ctx.fillStyle = isLight ? '#ffffff' : '#0d121d';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid lines
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.05)' : 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 40; x < w; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 40; y < h; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  // Outer Border Box
  ctx.strokeStyle = isLight ? '#0f172a' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 30, w - 60, h - 60);

  // Corner Accents
  ctx.strokeStyle = isLight ? '#0f172a' : '#94a3b8';
  ctx.lineWidth = 4;
  const len = 30;
  // Top Left
  ctx.beginPath(); ctx.moveTo(30, 30 + len); ctx.lineTo(30, 30); ctx.lineTo(30 + len, 30); ctx.stroke();
  // Top Right
  ctx.beginPath(); ctx.moveTo(w - 30 - len, 30); ctx.lineTo(w - 30, 30); ctx.lineTo(w - 30, 30 + len); ctx.stroke();
  // Bottom Left
  ctx.beginPath(); ctx.moveTo(30, h - 30 - len); ctx.lineTo(30, h - 30); ctx.lineTo(30 + len, h - 30); ctx.stroke();
  // Bottom Right
  ctx.beginPath(); ctx.moveTo(w - 30 - len, h - 30); ctx.lineTo(w - 30, h - 30); ctx.lineTo(w - 30, h - 30 - len); ctx.stroke();

  // Header Title
  ctx.font = 'bold 22px Outfit, sans-serif';
  ctx.fillStyle = isLight ? '#7e22ce' : '#a855f7';
  ctx.fillText('TOKENBURN · 2026 全生态 AI 编程算力战报', 70, 80);

  ctx.font = '14px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#64748b' : '#64748b';
  ctx.fillText(`AUTHENTICATED BY LOCAL REPO SCANNER · ${new Date().toLocaleDateString()}`, 70, 110);

  // Big Rank Badge Box
  ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(70, 140, 480, 110, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 44px Outfit, sans-serif';
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.fillText(`${overview.rank.badge} ${overview.rank.title}`, 95, 205);

  ctx.font = 'bold 14px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
  ctx.fillText(overview.rank.enTitle.toUpperCase(), 98, 235);

  // Grand Total Tokens (Huge Number)
  ctx.font = '14px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
  ctx.fillText('全生态累计消耗 TOKEN (TOTAL BURNED)', 600, 160);

  ctx.font = 'bold 56px Outfit, sans-serif';
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.fillText(overview.grandTotal.toLocaleString(), 600, 225);

  ctx.font = 'bold 16px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
  ctx.fillText('TOKENS · 超越全网 99.4% AI 结对开发者', 600, 260);

  // Divider line
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath(); ctx.moveTo(70, 290); ctx.lineTo(w - 70, 290); ctx.stroke();

  // Metrics Row (4 Cards)
  const metrics = [
    { label: 'Claude Code', val: formatShort(toolStats['Claude Code']?.totalTokens || 0), color: '#ea580c' },
    { label: '反重力 IDE', val: formatShort(toolStats['反重力 IDE']?.totalTokens || 0), color: isLight ? '#7e22ce' : '#8b5cf6' },
    { label: '华为码道云', val: formatShort(toolStats['华为码道云']?.totalTokens || 0), color: '#ef4444' },
    { label: 'Workbuddy', val: formatShort(toolStats['Workbuddy']?.totalTokens || 0), color: isLight ? '#0284c7' : '#06b6d4' }
  ];

  metrics.forEach((m, idx) => {
    const cardX = 70 + idx * 265;
    const cardY = 320;
    ctx.fillStyle = isLight ? 'rgba(255, 255, 255, 0.85)' : 'rgba(255, 255, 255, 0.03)';
    ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 240, 100, 10);
    ctx.fill();
    ctx.stroke();

    ctx.font = '13px Outfit, sans-serif';
    ctx.fillStyle = isLight ? '#64748b' : '#94a3b8';
    ctx.fillText(m.label, cardX + 20, cardY + 38);

    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
    ctx.fillText(m.val, cardX + 20, cardY + 76);
  });

  // Highlight Box at Bottom
  ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)';
  ctx.strokeStyle = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.roundRect(70, 450, w - 140, 110, 12);
  ctx.fill();
  ctx.stroke();

  ctx.font = 'bold 20px Outfit, sans-serif';
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.fillText('战绩等效生产力换算', 100, 492);

  ctx.font = '16px Noto Sans SC, sans-serif';
  ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
  ctx.fillText(`• 等效编写代码：约 ${(overview.estimatedLinesOfCode || 0).toLocaleString()} 行   • 节约人类工时：约 ${(overview.estimatedHoursSaved || 0).toLocaleString()} 小时   • 参战会话：${overview.sessionCount} 场`, 100, 532);

  // Footer Tagline
  ctx.font = '13px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#64748b' : '#475569';
  ctx.fillText('TokenBurn · 属于 AI 时代开发者的算力功德与战绩勋章 · GitHub Open Source', 70, 615);

  document.getElementById('poster-modal').classList.add('active');
}

// ---------------- 实时监控（SSE） ----------------
let realtimeEs = null;

function setLiveStatus(text, state = 'live') {
  const pill = document.getElementById('live-pill');
  const txt = document.getElementById('live-status-text');
  if (!pill || !txt) return;
  txt.innerText = text;
  pill.classList.remove('live', 'scanning', 'error', 'connecting');
  pill.classList.add(state);
}

function initRealtime() {
  if (!window.EventSource) {
    setLiveStatus('浏览器不支持实时推送', 'error');
    return;
  }
  if (realtimeEs) { try { realtimeEs.close(); } catch (e) {} }
  realtimeEs = new EventSource('/api/events');

  realtimeEs.addEventListener('hello', () => {
    setLiveStatus('实时监控中', 'live');
  });
  realtimeEs.addEventListener('scanning', (e) => {
    try {
      const d = JSON.parse(e.data);
      setLiveStatus(`侦测到 ${d.tools?.join('、') || '变化'} · 重扫中`, 'scanning');
    } catch (err) {
      setLiveStatus('实时重扫中', 'scanning');
    }
  });
  realtimeEs.addEventListener('update', (e) => {
    try {
      const data = JSON.parse(e.data);
      setLiveStatus('刚刚实时更新', 'live');
      if (currentStats) renderDashboard(data);
    } catch (err) {}
  });
  realtimeEs.addEventListener('error', () => {
    setLiveStatus('实时连接断开 · 重连中', 'error');
  });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchStats();
  initRealtime();

  document.getElementById('btn-refresh').addEventListener('click', () => fetchStats(true));
  document.getElementById('btn-share-poster').addEventListener('click', generatePoster);

  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('poster-modal').classList.remove('active');
  });

  document.getElementById('btn-download-poster').addEventListener('click', () => {
    const canvas = document.getElementById('poster-canvas');
    const link = document.createElement('a');
    link.download = `TokenBurn-战绩海报-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  });

  document.getElementById('btn-copy-poster').addEventListener('click', async () => {
    const canvas = document.getElementById('poster-canvas');
    try {
      canvas.toBlob(async (blob) => {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        alert('战报海报已成功复制到剪贴板，可直接粘贴分享！');
      });
    } catch (e) {
      alert('复制失败，请直接点击“下载高清战报图片”保存！');
    }
  });

  const toggleSupportedBtn = document.getElementById('toggle-supported-tools');
  if (toggleSupportedBtn) {
    toggleSupportedBtn.addEventListener('click', () => {
      const grid = document.getElementById('supported-tools-grid');
      const arrow = document.getElementById('supported-arrow');
      if (!grid) return;
      const isHidden = grid.style.display === 'none';
      grid.style.display = isHidden ? 'grid' : 'none';
      toggleSupportedBtn.classList.toggle('expanded', isHidden);
      if (arrow) arrow.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  }
});

