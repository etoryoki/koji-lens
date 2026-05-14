import {
  analyzeDirectory,
  checkBudgetAlert,
  computeBudgetForecast,
  defaultClaudeLogDir,
  formatUsd,
  listProjectBudgets,
  loadConfig,
  normalizeDirArg,
  resolveBudgetForProject,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface BudgetOptions {
  budget?: string;
  format: string;
  dir?: string;
  cache: boolean;
  withAlerts?: boolean;
  project?: string;
  list?: boolean;
}

function extractProjectKey(filePath: string): string {
  const m = filePath.match(/[\\/]projects[\\/]([^\\/]+)[\\/]/);
  return m ? m[1] : "(unknown)";
}

function pad(s: string, width: number, rightAlign = false): string {
  if (s.length >= width) return s;
  const padding = " ".repeat(width - s.length);
  return rightAlign ? padding + s : s + padding;
}

export async function budgetCommand(opts: BudgetOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = normalizeDirArg(opts.dir ?? cfg.logDir ?? defaultClaudeLogDir());

  // --list: 全 project budgets 一覧表示 (Pro v0.2 §6.1)
  if (opts.list === true) {
    const projectBudgets = listProjectBudgets(cfg);
    const lines: string[] = [];
    lines.push("koji-lens — configured budgets");
    lines.push("=".repeat(40));
    if (cfg.budgetUsd && cfg.budgetUsd > 0) {
      lines.push(`(legacy)        ${formatUsd(cfg.budgetUsd)}`);
    }
    if (Object.keys(projectBudgets).length === 0) {
      if (!cfg.budgetUsd) {
        lines.push("(no budgets configured)");
      }
    } else {
      const sorted = Object.entries(projectBudgets).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [key, usd] of sorted) {
        const label = key === "_default" ? "(default)" : key;
        lines.push(`${label.padEnd(16)}${formatUsd(usd)}`);
      }
    }
    process.stdout.write(lines.join("\n") + "\n");
    return;
  }

  // Budget 解決優先順:
  //   1. --budget <usd> (一時上書き)
  //   2. KOJI_LENS_BUDGET env
  //   3. config.budgets[--project] (個別プロジェクト予算、Pro v0.2 §6.1)
  //   4. config.budgets._default (全プロジェクト共通)
  //   5. config.budgetUsd (旧フィールド後方互換)
  const budgetUsd = (() => {
    if (opts.budget !== undefined) {
      const n = Number(opts.budget);
      if (!Number.isFinite(n) || n <= 0) {
        throw new Error(
          `Invalid --budget value: "${opts.budget}". Expected positive number (e.g., 200).`,
        );
      }
      return n;
    }
    const envRaw = process.env.KOJI_LENS_BUDGET;
    if (envRaw) {
      const n = Number(envRaw);
      if (Number.isFinite(n) && n > 0) return n;
    }
    const resolved = resolveBudgetForProject(opts.project, cfg);
    if (resolved > 0) return resolved;
    throw new Error(
      "Budget not set. Use one of:\n" +
        "  - `koji-lens budget --budget 200`\n" +
        "  - `koji-lens config set budgetUsd 200` (persistent default)\n" +
        "  - Edit ~/.koji-lens/config.json budgets.<project> = 100\n" +
        "  - export KOJI_LENS_BUDGET=200",
    );
  })();

  // 2026-05-14 (深町 C2 採用): 予算アラート判定結果を Free 開放
  // memory `feedback_pain_point_observation_free_principle.md` 整合
  // 「気付き = Free」原則整合、通知配信 (email / webhook) のみ Pro (Phase B 期間中)
  // 旧設計: `--with-alerts` は KOJI_LENS_PRO 必須 → Free 化、判定結果は誰でも見られる

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

  // --project filter: 該当 project の sessions のみで予算計算
  const filtered = opts.project
    ? all.filter((s) => extractProjectKey(s.filePath) === opts.project)
    : all;

  const forecast = computeBudgetForecast(filtered, budgetUsd);
  const alert = opts.withAlerts ? checkBudgetAlert(forecast) : null;

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          forecast,
          alert,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  // text 出力
  const lines: string[] = [];
  const headerSuffix = opts.project ? ` [project: ${opts.project}]` : "";
  lines.push(`koji-lens — budget tracking${headerSuffix}`);
  lines.push("=".repeat(40));
  lines.push(
    `${pad("month-to-date:", 18)}${pad(formatUsd(forecast.currentCostUsd), 12, true)} / ${pad(formatUsd(forecast.budgetUsd), 10, true)}  (${forecast.utilizationPct.toFixed(1)}%)`,
  );
  lines.push(
    `${pad("forecast:", 18)}${pad(formatUsd(forecast.forecastCostUsd), 12, true)} / ${pad(formatUsd(forecast.budgetUsd), 10, true)}  (${forecast.forecastUtilizationPct.toFixed(1)}%)${forecast.forecastUtilizationPct >= 100 ? " 🚨" : forecast.forecastUtilizationPct >= 80 ? " ⚠️" : ""}`,
  );
  lines.push(
    `${pad("days elapsed:", 18)}${pad(`${forecast.daysElapsed} / ${forecast.daysInMonth}`, 12, true)}`,
  );

  if (alert) {
    lines.push("");
    const icon = alert.level === "critical" ? "🚨" : "⚠️";
    lines.push(`${icon} ${alert.level}: ${alert.message}`);
  } else if (opts.withAlerts) {
    lines.push("");
    lines.push("✅ no alerts (forecast below 80% of budget)");
  }

  if (!opts.withAlerts) {
    lines.push("");
    lines.push(
      "hint: pass --with-alerts for budget alert details (forecast %, warning/critical level). Free feature: notification dispatch (email / webhook) is Pro.",
    );
  }

  process.stdout.write(lines.join("\n") + "\n");
}
