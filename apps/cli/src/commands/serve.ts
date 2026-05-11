import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  defaultClaudeLogDir,
  writeWebCache,
  type SessionAggregate,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";

export interface ServeOptions {
  port: string;
}

function resolveStandaloneServer(cliDir: string): string | null {
  const candidates = [
    path.resolve(cliDir, "../../web-standalone/apps/web/server.js"),
    path.resolve(cliDir, "../../../web/.next/standalone/apps/web/server.js"),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

async function precomputeWebCache(): Promise<void> {
  const dir = defaultClaudeLogDir();
  if (!existsSync(dir)) {
    console.error(
      `koji-lens: Claude log directory not found at ${dir}\n` +
        "  Make sure Claude Code is installed and has session logs.",
    );
    process.exit(1);
  }

  console.log("koji-lens: precomputing web cache...");
  const cache = openCacheDb();
  let sessions: SessionAggregate[];
  try {
    sessions = await analyzeDirectoryCached(dir, cache.db);
  } finally {
    cache.close();
  }

  await writeWebCache({
    version: 1,
    generatedAt: new Date().toISOString(),
    claudeLogDir: dir,
    sessions,
  });
  console.log(`koji-lens: cached ${sessions.length} session(s) for web UI`);
}

export async function serveCommand(opts: ServeOptions): Promise<void> {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = resolveStandaloneServer(cliDir);

  if (!serverPath) {
    console.error(
      "Web UI standalone build not found.\n" +
        "  In development: run `pnpm --filter @kojihq/web build` then copy .next/static into .next/standalone/apps/web/.next/static",
    );
    process.exit(1);
  }

  await precomputeWebCache();

  const port = Number(opts.port);
  const env = { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" };

  console.log(`koji-lens: starting web UI on http://127.0.0.1:${port}`);

  const child = spawn("node", [serverPath], {
    stdio: "inherit",
    env,
  });

  const shutdown = () => {
    if (!child.killed) child.kill();
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  child.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
