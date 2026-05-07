type TFn = (key: string, params?: Record<string, string | number>) => string;

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const; // Sun..Sat

const DAY_LABELS_KEYS: Record<(typeof DAYS)[number], string> = {
  0: "heatmap.day_sun",
  1: "heatmap.day_mon",
  2: "heatmap.day_tue",
  3: "heatmap.day_wed",
  4: "heatmap.day_thu",
  5: "heatmap.day_fri",
  6: "heatmap.day_sat",
};

export function HeatmapGrid({
  data,
  t,
}: {
  data: number[][]; // data[day 0-6][hour 0-23] = costUsd
  t: TFn;
}) {
  const flat = data.flat();
  const max = flat.reduce((m, v) => (v > m ? v : m), 0);

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex items-end gap-1 pb-1 pl-12 text-[9px] text-slate-500 tabular-nums">
          {HOURS.map((h) => (
            <div key={h} className="w-5 text-center" style={{ width: "1.25rem" }}>
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {DAYS.map((day) => (
          <div key={day} className="flex items-center gap-1 py-0.5">
            <div className="w-10 text-right text-[10px] text-slate-400">
              {t(DAY_LABELS_KEYS[day])}
            </div>
            {HOURS.map((hour) => {
              const value = data[day]?.[hour] ?? 0;
              const intensity = max > 0 ? value / max : 0;
              const opacity = intensity === 0 ? 0.05 : 0.15 + intensity * 0.85;
              const bg =
                intensity === 0
                  ? "rgba(148, 163, 184, 0.05)"
                  : `rgba(96, 165, 250, ${opacity.toFixed(3)})`;
              return (
                <div
                  key={hour}
                  className="h-5 w-5 rounded"
                  style={{ background: bg, width: "1.25rem", height: "1.25rem" }}
                  title={`${t(DAY_LABELS_KEYS[day])} ${hour}:00 — $${value.toFixed(2)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
