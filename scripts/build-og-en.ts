import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateMark13Fragment } from "./build-koji-mark";

const here = dirname(fileURLToPath(import.meta.url));
const SVG_PATH = resolve(here, "../apps/lp/public/og-en.svg");
const PNG_PATH = resolve(here, "../apps/lp/public/og-en.png");
const FONT_PATH = resolve(here, "../assets/fonts/MPLUSRounded1c-Bold.ttf");

const svgRaw = readFileSync(SVG_PATH, "utf-8");
const mark = generateMark13Fragment({ x: 40, y: 40, width: 80, height: 80, idSuffix: "_ogen" });
const svgFinal = svgRaw.includes("<!-- KOJI_MARK -->")
  ? svgRaw.replace("<!-- KOJI_MARK -->", mark)
  : svgRaw;

if (svgRaw !== svgFinal) {
  writeFileSync(SVG_PATH, svgFinal);
  console.log(`[build-og-en] embedded Mark13 fragment into ${SVG_PATH}`);
}

const resvg = new Resvg(Buffer.from(svgFinal), {
  background: "#0f172a",
  fitTo: { mode: "width", value: 1200 },
  font: {
    loadSystemFonts: true,
    fontFiles: [FONT_PATH],
    defaultFontFamily: "Inter",
  },
});

const png = resvg.render().asPng();
writeFileSync(PNG_PATH, png);

console.log(`[build-og-en] wrote ${PNG_PATH} (${png.length.toLocaleString()} bytes)`);
