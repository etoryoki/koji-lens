import type { CompareResult } from "./compare.js";

export interface MonthRanges {
  thisMonth: { from: Date; to: Date };
  lastMonth: { from: Date; to: Date };
}

export function computeMonthRanges(now: Date = new Date()): MonthRanges {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const thisMonthStart = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const thisMonthEnd = now;

  const lastMonthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const lastMonthEnd = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0) - 1);

  return {
    thisMonth: { from: thisMonthStart, to: thisMonthEnd },
    lastMonth: { from: lastMonthStart, to: lastMonthEnd },
  };
}

export function renderStatusline(result: CompareResult): string {
  const before = result.before;
  const after = result.after;

  if (before.sessionsCount === 0 && after.sessionsCount === 0) {
    return "⚪ no data yet";
  }
  if (before.sessionsCount === 0) {
    return `⚪ new | 💰 $${after.totalCostUsd.toFixed(0)} this month`;
  }

  const pct = result.delta.costUsdPct;
  const savings = -result.delta.costUsd;

  const status =
    pct < -10 ? "💚 on track" : pct > 10 ? "🚨 over budget" : "💛 watch";

  const trendIcon = pct < -1 ? "📉" : pct > 1 ? "📈" : "➖";
  const trendText = `${trendIcon} ${formatPct(pct)} vs last month`;

  const savingsAbs = Math.abs(savings).toFixed(0);
  const savingsText =
    savings > 0 ? `🎯 $${savingsAbs} saved` : `💸 $${savingsAbs} over`;

  const sonnetText = computeSonnetShift(result);
  const middleText = sonnetText ? `${savingsText} (${sonnetText})` : savingsText;

  return `${trendText} | ${middleText} | ${status}`;
}

function formatPct(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}%`;
}

function computeSonnetShift(result: CompareResult): string | null {
  const beforeSonnet = sumByModelMatch(result.before.costByModel, "sonnet");
  const afterSonnet = sumByModelMatch(result.after.costByModel, "sonnet");

  const beforeRatio =
    result.before.totalCostUsd > 0
      ? (beforeSonnet / result.before.totalCostUsd) * 100
      : 0;
  const afterRatio =
    result.after.totalCostUsd > 0
      ? (afterSonnet / result.after.totalCostUsd) * 100
      : 0;

  if (Math.abs(afterRatio - beforeRatio) < 5) return null;

  return `Sonnet ${Math.round(afterRatio)}%, was ${Math.round(beforeRatio)}%`;
}

function sumByModelMatch(
  costByModel: Record<string, number>,
  keyword: string,
): number {
  let sum = 0;
  for (const [model, cost] of Object.entries(costByModel)) {
    if (model.toLowerCase().includes(keyword)) {
      sum += cost;
    }
  }
  return sum;
}
