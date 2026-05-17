import type { BudgetAlert } from "./budget.js";
import type { CacheRateResult } from "./cache-rate.js";
import type { CompareResult } from "./compare.js";
import {
  computeBuddyLevel,
  computeBuddyState,
  renderBuddyDecoration,
  renderBuddySaying,
  type BuddyLocale,
  type BuddyType,
} from "./buddy.js";
import type { AgentState } from "./state.js";
import type { AuditAnomalySignal } from "./audit.js";

export interface RenderOptions {
  stateIcon?: string | null;
  cacheRate?: CacheRateResult | null;
  buddy?: {
    enabled: boolean;
    type?: BuddyType;
    speech?: boolean;
    locale?: BuddyLocale;
    agentState?: AgentState | null;
  };
  // v0.7 (2026-05-08): false で spend signal (💚/💛/🚨/⚪) を非表示
  // --no-spend フラグ + --buddy-only mode 両方で利用
  spendVisible?: boolean;
  // 2026-05-14 (深町 W2 採用): 予算アラート表示 (Free 開放、「気付き = Free」原則整合)
  // warning (80%+) = 💸 / critical (100%+) = 🔥、null/undefined で非表示
  budgetAlert?: BudgetAlert | null;
  // 2026-05-16 案 E 段階 6: audit 異常検知 signal
  // warning = ⚠ (新規 MCP / 高頻度 exec) / critical = 🛡 (機密ファイル書き込み)
  // null/undefined or severity=ok で非表示
  auditSignal?: AuditAnomalySignal | null;
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
  const buddySuffix = renderBuddySuffix(result, options);

  // v0.7 (2026-05-08): per-signal 表示制御
  // --no-spend / --no-cache-rate / --no-state は CLI 側で個別 opt-out
  // --buddy-only は CLI 側で 3 つすべて opt-out + buddy 強制有効の shortcut
  const spendVisible = options.spendVisible !== false; // default: true
  const cacheVisible = options.cacheRate != null; // null/undefined で非表示
  const stateVisible = options.stateIcon != null;

  const parts: string[] = [];

  if (stateVisible && options.stateIcon) {
    parts.push(options.stateIcon);
  }

  // 2026-05-14 (深町 W2 採用): 予算アラート表示を state icon と spend signal の間に配置
  // 警告系の視認順 (緊急度高い側を左に集約)、Free 開放で「気付き = Free」整合
  const budgetAlertText = renderBudgetAlertSuffix(options.budgetAlert);
  if (budgetAlertText) {
    parts.push(budgetAlertText);
  }

  // 2026-05-16 案 E 段階 6: audit 異常検知 signal を予算アラートと spend の間に配置
  // critical (機密ファイル書き込み) = 🛡 / warning (新規 MCP / 高頻度 exec) = ⚠
  const auditText = renderAuditSignalSuffix(options.auditSignal);
  if (auditText) {
    parts.push(auditText);
  }

  if (spendVisible) {
    const base = renderSpendSignal(result, mode);
    const cacheSuffix = cacheVisible
      ? renderCacheSuffix(options.cacheRate, mode)
      : "";
    parts.push(cacheSuffix ? `${base}${cacheSuffix}` : base);
  } else if (cacheVisible) {
    // spend 非表示でも cache rate のみ表示は妥当
    const cacheSuffix = renderCacheSuffix(options.cacheRate, mode);
    if (cacheSuffix) {
      // " 💎 78%" の先頭スペース除去
      parts.push(cacheSuffix.startsWith(" ") ? cacheSuffix.slice(1) : cacheSuffix);
    }
  }

  if (buddySuffix) {
    parts.push(buddySuffix);
  }

  return parts.join(" ");
}

function renderBuddySuffix(
  result: CompareResult,
  options: RenderOptions,
): string {
  const buddy = options.buddy;
  if (!buddy || !buddy.enabled) return "";
  const type: BuddyType = buddy.type ?? "koji";
  const locale: BuddyLocale = buddy.locale ?? "ja";
  const state = computeBuddyState(result, buddy.agentState ?? null);
  const level = computeBuddyLevel(result.after.sessionsCount);
  const decoration = renderBuddyDecoration(state, level, type);
  if (buddy.speech) {
    const saying = renderBuddySaying(state, level, type, locale);
    return `${decoration} < ${saying}`;
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

// 2026-05-14 (深町 W2 採用): 予算アラート表示 (Free 開放、最大 ROI 機能)
// warning (80%+ forecast) = 💸 / critical (100%+ current or forecast) = 🔥
// spend signal の 🚨 (cost trend 軸) と区別、budget context (vs 月次予算) 専用
function renderBudgetAlertSuffix(
  alert: BudgetAlert | null | undefined,
): string {
  if (!alert) return "";
  const icon = alert.level === "critical" ? "🔥" : "💸";
  const pct = Math.round(alert.utilizationPct);
  return `${icon} ${pct}%`;
}

// 2026-05-16 案 E 段階 6: audit 異常検知 signal レンダリング
// critical (機密ファイル書き込み) = 🛡 / warning (新規 MCP / 高頻度 exec) = ⚠
// severity=ok or null/undefined で空文字 (non-display)
// 2026-05-17 案 B 候補 4-c: severity 別 detail 表示改善 (深町 + 桐谷諮問結果採用)
//   critical = 🛡 sensitive=N (N 件の機密ファイル書き込み検出)
//   warning = ⚠ +Nmcp/exec N (具体パターン名明示) or ⚠ (詳細なし fallback)
function renderAuditSignalSuffix(
  signal: AuditAnomalySignal | null | undefined,
): string {
  if (!signal || signal.severity === "ok") return "";
  if (signal.severity === "critical") {
    const n = signal.sensitiveWrites.length;
    return n > 0 ? `🛡 sensitive=${n}` : `🛡`;
  }
  // warning
  const parts: string[] = [];
  if (signal.newMcpServers.length > 0) {
    parts.push(`+${signal.newMcpServers.length}mcp`);
  }
  if (signal.highFreqExec) {
    parts.push(`exec=${signal.execCount}`);
  }
  return parts.length > 0 ? `⚠ ${parts.join(" ")}` : "⚠";
}
