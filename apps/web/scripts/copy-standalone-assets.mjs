import { cpSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, "..");
const standaloneWeb = path.join(webRoot, ".next/standalone/apps/web");

if (!existsSync(standaloneWeb)) {
  console.error(
    `[copy-standalone-assets] ${standaloneWeb} not found. Did you run \`next build\` with output:'standalone'?`,
  );
  process.exit(1);
}

const pairs = [
  {
    src: path.join(webRoot, ".next/static"),
    dest: path.join(standaloneWeb, ".next/static"),
    label: ".next/static",
  },
  {
    src: path.join(webRoot, "public"),
    dest: path.join(standaloneWeb, "public"),
    label: "public",
  },
];

for (const { src, dest, label } of pairs) {
  if (!existsSync(src)) {
    console.log(`[copy-standalone-assets] ${label}: skipped (source missing)`);
    continue;
  }
  cpSync(src, dest, { recursive: true });
  console.log(`[copy-standalone-assets] ${label}: copied -> ${dest}`);
}
