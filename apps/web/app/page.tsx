import { headers } from "next/headers";
import {
  checkBudgetAlert,
  computeBudgetForecast,
  computeDailyBudgetTrend,
  computeWeeklyTrend,
  defaultClaudeLogDir,
  detectTrendRegressionsWithAttribution,
  formatDuration,
  formatJpy,
  formatUsd,
  rollupSubagents,
  type BudgetAlert,
  type BudgetForecast,
  type DailyBudgetPoint,
  type SessionAggregate,
  type SessionAggregateWithChildren,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";
import { AttributionBadge } from "./components/AttributionBadge";
import {
  BudgetTrendChart,
  CostLineChart,
  ModelCostStackedArea,
  ToolPie,
  WeeklyTrendChart,
} from "./components/Charts";
import { KojiMark } from "./components/KojiMark";
import { detectLang, DEFAULT_LANG, t, type Lang } from "./i18n";

export const dynamic = "force-dynamic";

const USD_JPY = 155;

function formatShortDateTime(iso: string | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

function extractProjectKey(filePath: string): string {
  const m = filePath.match(/[\\/]projects[\\/]([^\\/]+)[\\/]/);
  return m ? m[1] : "(unknown)";
}

function projectLabel(key: string): string {
  if (key === "(unknown)") return key;
  const segments = key.split("-").filter((s) => s.length > 0);
  if (segments.length <= 2) return segments.join("-");
  return segments.slice(-2).join("-");
}

type PeriodKey = "24h" | "7d" | "30d" | "all";

const PERIOD_HOURS: Record<Exclude<PeriodKey, "all">, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
};

const PERIOD_KEY_MAP: Record<PeriodKey, string> = {
  "24h": "period.24h",
  "7d": "period.7d",
  "30d": "period.30d",
  all: "period.all",
};

const DEFAULT_PERIOD: PeriodKey = "30d";

function isValidPeriod(v: string | undefined): v is PeriodKey {
  return v === "24h" || v === "7d" || v === "30d" || v === "all";
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{
    project?: string;
    period?: string;
    lang?: string;
    budget?: string;
  }>;
}) {
  const params = (await searchParams) ?? {};
  const headersList = await headers();
  const lang = detectLang(params.lang, headersList.get("accept-language"));
  const _ = (key: string, p?: Record<string, string | number>) => t(lang, key, p);

  const selectedProject = params.project;
  const selectedPeriod: PeriodKey = isValidPeriod(params.period)
    ? params.period
    : DEFAULT_PERIOD;

  const periodSinceIso =
    selectedPeriod === "all"
      ? undefined
      : new Date(
          Date.now() - PERIOD_HOURS[selectedPeriod] * 60 * 60 * 1000,
        ).toISOString();
  const byHour = selectedPeriod === "24h";

  let all: SessionAggregate[];
  const cache = openCacheDb();
  try {
    all = await analyzeDirectoryCached(defaultClaudeLogDir(), cache.db);
  } finally {
    cache.close();
  }
  const rolled = rollupSubagents(all);
  const filteredByActivity = rolled.filter(
    (a) => a.assistantTurns > 0 || a.userTurns > 0,
  );

  const projectCounts = new Map<string, number>();
  for (const a of filteredByActivity) {
    const key = extractProjectKey(a.filePath);
    projectCounts.set(key, (projectCounts.get(key) ?? 0) + 1);
  }
  const projectKeys = [...projectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const filteredAll = filteredByActivity
    .filter((a) =>
      selectedProject ? extractProjectKey(a.filePath) === selectedProject : true,
    )
    .filter((a) =>
      periodSinceIso ? (a.endedAt ?? "") >= periodSinceIso : true,
    )
    .sort((a, b) => (b.endedAt ?? "").localeCompare(a.endedAt ?? ""));

  const aggs = filteredAll.slice(0, 30);

  const totalCost = filteredAll.reduce((s, a) => s + a.costUsd, 0);
  const totalInput = filteredAll.reduce((s, a) => s + a.inputTokens, 0);
  const totalOutput = filteredAll.reduce((s, a) => s + a.outputTokens, 0);
  const totalCacheRead = filteredAll.reduce(
    (s, a) => s + a.cacheReadTokens,
    0,
  );
  const totalCacheCreate = filteredAll.reduce(
    (s, a) => s + a.cacheCreateTokens,
    0,
  );
  const totalDurationMs = filteredAll.reduce((s, a) => s + a.durationMs, 0);
  const totalAssistant = filteredAll.reduce(
    (s, a) => s + a.assistantTurns,
    0,
  );

  function bucketKey(iso: string): string {
    const d = new Date(iso);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    if (byHour) {
      const hh = String(d.getHours()).padStart(2, "0");
      return `${mm}/${dd} ${hh}:00`;
    }
    return `${mm}/${dd}`;
  }

  function shortModelName(model: string): string {
    const m = model.toLowerCase();
    if (m.includes("opus")) return "Opus";
    if (m.includes("sonnet")) return "Sonnet";
    if (m.includes("haiku")) return "Haiku";
    return model;
  }

  const modelCostTotals = new Map<string, number>();
  for (const a of filteredAll) {
    for (const [model, cost] of Object.entries(a.costsByModel)) {
      const k = shortModelName(model);
      modelCostTotals.set(k, (modelCostTotals.get(k) ?? 0) + cost);
    }
  }
  const modelKeys = [...modelCostTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const buckets = new Map<string, { cost: number; byModel: Record<string, number> }>();
  for (const a of filteredAll) {
    const ts = a.endedAt ?? a.startedAt;
    if (!ts) continue;
    const key = bucketKey(ts);
    const b = buckets.get(key) ?? { cost: 0, byModel: {} };
    b.cost += a.costUsd;
    for (const [model, cost] of Object.entries(a.costsByModel)) {
      const k = shortModelName(model);
      b.byModel[k] = (b.byModel[k] ?? 0) + cost;
    }
    buckets.set(key, b);
  }
  const sortedBuckets = [...buckets.entries()].sort((x, y) =>
    x[0].localeCompare(y[0]),
  );

  const costChart = sortedBuckets.map(([label, v]) => ({
    label,
    cost: Number(v.cost.toFixed(4)),
  }));

  const modelCostChart = sortedBuckets.map(([label, v]) => {
    const row: Record<string, number | string> = { label };
    for (const m of modelKeys) {
      row[m] = Number((v.byModel[m] ?? 0).toFixed(4));
    }
    return row;
  });

  const toolTotals: Record<string, number> = {};
  for (const a of filteredAll) {
    for (const [k, v] of Object.entries(a.tools)) {
      toolTotals[k] = (toolTotals[k] ?? 0) + v;
    }
  }
  const toolPie = Object.entries(toolTotals)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const isPro = process.env.KOJI_LENS_PRO === "1";
  const weeklyTrend = computeWeeklyTrend(filteredAll, 4);
  const trendRegressions = detectTrendRegressionsWithAttribution(weeklyTrend, {
    enableAttribution: isPro,
  });

  const budgetUsd = (() => {
    const raw = params.budget ?? process.env.KOJI_LENS_BUDGET;
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : 0;
  })();
  const budgetForecast =
    budgetUsd > 0 ? computeBudgetForecast(rolled, budgetUsd) : null;
  const budgetAlert = budgetForecast ? checkBudgetAlert(budgetForecast) : null;
  const budgetTrend: DailyBudgetPoint[] =
    budgetUsd > 0 ? computeDailyBudgetTrend(rolled) : [];

  const langSwitchHref = (target: Lang) => {
    const search = new URLSearchParams();
    if (selectedProject) search.set("project", selectedProject);
    if (selectedPeriod !== DEFAULT_PERIOD) search.set("period", selectedPeriod);
    search.set("lang", target);
    if (params.budget) search.set("budget", params.budget);
    return `/?${search.toString()}`;
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="flex items-center justify-between" role="banner">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-7 items-center justify-center rounded-md bg-[#F2EDE4]">
              <KojiMark className="size-5" />
            </span>
            <span className="font-semibold tracking-tight text-white">
              koji-lens
            </span>
          </div>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">
              {_("header.session_count", { n: filteredAll.length })}
            </p>
            <span className="text-xs text-slate-600">·</span>
            <div className="flex gap-1 text-xs">
              <a
                href={langSwitchHref("ja")}
                className={
                  lang === "ja"
                    ? "text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
                }
              >
                {_("lang.ja")}
              </a>
              <span className="text-slate-700">/</span>
              <a
                href={langSwitchHref("en")}
                className={
                  lang === "en"
                    ? "text-slate-200"
                    : "text-slate-500 hover:text-slate-300"
                }
              >
                {_("lang.en")}
              </a>
            </div>
          </div>
        </header>

        <aside
          role="note"
          className="rounded-md border border-amber-700/40 bg-amber-950/40 px-4 py-3 text-xs leading-relaxed text-amber-100"
        >
          <span className="font-semibold text-amber-200">
            {_("disclaimer.title")}
          </span>{" "}
          {_("disclaimer.body")}
        </aside>

        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6 md:p-8">
          <p className="mb-1 text-xs uppercase tracking-widest text-slate-500">
            {_("kpi.total_cost")}
          </p>
          <p className="text-4xl font-semibold tracking-tight text-white tabular-nums md:text-5xl">
            {formatUsd(totalCost)}
          </p>
          {lang === "ja" ? (
            <p className="mt-1 text-sm text-slate-400 tabular-nums">
              {formatJpy(totalCost, USD_JPY)}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400 tabular-nums">
            <span>
              {_("kpi.turns_count", { n: totalAssistant.toLocaleString() })}
            </span>
            <span>{formatDuration(totalDurationMs)}</span>
            <span>
              {_("kpi.tokens_count", {
                n: ((totalInput + totalOutput) / 1_000_000).toFixed(1),
              })}
            </span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <Card
            label={_("kpi.assistant_turns")}
            value={totalAssistant.toLocaleString()}
          />
          <Card
            label={_("kpi.io_tokens")}
            value={(totalInput + totalOutput).toLocaleString()}
            sub={_("kpi.tokens_unit")}
          />
          <Card
            label={_("kpi.cache_read_create")}
            value={`${(totalCacheRead / 1_000_000).toFixed(2)}M / ${(totalCacheCreate / 1_000_000).toFixed(2)}M`}
            sub={_("kpi.tokens_unit")}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Panel
            title={
              byHour
                ? _("chart.cost_trend_hourly")
                : _("chart.cost_trend_daily")
            }
            className="lg:col-span-2"
          >
            <CostLineChart
              data={costChart}
              costLabel={_("chart.cost_label")}
            />
          </Panel>
          <Panel title={_("chart.tool_top10")}>
            <ToolPie data={toolPie} usageLabel={_("chart.usage_count")} />
          </Panel>
        </section>

        <section>
          <Panel
            title={
              byHour
                ? _("chart.model_cost_hourly")
                : _("chart.model_cost_daily")
            }
          >
            <ModelCostStackedArea data={modelCostChart} keys={modelKeys} />
          </Panel>
        </section>

        <section>
          <Panel title={_("budget.section_title")}>
            <BudgetView
              forecast={budgetForecast}
              alert={budgetAlert}
              trend={budgetTrend}
              isPro={isPro}
              t={_}
            />
          </Panel>
        </section>

        <section>
          <Panel
            title={
              <span className="inline-flex items-center gap-2">
                {_("trend.section_title")}
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    isPro
                      ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                      : "bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/40"
                  }`}
                >
                  {_("trend.pro_badge")}
                </span>
              </span>
            }
          >
            <div className="mb-4">
              <WeeklyTrendChart
                data={weeklyTrend.weeks.map((w) => ({
                  week: w.weekStartIso,
                  cacheHitRatePct: w.cacheHitRatePct,
                  latencyP95Ms: w.latencyP95Ms,
                }))}
                cacheLabel={_("trend.cache_hit_label")}
                latencyLabel={_("trend.p95_label")}
              />
            </div>

            <TrendTable trend={weeklyTrend} t={_} />

            {trendRegressions.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">
                {_("trend.no_regressions")}
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="text-xs font-medium uppercase tracking-widest text-slate-500">
                  {_("trend.regressions_detected", {
                    n: trendRegressions.length,
                  })}
                </div>
                {trendRegressions.map((r, i) => (
                  <div
                    key={`${r.type}-${i}`}
                    className="rounded-md border border-slate-800 bg-slate-900/40 p-3"
                  >
                    <div className="flex items-start gap-2 text-sm">
                      <span>{r.severity === "critical" ? "🚨" : "⚠️"}</span>
                      <div className="flex-1">
                        <div className="text-slate-200">{r.message}</div>
                        <div className="mt-0.5 text-xs text-slate-400">
                          {r.details}
                        </div>
                      </div>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          r.severity === "critical"
                            ? "bg-red-500/20 text-red-200 ring-1 ring-red-500/40"
                            : "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                        }`}
                      >
                        {r.severity === "critical"
                          ? _("trend.severity_critical")
                          : _("trend.severity_warning")}
                      </span>
                    </div>
                    {isPro && r.attribution ? (
                      <AttributionBadge attribution={r.attribution} t={_} />
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {!isPro ? (
              <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="text-xs font-medium text-amber-200">
                  🔒 {_("trend.pro_locked_title")}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">
                  {_("trend.pro_locked_body")}
                </div>
              </div>
            ) : null}
          </Panel>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400">
              {_("section.session_list")}
            </h2>
            {selectedProject || selectedPeriod !== DEFAULT_PERIOD ? (
              <p className="text-xs text-slate-500">
                {_("filter.filtering")}{" "}
                ·{" "}
                <a
                  href={buildHref({ lang, budget: params.budget })}
                  className="text-blue-400 hover:underline"
                >
                  {_("filter.reset")}
                </a>
              </p>
            ) : null}
          </div>
          <PeriodFilter
            selected={selectedPeriod}
            project={selectedProject}
            lang={lang}
            budget={params.budget}
            t={_}
          />
          <ProjectFilter
            projectKeys={projectKeys}
            selected={selectedProject}
            counts={projectCounts}
            period={selectedPeriod}
            lang={lang}
            budget={params.budget}
            t={_}
          />
          <SessionTable sessions={aggs} t={_} />
        </section>

        <footer className="flex flex-col gap-1 border-t border-slate-800 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>
            koji-lens ·{" "}
            {_("footer.about_path", { path: "~/.claude/projects/**/*.jsonl" })
              .split("~/.claude/projects/**/*.jsonl")
              .map((part, i, arr) => (
                <span key={i}>
                  {part}
                  {i < arr.length - 1 ? (
                    <code className="text-slate-400">
                      ~/.claude/projects/**/*.jsonl
                    </code>
                  ) : null}
                </span>
              ))}
          </span>
          <span>{_("footer.cost_note")}</span>
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
  title: React.ReactNode;
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

function BudgetView({
  forecast,
  alert,
  trend,
  isPro,
  t,
}: {
  forecast: BudgetForecast | null;
  alert: BudgetAlert | null;
  trend: DailyBudgetPoint[];
  isPro: boolean;
  t: TFn;
}) {
  if (!forecast) {
    return (
      <div className="rounded-md border border-slate-700/50 bg-slate-800/30 p-3 text-xs text-slate-400">
        <div className="font-medium text-slate-300">
          {t("budget.no_budget_set")}
        </div>
        <div className="mt-1 leading-relaxed">{t("budget.set_budget_hint")}</div>
      </div>
    );
  }

  const usagePct = Math.min(forecast.utilizationPct, 100);
  const forecastPct = Math.min(forecast.forecastUtilizationPct, 200);
  const barColor =
    forecastPct >= 100
      ? "bg-red-500"
      : forecastPct >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BudgetCard
          label={t("budget.budget_label")}
          value={formatUsd(forecast.budgetUsd)}
          sub={t("budget.days_elapsed", {
            n: forecast.daysElapsed,
            total: forecast.daysInMonth,
          })}
        />
        <BudgetCard
          label={t("budget.current_label")}
          value={formatUsd(forecast.currentCostUsd)}
          sub={`${forecast.utilizationPct.toFixed(0)}%`}
        />
        <BudgetCard
          label={t("budget.forecast_label")}
          value={formatUsd(forecast.forecastCostUsd)}
          sub={`${forecast.forecastUtilizationPct.toFixed(0)}%`}
          highlight={forecastPct >= 80}
        />
      </div>

      {trend.length > 0 ? (
        <div>
          <div className="mb-2 text-[10px] uppercase tracking-widest text-slate-500">
            {t("budget.trend_chart_title")}
          </div>
          <BudgetTrendChart
            data={trend}
            budgetUsd={forecast.budgetUsd}
            cumulativeLabel={t("budget.trend_cumulative_label")}
            forecastLabel={t("budget.trend_forecast_label")}
            budgetLabel={t("budget.trend_budget_label")}
          />
        </div>
      ) : null}

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
          <span>{t("budget.utilization_label")}</span>
          <span className="tabular-nums">
            {forecast.utilizationPct.toFixed(0)}% / forecast{" "}
            {forecast.forecastUtilizationPct.toFixed(0)}%
          </span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="absolute inset-y-0 left-0 bg-slate-600/60"
            style={{ width: `${Math.min(forecastPct / 2, 100)}%` }}
          />
          <div
            className={`absolute inset-y-0 left-0 ${barColor}`}
            style={{ width: `${usagePct / 2}%` }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-slate-300"
            style={{ left: "50%" }}
            title="100% budget"
          />
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-slate-400">
          <span>{t("budget.alert_section_pro")}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
              isPro
                ? "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40"
                : "bg-slate-700/40 text-slate-400 ring-1 ring-slate-600/40"
            }`}
          >
            {t("trend.pro_badge")}
          </span>
        </div>

        {alert ? (
          isPro ? (
            <div
              className={`rounded-md p-3 text-sm ${
                alert.level === "critical"
                  ? "border border-red-500/30 bg-red-500/10 text-red-200"
                  : "border border-amber-500/30 bg-amber-500/10 text-amber-200"
              }`}
            >
              <div className="flex items-start gap-2">
                <span>{alert.level === "critical" ? "🚨" : "⚠️"}</span>
                <div className="flex-1">
                  <div className="font-medium">
                    {alert.level === "critical"
                      ? t("budget.alert_severity_critical")
                      : t("budget.alert_severity_warning")}
                  </div>
                  <div className="mt-1 text-xs leading-relaxed">
                    {t(
                      `budget.alert_message_${alert.level}_${alert.trigger}`,
                      {
                        currentCost: formatUsd(forecast.currentCostUsd),
                        forecastCost: formatUsd(forecast.forecastCostUsd),
                        budgetUsd: formatUsd(forecast.budgetUsd),
                      },
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="text-xs font-medium text-amber-200">
                🔒 {t("budget.alert_locked_title")}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-slate-400">
                {t("budget.alert_locked_body")}
              </div>
            </div>
          )
        ) : (
          <p className="text-xs text-slate-500">
            {forecast.forecastUtilizationPct < 80
              ? "—"
              : t("budget.alert_severity_warning")}
          </p>
        )}
      </div>
    </div>
  );
}

function BudgetCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        highlight
          ? "border-amber-500/40 bg-amber-500/5"
          : "border-slate-800 bg-slate-900/40"
      }`}
    >
      <div className="text-[10px] uppercase tracking-widest text-slate-500">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">
        {value}
      </div>
      {sub ? <div className="text-xs text-slate-400">{sub}</div> : null}
    </div>
  );
}

function TrendTable({
  trend,
  t,
}: {
  trend: { weeks: { weekStartIso: string; sessionsCount: number; cacheHitRatePct: number; latencyP95Ms: number }[] };
  t: TFn;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800">
      <table className="w-full text-xs">
        <thead className="bg-slate-900/80 text-slate-400">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              {t("trend.weekly_label")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("trend.sessions_label")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("trend.cache_hit_label")}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              {t("trend.p95_label")} (ms)
            </th>
          </tr>
        </thead>
        <tbody>
          {trend.weeks.map((w) => (
            <tr key={w.weekStartIso} className="border-t border-slate-800">
              <td className="px-3 py-1.5 font-mono text-slate-300">
                {w.weekStartIso}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                {w.sessionsCount}
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                {w.cacheHitRatePct.toFixed(1)}%
              </td>
              <td className="px-3 py-1.5 text-right tabular-nums text-slate-300">
                {w.latencyP95Ms}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type TFn = (key: string, params?: Record<string, string | number>) => string;

function buildHref(params: {
  project?: string;
  period?: PeriodKey;
  lang?: Lang;
  budget?: string;
}): string {
  const search = new URLSearchParams();
  if (params.project) search.set("project", params.project);
  if (params.period && params.period !== DEFAULT_PERIOD) {
    search.set("period", params.period);
  }
  if (params.lang && params.lang !== DEFAULT_LANG) {
    search.set("lang", params.lang);
  }
  if (params.budget) search.set("budget", params.budget);
  const qs = search.toString();
  return qs ? `/?${qs}` : "/";
}

function PeriodFilter({
  selected,
  project,
  lang,
  budget,
  t,
}: {
  selected: PeriodKey;
  project: string | undefined;
  lang: Lang;
  budget: string | undefined;
  t: TFn;
}) {
  const periods: PeriodKey[] = ["24h", "7d", "30d", "all"];
  return (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">
        {t("filter.period")}
      </span>
      {periods.map((p) => {
        const isActive = selected === p;
        return (
          <a
            key={p}
            href={buildHref({ project, period: p, lang, budget })}
            className={`rounded-md px-2.5 py-1 text-xs ${
              isActive
                ? "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/40"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {t(PERIOD_KEY_MAP[p])}
          </a>
        );
      })}
    </div>
  );
}

function ProjectFilter({
  projectKeys,
  selected,
  counts,
  period,
  lang,
  budget,
  t,
}: {
  projectKeys: string[];
  selected: string | undefined;
  counts: Map<string, number>;
  period: PeriodKey;
  lang: Lang;
  budget: string | undefined;
  t: TFn;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">
        {t("filter.project")}
      </span>
      <a
        href={buildHref({ period, lang, budget })}
        className={`rounded-md px-2.5 py-1 text-xs ${
          !selected
            ? "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/40"
            : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
        }`}
      >
        {t("filter.all")}
      </a>
      {projectKeys.map((key) => {
        const isActive = selected === key;
        const count = counts.get(key) ?? 0;
        return (
          <a
            key={key}
            href={buildHref({ project: key, period, lang, budget })}
            title={key}
            className={`rounded-md px-2.5 py-1 text-xs ${
              isActive
                ? "bg-blue-500/20 text-blue-200 ring-1 ring-blue-500/40"
                : "bg-slate-800/60 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {projectLabel(key)}{" "}
            <span className="text-slate-500">({count})</span>
          </a>
        );
      })}
    </div>
  );
}

function SessionTable({
  sessions,
  t,
}: {
  sessions: SessionAggregateWithChildren[];
  t: TFn;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900 text-slate-300">
          <tr>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              {t("table.project")}
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              {t("table.start")}
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              {t("table.duration")}
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              {t("table.turns")}
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              {t("table.cost")}
            </th>
            <th scope="col" className="px-4 py-2 text-left font-medium">
              {t("table.tools_top")}
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
            const projectKey = extractProjectKey(a.filePath);
            return (
              <tr key={a.sessionId} className="border-t border-slate-800">
                <td
                  className="px-4 py-2 text-xs text-slate-300"
                  title={projectKey}
                >
                  {projectLabel(projectKey)}
                </td>
                <td className="px-4 py-2 tabular-nums">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-200">
                      {formatShortDateTime(a.startedAt ?? undefined)}
                    </span>
                    {a.subagents.length > 0 ? (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {t("filter.subagents_badge", {
                          n: a.subagents.length,
                        })}
                      </span>
                    ) : null}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500">
                    {a.sessionId.slice(0, 8)}
                  </div>
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
