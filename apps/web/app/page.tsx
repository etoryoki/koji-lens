import {
  analyzeDirectory,
  defaultClaudeLogDir,
  formatDuration,
  formatJpy,
  formatUsd,
  type SessionAggregate,
} from "@kojihq/core";
import { CostBarChart, TokensStackedBar, ToolPie } from "./components/Charts";

export const dynamic = "force-dynamic";

const USD_JPY = 155;

export default async function Page() {
  const all = await analyzeDirectory(defaultClaudeLogDir());
  const aggs = all
    .filter((a) => a.assistantTurns > 0 || a.userTurns > 0)
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""))
    .slice(0, 30);

  const totalCost = aggs.reduce((s, a) => s + a.costUsd, 0);
  const totalInput = aggs.reduce((s, a) => s + a.inputTokens, 0);
  const totalOutput = aggs.reduce((s, a) => s + a.outputTokens, 0);
  const totalCacheRead = aggs.reduce((s, a) => s + a.cacheReadTokens, 0);
  const totalCacheCreate = aggs.reduce((s, a) => s + a.cacheCreateTokens, 0);
  const totalDurationMs = aggs.reduce((s, a) => s + a.durationMs, 0);
  const totalAssistant = aggs.reduce((s, a) => s + a.assistantTurns, 0);

  const costChart = aggs.map((a) => ({
    label: a.sessionId.slice(0, 8),
    cost: Number(a.costUsd.toFixed(4)),
  }));

  const tokensChart = aggs.map((a) => ({
    label: a.sessionId.slice(0, 8),
    input: a.inputTokens,
    output: a.outputTokens,
    cacheRead: a.cacheReadTokens,
    cacheCreate: a.cacheCreateTokens,
  }));

  const toolTotals: Record<string, number> = {};
  for (const a of aggs) {
    for (const [k, v] of Object.entries(a.tools)) {
      toolTotals[k] = (toolTotals[k] ?? 0) + v;
    }
  }
  const toolPie = Object.entries(toolTotals)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="space-y-2">
          <div className="text-xs uppercase tracking-widest text-sky-400">
            koji-lens
          </div>
          <h1 className="text-3xl font-semibold">
            Claude Code Session Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            {aggs.length} session(s) (latest 30) · total duration{" "}
            {formatDuration(totalDurationMs)} · cost {formatUsd(totalCost)} (
            {formatJpy(totalCost, USD_JPY)})
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            label="Total cost"
            value={formatUsd(totalCost)}
            sub={formatJpy(totalCost, USD_JPY)}
          />
          <Card label="Assistant turns" value={String(totalAssistant)} />
          <Card
            label="Input + output"
            value={(totalInput + totalOutput).toLocaleString()}
            sub="tokens"
          />
          <Card
            label="Cache read / create"
            value={`${(totalCacheRead / 1_000_000).toFixed(2)}M / ${(totalCacheCreate / 1_000_000).toFixed(2)}M`}
            sub="tokens"
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Cost per session">
            <CostBarChart data={costChart} />
          </Panel>
          <Panel title="Tool usage (top 10)">
            <ToolPie data={toolPie} />
          </Panel>
          <Panel title="Tokens per session (stacked)" className="lg:col-span-2">
            <TokensStackedBar data={tokensChart} />
          </Panel>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Sessions</h2>
          <SessionTable sessions={aggs} />
        </section>

        <footer className="text-xs text-slate-500 pt-8 border-t border-slate-800">
          koji-lens · reads{" "}
          <code className="text-slate-300">~/.claude/projects/**/*.jsonl</code>{" "}
          directly · prices are provisional
        </footer>
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="text-[11px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub ? <div className="text-xs text-slate-400 mt-0.5">{sub}</div> : null}
    </div>
  );
}

function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-900/60 border border-slate-800 rounded-xl p-4 ${className ?? ""}`}
    >
      <div className="text-sm font-medium text-slate-200 mb-3">{title}</div>
      {children}
    </div>
  );
}

function SessionTable({ sessions }: { sessions: SessionAggregate[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-slate-300">
          <tr>
            <th className="text-left px-4 py-2 font-medium">Session</th>
            <th className="text-left px-4 py-2 font-medium">Started</th>
            <th className="text-right px-4 py-2 font-medium">Duration</th>
            <th className="text-right px-4 py-2 font-medium">Turns</th>
            <th className="text-right px-4 py-2 font-medium">Cost</th>
            <th className="text-left px-4 py-2 font-medium">Top tools</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((a) => {
            const topTools = Object.entries(a.tools)
              .sort((x, y) => y[1] - x[1])
              .slice(0, 4)
              .map(([k, v]) => `${k}×${v}`)
              .join(", ");
            return (
              <tr key={a.sessionId} className="border-t border-slate-800">
                <td className="px-4 py-2 font-mono text-xs text-sky-300">
                  {a.sessionId.slice(0, 8)}
                </td>
                <td className="px-4 py-2 text-slate-400">
                  {a.startedAt ?? "-"}
                </td>
                <td className="px-4 py-2 text-right">
                  {formatDuration(a.durationMs)}
                </td>
                <td className="px-4 py-2 text-right">{a.assistantTurns}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {formatUsd(a.costUsd)}
                </td>
                <td className="px-4 py-2 text-slate-300 text-xs">
                  {topTools || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
