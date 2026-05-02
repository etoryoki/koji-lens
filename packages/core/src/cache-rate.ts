import type { SessionAggregate } from "./aggregate.js";

export interface CacheRateResult {
  rate: number;
  inputTokens: number;
  cacheReadTokens: number;
}

export function computeCacheRate(
  aggs: SessionAggregate[],
): CacheRateResult | null {
  let totalInput = 0;
  let totalCacheRead = 0;
  for (const agg of aggs) {
    totalInput += agg.inputTokens;
    totalCacheRead += agg.cacheReadTokens;
  }
  const denom = totalInput + totalCacheRead;
  if (denom === 0) return null;
  return {
    rate: (totalCacheRead / denom) * 100,
    inputTokens: totalInput,
    cacheReadTokens: totalCacheRead,
  };
}
