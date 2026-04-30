import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SVG_PATH = resolve(here, "../apps/lp/public/og-en.svg");
const PNG_PATH = resolve(here, "../apps/lp/public/og-en.png");

const svg = readFileSync(SVG_PATH);

const resvg = new Resvg(svg, {
  background: "#0f172a",
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: true,
    defaultFontFamily: "Inter",
  },
});

const png = resvg.render().asPng();
writeFileSync(PNG_PATH, png);

console.log(`[build-og-en] wrote ${PNG_PATH} (${png.length.toLocaleString()} bytes)`);
