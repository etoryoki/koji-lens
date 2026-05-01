import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const INK = "#1A1715";
const KINARI = "#F2EDE4";

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function onigiriPath(cx: number, cy: number, rx: number, ry: number, jitter = 0, seed = 1): string {
  const rng = mulberry32(seed);
  const N = 24;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const topPinch = 1 - 0.18 * Math.max(0, Math.cos(t));
    const bottomFlatten = 1 - 0.05 * Math.max(0, -Math.cos(t));
    const j = jitter * (rng() - 0.5) * 2;
    const r = 1 + j * 0.06;
    const x = cx + Math.sin(t) * rx * r * topPinch * (1 + 0.04 * Math.sin(t * 2));
    const y = cy - Math.cos(t) * ry * r * bottomFlatten;
    pts.push([x, y]);
  }
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < N; i++) {
    const p0 = pts[(i - 1 + N) % N];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % N];
    const p3 = pts[(i + 2) % N];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  d += " Z";
  return d;
}

export function generateMark13Fragment(opts: { x: number; y: number; width: number; height: number; idSuffix?: string }): string {
  const idSuffix = opts.idSuffix ?? "";
  const rng = mulberry32(91);
  const placed: { x: number; y: number; ang: number; s: number }[] = [];
  let attempts = 0;
  while (placed.length < 70 && attempts < 4000) {
    attempts++;
    const r = 74 * Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.96;
    const inFace = x > 60 && x < 140 && y > 92 && y < 142;
    if (inFace && rng() > 0.15) continue;
    let ok = true;
    for (const p of placed) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < 130) { ok = false; break; }
    }
    if (ok) placed.push({ x, y, ang: rng() * 360, s: 0.85 + rng() * 0.4 });
  }
  const fuzz: { x: number; y: number; sz: number; op: number }[] = [];
  for (let i = 0; i < 80; i++) {
    const a = rng() * Math.PI * 2;
    const r = 70 + rng() * 22;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.95;
    fuzz.push({ x, y, sz: 0.6 + rng() * 1.4, op: 0.25 + rng() * 0.45 });
  }
  const onigiriD = onigiriPath(100, 108, 78, 80, 0, 1);
  const fuzzSvg = fuzz.map((p) => `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.sz.toFixed(2)}" fill="${INK}" opacity="${p.op.toFixed(2)}"/>`).join("");
  const grainsSvg = placed.map((p) => `<ellipse cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" rx="${(5.2 * p.s).toFixed(2)}" ry="${(2.4 * p.s).toFixed(2)}" transform="rotate(${p.ang.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)})" fill="${KINARI}" opacity="0.55"/>`).join("");
  return `<svg x="${opts.x}" y="${opts.y}" width="${opts.width}" height="${opts.height}" viewBox="0 0 200 200"><defs><clipPath id="m13clip${idSuffix}"><path d="${onigiriD}"/></clipPath></defs>${fuzzSvg}<path d="${onigiriD}" fill="${INK}" opacity="0.92"/><g clip-path="url(#m13clip${idSuffix})" opacity="0.78">${grainsSvg}</g><ellipse cx="78" cy="106" rx="5" ry="7" fill="${KINARI}"/><ellipse cx="122" cy="106" rx="5" ry="7" fill="${KINARI}"/><ellipse cx="64" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5"/><ellipse cx="136" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5"/><path d="M 88 134 Q 100 144 112 134" fill="none" stroke="${KINARI}" stroke-width="3" stroke-linecap="round"/></svg>`;
}

function buildMark13Svg(opts: { withBackground: boolean; viewBoxOnly?: boolean } = { withBackground: true }): string {
  const rng = mulberry32(91);
  const placed: { x: number; y: number; ang: number; s: number }[] = [];
  let attempts = 0;
  while (placed.length < 70 && attempts < 4000) {
    attempts++;
    const r = 74 * Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.96;
    const inFace = x > 60 && x < 140 && y > 92 && y < 142;
    if (inFace && rng() > 0.15) continue;
    let ok = true;
    for (const p of placed) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < 130) {
        ok = false;
        break;
      }
    }
    if (ok) placed.push({ x, y, ang: rng() * 360, s: 0.85 + rng() * 0.4 });
  }

  const fuzz: { x: number; y: number; sz: number; op: number }[] = [];
  for (let i = 0; i < 80; i++) {
    const a = rng() * Math.PI * 2;
    const r = 70 + rng() * 22;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.95;
    fuzz.push({ x, y, sz: 0.6 + rng() * 1.4, op: 0.25 + rng() * 0.45 });
  }

  const onigiriD = onigiriPath(100, 108, 78, 80, 0, 1);

  const fuzzSvg = fuzz
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.sz.toFixed(2)}" fill="${INK}" opacity="${p.op.toFixed(2)}"/>`
    )
    .join("");

  const grainsSvg = placed
    .map(
      (p) =>
        `<ellipse cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" rx="${(5.2 * p.s).toFixed(2)}" ry="${(2.4 * p.s).toFixed(2)}" transform="rotate(${p.ang.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)})" fill="${KINARI}" opacity="0.55"/>`
    )
    .join("");

  const bg = opts.withBackground
    ? `<rect width="200" height="200" fill="${KINARI}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="koji">
  ${bg}
  <defs>
    <clipPath id="m13clip"><path d="${onigiriD}"/></clipPath>
  </defs>
  ${fuzzSvg}
  <path d="${onigiriD}" fill="${INK}" opacity="0.92"/>
  <g clip-path="url(#m13clip)" opacity="0.78">${grainsSvg}</g>
  <ellipse cx="78" cy="106" rx="5" ry="7" fill="${KINARI}"/>
  <ellipse cx="122" cy="106" rx="5" ry="7" fill="${KINARI}"/>
  <ellipse cx="64" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5"/>
  <ellipse cx="136" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5"/>
  <path d="M 88 134 Q 100 144 112 134" fill="none" stroke="${KINARI}" stroke-width="3" stroke-linecap="round"/>
</svg>`;
}

