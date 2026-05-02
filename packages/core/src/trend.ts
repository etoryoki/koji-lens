import type { SessionAggregate } from "./aggregate.js";

export interface WeeklyTrendBucket {
  weekStartIso: string;
  weekEndIso: string;
  sessionsCount: number;
  totalCostUsd: number;
  totalInputTokens: number;
  totalCacheReadTokens: number;
  cacheHitRatePct: number;
  latencyP50Ms: number;
  latencyP95Ms: number;
  modelChangesCount: number;
  costByModel: Record<string, number>;
}

export interface WeeklyTrendResult {
  weeks: WeeklyTrendBucket[];
}

export interface TrendRegression {
  type: "cache_drop" | "latency_spike" | "model_change_spike";
  severity: "warning" | "critical";
  message: string;
  details: string;
}

function startOfWeekUtc(d: Date): Date {
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  const result = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  result.setUTCDate(result.getUTCDate() - diff);
  return result;
}

function median(sortedAsc: number[]): number {
  if (sortedAsc.length === 0) return 0;
  const mid = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 0) {
    return Math.round((sortedAsc[mid - 1] + sortedAsc[mid]) / 2);
  }
  return sortedAsc[mid];
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.floor((p / 100) * sortedAsc.length),
  );
  return sortedAsc[idx];
}

export function computeWeeklyTrend(
  aggs: SessionAggregate[],
  weeksBack: number = 4,
  now: Date = new Date(),
): WeeklyTrendResult {
  const buckets: WeeklyTrendBucket[] = [];
  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = startOfWeekUtc(
      new Date(now.getTime() - i * 7 * 86_400_000),
    );
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000 - 1);

    const inWeek = aggs.filter((a) => {
      if (!a.endedAt) return false;
      const ts = new Date(a.endedAt).getTime();
      return ts >= weekStart.getTime() && ts <= weekEnd.getTime();
    });

    let totalCost = 0;
    let totalInput = 0;
    let totalCacheRead = 0;
    let modelChangesCount = 0;
    const latenciesP50: number[] = [];
    const latenciesP95: number[] = [];
    const costByModel: Record<string, number> = {};

    for (const a of inWeek) {
      totalCost += a.costUsd;
      totalInput += a.inputTokens;
      totalCacheRead += a.cacheReadTokens;
      modelChangesCount += a.modelChanges.length;
      if (a.latencyP50Ms > 0) latenciesP50.push(a.latencyP50Ms);
      if (a.latencyP95Ms > 0) latenciesP95.push(a.latencyP95Ms);
      for (const [m, c] of Object.entries(a.costsByModel)) {
        costByModel[m] = (costByModel[m] ?? 0) + c;
      }
    }

    const cacheDenom = totalInput + totalCacheRead;
    const cacheHitRatePct =
      cacheDenom > 0 ? (totalCacheRead / cacheDenom) * 100 : 0;

    latenciesP50.sort((a, b) => a - b);
    latenciesP95.sort((a, b) => a - b);

    buckets.push({
      weekStartIso: weekStart.toISOString().slice(0, 10),
      weekEndIso: weekEnd.toISOString().slice(0, 10),
      sessionsCount: inWeek.length,
      totalCostUsd: totalCost,
      totalInputTokens: totalInput,
      totalCacheReadTokens: totalCacheRead,
      cacheHitRatePct,
      latencyP50Ms: median(latenciesP50),
      latencyP95Ms: percentile(latenciesP95, 95),
      modelChangesCount,
      costByModel,
    });
  }

  return { weeks: buckets };
}

