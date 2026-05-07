import {
  computeCacheRate,
  computeCompare,
  computeMonthRanges,
  defaultClaudeLogDir,
  defaultStateFilePath,
  loadConfig,
  readAgentState,
  renderStatusline,
  analyzeDirectory,
  type BuddyType,
  type SessionAggregate,
  type StatuslineMode,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

const VALID_BUDDY_TYPES: ReadonlyArray<BuddyType> = ["koji", "owl", "cat"];

function parseBuddyType(input: string | undefined): BuddyType {
  const candidate = input ?? "koji";
  if ((VALID_BUDDY_TYPES as ReadonlyArray<string>).includes(candidate)) {
    return candidate as BuddyType;
  }
  throw new Error(
    `Invalid --buddy-type: "${input}". Expected: ${VALID_BUDDY_TYPES.join(", ")}`,
  );
}

export interface StatuslineOptions {
  format: string;
  mode: string;
  dir?: string;
  stateFile?: string;
  state: boolean;
  cacheRate: boolean;
  cache: boolean;
  buddy?: boolean;
  buddySpeech?: boolean;
  buddyType?: string;
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

  const stateRead =
    opts.state === false
      ? { icon: null, state: null, staleMs: null }
      : readAgentState(opts.stateFile ?? defaultStateFilePath());

  const cacheRate =
    opts.cacheRate === false ? null : computeCacheRate(afterAggs);

  // 起案 v0.4 §3 楽しさ別チャネル化整合: --buddy で opt-in、env KOJI_LENS_BUDDY=1 で永続化
  const buddyEnabled =
    opts.buddy === true || process.env.KOJI_LENS_BUDDY === "1";
  const buddyType = parseBuddyType(opts.buddyType);

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
          agentState: stateRead,
          cacheRate,
          statusline: renderStatusline(result, mode, {
            stateIcon: stateRead.icon,
            cacheRate,
            buddy: buddyEnabled
              ? {
                  enabled: true,
                  type: buddyType,
                  speech: opts.buddySpeech === true,
                  agentState: stateRead.state,
                }
              : undefined,
          }),
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(
    renderStatusline(result, mode, {
      stateIcon: stateRead.icon,
      cacheRate,
      buddy: buddyEnabled
        ? {
            enabled: true,
            type: buddyType,
            speech: opts.buddySpeech === true,
            agentState: stateRead.state,
          }
        : undefined,
    }) + "\n",
  );
}
