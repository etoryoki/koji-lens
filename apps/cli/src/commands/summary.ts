import {
  analyzeDirectory,
  defaultClaudeLogDir,
  parseSince,
  renderSummary,
  sumAggregates,
} from "@kojihq/core";

export interface SummaryOptions {
  since: string;
  format: string;
  dir?: string;
  usdJpy: string;
}

export async function summaryCommand(opts: SummaryOptions): Promise<void> {
  const dir = opts.dir ?? defaultClaudeLogDir();
  const since = parseSince(opts.since);
  const all = await analyzeDirectory(dir, { since });
  const active = all.filter((a) => a.assistantTurns > 0 || a.userTurns > 0);
  const total = sumAggregates(active);
  const rate = Number(opts.usdJpy);

  if (opts.format === "json") {
    const payload = {
      generatedAt: new Date().toISOString(),
      since: since.toISOString(),
      dir,
      total,
      sessions: active,
    };
    process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
    return;
  }

  if (active.length === 0) {
    console.log(`No active sessions under ${dir} since ${since.toISOString()}.`);
    return;
  }

  active.sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));
  process.stdout.write(renderSummary(active, total, { usdJpy: rate }) + "\n");
}
