import {
  detectTrendRegressions,
  type TrendAttribution,
  type TrendRegressionWithAttribution,
  type UserPatternChange,
  type WeeklyTrendBucket,
  type WeeklyTrendResult,
} from "./trend.js";

export interface DetectOptions {
  enableAttribution?: boolean;
}

export function analyzeUserPatternChange(
  latest: WeeklyTrendBucket,
  history: WeeklyTrendBucket[],
): UserPatternChange {
  const cumulativeDirs = new Set<string>();
  const cumulativeModels = new Set<string>();
  const cumulativeTools = new Set<string>();
  for (const w of history) {
    for (const d of w.uniqueDirs) cumulativeDirs.add(d);
    for (const m of w.uniqueModels) cumulativeModels.add(m);
    for (const t of w.uniqueTools) cumulativeTools.add(t);
  }

  const newDirs = latest.uniqueDirs.filter((d) => !cumulativeDirs.has(d));
  const newModels = latest.uniqueModels.filter((m) => !cumulativeModels.has(m));
  const newTools = latest.uniqueTools.filter((t) => !cumulativeTools.has(t));

  const avgPrevSessions =
    history.length > 0
      ? history.reduce((s, w) => s + w.sessionsCount, 0) / history.length
      : 0;
  const sessionCountChangePct =
    avgPrevSessions > 0
      ? ((latest.sessionsCount - avgPrevSessions) / avgPrevSessions) * 100
      : 0;

  return {
    dirChange: newDirs.length,
    modelChange: newModels.length,
    toolChange: newTools.length,
    sessionCountChangePct,
    newDirs: newDirs.slice(0, 5),
    newModels: newModels.slice(0, 5),
    newTools: newTools.slice(0, 5),
  };
}

export function attributeRegression(
  patternChange: UserPatternChange,
): TrendAttribution {
  const significantChanges = [
    patternChange.dirChange > 0,
    patternChange.modelChange > 0,
    patternChange.toolChange > 0,
    Math.abs(patternChange.sessionCountChangePct) > 20,
  ].filter(Boolean).length;

  let verdict: TrendAttribution["verdict"];
  let reasoning: string;

  if (significantChanges === 0) {
    verdict = "vendor_likely";
    reasoning = "no user pattern changes detected this week";
  } else if (significantChanges >= 3) {
    verdict = "user_likely";
    const parts: string[] = [];
    if (patternChange.dirChange > 0) {
      parts.push(
        `${patternChange.dirChange} new dir${patternChange.dirChange === 1 ? "" : "s"}`,
      );
    }
    if (patternChange.modelChange > 0) {
      parts.push(
        `${patternChange.modelChange} new model${patternChange.modelChange === 1 ? "" : "s"}`,
      );
    }
    if (patternChange.toolChange > 0) {
      parts.push(
        `${patternChange.toolChange} new tool${patternChange.toolChange === 1 ? "" : "s"}`,
      );
    }
    if (Math.abs(patternChange.sessionCountChangePct) > 20) {
      const sign = patternChange.sessionCountChangePct > 0 ? "+" : "";
      parts.push(
        `${sign}${patternChange.sessionCountChangePct.toFixed(0)}% session count`,
      );
    }
    reasoning = parts.join(", ") + " this week";
  } else {
    verdict = "ambiguous";
    reasoning = `${significantChanges} of 4 user pattern axes changed — insufficient to attribute`;
  }

  return { verdict, reasoning, patternChange };
}

export function detectTrendRegressionsWithAttribution(
  result: WeeklyTrendResult,
  options: DetectOptions = {},
): TrendRegressionWithAttribution[] {
  const regressions = detectTrendRegressions(result);

  if (!options.enableAttribution || result.weeks.length < 2) {
    return regressions;
  }

  const latest = result.weeks[result.weeks.length - 1];
  const history = result.weeks.slice(0, -1);
  const patternChange = analyzeUserPatternChange(latest, history);
  const attribution = attributeRegression(patternChange);

  return regressions.map((r) => ({ ...r, attribution }));
}
