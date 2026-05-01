import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const FONT_PATH = resolve(here, "../assets/fonts/MPLUSRounded1c-Bold.ttf");

const SVG_PATH = "C:/Users/User/Desktop/ai-project/ai-company/ceo/assets/brand/bluesky-avatar-v1-draft/01-K-monogram.svg";
const PNG_PATH = "C:/Users/User/Desktop/ai-project/ai-company/ceo/assets/brand/bluesky-avatar-v1-draft/01-K-monogram.png";

const svg = readFileSync(SVG_PATH);

const resvg = new Resvg(svg, {
  background: "#0f172a",
  fitTo: { mode: "width", value: 512 },
  font: {
    loadSystemFonts: true,
    fontFiles: [FONT_PATH],
    defaultFontFamily: "Inter",
  },
});

const png = resvg.render().asPng();
writeFileSync(PNG_PATH, png);

console.log(`[build-avatar] wrote ${PNG_PATH} (${png.length.toLocaleString()} bytes)`);
