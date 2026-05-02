import {
  computeCompare,
  computeMonthRanges,
  defaultClaudeLogDir,
  loadConfig,
  renderStatusline,
  analyzeDirectory,
  type SessionAggregate,
  type StatuslineMode,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface StatuslineOptions {
  format: string;
  mode: string;
  dir?: string;
  cache: boolean;
}

const VALID_MODES: ReadonlyArray<StatuslineMode> = [
  "minimal",
  "normal",
  "detailed",
];

function parseMode(input: string): StatuslineMode {
  if ((VALID_MODES as ReadonlyArray<string>).includes(input)) {
    return input as StatuslineMode;
  }
  throw new Error(
    `Invalid --mode: "${input}". Expected one of: ${VALID_MODES.join(", ")}`,
  );
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

  const mode = parseMode(opts.mode);

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode,
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
          statusline: renderStatusline(result, mode),
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(renderStatusline(result, mode) + "\n");
}
