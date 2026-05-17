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

export function formatLocalDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export function extractParentFromPath(filePath: string): string | null {
  const m = filePath.match(/[\\/]([^\\/]+)[\\/]subagents[\\/][^\\/]+\.jsonl$/);
  return m ? m[1] : null;
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

function topCostEntries(obj: Record<string, number>, n: number): string {
  return (
    Object.entries(obj)
      .filter(([, v]) => v > 0)
      .sort((x, y) => y[1] - x[1])
      .slice(0, n)
      .map(([k, v]) => `${k}=${formatUsd(v)}`)
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
  const parent = extractParentFromPath(a.filePath);
  if (parent) lines.push(`  parent:   ${parent} (this is a subagent session)`);
  lines.push(`  file:     ${a.filePath}`);
  const startedLocal = a.startedAt
    ? ` (${formatLocalDateTime(a.startedAt)} local)`
    : "";
  const endedLocal = a.endedAt
    ? ` (${formatLocalDateTime(a.endedAt)} local)`
    : "";
  lines.push(`  started:  ${a.startedAt ?? "-"}${startedLocal}`);
  lines.push(`  ended:    ${a.endedAt ?? "-"}${endedLocal}`);
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
  lines.push(
    `  cost by model:  ${topCostEntries(total.costsByModel, topN)}`,
  );
  lines.push(`  tools:          ${topEntries(total.tools, topN)}`);
  lines.push(`  models:         ${topEntries(total.models, topN)}`);

  const totalTokens =
    total.inputTokens +
    total.outputTokens +
    total.cacheReadTokens +
    total.cacheCreateTokens;
  if (totalTokens > 0) {
    const cacheReadPct = ((total.cacheReadTokens / totalTokens) * 100).toFixed(1);
    const cacheCreatePct = ((total.cacheCreateTokens / totalTokens) * 100).toFixed(1);
    const outputPct = ((total.outputTokens / totalTokens) * 100).toFixed(2);
    const inputPct = ((total.inputTokens / totalTokens) * 100).toFixed(2);
    lines.push(
      `  token mix:      cache_read ${cacheReadPct}% / cache_create ${cacheCreatePct}% / output ${outputPct}% / input ${inputPct}%`,
    );
  }

  if (total.costUsd > 0) {
    const topCostModel = Object.entries(total.costsByModel)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 1)[0];
    if (topCostModel) {
      const [topModel, topCost] = topCostModel;
      const topPct = ((topCost / total.costUsd) * 100).toFixed(1);
      lines.push(`  cost mix:       ${topModel} ${topPct}% (top model share)`);
    }
  }

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

export interface RenderSummaryOptions extends RenderOptions {
  summaryOnly?: boolean;
  since?: Date;
  until?: Date;
  sinceLabel?: string;
}

function buildPeriodHeader(opts: RenderSummaryOptions): string | null {
  if (!opts.since || !opts.until) return null;
  const fromLocal = formatLocalDateTime(opts.since.toISOString());
  const toLocal = formatLocalDateTime(opts.until.toISOString());
  const isShorthand =
    opts.sinceLabel && /^\d+[hdw]$/.test(opts.sinceLabel.trim());
  const tail = isShorthand ? ` (last ${opts.sinceLabel})` : "";
  return `period: ${fromLocal} → ${toLocal} local${tail}`;
}

export function renderSummary(
  aggs: SessionAggregate[],
  total: TotalAggregate,
  opts: RenderSummaryOptions,
): string {
  const border = "=".repeat(60);
  const parts: string[] = [];
  parts.push(`koji-lens — analyzed ${aggs.length} session(s)`);
  const periodHeader = buildPeriodHeader(opts);
  if (periodHeader) parts.push(periodHeader);
  parts.push(border);
  parts.push(renderTotalBlock(total, opts));
  parts.push(border);
  if (opts.summaryOnly) {
    return parts.join("\n");
  }
  for (const a of aggs) {
    parts.push("");
    parts.push(renderSessionBlock(a, opts));
  }
  return parts.join("\n");
}
