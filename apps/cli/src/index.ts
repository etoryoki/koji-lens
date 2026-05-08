#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { summaryCommand } from "./commands/summary.js";
import { sessionsCommand } from "./commands/sessions.js";
import { sessionCommand } from "./commands/session.js";
import { serveCommand } from "./commands/serve.js";
import { configCommand } from "./commands/config.js";
import { compareCommand } from "./commands/compare.js";
import { statuslineCommand } from "./commands/statusline.js";
import { trendCommand } from "./commands/trend.js";
import { budgetCommand } from "./commands/budget.js";
import { exportCommand } from "./commands/export.js";

const pkgPath = fileURLToPath(new URL("../package.json", import.meta.url));
const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };

const program = new Command();

program
  .name("koji-lens")
  .description("Claude Code local usage analyzer")
  .version(pkg.version);

program
  .command("summary")
  .description("Show usage summary for the given period")
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (months/years not supported — use ISO date for longer ranges)',
    "24h",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory (default: config.logDir or ~/.claude/projects)")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate (default: config.usdJpy or 155)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option("--summary-only", "Show TOTAL only (skip per-session details)")
  .action(async (opts) => {
    try {
      await summaryCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("sessions")
  .description("List recent sessions")
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (months/years not supported — use ISO date for longer ranges)',
    "7d",
  )
  .option("--limit <n>", "Max sessions to display", "10")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (opts) => {
    try {
      await sessionsCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("session <id>")
  .description("Show detail of a session")
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory (default: config.logDir or ~/.claude/projects)")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate (default: config.usdJpy or 155)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (id: string, opts) => {
    try {
      await sessionCommand(id, opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("compare")
  .description(
    "Compare usage between two periods (e.g. before/after Sonnet migration)",
  )
  .requiredOption(
    "--before <range>",
    "Before period (YYYY-MM-DD..YYYY-MM-DD format)",
  )
  .requiredOption(
    "--after <range>",
    "After period (YYYY-MM-DD..YYYY-MM-DD format)",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .action(async (opts) => {
    try {
      await compareCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("trend")
  .description(
    "Show weekly trend of cost / cache hit rate / latency / model changes (regression detection across N weeks)",
  )
  .option("--weeks <num>", "Number of weeks to display (1-52)", "4")
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--with-attribution",
    "[Pro] Attribute regressions to vendor (Anthropic) or user-side changes — requires KOJI_LENS_PRO=1 in dev mode",
  )
  .action(async (opts) => {
    try {
      await trendCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("budget")
  .description(
    "Show month-to-date cost vs monthly budget + linear forecast to month-end",
  )
  .option(
    "--budget <usd>",
    "Monthly budget in USD (e.g., 200). Overrides KOJI_LENS_BUDGET env / config.budgetUsd",
  )
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--with-alerts",
    "[Pro] Show budget alerts when forecast >= 80% (warning) or >= 100% (critical) — requires KOJI_LENS_PRO=1 in dev mode",
  )
  .option(
    "--project <key>",
    "[Pro] Filter sessions to a specific project key + use config.budgets[<key>] (Pro v0.2 §6.1)",
  )
  .option(
    "--list",
    "Show all configured budgets (default + per-project) without computing forecast",
  )
  .action(async (opts) => {
    try {
      await budgetCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("export")
  .description(
    "Export session aggregates as CSV or JSON for external analysis (data ownership)",
  )
  .option(
    "--since <expr>",
    'Period start: "Nh" / "Nd" / "Nw" or ISO date (default: 30 days)',
    "30d",
  )
  .option("--format <format>", "Output format: csv | json", "csv")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--output <file>",
    "Write to file instead of stdout (e.g., --output sessions.csv)",
  )
  .action(async (opts) => {
    try {
      await exportCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("statusline")
  .description(
    "Print a one-line savings status for Claude Code statusLine integration (this month vs last month)",
  )
  .option(
    "--mode <mode>",
    "Display density: minimal (icon only) | normal (icon + %) | detailed (icon + % + amount)",
    "normal",
  )
  .option("--format <format>", "Output format: statusline | json", "statusline")
  .option("--dir <path>", "Claude Code log directory")
  .option(
    "--state-file <path>",
    "Path to agent-state JSON written by Claude Code hooks (default: ~/.koji-lens/state.json)",
  )
  .option("--no-state", "Skip agent-state lookup (suppress ⚡/💤/🛑 icon)")
  .option("--no-cache-rate", "Suppress cache hit rate signal (💎 X%)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
  .option(
    "--buddy",
    "Enable koji-buddy decoration suffix (🍙·/+/✦/★/★★ for Lv1-5, appended to statusline tail). Persistent: set KOJI_LENS_BUDDY=1 in env",
  )
  .option(
    "--buddy-speech",
    "Show buddy saying inline (e.g., 🍙· \"いい発酵中…\")",
  )
  .option(
    "--buddy-type <type>",
    "Buddy character: koji (default, Phase α) | owl (Phase β) | cat (Phase β)",
    "koji",
  )
  .action(async (opts) => {
    try {
      await statuslineCommand(opts);
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program
  .command("serve")
  .description("Start local web UI")
  .option("--port <port>", "Port to listen", "3210")
  .action((opts) => {
    serveCommand(opts);
  });

program
  .command("config")
  .description("Manage configuration at ~/.koji-lens/config.json")
  .argument("<action>", "get | set | unset | list | path")
  .argument("[key]", "config key (logDir | usdJpy)")
  .argument("[value]", "config value (for set)")
  .action((action: string, key?: string, value?: string) => {
    configCommand(action, key, value);
  });

program.parseAsync().catch((err) => {
  console.error(err);
  process.exit(1);
});
