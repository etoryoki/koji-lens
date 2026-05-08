import type { CacheRateResult } from "./cache-rate.js";
import type { CompareResult } from "./compare.js";
import {
  computeBuddyLevel,
  computeBuddyState,
  renderBuddyDecoration,
  renderBuddySaying,
  type BuddyType,
} from "./buddy.js";
import type { AgentState } from "./state.js";

export interface RenderOptions {
  stateIcon?: string | null;
  cacheRate?: CacheRateResult | null;
  buddy?: {
    enabled: boolean;
    type?: BuddyType;
    speech?: boolean;
    agentState?: AgentState | null;
  };
}

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
  options: RenderOptions = {},
): string {
  const base = renderSpendSignal(result, mode);
  const cacheSuffix = renderCacheSuffix(options.cacheRate, mode);
  const stateIcon = options.stateIcon;
  const buddySuffix = renderBuddySuffix(result, options);

  const spendAndCache = cacheSuffix ? `${base}${cacheSuffix}` : base;
  const withState = stateIcon ? `${stateIcon} ${spendAndCache}` : spendAndCache;
  return buddySuffix ? `${withState} ${buddySuffix}` : withState;
}

function renderBuddySuffix(
  result: CompareResult,
  options: RenderOptions,
): string {
  const buddy = options.buddy;
  if (!buddy || !buddy.enabled) return "";
  const type: BuddyType = buddy.type ?? "koji";
  const state = computeBuddyState(result, buddy.agentState ?? null);
  const level = computeBuddyLevel(result.after.sessionsCount);
  const decoration = renderBuddyDecoration(state, level, type);
  if (buddy.speech) {
    const saying = renderBuddySaying(state, level, type);
    return `${decoration} <${saying}`;
  }
  return decoration;
}

function renderCacheSuffix(
  cacheRate: CacheRateResult | null | undefined,
  mode: StatuslineMode,
): string {
  if (!cacheRate) return "";
  const rate = Math.round(cacheRate.rate);
  const icon = rate >= 70 ? "💎" : rate >= 30 ? "🧊" : "💧";
  switch (mode) {
    case "minimal":
      return ` ${icon}`;
    case "detailed":
      return ` | ${icon} ${rate}% cache`;
    case "normal":
    default:
      return ` ${icon} ${rate}%`;
  }
}

function renderSpendSignal(
  result: CompareResult,
  mode: StatuslineMode,
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
