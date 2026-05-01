import type { CompareResult } from "./compare.js";

const MIN_SESSIONS_FOR_RULES = 5;
const PROJECTION_MIN_DAYS = 14;
const MODEL_SHIFT_THRESHOLD_PCT = -30;
const DAILY_DROP_THRESHOLD_PCT = -30;
const TOOL_RATE_CHANGE_THRESHOLD_PCT = 50;
const MAX_INSIGHTS = 3;

export function generateInsights(result: CompareResult): string[] {
  const hasEnoughSessions =
    result.before.sessionsCount >= MIN_SESSIONS_FOR_RULES &&
    result.after.sessionsCount >= MIN_SESSIONS_FOR_RULES;

  if (!hasEnoughSessions) {
    return [];
  }

  const candidates: string[] = [];

  // 優先度 1: Model shift detection (Opus → Sonnet/Haiku で 30% 以上削減)
  const opusModel = Object.keys(result.delta.costByModel).find((m) =>
    m.toLowerCase().includes("opus"),
  );
  if (opusModel) {
    const opusEntry = result.delta.costByModel[opusModel];
    if (
      opusEntry &&
      opusEntry.before > 0 &&
      opusEntry.pct <= MODEL_SHIFT_THRESHOLD_PCT
    ) {
      candidates.push(
        `Opus → Sonnet/Haiku 移行で ${Math.abs(opusEntry.pct).toFixed(1)}% コスト削減（model mix shift）`,
      );
    }
  }

  // 優先度 2: Net savings projection (期間 14 日以上、白川案で 2 番手昇格)
  const beforeDays = result.before.dayCount;
  const afterDays = result.after.dayCount;
  if (beforeDays >= PROJECTION_MIN_DAYS && afterDays >= PROJECTION_MIN_DAYS) {
    const dailyDelta = result.delta.costUsd / afterDays;
    const yearlyProjection = dailyDelta * 365;
    if (Math.abs(yearlyProjection) >= 1) {
      const sign = yearlyProjection < 0 ? "saved" : "extra spend";
      const abs = Math.abs(yearlyProjection);
      candidates.push(`if continued: $${abs.toFixed(0)} ${sign} per year`);
    }
  }

  // 優先度 3: Outlier session (CompareResult からは復元不可、Phase B でリファイン)
  // 現状: skip。queries 層でセッション単位データを返す設計に拡張時に再実装

  // 優先度 4: Daily average drop (30% 以上削減)
  if (beforeDays > 0 && afterDays > 0) {
    const beforeDaily = result.before.totalCostUsd / beforeDays;
    const afterDaily = result.after.totalCostUsd / afterDays;
    if (beforeDaily > 0) {
      const dailyPct = ((afterDaily - beforeDaily) / beforeDaily) * 100;
      if (dailyPct <= DAILY_DROP_THRESHOLD_PCT) {
        candidates.push(
          `daily average $${afterDaily.toFixed(2)}/day (was $${beforeDaily.toFixed(2)}/day, ${dailyPct.toFixed(1)}%)`,
        );
      }
    }
  }

  // 優先度 5: Tool 偏り変化 (per-session 比率 50% 超変化、白川案で最後位)
  for (const tool of result.delta.toolsTopChanged) {
    if (Math.abs(tool.pct) >= TOOL_RATE_CHANGE_THRESHOLD_PCT) {
      const direction = tool.pct < 0 ? "減少" : "増加";
      candidates.push(
        `${tool.name} の per-session 利用が ${Math.abs(tool.pct).toFixed(1)}% ${direction}`,
      );
    }
  }

  return candidates.slice(0, MAX_INSIGHTS);
}
