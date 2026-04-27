import type { SessionAggregate, TotalAggregate } from "./aggregate.js";

export function formatDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  parts.push(`${sec}s`);
  return parts.join(" ");
}

export function formatUsd(v: number): string {
  return `$${v.toFixed(4)}`;
}

export function formatJpy(v: number, rate: number): string {
  return `¥${Math.round(v * rate).toLocaleString("ja-JP")}`;
}

export function formatTokens(n: number): string {
  return n.toLocaleString();
}

function topEntries(obj: Record<string, number>, n: number): string {
  return (
    Object.entries(obj)
      .sort((x, y) => y[1] - x[1])
      .slice(0, n)
      .map(([k, v]) => `${k}×${v}`)
      .join(", ") || "-"
  );
}

export interface RenderOptions {
  usdJpy: number;
  topN?: number;
}

export function renderSessionBlock(
  a: SessionAggregate,
  opts: RenderOptions,
): string {
  const topN = opts.topN ?? 10;
  const lines: string[] = [];
  lines.push(`Session ${a.sessionId}`);
  lines.push(`  file:     ${a.filePath}`);
  lines.push(`  started:  ${a.startedAt ?? "-"}`);
  lines.push(`  ended:    ${a.endedAt ?? "-"}`);
  lines.push(`  duration: ${formatDuration(a.durationMs)}`);
  lines.push(
    `  turns:    assistant=${a.assistantTurns}, user=${a.userTurns}, sidechain=${a.sidechainCount}`,
  );
  lines.push(
    `  tokens:   input=${formatTokens(a.inputTokens)}, output=${formatTokens(
      a.outputTokens,
    )}, cache_read=${formatTokens(a.cacheReadTokens)}, cache_create=${formatTokens(
      a.cacheCreateTokens,
    )}`,
  );
  lines.push(
    `  cost:     ${formatUsd(a.costUsd)} (${formatJpy(a.costUsd, opts.usdJpy)})`,
  );
  lines.push(`  models:   ${topEntries(a.models, topN)}`);
  lines.push(`  tools:    ${topEntries(a.tools, topN)}`);
  return lines.join("\n");
}

export function renderTotalBlock(
  total: TotalAggregate,
  opts: RenderOptions,
): string {
  const topN = opts.topN ?? 10;
  const lines: string[] = [];
  lines.push("TOTAL");
  lines.push(`  sessions:       ${total.sessionCount}`);
  lines.push(`  duration (sum): ${formatDuration(total.durationMs)}`);
  lines.push(
    `  turns:          assistant=${total.assistantTurns}, user=${total.userTurns}, sidechain=${total.sidechainCount}`,
  );
  lines.push(
    `  tokens:         input=${formatTokens(total.inputTokens)}, output=${formatTokens(
      total.outputTokens,
    )}, cache_read=${formatTokens(total.cacheReadTokens)}, cache_create=${formatTokens(
      total.cacheCreateTokens,
    )}`,
  );
  lines.push(
    `  cost:           ${formatUsd(total.costUsd)} (${formatJpy(total.costUsd, opts.usdJpy)})`,
  );
  lines.push(`  tools:          ${topEntries(total.tools, topN)}`);
  lines.push(`  models:         ${topEntries(total.models, topN)}`);
  lines.push("");
  lines.push(
    "  note: Cost is API-rate equivalent (token × Anthropic API price).",
  );
  lines.push(
    "        Actual billing depends on your plan — Claude Pro / Max",
  );
  lines.push(
    "        subscribers pay a flat fee regardless of this number.",
  );
  return lines.join("\n");
}

export function renderSummary(
  aggs: SessionAggregate[],
  total: TotalAggregate,
  opts: RenderOptions,
): string {
  const border = "=".repeat(60);
  const parts: string[] = [];
  parts.push(`koji-lens — analyzed ${aggs.length} session(s)`);
  parts.push(border);
  for (const a of aggs) {
    parts.push("");
    parts.push(renderSessionBlock(a, opts));
  }
  parts.push("");
  parts.push(border);
  parts.push(renderTotalBlock(total, opts));
  return parts.join("\n");
}