function generateKojiMarkTsx(): string {
  const rng = mulberry32(91);
  const placed: { x: number; y: number; ang: number; s: number }[] = [];
  let attempts = 0;
  while (placed.length < 70 && attempts < 4000) {
    attempts++;
    const r = 74 * Math.sqrt(rng());
    const a = rng() * Math.PI * 2;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.96;
    const inFace = x > 60 && x < 140 && y > 92 && y < 142;
    if (inFace && rng() > 0.15) continue;
    let ok = true;
    for (const p of placed) {
      const dx = p.x - x;
      const dy = p.y - y;
      if (dx * dx + dy * dy < 130) { ok = false; break; }
    }
    if (ok) placed.push({ x, y, ang: rng() * 360, s: 0.85 + rng() * 0.4 });
  }
  const fuzz: { x: number; y: number; sz: number; op: number }[] = [];
  for (let i = 0; i < 80; i++) {
    const a = rng() * Math.PI * 2;
    const r = 70 + rng() * 22;
    const x = 100 + Math.cos(a) * r;
    const y = 108 + Math.sin(a) * r * 0.95;
    fuzz.push({ x, y, sz: 0.6 + rng() * 1.4, op: 0.25 + rng() * 0.45 });
  }
  const onigiriD = onigiriPath(100, 108, 78, 80, 0, 1);
  const fuzzJsx = fuzz
    .map((p) => `      <circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="${p.sz.toFixed(2)}" fill="${INK}" opacity="${p.op.toFixed(2)}" />`)
    .join("\n");
  const grainsJsx = placed
    .map((p) => `        <ellipse cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" rx="${(5.2 * p.s).toFixed(2)}" ry="${(2.4 * p.s).toFixed(2)}" transform="rotate(${p.ang.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)})" fill="${KINARI}" opacity="0.55" />`)
    .join("\n");

  return `import { useId } from "react";

interface KojiMarkProps {
  className?: string;
}

export function KojiMark({ className = "size-5" }: KojiMarkProps) {
  const clipId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      className={className}
      role="img"
      aria-label="koji"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="${onigiriD}" />
        </clipPath>
      </defs>
${fuzzJsx}
      <path d="${onigiriD}" fill="${INK}" opacity="0.92" />
      <g clipPath={\`url(#\${clipId})\`} opacity="0.78">
${grainsJsx}
      </g>
      <ellipse cx="78" cy="106" rx="5" ry="7" fill="${KINARI}" />
      <ellipse cx="122" cy="106" rx="5" ry="7" fill="${KINARI}" />
      <ellipse cx="64" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5" />
      <ellipse cx="136" cy="128" rx="6" ry="3" fill="${KINARI}" opacity="0.5" />
      <path d="M 88 134 Q 100 144 112 134" fill="none" stroke="${KINARI}" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
`;
}

const AVATAR_PATH = "C:/Users/User/Desktop/ai-project/ai-company/ceo/assets/brand/bluesky-avatar-v1-draft/01-K-monogram.svg";
const ICON_PATH = resolve(here, "../apps/lp/app/icon.svg");
const TSX_LP_PATH = resolve(here, "../apps/lp/app/components/KojiMark.tsx");
const TSX_WEB_PATH = resolve(here, "../apps/web/app/components/KojiMark.tsx");

const svgWithBg = buildMark13Svg({ withBackground: true });
writeFileSync(AVATAR_PATH, svgWithBg);
console.log(`[build-koji-mark] wrote ${AVATAR_PATH} (${svgWithBg.length.toLocaleString()} bytes)`);

writeFileSync(ICON_PATH, svgWithBg);
console.log(`[build-koji-mark] wrote ${ICON_PATH} (${svgWithBg.length.toLocaleString()} bytes)`);

const tsx = generateKojiMarkTsx();
writeFileSync(TSX_LP_PATH, tsx);
console.log(`[build-koji-mark] wrote ${TSX_LP_PATH} (${tsx.length.toLocaleString()} bytes)`);

writeFileSync(TSX_WEB_PATH, tsx);
console.log(`[build-koji-mark] wrote ${TSX_WEB_PATH} (${tsx.length.toLocaleString()} bytes)`);
