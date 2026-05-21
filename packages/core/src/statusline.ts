import type { BudgetAlert } from "./budget.js";
import type { CacheRateResult } from "./cache-rate.js";
import type { CompareResult } from "./compare.js";
import type { BillingMode } from "./config.js";
import { DEFAULT_BILLING_MODE } from "./config.js";
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
  // 2026-05-21 (オーナー指摘採用): billing mode 軸でユーザー視点反転
  // - subscription (default、Pro/Max ユーザー想定多数派): 使い込み = 元取れている = 💚
  // - api (opt-in、API key ユーザー少数派): コスト増 = 痛い = 🚨 cost up
  // undefined で DEFAULT_BILLING_MODE ("subscription") 採用
  billingMode?: BillingMode;
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

  // 2026-05-17 白川 Designer Critical 1 採用: cost group | audit group 二ブロック構造
  // 修正前: state → budget → audit → spend+cache → buddy = 絵文字連続 (🔥 ⚠) で区別不能
  // 修正後: state → budget → spend+cache → │ → audit → buddy = 文脈別グルーピング
  const costGroup: string[] = [];
  const auditGroup: string[] = [];

  if (stateVisible && options.stateIcon) {
    costGroup.push(options.stateIcon);
  }

  // 予算アラート (cost 軸 = cost group): warning 80%+ = 💸 / critical 100%+ = 🔥
  const budgetAlertText = renderBudgetAlertSuffix(options.budgetAlert);
  if (budgetAlertText) {
    costGroup.push(budgetAlertText);
  }

  if (spendVisible) {
    const base = renderSpendSignal(result, mode, options.billingMode);
    const cacheSuffix = cacheVisible
      ? renderCacheSuffix(options.cacheRate, mode)
      : "";
    costGroup.push(cacheSuffix ? `${base}${cacheSuffix}` : base);
  } else if (cacheVisible) {
    // spend 非表示でも cache rate のみ表示は妥当
    const cacheSuffix = renderCacheSuffix(options.cacheRate, mode);
    if (cacheSuffix) {
      // " 💎 78%" の先頭スペース除去
      costGroup.push(cacheSuffix.startsWith(" ") ? cacheSuffix.slice(1) : cacheSuffix);
    }
  }

  // audit 異常検知 signal (security 軸 = audit group): critical = 🛡 / warning = ⚠
  const auditText = renderAuditSignalSuffix(options.auditSignal);
  if (auditText) {
    auditGroup.push(auditText);
  }

  // 2 ブロック結合 (audit 表示時のみ │ セパレータ insert)
  const parts: string[] = [];
  if (costGroup.length > 0) {
    parts.push(costGroup.join(" "));
  }
  if (auditGroup.length > 0) {
    parts.push(auditGroup.join(" "));
  }
  let result_str = parts.join(" │ ");

  if (buddySuffix) {
    result_str = result_str ? `${result_str} ${buddySuffix}` : buddySuffix;
  }

  return result_str;
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
      // v0.2 (2026-05-21 本実装、白川 採用): ccusage 差別化セパレータ │ 統一
      return ` │ ${icon} ${rate}% cache`;
    case "normal":
    default:
      return ` ${icon} ${rate}%`;
  }
}

function renderSpendSignal(
  result: CompareResult,
  mode: StatuslineMode,
  billingMode: BillingMode = DEFAULT_BILLING_MODE,
): string {
  const before = result.before;
  const after = result.after;

  if (before.sessionsCount === 0 && after.sessionsCount === 0) {
    return mode === "minimal" ? "⚪" : "⚪ no data";
  }
  if (before.sessionsCount === 0) {
    if (mode === "minimal") return "⚪";
    // v0.2 (2026-05-21 本実装、白川 Warning 9 採用): 月初 1-3 日に日数ヒント付与
    const dayHint = after.dayCount <= 3 ? ` (${after.dayCount}d)` : "";
    return `⚪ new${dayHint}`;
  }

  const pct = result.delta.costUsdPct;
  const afterCostUsd = after.totalCostUsd ?? 0;

  // 2026-05-21 (オーナー指摘採用): billing mode 軸でユーザー視点反転
  // - subscription mode (default、Pro/Max ユーザー想定多数派): 使い込み = 元取れている
  //   pct > +10% かつ $10 以上 = 💚 (sub value up = フラット fee 元取れている = 多く使えている)
  //   pct < -10% = 💧 (under-utilized = サブスク使い込み不足 = もったいない)
  //   それ以外 = 💛 (watch)
  // - api mode (opt-in、API key ユーザー少数派、v0.2 整合):
  //   pct < -10% = 💚 (saved = コスト削減成功)
  //   pct > +10% かつ $10 以上 = 🚨 (cost up = コスト増警戒)
  //   それ以外 = 💛 (watch)
  let emoji: string;
  let detailedSuffix: string;
  let usageDirection: string; // detailed mode の文言: "more usage" or "less usage" or "saved" or "over"
  if (billingMode === "subscription") {
    const isHighUsageUp = pct > 10 && afterCostUsd >= 10;
    const isUnderUtilized = pct < -10;
    emoji = isHighUsageUp ? "💚" : isUnderUtilized ? "💧" : "💛";
    detailedSuffix = isHighUsageUp ? " │ sub value up" : isUnderUtilized ? " │ under-utilized" : "";
    usageDirection = pct > 0 ? "more usage" : "less usage";
  } else {
    const isHighCostUp = pct > 10 && afterCostUsd >= 10;
    emoji = pct < -10 ? "💚" : isHighCostUp ? "🚨" : "💛";
    detailedSuffix = isHighCostUp ? " │ cost up" : "";
    usageDirection = pct > 0 ? "over" : "saved";
  }

  if (mode === "minimal") {
    return emoji;
  }

  if (mode === "detailed") {
    const usageAbs = Math.abs(result.delta.costUsd).toFixed(0);
    return `${emoji} ${formatPct(pct)} vs last month │ $${usageAbs} ${usageDirection}${detailedSuffix}`;
  }

  return `${emoji} ${formatPct(pct)}`;
}

function formatPct(pct: number): string {
  const rounded = Math.round(pct);
  if (rounded === 0) return "0%";
  // v0.2 (2026-05-21 本実装、白川 Warning 8 採用): `+82%`/`-82%` → `↑82%`/`↓82%`
  // (down arrow で削減方向明示、up arrow でコスト増加方向明示、ccusage 差別化 + 読み方向直感的)
  const arrow = rounded > 0 ? "↑" : "↓";
  return `${arrow}${Math.abs(rounded)}%`;
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
