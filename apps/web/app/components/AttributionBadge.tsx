import type { TrendAttribution } from "@kojihq/core";

type TFn = (key: string, params?: Record<string, string | number>) => string;

const VERDICT_STYLES: Record<
  TrendAttribution["verdict"],
  { icon: string; bg: string; text: string; ring: string }
> = {
  vendor_likely: {
    icon: "🛰",
    bg: "bg-amber-500/10",
    text: "text-amber-200",
    ring: "ring-amber-500/30",
  },
  user_likely: {
    icon: "👤",
    bg: "bg-blue-500/10",
    text: "text-blue-200",
    ring: "ring-blue-500/30",
  },
  ambiguous: {
    icon: "❔",
    bg: "bg-slate-500/10",
    text: "text-slate-300",
    ring: "ring-slate-500/30",
  },
};

export function AttributionBadge({
  attribution,
  t,
}: {
  attribution: TrendAttribution;
  t: TFn;
}) {
  const s = VERDICT_STYLES[attribution.verdict];
  const verdictKey = `trend.attribution_${attribution.verdict}`;
  return (
    <div
      className={`mt-2 inline-flex items-start gap-2 rounded-md px-2.5 py-1.5 text-xs ${s.bg} ${s.text} ring-1 ${s.ring}`}
    >
      <span className="leading-tight">{s.icon}</span>
      <span className="leading-tight">
        <span className="font-medium">{t(verdictKey)}</span>
        <span className="ml-1.5 text-slate-400">— {attribution.reasoning}</span>
      </span>
    </div>
  );
}
