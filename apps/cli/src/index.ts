#!/usr/bin/env node
import { Command } from "commander";
import { VERSION } from "@kojihq/core";

const program = new Command();

program
  .name("koji-lens")
  .description("Claude Code local usage analyzer")
  .version(VERSION);

program
  .command("summary")
  .description("Show usage summary for the given period")
  .option("--since <date>", "Period start (e.g. 24h, 7d, 2026-04-01)", "24h")
  .option("--format <format>", "Output format: text or json", "text")
  .action((opts: { since: string; format: string }) => {
    console.log("[stub] summary", opts);
  });

program
  .command("sessions")
  .description("List recent sessions")
  .action(() => {
    console.log("[stub] sessions");
  });

program
  .command("session <id>")
  .description("Show detail of a session")
  .action((id: string) => {
    console.log("[stub] session", id);
  });

program
  .command("serve")
  .description("Start local web UI")
  .option("--port <port>", "Port to listen", "3210")
  .action((opts: { port: string }) => {
    console.log("[stub] serve", opts);
  });

program
  .command("config")
  .description("Get/set configuration values")
  .argument("<action>", "get | set")
  .argument("[key]", "config key")
  .argument("[value]", "config value (only for set)")
  .action((action: string, key?: string, value?: string) => {
    console.log("[stub] config", { action, key, value });
  });

program.parse();
