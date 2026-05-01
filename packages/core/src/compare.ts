import type { SessionAggregate } from "./aggregate.js";

export interface PeriodSummary {
  range: { from: string; to: string };
  dayCount: number;
  sessionsCount: number;
  totalCostUsd: number;
  totalTokens: number;
  costByModel: Record<string, number>;
  toolsCount: Record<string, number>;
}

export interface CompareResult {
  before: PeriodSummary;
  after: PeriodSummary;
  delta: {
    costUsd: number;
    costUsdPct: number;
    sessionsCount: number;
    sessionsCountPct: number;
    costByModel: Record<
      string,
      { before: number; after: number; pct: number }
    >;
    toolsTopChanged: {
      name: string;
      beforePerSession: number;
      afterPerSession: number;
      pct: number;
    }[];
  };
}

export function computePeriodSummary(
  aggs: SessionAggregate[],
  range: { from: Date; to: Date },
): PeriodSummary {
  const dayCount = Math.max(
    1,
    Math.floor((range.to.getTime() - range.from.getTime()) / 86400000) + 1,
  );

  let totalCostUsd = 0;
  let totalTokens = 0;
  const costByModel: Record<string, number> = {};
  const toolsCount: Record<string, number> = {};

  for (const agg of aggs) {
    totalCostUsd += agg.costUsd;
    totalTokens +=
      agg.inputTokens +
      agg.outputTokens +
      agg.cacheReadTokens +
      agg.cacheCreateTokens;

    for (const [model, cost] of Object.entries(agg.costsByModel)) {
      costByModel[model] = (costByModel[model] ?? 0) + cost;
    }

    for (const [tool, count] of Object.entries(agg.tools)) {
      toolsCount[tool] = (toolsCount[tool] ?? 0) + count;
    }
  }

  return {
    range: {
      from: range.from.toISOString().slice(0, 10),
      to: range.to.toISOString().slice(0, 10),
    },
    dayCount,
    sessionsCount: aggs.length,
    totalCostUsd,
    totalTokens,
    costByModel,
    toolsCount,
  };
}

export function computeCompare(
  beforeAggs: SessionAggregate[],
  afterAggs: SessionAggregate[],
  rangeBefore: { from: Date; to: Date },
  rangeAfter: { from: Date; to: Date },
): CompareResult {
  const before = computePeriodSummary(beforeAggs, rangeBefore);
  const after = computePeriodSummary(afterAggs, rangeAfter);

  const costUsdDelta = after.totalCostUsd - before.totalCostUsd;
  const costUsdPct =
    before.totalCostUsd > 0 ? (costUsdDelta / before.totalCostUsd) * 100 : 0;

  const sessionsCountDelta = after.sessionsCount - before.sessionsCount;
  const sessionsCountPct =
    before.sessionsCount > 0
      ? (sessionsCountDelta / before.sessionsCount) * 100
      : 0;

  const costByModelDelta: Record<
    string,
    { before: number; after: number; pct: number }
  > = {};
  const allModels = new Set([
    ...Object.keys(before.costByModel),
    ...Object.keys(after.costByModel),
  ]);
  for (const model of allModels) {
    const beforeCost = before.costByModel[model] ?? 0;
    const afterCost = after.costByModel[model] ?? 0;
    const pct =
      beforeCost > 0 ? ((afterCost - beforeCost) / beforeCost) * 100 : 0;
    costByModelDelta[model] = { before: beforeCost, after: afterCost, pct };
  }

  const toolsTopChangedAll: {
    name: string;
    beforePerSession: number;
    afterPerSession: number;
    pct: number;
  }[] = [];
  const allTools = new Set([
    ...Object.keys(before.toolsCount),
    ...Object.keys(after.toolsCount),
  ]);
  for (const tool of allTools) {
    const beforeRate =
      before.sessionsCount > 0
        ? (before.toolsCount[tool] ?? 0) / before.sessionsCount
        : 0;
    const afterRate =
      after.sessionsCount > 0
        ? (after.toolsCount[tool] ?? 0) / after.sessionsCount
        : 0;
    const pct =
      beforeRate > 0 ? ((afterRate - beforeRate) / beforeRate) * 100 : 0;
    toolsTopChangedAll.push({
      name: tool,
      beforePerSession: beforeRate,
      afterPerSession: afterRate,
      pct,
    });
  }
  toolsTopChangedAll.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
  const toolsTopChanged = toolsTopChangedAll.slice(0, 5);

  return {
    before,
    after,
    delta: {
      costUsd: costUsdDelta,
      costUsdPct,
      sessionsCount: sessionsCountDelta,
      sessionsCountPct,
      costByModel: costByModelDelta,
      toolsTopChanged,
    },
  };
}
