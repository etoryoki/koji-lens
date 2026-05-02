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
  .command("statusline")
  .description(
    "Print a one-line savings status for Claude Code statusLine integration (this month vs last month)",
  )
  .option("--format <format>", "Output format: statusline | json", "statusline")
  .option("--dir <path>", "Claude Code log directory")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
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
