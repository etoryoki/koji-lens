import {
  computeWeeklyTrend,
  defaultClaudeLogDir,
  loadConfig,
  renderWeeklyTrendText,
  analyzeDirectory,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface TrendOptions {
  weeks: string;
  format: string;
  dir?: string;
  cache: boolean;
}

export async function trendCommand(opts: TrendOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();

  const weeks = Number(opts.weeks);
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
    throw new Error(
      `Invalid --weeks value: "${opts.weeks}". Expected integer 1-52.`,
    );
  }

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

  const result = computeWeeklyTrend(all, weeks);

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        { generatedAt: new Date().toISOString(), weeks: result.weeks },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(renderWeeklyTrendText(result) + "\n");
}
