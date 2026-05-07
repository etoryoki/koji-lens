import type { AgentState } from "./state.js";
import type { CompareResult } from "./compare.js";

// 起案 v0.4 §1 装飾アイコン (全 Lv 固定 3cells、refreshInterval 1 秒のガタつき完全解消)
// ASCII 寄り文字採用 (深町 Warning 3 対処、cross-platform 安定)
const DECORATIONS: Record<BuddyLevel, string> = {
  1: "·",
  2: "+",
  3: "✦",
  4: "★",
  5: "★★",
};

// 起案 v0.4 §8 種類 (Phase α は麹のみ、フクロウ + 猫は Phase β)
export type BuddyType = "koji" | "owl" | "cat";

const BUDDY_ICONS: Record<BuddyType, string> = {
  koji: "🍙",
  owl: "🦉",
  cat: "🐈",
};

// 起案 v0.4 §9 5 状態 (健康/過食/休息/主人待ち/病気)
export type BuddyState =
  | "healthy"
  | "overfed"
  | "resting"
  | "awaiting"
  | "sick";

// レベル 1-5 (累計セッション数ベース)
export type BuddyLevel = 1 | 2 | 3 | 4 | 5;

// 起案 v0.4 §9 麹 25 セリフ完全品質版 (白川起案 + CEO 採用)
const SAYINGS_KOJI: Record<BuddyState, Record<BuddyLevel, string>> = {
  healthy: {
    1: "いい発酵中…",
    2: "順調…",
    3: "いい味出てきた…",
    4: "深みが出てきた…",
    5: "丁寧に育てていますね…ゆっくりでいい…",
  },
  overfed: {
    1: "ちょっと熟しすぎ…?",
    2: "使いすぎかも…",
    3: "ペース調整を…",
    4: "酸味出てる…注意…",
    5: "腐敗と熟成は紙一重…気をつけて…",
  },
  resting: {
    1: "ふんわり…zzz",
    2: "休んでます…",
    3: "静かに発酵中…",
    4: "眠りも仕事…",
    5: "休むことも発酵のうち…ね…",
  },
  awaiting: {
    1: "ぽつぽつ…?",
    2: "待機中…",
    3: "ご判断を…",
    4: "準備整いました…",
    5: "待てます…発酵は急かせないので…",
  },
  sick: {
    1: "腐敗注意…",
    2: "危険信号…",
    3: "対応必要…",
    4: "分解進行中…",
    5: "分解が始まってます…でも、再生できます…",
  },
};

// 累計セッション数 → Lv 換算 (起案 v0.4 暗黙設計、Phase α MVP 閾値)
export function computeBuddyLevel(totalSessionsCount: number): BuddyLevel {
  if (totalSessionsCount >= 1000) return 5;
  if (totalSessionsCount >= 300) return 4;
  if (totalSessionsCount >= 100) return 3;
  if (totalSessionsCount >= 30) return 2;
  return 1;
}

// CompareResult + AgentState → BuddyState 算出
// 起案 v0.4 §9 状態定義: 健康 (順調) / 過食 (cost 急増) / 休息 (idle) / 主人待ち (awaiting_approval) / 病気 (cost 異常)
export function computeBuddyState(
  result: CompareResult,
  agentState: AgentState | null,
): BuddyState {
  if (agentState === "awaiting_approval") return "awaiting";
  if (agentState === "idle") return "resting";

  const pct = result.delta.costUsdPct;
  if (pct >= 50) return "sick";
  if (pct >= 20) return "overfed";
  if (result.before.sessionsCount === 0 && result.after.sessionsCount === 0) {
    return "resting";
  }
  return "healthy";
}

export interface BuddyRender {
  decoration: string;
  saying: string;
  level: BuddyLevel;
  state: BuddyState;
}

export function renderBuddy(
  state: BuddyState,
  level: BuddyLevel,
  type: BuddyType = "koji",
): BuddyRender {
  const icon = BUDDY_ICONS[type];
  const decoration = `${icon}${DECORATIONS[level]}`;
  // Phase α は麹のみ実装、フクロウ + 猫は "Coming soon" フォールバック
  const saying = type === "koji" ? SAYINGS_KOJI[state][level] : "(Coming soon)";
  return { decoration, saying, level, state };
}

// 起案 v0.4 §3 楽しさ別チャネル化 (statusline は装飾のみ、--buddy-speech で発言 opt-in)
export function renderBuddyDecoration(
  state: BuddyState,
  level: BuddyLevel,
  type: BuddyType = "koji",
): string {
  return renderBuddy(state, level, type).decoration;
}

export function renderBuddySaying(
  state: BuddyState,
  level: BuddyLevel,
  type: BuddyType = "koji",
): string {
  return renderBuddy(state, level, type).saying;
}
