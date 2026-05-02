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

export type StatuslineMode = "minimal" | "normal" | "detailed";

export function renderStatusline(
  result: CompareResult,
  mode: StatuslineMode = "normal",
): string {
  const before = result.before;
  const after = result.after;

  if (before.sessionsCount === 0 && after.sessionsCount === 0) {
    return mode === "minimal" ? "⚪" : "⚪ no data";
  }
  if (before.sessionsCount === 0) {
    return mode === "minimal" ? "⚪" : "⚪ new";
  }

  const pct = result.delta.costUsdPct;
  const emoji = pct < -10 ? "💚" : pct > 10 ? "🚨" : "💛";

  if (mode === "minimal") {
    return emoji;
  }

  if (mode === "detailed") {
    const savings = -result.delta.costUsd;
    const savingsAbs = Math.abs(savings).toFixed(0);
    const direction = savings > 0 ? "saved" : "over";
    return `${emoji} ${formatPct(pct)} vs last month | $${savingsAbs} ${direction}`;
  }

  return `${emoji} ${formatPct(pct)}`;
}

function formatPct(pct: number): string {
  const rounded = Math.round(pct);
  if (rounded === 0) return "0%";
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded}%`;
}
