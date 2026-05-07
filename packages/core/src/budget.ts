import type { SessionAggregate } from "./aggregate.js";

export interface DailyBudgetPoint {
  date: string;
  dailyCostUsd: number;
  cumulativeCostUsd: number;
  forecastCostUsd: number;
}

export interface BudgetForecast {
  budgetUsd: number;
  monthStartIso: string;
  daysElapsed: number;
  daysInMonth: number;
  currentCostUsd: number;
  utilizationPct: number;
  forecastCostUsd: number;
  forecastUtilizationPct: number;
}

export interface BudgetAlert {
  level: "warning" | "critical";
  trigger: "current" | "forecast";
  message: string;
  utilizationPct: number;
}

export function computeBudgetForecast(
  aggs: SessionAggregate[],
  budgetUsd: number,
  now: Date = new Date(),
): BudgetForecast {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysElapsed = now.getUTCDate();

  let currentCost = 0;
  for (const a of aggs) {
    const ts = a.endedAt ?? a.startedAt;
    if (!ts) continue;
    const at = new Date(ts);
    if (Number.isNaN(at.getTime())) continue;
    if (at.getTime() >= monthStart.getTime()) {
      currentCost += a.costUsd;
    }
  }

  const dailyAvg = daysElapsed > 0 ? currentCost / daysElapsed : 0;
  const forecastCost = dailyAvg * daysInMonth;

  return {
    budgetUsd,
    monthStartIso: monthStart.toISOString().slice(0, 10),
    daysElapsed,
    daysInMonth,
    currentCostUsd: currentCost,
    utilizationPct: budgetUsd > 0 ? (currentCost / budgetUsd) * 100 : 0,
    forecastCostUsd: forecastCost,
    forecastUtilizationPct:
      budgetUsd > 0 ? (forecastCost / budgetUsd) * 100 : 0,
  };
}

export function computeDailyBudgetTrend(
  aggs: SessionAggregate[],
  now: Date = new Date(),
): DailyBudgetPoint[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const monthStart = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const daysElapsed = now.getUTCDate();

  const dailyCosts: number[] = new Array(daysElapsed).fill(0);

  for (const a of aggs) {
    const ts = a.endedAt ?? a.startedAt;
    if (!ts) continue;
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) continue;
    if (d.getTime() < monthStart.getTime()) continue;
    const day = d.getUTCDate();
    if (day < 1 || day > daysElapsed) continue;
    dailyCosts[day - 1] += a.costUsd;
  }

  let cumulative = 0;
  const points: DailyBudgetPoint[] = [];
  for (let i = 0; i < daysElapsed; i++) {
    cumulative += dailyCosts[i];
    const dateObj = new Date(Date.UTC(year, month, i + 1));
    const day = i + 1;
    const dailyAvgSoFar = day > 0 ? cumulative / day : 0;
    points.push({
      date: dateObj.toISOString().slice(0, 10),
      dailyCostUsd: dailyCosts[i],
      cumulativeCostUsd: cumulative,
      forecastCostUsd: dailyAvgSoFar * daysInMonth,
    });
  }

  return points;
}

export function checkBudgetAlert(
  forecast: BudgetForecast,
): BudgetAlert | null {
  if (forecast.budgetUsd <= 0) return null;

  if (forecast.utilizationPct >= 100) {
    return {
      level: "critical",
      trigger: "current",
      message: `Budget exceeded: $${forecast.currentCostUsd.toFixed(2)} / $${forecast.budgetUsd.toFixed(2)} (current)`,
      utilizationPct: forecast.utilizationPct,
    };
  }

  if (forecast.forecastUtilizationPct >= 100) {
    return {
      level: "critical",
      trigger: "forecast",
      message: `Forecast to exceed budget: $${forecast.forecastCostUsd.toFixed(2)} / $${forecast.budgetUsd.toFixed(2)} by month-end`,
      utilizationPct: forecast.forecastUtilizationPct,
    };
  }

  if (forecast.forecastUtilizationPct >= 80) {
    return {
      level: "warning",
      trigger: "forecast",
      message: `Forecast at 80%+: $${forecast.forecastCostUsd.toFixed(2)} / $${forecast.budgetUsd.toFixed(2)} by month-end`,
      utilizationPct: forecast.forecastUtilizationPct,
    };
  }

  return null;
}
