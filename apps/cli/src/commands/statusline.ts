import {
  computeCompare,
  computeMonthRanges,
  defaultClaudeLogDir,
  loadConfig,
  renderStatusline,
  analyzeDirectory,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface StatuslineOptions {
  format: string;
  dir?: string;
  cache: boolean;
}

interface DateRange {
  from: Date;
  to: Date;
}

function filterByRange(
  aggs: SessionAggregate[],
  range: DateRange,
): SessionAggregate[] {
  return aggs.filter((agg) => {
    if (!agg.endedAt) return false;
    const ts = new Date(agg.endedAt).getTime();
    return ts >= range.from.getTime() && ts <= range.to.getTime();
  });
}

export async function statuslineCommand(
  opts: StatuslineOptions,
): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const ranges = computeMonthRanges();

  let all: SessionAggregate[];
  if (opts.cache === false) {
    all = await analyzeDirectory(dir);
  } else {
    const cache = openCacheDb();
    try {
      all = await analyzeDirectoryCached(dir, cache.db);
    } finally {
      cache.close();
    }
  }

  const beforeAggs = filterByRange(all, ranges.lastMonth);
  const afterAggs = filterByRange(all, ranges.thisMonth);

  const result = computeCompare(
    beforeAggs,
    afterAggs,
    ranges.lastMonth,
    ranges.thisMonth,
  );

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          ranges: {
            lastMonth: {
              from: ranges.lastMonth.from.toISOString(),
              to: ranges.lastMonth.to.toISOString(),
            },
            thisMonth: {
              from: ranges.thisMonth.from.toISOString(),
              to: ranges.thisMonth.to.toISOString(),
            },
          },
          before: result.before,
          after: result.after,
          delta: result.delta,
          statusline: renderStatusline(result),
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(renderStatusline(result) + "\n");
}
