import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const cliRoot = path.resolve(here, "..");
const repoRoot = path.resolve(cliRoot, "../..");
const webStandaloneRoot = path.join(repoRoot, "apps/web/.next/standalone");
const target = path.join(cliRoot, "web-standalone");

if (!existsSync(webStandaloneRoot)) {
  console.warn(
    `[bundle-web-standalone] ${webStandaloneRoot} not found. Skipping bundle.`,
  );
  console.warn(
    "[bundle-web-standalone] Run `pnpm --filter @kojihq/web build` first if you intend to publish.",
  );
  process.exit(0);
}

if (existsSync(target)) {
  rmSync(target, { recursive: true, force: true });
}

cpSync(webStandaloneRoot, target, { recursive: true });

const serverJsPath = path.join(target, "apps/web/server.js");
if (existsSync(serverJsPath)) {
  const original = readFileSync(serverJsPath, "utf8");
  const sanitized = original
    .replace(/"outputFileTracingRoot":"[^"]*"/g, '"outputFileTracingRoot":"./"')
    .replace(/"turbopack":\{"root":"[^"]*"\}/g, '"turbopack":{"root":"./"}');
  if (sanitized !== original) {
    writeFileSync(serverJsPath, sanitized);
    console.log(
      "[bundle-web-standalone] Sanitized build-machine absolute paths in server.js",
    );
  }
}

console.log(`[bundle-web-standalone] Bundled -> ${target}`);
console.log(
  `[bundle-web-standalone] Resolved server entry: ${path.join(target, "apps/web/server.js")}`,
);
