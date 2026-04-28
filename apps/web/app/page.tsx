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
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex items-center justify-between" role="banner">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-slate-800 text-sm font-bold tracking-tight text-white">
              K
            </span>
            <span className="font-semibold tracking-tight text-white">
              koji-lens
            </span>
          </div>
          <p className="text-xs text-slate-500">
            直近 {aggs.length} セッション
          </p>
        </header>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 md:p-8">
          <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
            合計コスト
          </p>
          <p className="text-4xl font-semibold tracking-tight text-white tabular-nums md:text-5xl">
            {formatUsd(totalCost)}
          </p>
          <p className="mt-1 text-sm text-slate-400 tabular-nums">
            {formatJpy(totalCost, USD_JPY)}
          </p>
          <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-500">
            サブスクリプション（Claude Pro / Max）ご利用の場合、この金額は API
            換算の参考値です。実際のご請求はサブスクリプション料金のみ。
          </p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400 tabular-nums">
            <span>{totalAssistant.toLocaleString()} ターン</span>
            <span>{formatDuration(totalDurationMs)}</span>
            <span>
              {((totalInput + totalOutput) / 1_000_000).toFixed(1)}M トークン
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Card
            label="アシスタントターン"
            value={totalAssistant.toLocaleString()}
          />
          <Card
            label="入出力トークン"
            value={(totalInput + totalOutput).toLocaleString()}
            sub="トークン"
          />
          <Card
            label="キャッシュ 読み / 作成"
            value={`${(totalCacheRead / 1_000_000).toFixed(2)}M / ${(totalCacheCreate / 1_000_000).toFixed(2)}M`}
            sub="トークン"
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel title="セッション別コスト" className="lg:col-span-2">
            <CostBarChart data={costChart} />
          </Panel>
          <Panel title="ツール使用（上位 10）">
            <ToolPie data={toolPie} />
          </Panel>
        </section>

        <section>
          <Panel title="セッション別トークン内訳">
            <TokensStackedBar data={tokensChart} />
          </Panel>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-widest text-slate-400">
            セッション一覧
          </h2>
          <SessionTable sessions={aggs} />
        </section>

        <footer className="flex flex-col gap-1 border-t border-slate-800 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>
            koji-lens ·{" "}
            <code className="text-slate-400">
              ~/.claude/projects/**/*.jsonl
            </code>{" "}
            をローカルで解析
          </span>
          <span>コストは Anthropic 公式レートの計算値</span>
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
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-[11px] uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 text-xs text-slate-400">{sub}</div>
      ) : null}
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
      className={`rounded-xl border border-slate-800 bg-slate-900/60 p-4 ${className ?? ""}`}
    >
      <div className="mb-3 text-sm font-medium text-slate-200">{title}</div>
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
            <th scope="col" className="px-4 py-2 text-left font-medium">
              セッション ID
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              開始
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              経過時間
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              ターン
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              コスト
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              ツール上位
            </th>
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
                <td className="px-4 py-2 font-mono text-xs text-blue-400">
                  {a.sessionId.slice(0, 8)}
                </td>
                <td className="px-4 py-2 text-slate-400 tabular-nums">
                  {a.startedAt ?? "-"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {formatDuration(a.durationMs)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {a.assistantTurns}
                </td>
                <td className="px-4 py-2 text-right font-mono tabular-nums">
                  {formatUsd(a.costUsd)}
                </td>
                <td className="px-4 py-2 text-xs text-slate-300">
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