export function detectTrendRegressions(
  result: WeeklyTrendResult,
): TrendRegression[] {
  const regressions: TrendRegression[] = [];
  if (result.weeks.length < 2) return regressions;

  const latest = result.weeks[result.weeks.length - 1];
  const previous = result.weeks.slice(0, -1);
  if (previous.length === 0) return regressions;

  const avgPrevCache =
    previous.reduce((s, w) => s + w.cacheHitRatePct, 0) / previous.length;
  if (avgPrevCache > 0 && latest.cacheHitRatePct > 0) {
    const dropPct =
      ((latest.cacheHitRatePct - avgPrevCache) / avgPrevCache) * 100;
    if (dropPct <= -50) {
      regressions.push({
        type: "cache_drop",
        severity: "critical",
        message: "Cache hit rate dropped > 50% vs prior weeks",
        details: `latest=${latest.cacheHitRatePct.toFixed(1)}%, avg prev=${avgPrevCache.toFixed(1)}%`,
      });
    } else if (dropPct <= -25) {
      regressions.push({
        type: "cache_drop",
        severity: "warning",
        message: "Cache hit rate dropped > 25% vs prior weeks",
        details: `latest=${latest.cacheHitRatePct.toFixed(1)}%, avg prev=${avgPrevCache.toFixed(1)}%`,
      });
    }
  }

  const avgPrevP95 =
    previous.reduce((s, w) => s + w.latencyP95Ms, 0) / previous.length;
  if (avgPrevP95 > 0 && latest.latencyP95Ms > 0) {
    const ratio = latest.latencyP95Ms / avgPrevP95;
    if (ratio >= 2) {
      regressions.push({
        type: "latency_spike",
        severity: "critical",
        message: `p95 latency spiked ${ratio.toFixed(1)}x vs prior weeks`,
        details: `latest=${latest.latencyP95Ms}ms, avg prev=${avgPrevP95.toFixed(0)}ms`,
      });
    } else if (ratio >= 1.5) {
      regressions.push({
        type: "latency_spike",
        severity: "warning",
        message: `p95 latency up ${((ratio - 1) * 100).toFixed(0)}% vs prior weeks`,
        details: `latest=${latest.latencyP95Ms}ms, avg prev=${avgPrevP95.toFixed(0)}ms`,
      });
    }
  }

  const avgPrevModelChanges =
    previous.reduce((s, w) => s + w.modelChangesCount, 0) / previous.length;
  if (
    latest.modelChangesCount >= 5 &&
    latest.modelChangesCount >= avgPrevModelChanges * 3
  ) {
    regressions.push({
      type: "model_change_spike",
      severity: "warning",
      message:
        "Model changes spiked vs prior weeks (possible vendor-side default shift)",
      details: `latest=${latest.modelChangesCount}, avg prev=${avgPrevModelChanges.toFixed(1)}`,
    });
  }

  return regressions;
}

export function renderWeeklyTrendText(result: WeeklyTrendResult): string {
  const lines: string[] = [];
  lines.push(`koji-lens — weekly trend (${result.weeks.length} weeks)`);
  lines.push("=".repeat(60));
  lines.push(
    `${pad("week", 14)}${pad("sessions", 10, true)}${pad("cost", 12, true)}${pad("cache%", 10, true)}${pad("p50ms", 10, true)}${pad("p95ms", 10, true)}${pad("modelΔ", 8, true)}`,
  );
  for (const w of result.weeks) {
    lines.push(
      `${pad(w.weekStartIso, 14)}${pad(String(w.sessionsCount), 10, true)}${pad("$" + w.totalCostUsd.toFixed(2), 12, true)}${pad(w.cacheHitRatePct.toFixed(0) + "%", 10, true)}${pad(String(w.latencyP50Ms), 10, true)}${pad(String(w.latencyP95Ms), 10, true)}${pad(String(w.modelChangesCount), 8, true)}`,
    );
  }

  const regressions = detectTrendRegressions(result);
  if (regressions.length > 0) {
    lines.push("");
    lines.push("⚠️  Regressions detected:");
    for (const r of regressions) {
      const icon = r.severity === "critical" ? "🚨" : "⚠️";
      lines.push(`  ${icon} ${r.message}`);
      lines.push(`     ${r.details}`);
    }
  }

  lines.push("");
  lines.push("hint: drops in cache% or spikes in latency may indicate vendor-side regressions");
  lines.push("       (see Anthropic postmortems 2025-08 + 2026-04 for context).");
  return lines.join("\n");
}

function pad(s: string, width: number, rightAlign = false): string {
  if (s.length >= width) return s;
  const padding = " ".repeat(width - s.length);
  return rightAlign ? padding + s : s + padding;
}
