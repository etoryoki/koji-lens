import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

export function serveCommand(opts: ServeOptions): void {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const serverPath = resolveStandaloneServer(cliDir);

  if (!serverPath) {
    console.error(
      "Web UI standalone build not found.\n" +
        "  In development: run `pnpm --filter @kojihq/web build` then copy .next/static into .next/standalone/apps/web/.next/static",
    );
    process.exit(1);
  }

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
