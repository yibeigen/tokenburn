/**
 * TokenBurn 核心数据模型与战力段位规范
 */

export const RANKS = [
  { min: 100_000_000_000, title: "奇点执政架构师", enTitle: "Singularity Consul // E-11", badge: "E11", color: "#0f172a", desc: "千亿级极值算力主宰，自主智能体集群全面覆盖。" },
  { min: 50_000_000_000,  title: "星系级算力总督", enTitle: "Galactic Governor // E-10", badge: "E10", color: "#0f172a", desc: "五百亿级超大规模工程，工业代码吞吐达人类巅峰。" },
  { min: 10_000_000_000,  title: "超算集群总工程师", enTitle: "Hyperscale Director // E-9", badge: "E9", color: "#0f172a", desc: "百亿级算力巨型系统总控，多机协同生成全自动运转。" },
  { min: 2_000_000_000,   title: "资深首席架构师", enTitle: "Distinguished Fellow // E-8", badge: "E8", color: "#0f172a", desc: "二十亿级工业吞吐，开辟全自动多智能体研发生态。" },
  { min: 500_000_000,     title: "首席工程架构师", enTitle: "Chief Architect // E-7", badge: "E7", color: "#0f172a", desc: "全域智能体工程集群总控，算力吞吐突破 5 亿大关。" },
  { min: 100_000_000,     title: "资深主任架构师", enTitle: "Principal Engineer // E-6", badge: "E6", color: "#1e293b", desc: "亿级工业级代码吞吐主力，复杂系统自主生成枢纽。" },
  { min: 50_000_000,      title: "核心参谋工程师", enTitle: "Staff Engineer // E-5", badge: "E5", color: "#334155", desc: "多智能体协同常态化推进，单兵研发效能极限发挥。" },
  { min: 10_000_000,      title: "高级系统工程师", enTitle: "Senior Engineer // E-4", badge: "E4", color: "#059669", desc: "千万级实战任务密集推进，AI 辅助编码实现深度闭环。" },
  { min: 1_000_000,       title: "专职研发工程师", enTitle: "Development Engineer // E-3", badge: "E3", color: "#0284c7", desc: "跨越百万级工程量门槛，日常全场景 AI 原生交付。" },
  { min: 100_000,         title: "初阶工程专家", enTitle: "Associate Engineer // E-2", badge: "E2", color: "#64748b", desc: "人机协同流水线已规范成型，高质量推进交付。" },
  { min: 0,               title: "工程探索成员", enTitle: "Engineering Fellow // E-1", badge: "E1", color: "#94a3b8", desc: "工程化协作已起步，正在构建自动化生产流程。" }
];

export function getRankInfo(totalTokens) {
  for (const rank of RANKS) {
    if (totalTokens >= rank.min) {
      return rank;
    }
  }
  return RANKS[RANKS.length - 1];
}

export const TOOL_COLORS = {
  "Claude Code": "#f97316",
  "华为码道云": "#ef4444",
  "Workbuddy": "#06b6d4",
  "反重力 IDE": "#8b5cf6",
  "Trae": "#10b981",
  "Codex": "#3b82f6",
  "Cursor": "#eab308",
  "Other": "#94a3b8"
};
