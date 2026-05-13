import {
  computeWeeklyTrend,
  defaultClaudeLogDir,
  detectTrendRegressionsWithAttribution,
  loadConfig,
  renderWeeklyTrendText,
  analyzeDirectory,
  type SessionAggregate,
  type TrendRegressionWithAttribution,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";
import { triggerLazySync } from "../lib/lazy-sync.js";

export interface TrendOptions {
  weeks: string;
  format: string;
  dir?: string;
  cache: boolean;
  withAttribution?: boolean;
}

export async function trendCommand(opts: TrendOptions): Promise<void> {
  triggerLazySync();
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();

  const weeks = Number(opts.weeks);
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
    throw new Error(
      `Invalid --weeks value: "${opts.weeks}". Expected integer 1-52.`,
    );
  }

  // Pro feature gate (Phase A 拡張 (5) attribution layer)
  // dev mode: KOJI_LENS_PRO=1 でバイパス
  // 本番: Phase A 完成後の Stripe + Clerk 統合で置換予定 (設計 v0.2 §5.1.2)
  const isPro = process.env.KOJI_LENS_PRO === "1";
  if (opts.withAttribution && !isPro) {
    throw new Error(
      "--with-attribution is a Pro feature.\n" +
        "  Dev mode: set KOJI_LENS_PRO=1 to enable.\n" +
        "  Production: Pro authentication via Stripe + Clerk (Phase A complete).",
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

  let regressions: TrendRegressionWithAttribution[] | undefined;
  if (opts.withAttribution && isPro) {
    regressions = detectTrendRegressionsWithAttribution(result, {
      enableAttribution: true,
    });
  }

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          weeks: result.weeks,
          regressions: regressions ?? null,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  process.stdout.write(renderWeeklyTrendText(result, regressions) + "\n");
}
