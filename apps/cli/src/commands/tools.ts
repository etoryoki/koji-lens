import {
  analyzeDirectory,
  defaultClaudeLogDir,
  loadConfig,
  normalizeDirArg,
  parseSince,
  sumAggregates,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface ToolsOptions {
  since: string;
  format: string;
  dir?: string;
  cache: boolean;
  limit?: string;
}

const DEFAULT_TOP_N = 20;

export async function toolsCommand(opts: ToolsOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = normalizeDirArg(opts.dir ?? cfg.logDir ?? defaultClaudeLogDir());
  const since = parseSince(opts.since);
  const topN = opts.limit ? Number(opts.limit) : DEFAULT_TOP_N;

  let all: SessionAggregate[];
  if (opts.cache === false) {
    all = await analyzeDirectory(dir, { since });
  } else {
    const cache = openCacheDb();
    try {
      all = await analyzeDirectoryCached(dir, cache.db, { since });
    } finally {
      cache.close();
    }
  }

  const active = all.filter((a) => a.assistantTurns > 0 || a.userTurns > 0);
  const total = sumAggregates(active);

  const totalInvocations = Object.values(total.tools).reduce(
    (acc, n) => acc + n,
    0,
  );

  const sorted = Object.entries(total.tools)
    .sort(([, a], [, b]) => b - a)
    .slice(0, topN);

  if (opts.format === "json") {
    const payload = {
      generatedAt: new Date().toISOString(),
      since: since.toISOString(),
      dir,
      sessionCount: active.length,
      totalInvocations,
      toolBreakdown: sorted.map(([name, count]) => ({
        name,
        count,
        pct: totalInvocations > 0
          ? Number(((count / totalInvocations) * 100).toFixed(2))
          : 0,
      })),
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  if (active.length === 0) {
    console.log(`No active sessions under ${dir} since ${since.toISOString()}.`);
    return;
  }

  process.stdout.write(
    `koji-lens tools — analyzed ${active.length} session(s)\n`,
  );
  process.stdout.write(
    `period: ${since.toISOString()} → ${new Date().toISOString()} (last ${opts.since})\n`,
  );
  process.stdout.write("=".repeat(60) + "\n");
  process.stdout.write(`TOTAL tool invocations: ${totalInvocations}\n`);
  process.stdout.write("\n");
  process.stdout.write(`Tool breakdown (top ${Math.min(topN, sorted.length)}):\n`);

  const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

  for (const [name, count] of sorted) {
    const pct = totalInvocations > 0
      ? ((count / totalInvocations) * 100).toFixed(2)
      : "0.00";
    const barLength = Math.round((count / maxCount) * 30);
    const bar = "█".repeat(Math.max(1, barLength));
    process.stdout.write(
      `  ${name.padEnd(18)} ${count.toString().padStart(6)} (${pct.padStart(5)}%) ${bar}\n`,
    );
  }

  process.stdout.write("\n");
  process.stdout.write(
    "  note: counts include all tool_use entries across sessions in the period.\n",
  );
  process.stdout.write(
    "        Bash + Read + Edit + Write typically dominate (Claude Code default pattern).\n",
  );
}
