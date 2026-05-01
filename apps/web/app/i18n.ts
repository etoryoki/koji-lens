export type Lang = "ja" | "en";

export const DEFAULT_LANG: Lang = "en";

export function isValidLang(v: string | undefined): v is Lang {
  return v === "ja" || v === "en";
}

export function detectLang(
  searchParamLang: string | undefined,
  acceptLanguage: string | null,
): Lang {
  if (isValidLang(searchParamLang)) return searchParamLang;
  if (acceptLanguage && /\bja\b/i.test(acceptLanguage)) return "ja";
  return DEFAULT_LANG;
}

const ja: Record<string, string> = {
  "header.session_count": "{n} セッション",
  "lang.ja": "JA",
  "lang.en": "EN",
  "disclaimer.title": "参考値の表示について:",
  "disclaimer.body":
    "本ダッシュボードのコスト数値は、トークン量 × Anthropic API レートで算出した換算値です。Claude Pro / Max ご利用の場合、実際のご請求はサブスクリプション料金のみ。表示金額は使用量の目安・モデル使い分けの判断材料としてご活用ください。",
  "kpi.total_cost": "合計コスト",
  "kpi.turns_count": "{n} ターン",
  "kpi.tokens_count": "{n}M トークン",
  "kpi.assistant_turns": "アシスタントターン",
  "kpi.io_tokens": "入出力トークン",
  "kpi.cache_read_create": "キャッシュ 読み / 作成",
  "kpi.tokens_unit": "トークン",
  "chart.cost_trend_hourly": "コスト推移（時間別）",
  "chart.cost_trend_daily": "コスト推移（日別）",
  "chart.model_cost_hourly": "モデル別コスト推移（時間別）",
  "chart.model_cost_daily": "モデル別コスト推移（日別）",
  "chart.tool_top10": "ツール使用（上位 10）",
  "chart.cost_label": "コスト",
  "chart.usage_count": "使用回数",
  "section.session_list": "セッション一覧",
  "filter.period": "期間",
  "filter.project": "プロジェクト",
  "filter.all": "すべて",
  "filter.filtering": "絞り込み中",
  "filter.reset": "デフォルトに戻す",
  "filter.subagents_badge": "+{n} subs",
  "period.24h": "24 時間",
  "period.7d": "7 日",
  "period.30d": "30 日",
  "period.all": "すべて",
  "table.project": "プロジェクト",
  "table.start": "開始",
  "table.duration": "経過時間",
  "table.turns": "ターン",
  "table.cost": "コスト",
  "table.tools_top": "ツール上位",
  "footer.about_path": "{path} をローカルで解析",
  "footer.cost_note": "コストは Anthropic 公式レートの計算値",
};

const en: Record<string, string> = {
  "header.session_count": "{n} sessions",
  "lang.ja": "JA",
  "lang.en": "EN",
  "disclaimer.title": "About displayed costs:",
  "disclaimer.body":
    "Cost figures shown are calculated from token usage × Anthropic API rates. If you're on Claude Pro / Max, your actual bill is just the flat subscription fee. Use these numbers as a reference for usage trends and model selection decisions.",
  "kpi.total_cost": "Total cost",
  "kpi.turns_count": "{n} turns",
  "kpi.tokens_count": "{n}M tokens",
  "kpi.assistant_turns": "Assistant turns",
  "kpi.io_tokens": "I/O tokens",
  "kpi.cache_read_create": "Cache read / create",
  "kpi.tokens_unit": "tokens",
  "chart.cost_trend_hourly": "Cost trend (hourly)",
  "chart.cost_trend_daily": "Cost trend (daily)",
  "chart.model_cost_hourly": "Cost by model (hourly)",
  "chart.model_cost_daily": "Cost by model (daily)",
  "chart.tool_top10": "Top 10 tools used",
  "chart.cost_label": "Cost",
  "chart.usage_count": "Uses",
  "section.session_list": "Sessions",
  "filter.period": "Period",
  "filter.project": "Project",
  "filter.all": "All",
  "filter.filtering": "Filtering",
  "filter.reset": "Reset to default",
  "filter.subagents_badge": "+{n} subs",
  "period.24h": "24h",
  "period.7d": "7d",
  "period.30d": "30d",
  "period.all": "All time",
  "table.project": "Project",
  "table.start": "Started",
  "table.duration": "Duration",
  "table.turns": "Turns",
  "table.cost": "Cost",
  "table.tools_top": "Top tools",
  "footer.about_path": "Analyzes {path} locally",
  "footer.cost_note": "Cost calculated at Anthropic's official rates",
};

const dict: Record<Lang, Record<string, string>> = { ja, en };

export function t(
  lang: Lang,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = dict[lang][key] ?? dict[DEFAULT_LANG][key] ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (acc, [k, v]) =>
      acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
    template,
  );
}
