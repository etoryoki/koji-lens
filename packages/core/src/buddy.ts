import type { AgentState } from "./state.js";
import type { CompareResult } from "./compare.js";

// 起案 v0.4 §1 装飾アイコン (refreshInterval 1 秒のガタつき抑制)
// ASCII 寄り文字採用 (深町 Warning 3 対処、cross-platform 安定)
// v0.6 (2026-05-08): Lv6-10 拡張、麹発酵深化モチーフ、3 年級で Max
const DECORATIONS: Record<BuddyLevel, string> = {
  1: "·",
  2: "+",
  3: "✦",
  4: "★",
  5: "★★",
  6: "★★★",
  7: "❀",
  8: "✿",
  9: "❋",
  10: "❀❀",
};

// 起案 v0.4 §8 種類 (Phase α は麹のみ、フクロウ + 猫は Phase β)
export type BuddyType = "koji" | "owl" | "cat";

// v0.7 (2026-05-08) ロケール (default ja、HN 英語ユーザーは --buddy-locale en で切替)
export type BuddyLocale = "ja" | "en";

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

// レベル 1-10 (累計セッション数ベース、v0.6 で 5→10 拡張、3 年級で Max)
export type BuddyLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// 起案 v0.4 §9 麹 25 セリフ完全品質版 (白川 v0.1 採用 + CEO 採用)
// v0.6 (2026-05-08): Lv6-10 セリフ追加で 50 セリフ化、CEO 単独起案
// v0.7 (2026-05-08): ja → ja + en 二言語化、SAYINGS_KOJI_JA に rename + SAYINGS_KOJI_EN 新規
// (白川 Designer Critical 1+2 採用済 + Warning + Nit + EN セリフ peer review は v0.7.1 反映)
const SAYINGS_KOJI_JA: Record<BuddyState, Record<BuddyLevel, string>> = {
  healthy: {
    1: "いい発酵中…",
    2: "順調…",
    3: "いい味出てきた…",
    4: "深みが出てきた…",
    5: "丁寧に育てていますね…ゆっくりでいい…",
    6: "美味しさが熟成中…",
    7: "奥行きが出てきた…",
    8: "達人の域…",
    9: "古酒のような味わい…",
    10: "ただ、在る…",
  },
  overfed: {
    1: "ちょっと熟しすぎ…?",
    2: "使いすぎかも…",
    3: "ペース調整を…",
    4: "酸味出てる…注意…",
    5: "腐敗と熟成は紙一重…気をつけて…",
    6: "過熟は紙一重…",
    7: "酸化進行中…",
    8: "分解が始まりかけ…",
    9: "腐敗の足音…",
    10: "過剰の極み…ここから戻れます…",
  },
  resting: {
    1: "ふんわり…zzz",
    2: "休んでます…",
    3: "静かに発酵中…",
    4: "眠りも仕事…",
    5: "休むことも発酵のうち…ね…",
    6: "深い眠り…",
    7: "無の境地…",
    8: "禅の境地…",
    9: "永遠の静寂…",
    10: "無に至る…",
  },
  awaiting: {
    1: "ぽつぽつ…?",
    2: "待機中…",
    3: "ご判断を…",
    4: "準備整いました…",
    5: "待てます…発酵は急かせないので…",
    6: "静かに待ちます…",
    7: "決断を待ちます…",
    8: "動きを見守ります…",
    9: "全てを待つ覚悟…",
    10: "全てを受け入れる…",
  },
  sick: {
    1: "腐敗注意…",
    2: "危険信号…",
    3: "対応必要…",
    4: "分解進行中…",
    5: "分解が始まってます…でも、再生できます…",
    6: "異常検知…",
    7: "深刻な異常…",
    8: "危機的状況…",
    9: "腐敗末期…",
    10: "究極の試練…乗り越えれば、再生は可能です…",
  },
};

// v0.7 (2026-05-08) 麹 50 セリフ英訳版 (CEO 起案、白川 Designer EN peer review 発注予定)
// 翻訳指針: 直訳ではなく koji 発酵モチーフ + Ferment Small 哲学を保持
// Lv5 sick + Lv10 healthy のフラグシップは品質基準線維持
const SAYINGS_KOJI_EN: Record<BuddyState, Record<BuddyLevel, string>> = {
  healthy: {
    1: "Fermenting nicely...",
    2: "Going well...",
    3: "Flavor's coming through...",
    4: "Depth is showing...",
    5: "Carefully nurtured... slow is fine...",
    6: "Aging beautifully...",
    7: "Layers are forming...",
    8: "Mastery realm...",
    9: "Aged-sake quality...",
    10: "Simply, here...",
  },
  overfed: {
    1: "A bit too ripe?",
    2: "Maybe overspending...",
    3: "Pace adjustment needed...",
    4: "Acidity showing... careful...",
    5: "Decay and depth are razor-thin... careful...",
    6: "Over-ripening's edge...",
    7: "Oxidation in progress...",
    8: "Decay starting to peek...",
    9: "Footsteps of decay...",
    10: "Peak excess... you can return from here...",
  },
  resting: {
    1: "Floating... zzz",
    2: "Resting...",
    3: "Quietly fermenting...",
    4: "Sleep is work too...",
    5: "Resting is part of fermentation... too...",
    6: "Deep slumber...",
    7: "State of nothingness...",
    8: "Zen state...",
    9: "Eternal silence...",
    10: "Becoming nothing...",
  },
  awaiting: {
    1: "Drip... drop...?",
    2: "Standing by...",
    3: "Your call...",
    4: "Ready to go...",
    5: "I can wait... fermentation can't be rushed...",
    6: "Quietly waiting...",
    7: "Awaiting your decision...",
    8: "Watching your move...",
    9: "Resolved to wait for all...",
    10: "Accepting everything...",
  },
  sick: {
    1: "Decay warning...",
    2: "Danger signal...",
    3: "Action needed...",
    4: "Decay in progress...",
    5: "Decay has begun... but rebirth is possible...",
    6: "Anomaly detected...",
    7: "Severe anomaly...",
    8: "Critical state...",
    9: "Final stage of decay...",
    10: "Ultimate trial... cross it, and rebirth is possible...",
  },
};

// 累計セッション数 → Lv 換算 (v0.6 で Lv1-10 拡張、3 年級で Max 想定)
// オーナー指示 2026-05-08: 「数年使っても max に行かない」「3 年で Max」
// 想定: ヘビーユーザー (88 sess/日) で 3 年 ~= 100,000 sessions = Lv10
export function computeBuddyLevel(totalSessionsCount: number): BuddyLevel {
  if (totalSessionsCount >= 100000) return 10;
  if (totalSessionsCount >= 60000) return 9;
  if (totalSessionsCount >= 30000) return 8;
  if (totalSessionsCount >= 10000) return 7;
  if (totalSessionsCount >= 3000) return 6;
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
  locale: BuddyLocale = "ja",
): BuddyRender {
  const icon = BUDDY_ICONS[type];
  const decoration = `${icon}${DECORATIONS[level]}`;
  // Phase α は麹のみ実装、フクロウ + 猫は "Coming soon" フォールバック
  // v0.7 (2026-05-08) ja/en 二言語対応、locale 引数で切替 (default ja)
  let saying: string;
  if (type !== "koji") {
    saying = "(Coming soon)";
  } else {
    saying = locale === "en"
      ? SAYINGS_KOJI_EN[state][level]
      : SAYINGS_KOJI_JA[state][level];
  }
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
  locale: BuddyLocale = "ja",
): string {
  return renderBuddy(state, level, type, locale).saying;
}
