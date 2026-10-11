/**
 * TokenBurn 前端应用逻辑与海报渲染引擎 (双主题支持：默认亮色 Light Mode + 暗色 Dark Mode)
 */

const TOOL_COLORS = {
  "Claude Code": "#fb923c",
  "反重力 IDE": "#38bdf8",
  "Trae": "#2dd4bf",
  "华为码道云": "#f87171",
  "Workbuddy": "#818cf8",
  "通义灵码": "#fbbf24",
  "GitHub Copilot": "#94a3b8",
  "Cursor": "#22d3ee",
  "Windsurf": "#5eead4",
  "Cline": "#4ade80",
  "Roo Code": "#f472b6",
  "Continue": "#c084fc",
  "Aider": "#60a5fa",
  "Codex": "#34d399",
  "Kiro": "#fdba74",
  "Qoder": "#a78bfa",
  "Other": "#64748b"
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
  const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('tokenburn_theme') || 'dark';
  applyTheme(currentTheme, false);

  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      applyTheme(next, true);
      try {
        localStorage.setItem('tokenburn_theme', next);
      } catch (e) {}
    });
  }
}

function applyTheme(theme, shouldReTheme = true) {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.backgroundColor = theme === 'light' ? '#f4f6fb' : '#0a0d14';
  document.documentElement.style.colorScheme = theme;

  const metaCs = document.getElementById('meta-color-scheme');
  if (metaCs) {
    metaCs.setAttribute('content', theme);
  }

  const icon = document.getElementById('theme-icon');
  const text = document.getElementById('theme-text');
  const toggleBtn = document.getElementById('btn-theme-toggle');
  if (icon) {
    icon.innerHTML = theme === 'light'
      ? '<svg class="ico"><use href="#i-sun"/></svg>'
      : '<svg class="ico"><use href="#i-moon"/></svg>';
  }
  if (text) {
    text.innerText = theme === 'light' ? '亮色' : '暗色';
  }
  if (toggleBtn) {
    toggleBtn.title = theme === 'light' ? '当前为亮色模式，点击切换为暗色模式' : '当前为暗色模式，点击切换为亮色模式';
  }
  // Re-render ECharts with correct theme palette
  if (shouldReTheme) {
    reThemeCharts();
  }
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
    badgeText.innerText = '快照已归档';
    pill.title = `本地数据归档文件位于 token/data/snapshot.json\n快照时刻: ${timeStr} · 包含历史 16 款引擎数据`;
  } else {
    badgeText.innerText = '快照已归档';
    pill.title = '本地数据归档文件位于 token/data/snapshot.json';
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
        showToast(`战绩已同步至最新并已落盘保存！(共 ${data.overview.sessionCount} 场会话，耗时 ${(data.meta.durationMs / 1000).toFixed(1)}s)`, 'success', 4500);
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

  // 0. Update Connected Engine Status Badge
  const activeCount = Object.values(toolStats || {}).filter(t => (t.sessionCount || 0) > 0 || (t.totalTokens || 0) > 0).length;
  const totalCount = Object.keys(toolStats || {}).length;
  const statusEl = document.getElementById('status-text');
  const engineStatusBox = document.getElementById('engine-status');
  if (statusEl) {
    statusEl.innerText = `${activeCount} 款引擎活跃`;
    if (engineStatusBox) {
      engineStatusBox.title = `已连接本地 ${activeCount} 款活跃 AI 引擎 (全生态支持 ${totalCount} 款)`;
    }
  }

  // 1. Hero Rank & Counters
  const rank = overview.rank;
  const heroBadgeEl = document.getElementById('hero-badge');
  if (heroBadgeEl) heroBadgeEl.innerText = rank.badge;
  const heroRankTitleEl = document.getElementById('hero-rank-title');
  if (heroRankTitleEl) heroRankTitleEl.innerText = rank.title;
  const heroRankEnEl = document.getElementById('hero-rank-en');
  if (heroRankEnEl) heroRankEnEl.remove();
  const heroRankDescEl = document.getElementById('hero-rank-desc');
  if (heroRankDescEl) heroRankDescEl.innerText = rank.desc;

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

  // 1.25 多维战力生产力当量折算 (去水净产出严谨工程模型)
  // 核心原则：剔除 85%+ 重复上下文输入 (Input Tokens) 膨胀，仅按模型实际生成的 Net Output 纯净代码折算
  const gTotal = overview.grandTotal || 0;
  const outTokens = (overview.totalOutput && overview.totalOutput > 0)
    ? overview.totalOutput
    : Math.round(gTotal * 0.08); // 保守估计 net output 占比
  // 约每 120 净输出 tokens 沉淀 1 行有效业务交付代码（考虑 8-10:1 的多轮迭代收敛比与解释说明）
  const realisticLines = Math.round(outTokens / 120);
  // 若快照包含未去水旧数据（> 50万行），自动切换为严谨去水值
  const linesCode = (overview.estimatedLinesOfCode && overview.estimatedLinesOfCode < 500000)
    ? overview.estimatedLinesOfCode
    : realisticLines;
  // 资深工程师综合研发交付净产出（含构思与自测）标准人效约 80 行/工时
  const hoursSaved = (overview.estimatedHoursSaved && overview.estimatedHoursSaved < 20000)
    ? overview.estimatedHoursSaved
    : Math.round(linesCode / 80);

  // 指标 1: 代码行数与工程系统当量 (中大型商业系统核心逻辑约 2.5 万行有效代码)
  const elLines = document.getElementById('stat-lines-code');
  if (elLines) elLines.innerText = linesCode.toLocaleString();
  const projectsEquiv = Math.max(1, Math.round(linesCode / 25000));
  const elProj = document.getElementById('stat-projects-equiv');
  if (elProj) elProj.innerText = `≈ 相当于交付 ${projectsEquiv.toLocaleString()} 套中大型工程系统`;

  // 指标 2: 节约人类工时 (小时 -> 工作日 -> 研发人月 -> 人年)
  const elHours = document.getElementById('stat-hours-saved');
  if (elHours) elHours.innerText = hoursSaved.toLocaleString();
  const daysSaved = Math.round(hoursSaved / 8);
  const monthsSaved = (hoursSaved / 174).toFixed(1);
  const yearsSaved = (hoursSaved / 2088).toFixed(1);

  const elDays = document.getElementById('stat-days-saved');
  const elMonths = document.getElementById('stat-months-saved');
  const elYears = document.getElementById('stat-years-saved');
  if (elDays) elDays.innerText = `≈ ${daysSaved.toLocaleString()} 工作日`;
  if (elMonths) elMonths.innerText = `${monthsSaved} 研发人月`;
  if (elYears) elYears.innerText = `${yearsSaved} 人年`;

  // 指标 3: 研发生产力投资与全栈团队当量 (按标准研发时薪 ¥100/时折算)
  const rndValueYuan = Math.round(hoursSaved * 100);
  const elRnd = document.getElementById('stat-rnd-value');
  const elTeam = document.getElementById('stat-team-equiv');
  if (elRnd) {
    if (rndValueYuan >= 100000000) {
      elRnd.innerText = `¥ ${(rndValueYuan / 100000000).toFixed(2)} 亿元`;
    } else if (rndValueYuan >= 10000) {
      elRnd.innerText = `¥ ${(rndValueYuan / 10000).toFixed(1)} 万元`;
    } else {
      elRnd.innerText = `¥ ${rndValueYuan.toLocaleString()}`;
    }
  }
  if (elTeam) {
    const teamSize = Math.max(1, Math.round(Number(yearsSaved)));
    elTeam.innerText = `≈ 相当于 ${teamSize} 人技术团队全职产出 1 年`;
  }

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
  { key: 'first',   icon: 'i-flame',    name: '首燃之芯',   desc: '完成你的第一场 AI 会话',        goal: null,         metric: 'sessionCount', threshold: 1,   leveled: [], _target: () => '开启第一场 AI 会话' },
  { key: 'weeks',   icon: 'i-calendar', name: '百日筑基',   desc: '累计活跃燃烧满 100 天',        goal: null,         metric: 'activeDays',   threshold: 100, leveled: [], _target: () => `累计活跃 ${100} 天` },
  { key: 'billion', icon: 'i-activity', name: '破亿熔炉',   desc: '单月算力突破 1 亿 Token',      goal: null,         metric: 'peakMonth',    threshold: 1e8,  leveled: [], _target: () => `单月突破 ${formatShort(1e8)}` },
  { key: 'dual',    icon: 'i-zap',      name: '双核驱动',   desc: '同时驾驭 2 款以上 AI Agent',   goal: null,         metric: 'toolCount',    threshold: 2,   leveled: [], _target: () => '同时使用 2+ 款工具' },
  { key: 'fury',    icon: 'i-trend',    name: '一腔狂热',   desc: '单日算力爆表破 1000 万',       goal: null,         metric: 'peakDay',      threshold: 1e7,  leveled: [], _target: () => `单日突破 ${formatShort(1e7)}` },
  { key: 'monster', icon: 'i-trophy',   name: '五亿神话',   desc: '累计算力冲破 5 亿 Token 大关', goal: null,         metric: 'grandTotal',   threshold: 5e8, leveled: [], _target: () => `累计突破 ${formatShort(5e8)}` }
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
    let milestoneName = s.name;
    let milestoneDesc = s.desc;
    let threshold = s.threshold;
    let targetText = s._target();

    // 终极算力勋章随战绩动态进阶 (5亿 -> 10亿 -> 50亿 -> 百亿 -> 千亿)
    if (s.key === 'monster') {
      const g = m.grandTotal || 0;
      if (g >= 1e11) {
        milestoneName = '千亿奇点';
        milestoneDesc = '累计算力冲破 1000 亿神话极值';
        threshold = 1e11;
        targetText = `累计突破 ${formatShort(1e11)}`;
      } else if (g >= 1e10) {
        milestoneName = '百亿传奇';
        milestoneDesc = '累计算力冲破 100 亿工业极值大关';
        threshold = 1e10;
        targetText = `累计突破 ${formatShort(1e10)}`;
      } else if (g >= 5e9) {
        milestoneName = '五十亿之巅';
        milestoneDesc = '累计算力冲破 50 亿巨峰大关';
        threshold = 5e9;
        targetText = `累计突破 ${formatShort(5e9)}`;
      } else if (g >= 1e9) {
        milestoneName = '十亿丰碑';
        milestoneDesc = '累计算力冲破 10 亿工业大关';
        threshold = 1e9;
        targetText = `累计突破 ${formatShort(1e9)}`;
      } else {
        milestoneName = '五亿神话';
        milestoneDesc = '累计算力冲破 5 亿 Token 大关';
        threshold = 5e8;
        targetText = `累计突破 ${formatShort(5e8)}`;
      }
    }

    const achieved = m[s.metric] >= threshold;
    const progress = Math.min(1, m[s.metric] / threshold);
    let progressText = targetText;
    if (achieved) {
      progressText = '已达成 ✦';
    } else {
      const need = Math.max(1, threshold - m[s.metric]);
      if (s.metric === 'activeDays') progressText = `还差 ${need} 天`;
      else if (s.metric === 'grandTotal') progressText = `还差 ${formatShort(need)}`;
      else if (s.metric === 'peakDay') progressText = `还差 ${formatShort(Math.max(0, threshold - m[s.metric]))}`;
      else if (s.metric === 'peakMonth') progressText = `还差 ${formatShort(Math.max(0, threshold - m[s.metric]))}`;
      else if (s.metric === 'sessionCount') progressText = `还差 ${need} 场`;
      else if (s.metric === 'toolCount') progressText = `还差 ${need} 款`;
    }
    const el = document.createElement('div');
    el.className = `milestone-badge ${achieved ? 'earned' : 'locked'}`;
    el.innerHTML = `
      <div class="milestone-emoji"><svg class="ico"><use href="#${s.icon}"/></svg></div>
      <div class="milestone-name">${milestoneName}</div>
      <div class="milestone-desc">${milestoneDesc}</div>
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
      <div class="breakthrough-crown"><svg class="ico"><use href="#i-crown"/></svg></div>
      <div class="breakthrough-title">算力突破！</div>
      <div class="breakthrough-num">${num}</div>
      <div class="breakthrough-tokens">TOKENS · ${earnedCount}/${MILESTONES.length} 勋章已点亮</div>
      <div class="breakthrough-sub">你的每一份燃烧都值得被铭记，继续冲</div>
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
        <span class="supported-chip-status">${isActive ? `<svg class="ico"><use href="#i-check"/></svg> 已激活 (${tool.sessionCount})` : '待侦测'}</span>
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
let _chartResizeObserver = null;

function initChartResizeObserver() {
  if (typeof ResizeObserver !== 'undefined' && !_chartResizeObserver) {
    _chartResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const id = entry.target.id;
        const inst = _echartsInstances[id];
        if (inst && !inst.isDisposed()) {
          try { inst.resize(); } catch (e) {}
        }
      }
    });
  }
}

function resizeAllCharts() {
  Object.values(_echartsInstances).forEach(inst => {
    if (inst && !inst.isDisposed()) {
      try { inst.resize(); } catch (e) {}
    }
  });
}

// Window resize 防抖监听 (100ms)
let _resizeDebounceTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeDebounceTimer);
  _resizeDebounceTimer = setTimeout(resizeAllCharts, 100);
});

function getChart(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  initChartResizeObserver();

  // 复用已有实例，绝不每次 dispose 重建
  let inst = _echartsInstances[id] || (typeof echarts !== 'undefined' ? echarts.getInstanceByDom(el) : null);
  if (!inst || inst.isDisposed()) {
    inst = echarts.init(el);
    _echartsInstances[id] = inst;
  }
  if (_chartResizeObserver && !el.dataset.observedResize) {
    _chartResizeObserver.observe(el);
    el.dataset.observedResize = 'true';
  }
  return inst;
}

// 统一标准空态渲染器 (无数据时居中显示，杜绝假数据)
function renderEmptyChart(chart, message, T) {
  if (!chart) return;
  chart.clear();
  chart.setOption({
    graphic: [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: message || '暂无数据',
        textAlign: 'center',
        fill: T?.sub || '#7d8ba1',
        fontSize: 13,
        lineHeight: 22,
        fontFamily: 'inherit'
      }
    }]
  }, true);
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

let currentChartTab = 'radar';

function renderFeaturedChart(tabName, data) {
  if (typeof echarts === 'undefined' || !data) return;
  const T = chartThemeColors();
  const chart = getChart('chart-featured-canvas');
  if (!chart) return;

  // 清除前一个不同坐标系的配置，避免 radar/polar/grid/sunburst 坐标系残留冲突
  chart.clear();

  const titleEl = document.getElementById('featured-chart-title');
  const tagEl = document.getElementById('featured-chart-tag');

  if (tabName === 'circadian') {
    if (titleEl) titleEl.innerText = '24小时极客作息生物钟';
    if (tagEl) tagEl.innerText = '时钟极坐标 · 算力爆发峰值';
    renderCircadianPolarChart(chart, data, T);
  } else if (tabName === 'sunburst') {
    if (titleEl) titleEl.innerText = 'AI 智能体与模型嵌套旭日图';
    if (tagEl) tagEl.innerText = '双层立体架构 · 算力全景透视';
    renderSunburstChart(chart, data, T);
  } else if (tabName === 'velocity') {
    if (titleEl) titleEl.innerText = '算力资产时序累计与增长速率';
    if (tagEl) tagEl.innerText = '累积增值曲线 + 月度消耗流';
    renderVelocityChart(chart, data, T);
  } else {
    // Default: 'radar'
    if (titleEl) titleEl.innerText = '六维全息战力罗盘';
    if (tagEl) tagEl.innerText = 'VS 顶尖架构师基线 · 真实量化';
    renderRadarCompassChart(chart, data, T);
  }

  try { chart.resize(); } catch (e) {}
}

// 1. 六维全息战力罗盘 (修复 max: val 死板缺陷，真实量化对标全网基线)
function renderRadarCompassChart(chart, data, T) {
  const { overview = {}, toolStats = {}, topSessions = [], dailyMap = {} } = data;
  const grandTotal = overview.grandTotal || 0;

  if (grandTotal === 0) {
    const tagEl = document.getElementById('featured-chart-tag');
    if (tagEl) tagEl.innerText = '暂无战力数据';
    renderEmptyChart(chart, '暂无极客战力评估数据', T);
    return;
  }

  const maxSessionTokens = Math.max(...(topSessions || []).map(s => s.totalTokens || 0), 10000);
  const activeToolCount = Object.values(toolStats || {}).filter(t => (t.sessionCount || 0) > 0 || (t.totalTokens || 0) > 0).length || 1;
  const activeDays = Object.values(dailyMap || {}).filter(v => v > 0).length || 1;
  const sessionCount = overview.sessionCount || 1;
  const outputTokens = overview.totalOutput || Math.round(grandTotal * 0.28);

  // 科学对数分级与上限平滑映射 (0 ~ 100 分)
  const scoreCompute = Math.min(100, Math.max(15, Math.round((Math.log10(Math.max(1000, grandTotal)) / 8) * 100)));
  const scoreDepth = Math.min(100, Math.max(20, Math.round((Math.log10(Math.max(1000, maxSessionTokens)) / 6) * 100)));
  const scoreEcosystem = Math.min(100, Math.max(25, Math.round((activeToolCount / 6) * 100)));
  const scoreEndurance = Math.min(100, Math.max(20, Math.round((activeDays / 90) * 100)));
  const scoreScope = Math.min(100, Math.max(20, Math.round((Math.log10(Math.max(1, sessionCount)) / 3) * 100)));
  const scoreOutput = Math.min(100, Math.max(20, Math.round((Math.log10(Math.max(1000, outputTokens)) / 7.5) * 100)));

  const myScores = [scoreCompute, scoreDepth, scoreEcosystem, scoreEndurance, scoreScope, scoreOutput];
  const avgScore = (myScores.reduce((a, b) => a + b, 0) / 6).toFixed(1);

  chart.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: T.tooltipBg,
      borderColor: 'rgba(148,163,184,0.25)',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: T.text, fontSize: 12 },
      formatter: (params) => {
        const isMine = params.name === '我的极客战力';
        const vals = params.value;
        return `
          <div style="font-weight:700;margin-bottom:6px;color:${isMine ? '#ff7a1a' : '#94a3b8'}">
            ${params.name} ${isMine ? `(综合评分 ${avgScore})` : ''}
          </div>
          <div style="display:grid;grid-template-columns:auto auto;gap:4px 12px;font-size:11px;">
            <span>算力吞吐: <b>${vals[0]}分</b></span><span>思维深度: <b>${vals[1]}分</b></span>
            <span>集群协同: <b>${vals[2]}分</b></span><span>持久续航: <b>${vals[3]}分</b></span>
            <span>任务规模: <b>${vals[4]}分</b></span><span>代码产出: <b>${vals[5]}分</b></span>
          </div>
        `;
      }
    },
    legend: {
      data: ['我的极客战力', 'Top 5% 架构师基准'],
      top: 4,
      right: 10,
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 6,
      textStyle: { color: T.text, fontSize: 11 }
    },
    radar: {
      shape: 'polygon',
      center: ['50%', '54%'],
      radius: '62%',
      indicator: [
        { name: `算力吞吐\n${formatShort(grandTotal)}`, max: 100 },
        { name: `思维深度\n${formatShort(maxSessionTokens)}`, max: 100 },
        { name: `集群协同\n${activeToolCount} 款`, max: 100 },
        { name: `持久续航\n${activeDays} 天`, max: 100 },
        { name: `任务规模\n${sessionCount} 场`, max: 100 },
        { name: `代码产出\n${formatShort(outputTokens)}`, max: 100 }
      ],
      axisName: {
        color: T.text,
        fontSize: 11,
        lineHeight: 14,
        formatter: (val) => val
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: [
            'rgba(255, 122, 26, 0.03)',
            'rgba(255, 122, 26, 0.06)',
            'rgba(255, 122, 26, 0.1)',
            'rgba(255, 122, 26, 0.15)'
          ]
        }
      },
      axisLine: { lineStyle: { color: T.split } },
      splitLine: { lineStyle: { color: T.split } }
    },
    series: [{
      name: '战力对比',
      type: 'radar',
      data: [
        {
          value: myScores,
          name: '我的极客战力',
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color: '#ff7a1a', borderColor: '#ffffff', borderWidth: 1.5 },
          lineStyle: { width: 2.5, color: '#ff7a1a' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 122, 26, 0.42)' },
              { offset: 1, color: 'rgba(255, 122, 26, 0.06)' }
            ])
          }
        },
        {
          value: [84, 76, 68, 72, 80, 75],
          name: 'Top 5% 架构师基准',
          symbol: 'none',
          lineStyle: { width: 2, color: 'rgba(148, 163, 184, 0.55)', type: 'dashed' },
          areaStyle: { color: 'rgba(148, 163, 184, 0.06)' }
        }
      ]
    }]
  }, true);
}

// 2. 24小时极客作息生物钟 (时钟极坐标条形图)
function renderCircadianPolarChart(chart, data, T) {
  let hours = (data.hourlyMap && data.hourlyMap.length === 24) ? [...data.hourlyMap] : null;
  let counts = (data.hourlyCountMap && data.hourlyCountMap.length === 24) ? [...data.hourlyCountMap] : null;

  if (!hours || hours.reduce((s, v) => s + v, 0) === 0) {
    hours = new Array(24).fill(0);
    counts = new Array(24).fill(0);
    (data.topSessions || []).forEach(s => {
      if (s.timestamp) {
        try {
          const h = new Date(s.timestamp).getHours();
          if (h >= 0 && h < 24) {
            hours[h] += (s.totalTokens || 0);
            counts[h] += 1;
          }
        } catch {}
      }
    });
  }

  // 严格杜绝伪造假数据：若无小时分布数据，直接展示空态提示
  const totalTokensInHours = hours ? hours.reduce((s, v) => s + v, 0) : 0;
  if (totalTokensInHours === 0) {
    const tagEl = document.getElementById('featured-chart-tag');
    if (tagEl) tagEl.innerText = '暂无时序明细';
    renderEmptyChart(chart, '暂无 24 小时作息时序数据\n（本地工具会话暂未记录小时分布）', T);
    return;
  }

  let peakHour = 0;
  let maxHourVal = 0;
  hours.forEach((v, h) => {
    if (v > maxHourVal) { maxHourVal = v; peakHour = h; }
  });

  const isNightOwl = (peakHour >= 22 || peakHour <= 4);
  const isMorningBird = (peakHour >= 5 && peakHour <= 11);
  const badgeTitle = isNightOwl ? '暗夜极客' : (isMorningBird ? '晨光先锋' : '炽热全能');

  chart.setOption({
    tooltip: {
      confine: true,
      backgroundColor: T.tooltipBg,
      borderColor: 'rgba(148,163,184,0.25)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: T.text, fontSize: 12 },
      formatter: p => {
        const h = p.dataIndex;
        const nextH = (h + 1) % 24;
        const isPeak = (h === peakHour && maxHourVal > 0);
        return `
          <div style="font-weight:700;color:${isPeak ? '#FF7A1A' : '#56a0f5'};margin-bottom:4px;">
            ${String(h).padStart(2, '0')}:00 ~ ${String(nextH).padStart(2, '0')}:00 时段 ${isPeak ? '(全天爆发峰值)' : ''}
          </div>
          <div>消耗算力: <b>${formatShort(hours[h])}</b> Tokens (${hours[h].toLocaleString()})</div>
          <div>参战会话: <b>${counts[h] || 0}</b> 场</div>
        `;
      }
    },
    graphic: [{
      type: 'group',
      left: 'center',
      top: 'middle',
      children: [
        {
          type: 'text',
          left: 'center',
          top: -14,
          style: {
            text: `${String(peakHour).padStart(2, '0')}:00 峰值`,
            textAlign: 'center',
            fill: T.text,
            fontSize: 16,
            fontWeight: 800,
            fontFamily: 'JetBrains Mono, monospace'
          }
        },
        {
          type: 'text',
          left: 'center',
          top: 10,
          style: {
            text: badgeTitle,
            textAlign: 'center',
            fill: '#FF7A1A',
            fontSize: 12,
            fontWeight: 700
          }
        }
      ]
    }],
    polar: {
      center: ['50%', '50%'],
      radius: ['34%', '80%']
    },
    angleAxis: {
      type: 'category',
      startAngle: 90, // 00:00 刻度位于正上方 (12 点钟方向)，符合真实时钟直觉
      clockwise: true, // 顺时针运转，符合 24 小时生物钟作息认知
      data: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
      boundaryGap: false,
      splitLine: { show: true, lineStyle: { color: T.split, type: 'dashed' } },
      axisLine: { lineStyle: { color: T.axis } },
      axisLabel: {
        color: T.sub,
        fontSize: 11,
        interval: 2, // 3 小时一个主刻度 (00:00, 03:00, 06:00, 09:00, 12:00, 15:00, 18:00, 21:00)，整洁不挤压
        margin: 10
      }
    },
    radiusAxis: {
      min: 0,
      splitLine: { lineStyle: { color: T.split } },
      axisLabel: { show: false },
      axisLine: { show: false }
    },
    series: [{
      type: 'bar',
      coordinateSystem: 'polar',
      name: '小时算力',
      roundCap: true,
      data: hours.map((v, h) => {
        const isPeak = (v === maxHourVal && v > 0);
        return {
          value: v,
          itemStyle: {
            color: isPeak ? '#FF7A1A' : (v > 0 ? 'rgba(255, 122, 26, 0.42)' : 'transparent'),
            borderRadius: 3
          },
          emphasis: {
            itemStyle: {
              color: isPeak ? '#FF7A1A' : '#ffa25c'
            }
          }
        };
      })
    }]
  }, true);
}

// 3. AI 智能体与模型嵌套旭日图 (双层立体架构 · 合并碎片微量工具与模型，杜绝拥挤)
function renderSunburstChart(chart, data, T) {
  const toolStats = data.toolStats || {};
  const topSessions = data.topSessions || [];
  const activeTools = Object.values(toolStats).filter(t => (t.totalTokens || 0) > 0);

  if (activeTools.length === 0) {
    const tagEl = document.getElementById('featured-chart-tag');
    if (tagEl) tagEl.innerText = '暂无模型分布';
    renderEmptyChart(chart, '暂无 AI 智能体与模型嵌套数据', T);
    return;
  }

  const cleanName = (str) => {
    return String(str || '')
      .replace(/claude-3-5-/i, 'Claude 3.5 ')
      .replace(/claude-3-7-/i, 'Claude 3.7 ')
      .replace(/-20241022/g, '')
      .replace(/\/ Antigravity Agent/g, '')
      .replace(/<synthetic>/g, '系统引导')
      .trim();
  };

  const grandTotal = activeTools.reduce((s, t) => s + (t.totalTokens || 0), 0) || 1;

  // 核心优化：将全生态占比 < 2.5% 的极微量工具合并为「其他生态」，杜绝几十个微窄碎片扇形在圆周顶部挤压成齿轮
  const mainTools = activeTools
    .filter(t => (t.totalTokens / grandTotal) >= 0.025)
    .sort((a, b) => b.totalTokens - a.totalTokens);
  const minorTools = activeTools
    .filter(t => (t.totalTokens / grandTotal) < 0.025);

  const children = [];

  // 主力工具逐个构建模型层
  mainTools.forEach(tool => {
    const toolColor = TOOL_COLORS[tool.name] || '#ff7a1a';
    const toolModels = {};
    topSessions
      .filter(s => s.tool === tool.name && (s.totalTokens || 0) > 0)
      .forEach(s => {
        const m = cleanName(s.model || '标准编程模型');
        toolModels[m] = (toolModels[m] || 0) + (s.totalTokens || 0);
      });

    const modelEntries = Object.entries(toolModels).filter(([_, tok]) => tok > 0);
    let toolChildren = [];

    if (modelEntries.length > 0) {
      const toolModelSum = modelEntries.reduce((s, e) => s + e[1], 0) || 1;
      // 排序模型，并将该工具内占比 < 4% 的微小模型合并为「其他模型」
      const sortedModels = modelEntries.sort((a, b) => b[1] - a[1]);
      const mainModels = sortedModels.filter(([_, tok]) => (tok / toolModelSum) >= 0.04);
      const restModels = sortedModels.filter(([_, tok]) => (tok / toolModelSum) < 0.04);
      const restModelSum = restModels.reduce((s, e) => s + e[1], 0);

      // 模型色调递变透明度，既可明确区分又与母体工具色调呼应
      const opacities = [0.88, 0.72, 0.58, 0.45];
      toolChildren = mainModels.map(([mName, mTokens], idx) => ({
        name: mName,
        value: Math.max(1, Math.round((mTokens / toolModelSum) * tool.totalTokens)),
        itemStyle: { color: toolColor, opacity: opacities[idx % opacities.length] }
      }));

      if (restModels.length > 0 && restModelSum > 0) {
        toolChildren.push({
          name: '其他模型',
          value: Math.max(1, Math.round((restModelSum / toolModelSum) * tool.totalTokens)),
          itemStyle: { color: toolColor, opacity: 0.4 }
        });
      }
    } else {
      toolChildren = [{
        name: tool.name === 'Claude Code' ? 'Claude 3.7 / Sonnet' : '核心模型',
        value: tool.totalTokens,
        itemStyle: { color: toolColor, opacity: 0.8 }
      }];
    }

    children.push({
      name: tool.name,
      value: tool.totalTokens,
      itemStyle: { color: toolColor },
      children: toolChildren
    });
  });

  // 汇总微量生态工具到单一整洁扇区
  if (minorTools.length > 0) {
    const minorTokens = minorTools.reduce((s, t) => s + (t.totalTokens || 0), 0);
    children.push({
      name: '其他生态',
      value: minorTokens,
      itemStyle: { color: '#64748b' },
      children: [{
        name: `${minorTools.length} 款轻量工具`,
        value: minorTokens,
        itemStyle: { color: '#94a3b8', opacity: 0.8 }
      }]
    });
  }

  chart.setOption({
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: T.tooltipBg,
      borderColor: 'rgba(148,163,184,0.2)',
      textStyle: { color: T.text, fontSize: 12 },
      formatter: p => {
        const pct = ((p.value / grandTotal) * 100).toFixed(1);
        return `
          <div style="font-weight:700;margin-bottom:4px;color:${p.color || T.text};">${p.name}</div>
          <div>消耗算力: <b>${formatShort(p.value)}</b> Tokens</div>
          <div>精确数值: <b>${p.value.toLocaleString()}</b> Tokens</div>
          <div style="color:#ff7a1a;margin-top:2px;">全生态占比: <b>${pct}%</b></div>
        `;
      }
    },
    series: [{
      type: 'sunburst',
      data: children,
      radius: ['18%', '86%'],
      center: ['50%', '50%'],
      minAngle: 0, // 彻底杜绝硬编码角度把 0.01% 的小色块暴力撑大产生拥挤
      emphasis: { focus: 'ancestor' },
      levels: [
        {},
        {
          r0: '18%',
          r: '50%',
          itemStyle: { borderWidth: 2, borderColor: T.tooltipBg },
          label: {
            rotate: 'tangential',
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            minAngle: 14,
            formatter: p => p.name
          }
        },
        {
          r0: '52%',
          r: '86%',
          itemStyle: { borderWidth: 1.5, borderColor: T.tooltipBg },
          label: {
            rotate: 'radial',
            color: T.text,
            fontSize: 11,
            minAngle: 14,
            formatter: p => {
              const n = p.name || '';
              return n.length > 12 ? n.slice(0, 10) + '..' : n;
            }
          }
        }
      ]
    }]
  }, true);
}

// 4. 算力资产时序累计与增长速率 (双轴趋势流)
function renderVelocityChart(chart, data, T) {
  const monthlyMap = data.monthlyMap || {};
  const monthKeys = Object.keys(monthlyMap).sort();
  if (monthKeys.length === 0) {
    const tagEl = document.getElementById('featured-chart-tag');
    if (tagEl) tagEl.innerText = '暂无时序数据';
    renderEmptyChart(chart, '暂无月度时序资产数据', T);
    return;
  }
  const months = monthKeys;
  const monthlyBurn = months.map(m => monthlyMap[m] || 0);
  let cumulative = 0;
  const cumulativeData = monthlyBurn.map(v => {
    cumulative += v;
    return cumulative;
  });

  chart.setOption({
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: T.tooltipBg,
      borderColor: 'rgba(148,163,184,0.2)',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: T.text, fontSize: 12 },
      axisPointer: { type: 'cross', crossStyle: { color: T.sub } },
      formatter: params => {
        const title = params[0]?.name || '';
        let html = `<div style="font-weight:700;margin-bottom:6px;">${title} 资产态势</div>`;
        params.forEach(p => {
          html += `<div>${p.marker} ${p.seriesName}: <b>${formatShort(p.value)}</b> (${p.value.toLocaleString()})</div>`;
        });
        return html;
      }
    },
    legend: {
      data: ['累计资产跃升', '当月燃烧速度'],
      top: 4,
      right: 10,
      textStyle: { color: T.text, fontSize: 11 }
    },
    grid: { left: 10, right: 14, top: 38, bottom: 6, containLabel: true },
    xAxis: {
      type: 'category',
      data: months.map(m => m.slice(2)),
      axisLine: { lineStyle: { color: T.axis } },
      axisLabel: { color: T.sub, fontSize: 11 },
      axisTick: { show: false }
    },
    yAxis: [
      {
        type: 'value',
        name: '累计资产',
        nameTextStyle: { color: T.sub, fontSize: 10 },
        axisLabel: { color: T.sub, fontSize: 10, formatter: v => formatShort(v) },
        splitLine: { lineStyle: { color: T.split } }
      },
      {
        type: 'value',
        name: '月度速率',
        nameTextStyle: { color: T.sub, fontSize: 10 },
        axisLabel: { color: T.sub, fontSize: 10, formatter: v => formatShort(v) },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: '累计资产跃升',
        type: 'line',
        smooth: 0.35,
        yAxisIndex: 0,
        symbol: 'circle',
        symbolSize: 6,
        itemStyle: { color: '#ff7a1a', borderColor: '#ffffff', borderWidth: 2 },
        lineStyle: { width: 3, color: '#ff7a1a' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 122, 26, 0.4)' },
            { offset: 1, color: 'rgba(255, 122, 26, 0.02)' }
          ])
        },
        data: cumulativeData
      },
      {
        name: '当月燃烧速度',
        type: 'bar',
        yAxisIndex: 1,
        barMaxWidth: 26,
        itemStyle: {
          color: 'rgba(86, 160, 245, 0.55)',
          borderRadius: [4, 4, 0, 0]
        },
        emphasis: { itemStyle: { color: '#56a0f5' } },
        data: monthlyBurn
      }
    ]
  }, true);
}

function renderCharts(data) {
  if (typeof echarts === 'undefined') return;
  const { overview, toolStats, monthlyMap, modelStats } = data;
  const T = chartThemeColors();

  // ---- 1. 工具算力占比环形图 ----
  const donutEl = document.getElementById('chart-tools-donut');
  if (donutEl) {
    const donutChart = getChart('chart-tools-donut');
    const tools = Object.values(toolStats || {})
      .filter(t => (t.totalTokens || 0) > 0)
      .sort((a, b) => b.totalTokens - a.totalTokens);
    const grand = tools.reduce((s, t) => s + (t.totalTokens || 0), 0) || 0;

    if (tools.length === 0 || grand === 0) {
      renderEmptyChart(donutChart, '暂无工具消耗数据', T);
    } else {
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

      donutChart.setOption({
        tooltip: {
          trigger: 'item',
          confine: true,
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
          left: '34%',
          top: '44%',
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
  }

  // ---- 2. 多维特色互动图表 (六维全息战力罗盘 / 24h作息生物钟 / 模型旭日图 / 资产跃升) ----
  renderFeaturedChart(currentChartTab, data);

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
    const areaChart = getChart('chart-monthly-area');
    // 生成连续的月份轴：最近 12 个自然月，空置月份补 0，避免横轴断裂跳跃
    const monthKeys = Object.keys(monthlyMap || {});
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

    if (recent.length === 0 || vals.every(v => v === 0)) {
      renderEmptyChart(areaChart, '暂无月度消耗数据', T);
    } else {
      const maxVal = Math.max(...vals);
      areaChart.setOption({
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: T.tooltipBg,
          borderColor: 'rgba(148,163,184,0.2)',
          borderWidth: 1,
          padding: [8, 12],
          textStyle: { color: T.text },
          axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,122,26,0.08)' } },
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
              color: v === maxVal && v > 0 ? '#ff7a1a' : 'rgba(148, 163, 184, 0.3)'
            }
          })),
          emphasis: { itemStyle: { color: '#ff9d52' } }
        }]
      }, true);
    }
  }

  // 保证图表在首轮挂载与容器就绪后平滑贴合
  requestAnimationFrame(resizeAllCharts);
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

// 本地时区格式化 YYYY-MM-DD，替换 UTC 的 toISOString()，避免时区偏差导致日期错位一天
function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function renderPanoramicHeatmap(dailyMap, maxDay, tasksMap) {
  const grid = document.getElementById('heatmap-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const today = new Date();
  const dayCount = 52 * 7;

  // Build date list (oldest first) in local timezone
  const dateKeys = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dateKeys.push(formatLocalDate(d));
  }

  // Current streak: consecutive active days counting back from today (or yesterday if today is idle)
  const isActive = (key) => (dailyMap[key] || 0) > 0;
  let streak = 0;
  let cursor = dateKeys.length - 1;
  // allow streak to start today; if today idle, allow yesterday to still count
  if (!isActive(dateKeys[cursor]) && cursor > 0 && isActive(dateKeys[cursor - 1])) cursor = cursor - 1;
  while (cursor >= 0 && isActive(dateKeys[cursor])) { streak++; cursor--; }

  const streakSet = new Set(dateKeys.slice(dateKeys.length - 1 - streak + 1));

  for (let i = 0; i < dateKeys.length; i++) {
    const dateKey = dateKeys[i];
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
      ? `<span class="streak-flame"><svg class="ico"><use href="#i-flame"/></svg></span> 连续燃烧: <strong>${streak}</strong> 天 <span class="streak-lived">· 正在燃烧</span>`
      : `<span class="streak-flame"><svg class="ico"><use href="#i-flame"/></svg></span> 连续燃烧: - 天 <span class="streak-lived dim">· 今日留白,明日再战</span>`;
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
  const n = Number(num) || 0;
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
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
  ctx.fillStyle = isLight ? '#ea580c' : '#ff7a1a';
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

  const totalStr = (overview.grandTotal || 0).toLocaleString();
  const fontSize = totalStr.length > 15 ? 40 : totalStr.length > 12 ? 46 : 54;
  ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
  ctx.fillStyle = isLight ? '#0f172a' : '#ffffff';
  ctx.fillText(totalStr, 600, 225);

  ctx.font = 'bold 16px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#475569' : '#94a3b8';
  ctx.fillText('TOKENS · 超越全网 99.4% AI 结对开发者', 600, 260);

  // Divider line
  ctx.strokeStyle = isLight ? 'rgba(15, 23, 42, 0.08)' : 'rgba(255, 255, 255, 0.1)';
  ctx.beginPath(); ctx.moveTo(70, 290); ctx.lineTo(w - 70, 290); ctx.stroke();

  // Metrics Row (4 Cards)
  const metrics = [
    { label: 'Claude Code', val: formatShort(toolStats['Claude Code']?.totalTokens || 0), color: '#ea580c' },
    { label: '反重力 IDE', val: formatShort(toolStats['反重力 IDE']?.totalTokens || 0), color: isLight ? '#0284c7' : '#38bdf8' },
    { label: '华为码道云', val: formatShort(toolStats['华为码道云']?.totalTokens || 0), color: '#ef4444' },
    { label: 'Workbuddy', val: formatShort(toolStats['Workbuddy']?.totalTokens || 0), color: isLight ? '#4f46e5' : '#818cf8' }
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

  const postLines = (overview.estimatedLinesOfCode && overview.estimatedLinesOfCode < 500000)
    ? overview.estimatedLinesOfCode
    : Math.round((((overview.totalOutput && overview.totalOutput > 0) ? overview.totalOutput : Math.round(overview.grandTotal * 0.08))) / 120);
  const postHours = (overview.estimatedHoursSaved && overview.estimatedHoursSaved < 20000)
    ? overview.estimatedHoursSaved
    : Math.round(postLines / 80);

  ctx.font = '16px Noto Sans SC, sans-serif';
  ctx.fillStyle = isLight ? '#0f172a' : '#f8fafc';
  ctx.fillText(`• 等效编写代码：约 ${postLines.toLocaleString()} 行   • 节约人类工时：约 ${postHours.toLocaleString()} 小时   • 参战会话：${overview.sessionCount} 场`, 100, 532);

  // Footer Tagline & Author Attribution
  ctx.font = '13px JetBrains Mono, monospace';
  ctx.fillStyle = isLight ? '#64748b' : '#64748b';
  ctx.fillText('TokenBurn · https://github.com/yibeigen/tokenburn · Author: @yibeigen', 70, 615);

  ctx.textAlign = 'right';
  ctx.font = '12px Noto Sans SC, sans-serif';
  ctx.fillStyle = isLight ? '#94a3b8' : '#64748b';
  ctx.fillText('100% 本地离线解析 · 零数据上报 · MIT License', w - 70, 615);
  ctx.textAlign = 'left'; // reset

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

  // 战绩可视化多维矩阵 Tab 切换 (六维全息战力罗盘 / 24h作息生物钟 / 模型旭日图 / 资产跃升)
  const chartTabBtns = document.querySelectorAll('.chart-tab-btn');
  chartTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      chartTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartTab = btn.dataset.chartTab || 'radar';
      const targetData = window.currentStatsData || currentStats;
      if (targetData) {
        renderFeaturedChart(currentChartTab, targetData);
        const featuredChart = _echartsInstances['chart-featured-canvas'];
        if (featuredChart && !featuredChart.isDisposed()) {
          try { featuredChart.resize(); } catch (e) {}
        }
      }
    });
  });

  // 本地快照归档数据中心模态框
  const snapshotModal = document.getElementById('snapshot-modal');
  let currentSnapPaths = { file: '', dir: '' };

  async function updateSnapshotPathsInfo() {
    try {
      const res = await fetch('/api/open-data?action=info');
      if (res.ok) {
        const info = await res.json();
        if (info.path) currentSnapPaths.file = info.path;
        if (info.dir) currentSnapPaths.dir = info.dir;
        const fileInput = document.getElementById('snap-file-path-input');
        const dirInput = document.getElementById('snap-dir-path-input');
        if (fileInput && currentSnapPaths.file) fileInput.value = currentSnapPaths.file;
        if (dirInput && currentSnapPaths.dir) dirInput.value = currentSnapPaths.dir;
      }
    } catch {}
  }

  async function openSnapshotModal() {
    if (!snapshotModal) return;
    snapshotModal.classList.add('active');
    updateSnapshotPathsInfo();

    const codeBox = document.getElementById('snap-json-code-box');
    const sizeBadge = document.getElementById('snap-size-badge');

    try {
      const res = await fetch('/api/snapshot-data');
      if (res.ok) {
        const text = await res.text();
        const kb = (text.length / 1024).toFixed(1);
        if (sizeBadge) sizeBadge.innerText = `大小: ${kb} KB · 已格式化预览`;

        try {
          const parsed = JSON.parse(text);
          // Show a structured summary + first level preview
          const toolsWithData = Object.entries(parsed.toolStats || {})
            .filter(([, s]) => s.sessionCount > 0)
            .map(([name, s]) => `${name} (${s.sessionCount} 会话, ${(s.totalTokens || 0).toLocaleString()} tokens)`);

          const summary = {
            _summary: 'TokenBurn 本地战绩快照摘要',
            snapshotTime: parsed.meta?.snapshotTime || new Date().toISOString(),
            totalTokens: parsed.overview?.grandTotal || parsed.overview?.totalTokens || 0,
            activeToolCount: parsed.overview?.activeToolCount || toolsWithData.length,
            toolsWithData,
            rank: parsed.overview?.rank?.title || '未知段位'
          };
          if (codeBox) codeBox.textContent = JSON.stringify(summary, null, 2);
        } catch {
          if (codeBox) codeBox.textContent = text.slice(0, 3000);
        }
      } else {
        if (codeBox) codeBox.textContent = '// 本地快照数据暂未落盘，请稍后重试';
      }
    } catch (err) {
      if (codeBox) codeBox.textContent = `// 无法读取快照: ${err.message}`;
    }
  }

  function closeSnapshotModal() {
    if (snapshotModal) snapshotModal.classList.remove('active');
  }

  document.getElementById('btn-close-snapshot-modal')?.addEventListener('click', closeSnapshotModal);
  document.getElementById('btn-close-snapshot-modal-ok')?.addEventListener('click', closeSnapshotModal);
  snapshotModal?.addEventListener('click', (e) => {
    if (e.target === snapshotModal) closeSnapshotModal();
  });

  // 复制文件路径
  document.getElementById('btn-copy-snap-file-path')?.addEventListener('click', async () => {
    const val = document.getElementById('snap-file-path-input')?.value || currentSnapPaths.file || 'data/snapshot.json';
    try {
      await navigator.clipboard.writeText(val);
      showToast('✓ 归档文件路径已复制到剪贴板！');
    } catch {
      showToast(`路径: ${val}`);
    }
  });

  // 复制文件夹路径
  document.getElementById('btn-copy-snap-dir-path')?.addEventListener('click', async () => {
    const val = document.getElementById('snap-dir-path-input')?.value || currentSnapPaths.dir || 'data/';
    try {
      await navigator.clipboard.writeText(val);
      showToast('✓ 归档文件夹路径已复制到剪贴板！');
    } catch {
      showToast(`路径: ${val}`);
    }
  });

  // 弹窗卡片 1: 在浏览器新标签页全屏查看
  document.getElementById('btn-snap-card-open-tab')?.addEventListener('click', () => {
    window.open('/api/snapshot-data', '_blank');
  });

  // 弹窗卡片 3: 在系统资源管理器中打开
  document.getElementById('btn-snap-card-system-dir')?.addEventListener('click', async () => {
    try {
      showToast('正在尝试唤起系统资源管理器...');
      const res = await fetch('/api/open-data?action=dir');
      const data = await res.json();
      const openedPath = data.path || data.dir || currentSnapPaths.dir || 'data';
      showToast(`✓ 已执行打开指令！路径: ${openedPath}`);
    } catch {
      showToast('打开文件夹失败，请手动打开本地 data 文件夹');
    }
  });

  // 弹窗卡片 4: 复制完整 JSON
  document.getElementById('btn-snap-card-copy-json')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/snapshot-data');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      showToast('✓ 完整 snapshot.json 内容已全部复制到剪贴板！');
    } catch (e) {
      showToast('复制失败，请点击“在浏览器新标签页查看”后全选复制');
    }
  });

  // 顶部导航栏: 打开
  const btnOpenSnapFile = document.getElementById('btn-open-snap-file');
  if (btnOpenSnapFile) {
    btnOpenSnapFile.addEventListener('click', async (e) => {
      e.stopPropagation();
      // 在浏览器新标签页立即打开查看，同时后台尝试打开系统编辑器
      window.open('/api/snapshot-data', '_blank');
      try {
        const res = await fetch('/api/open-data?action=file');
        const data = await res.json();
        const targetPath = data.path || currentSnapPaths.file;
        if (targetPath && navigator.clipboard) {
          try { await navigator.clipboard.writeText(targetPath); } catch {}
        }
      } catch {}
      showToast(`已在新标签页打开预览！(路径已同步复制到剪贴板)`);
    });
  }

  // 顶部导航栏: 定位
  const btnOpenSnapDir = document.getElementById('btn-open-snap-dir');
  if (btnOpenSnapDir) {
    btnOpenSnapDir.addEventListener('click', async (e) => {
      e.stopPropagation();
      // 1. 立即弹出「本地归档数据中心」全能操作面板
      openSnapshotModal();
      // 2. 同时后台调用系统资源管理器打开
      try {
        const res = await fetch('/api/open-data?action=dir');
        const data = await res.json();
        const targetPath = data.path || data.dir || currentSnapPaths.dir;
        if (targetPath && navigator.clipboard) {
          try { await navigator.clipboard.writeText(targetPath); } catch {}
        }
      } catch {}
      showToast(`已为您打开归档中心面板，并已复制路径到剪贴板！`);
    });
  }

  // 点击快照胶囊打开归档数据中心面板
  const snapshotPill = document.getElementById('snapshot-pill');
  if (snapshotPill) {
    snapshotPill.style.cursor = 'pointer';
    snapshotPill.addEventListener('click', (e) => {
      if (e.target.closest('.pill-mini-btn')) return;
      openSnapshotModal();
    });
  }

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

  // ---------------- 作者、微信公众号与赞赏码弹窗交互 (21st.dev & Uiverse 现代便当盒 Tab 机制) ----------------
  const authorModal = document.getElementById('author-modal');
  const btnCloseAuthorModal = document.getElementById('btn-close-author-modal');
  const btnAuthorModalOk = document.getElementById('btn-author-modal-ok');
  const tabBtnWechat = document.getElementById('tab-btn-wechat');
  const tabBtnReward = document.getElementById('tab-btn-reward');
  const paneWechat = document.getElementById('pane-wechat');
  const paneReward = document.getElementById('pane-reward');
  const authorModalBody = document.querySelector('.author-modal-body');

  function switchAuthorTab(tabName) {
    if (tabName === 'reward' || tabName === 'qr-card-reward') {
      if (tabBtnReward) {
        tabBtnReward.classList.add('active');
        tabBtnReward.setAttribute('aria-selected', 'true');
      }
      if (tabBtnWechat) {
        tabBtnWechat.classList.remove('active');
        tabBtnWechat.setAttribute('aria-selected', 'false');
      }
      if (paneReward) paneReward.classList.add('active');
      if (paneWechat) paneWechat.classList.remove('active');
    } else {
      if (tabBtnWechat) {
        tabBtnWechat.classList.add('active');
        tabBtnWechat.setAttribute('aria-selected', 'true');
      }
      if (tabBtnReward) {
        tabBtnReward.classList.remove('active');
        tabBtnReward.setAttribute('aria-selected', 'false');
      }
      if (paneWechat) paneWechat.classList.add('active');
      if (paneReward) paneReward.classList.remove('active');
    }
    // 切换 Tab 时重置滚动位置到顶部
    if (authorModalBody) authorModalBody.scrollTop = 0;
  }

  if (tabBtnWechat) tabBtnWechat.addEventListener('click', () => switchAuthorTab('wechat'));
  if (tabBtnReward) tabBtnReward.addEventListener('click', () => switchAuthorTab('reward'));

  function openAuthorModal(targetTab = 'wechat') {
    if (!authorModal) return;
    switchAuthorTab(targetTab);
    authorModal.classList.add('active');
    // 强制重置滚动位置为 0，确保顶部作者头像、名称和介绍 100% 完整呈现
    requestAnimationFrame(() => {
      if (authorModalBody) authorModalBody.scrollTop = 0;
    });
  }

  function closeAuthorModal() {
    if (authorModal) authorModal.classList.remove('active');
  }

  const headerAuthorBtn = document.getElementById('header-author-btn');
  if (headerAuthorBtn) headerAuthorBtn.addEventListener('click', () => openAuthorModal('wechat'));

  const btnOpenAuthorModal = document.getElementById('btn-open-author-modal');
  if (btnOpenAuthorModal) btnOpenAuthorModal.addEventListener('click', () => openAuthorModal('wechat'));

  const btnHeroWechat = document.getElementById('btn-hero-wechat');
  if (btnHeroWechat) btnHeroWechat.addEventListener('click', () => openAuthorModal('wechat'));

  const btnHeroReward = document.getElementById('btn-hero-reward');
  if (btnHeroReward) btnHeroReward.addEventListener('click', () => openAuthorModal('reward'));

  const footerAuthorBadge = document.getElementById('footer-author-badge');
  if (footerAuthorBadge) footerAuthorBadge.addEventListener('click', () => openAuthorModal('wechat'));

  const btnFooterWechat = document.getElementById('btn-footer-wechat');
  if (btnFooterWechat) btnFooterWechat.addEventListener('click', () => openAuthorModal('wechat'));

  const btnFooterReward = document.getElementById('btn-footer-reward');
  if (btnFooterReward) btnFooterReward.addEventListener('click', () => openAuthorModal('reward'));

  if (btnCloseAuthorModal) btnCloseAuthorModal.addEventListener('click', closeAuthorModal);
  if (btnAuthorModalOk) btnAuthorModalOk.addEventListener('click', closeAuthorModal);

  // 点击遮罩层背景关闭
  if (authorModal) {
    authorModal.addEventListener('click', (e) => {
      if (e.target === authorModal) closeAuthorModal();
    });
  }

  // ---------------- 战力推导公式透明弹窗 (Formula Modal) ----------------
  const formulaModal = document.getElementById('formula-modal');
  const btnCloseFormula = document.getElementById('btn-close-formula');
  const btnFormulaModalOk = document.getElementById('btn-formula-modal-ok');
  const btnShowFormula = document.getElementById('btn-show-formula');
  const btnInfoCost = document.getElementById('btn-info-cost');
  const prodFormulaNote = document.getElementById('prod-formula-note');

  function openFormulaModal() {
    if (formulaModal) formulaModal.classList.add('active');
  }

  function closeFormulaModal() {
    if (formulaModal) formulaModal.classList.remove('active');
  }

  if (btnShowFormula) btnShowFormula.addEventListener('click', openFormulaModal);
  if (btnInfoCost) btnInfoCost.addEventListener('click', openFormulaModal);
  if (prodFormulaNote) prodFormulaNote.addEventListener('click', openFormulaModal);
  if (btnCloseFormula) btnCloseFormula.addEventListener('click', closeFormulaModal);
  if (btnFormulaModalOk) btnFormulaModalOk.addEventListener('click', closeFormulaModal);

  if (formulaModal) {
    formulaModal.addEventListener('click', (e) => {
      if (e.target === formulaModal) closeFormulaModal();
    });
  }

  // ---------------- 全局图片放大预览器 (Lightbox 扫码与高清大图) ----------------
  const lightboxModal = document.getElementById('image-lightbox-modal');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxImgFrame = document.getElementById('lightbox-img-frame');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxSubtitle = document.getElementById('lightbox-subtitle');
  const lightboxBadge = document.getElementById('lightbox-badge');
  const lightboxIcon = document.getElementById('lightbox-icon');
  const lightboxRawLink = document.getElementById('btn-lightbox-raw');
  const btnCloseLightbox = document.getElementById('btn-close-lightbox');
  const btnLightboxOk = document.getElementById('btn-lightbox-ok');

  function openImageLightbox({ src, title = '图片高清放大预览', subtitle = '手机对准屏幕即可直接扫码识别 · 单击任意处或按 Esc 关闭', badge = '手机微信扫一扫即可识别', icon = 'i-search', isAvatar = false }) {
    if (!lightboxModal || !lightboxImg) return;
    lightboxImg.src = src;
    lightboxImg.alt = title;
    if (lightboxTitle) lightboxTitle.innerText = title;
    if (lightboxSubtitle) lightboxSubtitle.innerText = subtitle;
    if (lightboxBadge) lightboxBadge.innerText = badge;
    if (lightboxIcon) lightboxIcon.innerHTML = `<svg class="ico"><use href="#${icon}"/></svg>`;
    if (lightboxRawLink) {
      lightboxRawLink.href = src;
      lightboxRawLink.title = `在新标签页打开 ${title}`;
    }

    if (isAvatar) {
      lightboxImg.classList.add('avatar-type');
      if (lightboxImgFrame) lightboxImgFrame.classList.add('avatar-frame');
    } else {
      lightboxImg.classList.remove('avatar-type');
      if (lightboxImgFrame) lightboxImgFrame.classList.remove('avatar-frame');
    }

    lightboxModal.classList.add('active');
    lightboxModal.setAttribute('aria-hidden', 'false');
  }

  function closeImageLightbox() {
    if (!lightboxModal) return;
    lightboxModal.classList.remove('active');
    lightboxModal.setAttribute('aria-hidden', 'true');
  }

  if (btnCloseLightbox) btnCloseLightbox.addEventListener('click', closeImageLightbox);
  if (btnLightboxOk) btnLightboxOk.addEventListener('click', closeImageLightbox);
  if (lightboxImgFrame) lightboxImgFrame.addEventListener('click', closeImageLightbox);

  // 点击遮罩空白区域关闭大图预览
  if (lightboxModal) {
    lightboxModal.addEventListener('click', (e) => {
      if (e.target === lightboxModal) {
        closeImageLightbox();
      }
    });
  }

  // 监听并绑定所有可放大元素（二维码卡片、二维码图片、头像等）
  function setupZoomableImages() {
    const zoomElements = document.querySelectorAll('.zoomable-qr-box, .zoomable-avatar-box, .zoomable-img, [data-zoom-src]');
    zoomElements.forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // 阻止事件冒泡，避免关闭父级弹窗
        const src = el.dataset.zoomSrc || el.getAttribute('src') || el.querySelector('img')?.getAttribute('src');
        if (!src) return;
        const title = el.dataset.zoomTitle || el.getAttribute('alt') || '图片高清放大预览';
        const subtitle = el.dataset.zoomSub || '手机对准屏幕即可直接扫码识别 · 单击任意处或按 Esc 关闭';
        const badge = el.dataset.zoomBadge || '手机微信扫一扫即可识别';
        const icon = el.dataset.zoomIcon || 'i-search';
        const isAvatar = el.dataset.zoomType === 'avatar' || src.includes('avatar');
        openImageLightbox({ src, title, subtitle, badge, icon, isAvatar });
      });
    });
  }
  setupZoomableImages();

  // ESC 键关闭所有弹窗（大图优先关闭，不影响底层作者弹窗）
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (lightboxModal && lightboxModal.classList.contains('active')) {
        closeImageLightbox();
        return; // 仅关闭大图，保留底层弹窗
      }
      closeAuthorModal();
      closeFormulaModal();
      const posterModal = document.getElementById('poster-modal');
      if (posterModal) posterModal.classList.remove('active');
      const snapModal = document.getElementById('snapshot-modal');
      if (snapModal) snapModal.classList.remove('active');
    }
  });
});

