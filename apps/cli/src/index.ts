#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "@kojihq/core";
import { summaryCommand } from "./commands/summary.js";
import { sessionsCommand } from "./commands/sessions.js";
import { sessionCommand } from "./commands/session.js";
import { serveCommand } from "./commands/serve.js";
import { configCommand } from "./commands/config.js";

const program = new Command();

program
  .name("koji-lens")
  .description("Claude Code local usage analyzer")
  .version(VERSION);

program
  .command("summary")
  .description("Show usage summary for the given period")
  .option("--since <expr>", 'Period start: "24h", "7d", "2w", or ISO date', "24h")
  .option("--format <format>", "Output format: text | json", "text")
  .option("--dir <path>", "Claude Code log directory (default: config.logDir or ~/.claude/projects)")
  .option("--usd-jpy <rate>", "USD -> JPY conversion rate (default: config.usdJpy or 155)")
  .option("--no-cache", "Disable SQLite cache (~/.koji-lens/cache.db)")
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
  .option("--since <expr>", 'Period start: "24h", "7d", "2w", or ISO date', "7d")
  .option("--limit <n>", "Max sessions to display", "20")
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
