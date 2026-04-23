import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

flattenPnpmModules(path.join(target, "node_modules"));

console.log(`[bundle-web-standalone] Bundled -> ${target}`);
console.log(
  `[bundle-web-standalone] Resolved server entry: ${path.join(target, "apps/web/server.js")}`,
);

function pnpmEntryToPackageName(entry) {
  const scoped = entry.match(/^(@[^+]+)\+([^@]+)@/);
  if (scoped) return `${scoped[1]}/${scoped[2]}`;
  const plain = entry.match(/^([^@]+)@/);
  return plain ? plain[1] : null;
}

function flattenPnpmModules(nodeModulesDir) {
  const pnpmDir = path.join(nodeModulesDir, ".pnpm");
  if (!existsSync(pnpmDir)) {
    console.warn(
      "[bundle-web-standalone] No .pnpm directory found; skip flatten.",
    );
    return;
  }

  let copied = 0;
  for (const entry of readdirSync(pnpmDir)) {
    if (entry === "node_modules") continue;
    const pkgName = pnpmEntryToPackageName(entry);
    if (!pkgName) continue;

    const src = path.join(pnpmDir, entry, "node_modules", pkgName);
    if (!existsSync(src)) continue;

    const dst = path.join(nodeModulesDir, pkgName);
    if (existsSync(dst)) continue;

    mkdirSync(path.dirname(dst), { recursive: true });
    cpSync(src, dst, { recursive: true, dereference: true });
    copied += 1;
  }

  console.log(
    `[bundle-web-standalone] Flattened ${copied} pnpm entries into top-level node_modules`,
  );
}
