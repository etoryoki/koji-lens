import {
  analyzeDirectory,
  checkBudgetAlert,
  computeBudgetForecast,
  defaultClaudeLogDir,
  formatUsd,
  loadConfig,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface BudgetOptions {
  budget?: string;
  format: string;
  dir?: string;
  cache: boolean;
  withAlerts?: boolean;
}

function pad(s: string, width: number, rightAlign = false): string {
  if (s.length >= width) return s;
  const padding = " ".repeat(width - s.length);
  return rightAlign ? padding + s : s + padding;
}

export async function budgetCommand(opts: BudgetOptions): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();

  // Budget 解決優先順: --budget <usd> > KOJI_LENS_BUDGET env > config.budgetUsd
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
    if (cfg.budgetUsd && Number.isFinite(cfg.budgetUsd) && cfg.budgetUsd > 0) {
      return cfg.budgetUsd;
    }
    throw new Error(
      "Budget not set. Use one of:\n" +
        "  - `koji-lens budget --budget 200`\n" +
        "  - `koji-lens config set budgetUsd 200` (persistent)\n" +
        "  - export KOJI_LENS_BUDGET=200",
    );
  })();

  // Pro feature gate (Phase A 拡張: budget alerts は Pro 通知機能)
  // dev mode: KOJI_LENS_PRO=1 でバイパス
  const isPro = process.env.KOJI_LENS_PRO === "1";
  if (opts.withAlerts && !isPro) {
    throw new Error(
      "--with-alerts is a Pro feature.\n" +
        "  Dev mode: set KOJI_LENS_PRO=1 to enable.\n" +
        "  Production: Pro authentication via Stripe + Clerk (Phase A complete).",
    );
  }

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

  const forecast = computeBudgetForecast(all, budgetUsd);
  const alert =
    opts.withAlerts && isPro ? checkBudgetAlert(forecast) : null;

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
  lines.push("koji-lens — budget tracking");
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
  } else if (opts.withAlerts && isPro) {
    lines.push("");
    lines.push("✅ no alerts (forecast below 80% of budget)");
  }

  if (!opts.withAlerts) {
    lines.push("");
    lines.push(
      "hint: pass --with-alerts for Pro budget alert notifications (requires KOJI_LENS_PRO=1 in dev mode)",
    );
  }

  process.stdout.write(lines.join("\n") + "\n");
}
