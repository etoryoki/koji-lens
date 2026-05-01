import {
  computeCompare,
  defaultClaudeLogDir,
  generateInsights,
  loadConfig,
  type CompareResult,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";
import { analyzeDirectory } from "@kojihq/core";

export interface CompareOptions {
  before: string;
  after: string;
  format: string;
  dir?: string;
  usdJpy?: string;
  cache: boolean;
}

const DEFAULT_USD_JPY = 155;

interface DateRange {
  from: Date;
  to: Date;
}

function parseDateRange(expr: string, label: string): DateRange {
  const match = expr.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (!match) {
    throw new Error(
      `Invalid --${label} format: "${expr}". Expected YYYY-MM-DD..YYYY-MM-DD`,
    );
  }
  const from = new Date(`${match[1]}T00:00:00.000Z`);
  const to = new Date(`${match[2]}T23:59:59.999Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error(`Invalid --${label} date: "${expr}"`);
  }
  if (from > to) {
    throw new Error(`Invalid --${label} range: from > to`);
  }
  return { from, to };
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

export async function compareCommand(opts: CompareOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const beforeRange = parseDateRange(opts.before, "before");
  const afterRange = parseDateRange(opts.after, "after");

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

  const beforeAggs = filterByRange(all, beforeRange);
  const afterAggs = filterByRange(all, afterRange);

  const result = computeCompare(beforeAggs, afterAggs, beforeRange, afterRange);
  const insights = generateInsights(result);

  if (opts.format === "json") {
    const rate =
      opts.usdJpy !== undefined ? Number(opts.usdJpy) : (cfg.usdJpy ?? DEFAULT_USD_JPY);
    const payload = {
      generatedAt: new Date().toISOString(),
      before: result.before,
      after: result.after,
      delta: result.delta,
      insights,
      usdJpyRate: rate,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  process.stdout.write(renderCompareText(result, insights) + "\n");
}

export function renderCompareText(
  result: CompareResult,
  insights: string[],
): string {
  const lines: string[] = [];
  const before = result.before;
  const after = result.after;

  lines.push(
    `koji-lens — comparing ${before.range.from}..${before.range.to} (before) vs ${after.range.from}..${after.range.to} (after)`,
  );
  lines.push("=".repeat(60));
  lines.push(
    `${pad("", 30)}${pad("before", 16, true)}${pad("after", 16, true)}${pad("Δ", 10, true)}`,
  );
  lines.push(
    `${pad("sessions", 30)}${pad(String(before.sessionsCount), 16, true)}${pad(String(after.sessionsCount), 16, true)}${pad(formatPct(result.delta.sessionsCountPct), 10, true)}`,
  );
  lines.push(
    `${pad("total cost", 30)}${pad("$" + before.totalCostUsd.toFixed(2), 16, true)}${pad("$" + after.totalCostUsd.toFixed(2), 16, true)}${pad(formatPct(result.delta.costUsdPct), 10, true)}`,
  );
  lines.push("");

  // cost by model
  lines.push("cost by model:");
  const models = Object.keys(result.delta.costByModel).sort();
  for (const model of models) {
    const entry = result.delta.costByModel[model];
    if (!entry) continue;
    lines.push(
      `  ${pad(model, 28)}${pad("$" + entry.before.toFixed(2), 16, true)}${pad("$" + entry.after.toFixed(2), 16, true)}${pad(formatPct(entry.pct), 10, true)}`,
    );
  }
  lines.push("");

  // tools breakdown (per-session normalized)
  if (result.delta.toolsTopChanged.length > 0) {
    lines.push("tools breakdown (top 5 changed, per-session):");
    for (const tool of result.delta.toolsTopChanged) {
      lines.push(
        `  ${pad(tool.name, 28)}${pad(tool.beforePerSession.toFixed(1) + "/sess", 16, true)}${pad(tool.afterPerSession.toFixed(1) + "/sess", 16, true)}${pad(formatPct(tool.pct), 10, true)}`,
      );
    }
    lines.push("");
  }

  // insights
  if (insights.length > 0) {
    lines.push("💡 Insights:");
    for (const insight of insights) {
      lines.push(`  - ${insight}`);
    }
    lines.push("");
  }

  // period summary
  lines.push("period summary:");
  lines.push(
    `  net cost delta: $${result.delta.costUsd.toFixed(2)} (${formatPct(result.delta.costUsdPct)})`,
  );
  if (after.dayCount > 0) {
    lines.push(
      `  daily average:  $${(after.totalCostUsd / after.dayCount).toFixed(2)}/day (was $${(before.totalCostUsd / Math.max(1, before.dayCount)).toFixed(2)}/day)`,
    );
  }
  lines.push("");
  lines.push("  → この比較を毎月自動で受け取る: lens.kojihq.com/pro");

  return lines.join("\n");
}

function pad(s: string, width: number, rightAlign = false): string {
  if (s.length >= width) return s;
  const padding = " ".repeat(width - s.length);
  return rightAlign ? padding + s : s + padding;
}

function formatPct(pct: number): string {
  if (pct === 0) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}
