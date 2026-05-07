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
  "trend.section_title": "週次トレンド & 帰属判定",
  "trend.pro_badge": "PRO",
  "trend.no_regressions": "直近 4 週で異常検知なし。継続観測中。",
  "trend.regressions_detected": "{n} 件の異常検知",
  "trend.severity_critical": "重大",
  "trend.severity_warning": "警告",
  "trend.attribution_vendor_likely": "vendor 由来候補",
  "trend.attribution_user_likely": "user 由来候補",
  "trend.attribution_ambiguous": "判定困難",
  "trend.pro_locked_title": "Pro 機能: 帰属判定 (Attribution)",
  "trend.pro_locked_body":
    "regression 検出時に「Anthropic 由来候補」か「ユーザー側変化候補」かを 4 軸 (新規 dir / 新規 model / 新規 tool / セッション数変動) から推論します。dev mode では環境変数 KOJI_LENS_PRO=1 で動作確認可能。",
  "trend.weekly_label": "週",
  "trend.cache_hit_label": "cache%",
  "trend.p95_label": "p95",
  "trend.sessions_label": "セッション",
  "budget.section_title": "予算と月末予測",
  "budget.budget_label": "月予算",
  "budget.current_label": "今月の累計",
  "budget.forecast_label": "月末予測",
  "budget.utilization_label": "使用率",
  "budget.days_elapsed": "{n} / {total} 日経過",
  "budget.no_budget_set": "予算未設定",
  "budget.set_budget_hint": "URL に ?budget=200 を追加すると予算管理が有効になります（例: $200 を月予算として設定）",
  "budget.alert_section_pro": "予算アラート",
  "budget.alert_locked_title": "Pro 機能: 予算アラート通知",
  "budget.alert_locked_body":
    "月末予測が予算 80% (warning) / 100% (critical) 到達時に通知。Slack / メール送信は Phase A 完成後の Resend 統合で実装、dev mode では UI 表示のみ。",
  "budget.alert_severity_critical": "critical",
  "budget.alert_severity_warning": "warning",
  "budget.alert_message_critical_current":
    "予算超過: {currentCost} / {budgetUsd}（現在の累計）",
  "budget.alert_message_critical_forecast":
    "月末予測が予算超過: {forecastCost} / {budgetUsd}",
  "budget.alert_message_warning_forecast":
    "月末予測が予算 80%+ 到達: {forecastCost} / {budgetUsd}",
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
  "trend.section_title": "Weekly trend & attribution",
  "trend.pro_badge": "PRO",
  "trend.no_regressions": "No regressions detected in the last 4 weeks. Monitoring continues.",
  "trend.regressions_detected": "{n} regression(s) detected",
  "trend.severity_critical": "critical",
  "trend.severity_warning": "warning",
  "trend.attribution_vendor_likely": "vendor likely",
  "trend.attribution_user_likely": "user likely",
  "trend.attribution_ambiguous": "ambiguous",
  "trend.pro_locked_title": "Pro feature: Attribution",
  "trend.pro_locked_body":
    "Infers whether a regression is vendor-side (Anthropic) or user-side from 4 axes (new dirs / models / tools / session count change). In dev mode, set KOJI_LENS_PRO=1 to enable.",
  "trend.weekly_label": "Week",
  "trend.cache_hit_label": "cache%",
  "trend.p95_label": "p95",
  "trend.sessions_label": "sessions",
  "budget.section_title": "Budget & month-end forecast",
  "budget.budget_label": "Monthly budget",
  "budget.current_label": "Month-to-date",
  "budget.forecast_label": "Forecast",
  "budget.utilization_label": "Utilization",
  "budget.days_elapsed": "Day {n} of {total}",
  "budget.no_budget_set": "No budget set",
  "budget.set_budget_hint":
    "Add ?budget=200 to the URL to enable budget tracking (e.g., $200 as a monthly budget).",
  "budget.alert_section_pro": "Budget alerts",
  "budget.alert_locked_title": "Pro feature: Budget alert notifications",
  "budget.alert_locked_body":
    "Notifies when forecast hits 80% (warning) or 100% (critical) of budget. Slack / email delivery via Resend after Phase A completion; dev mode shows UI only.",
  "budget.alert_severity_critical": "critical",
  "budget.alert_severity_warning": "warning",
  "budget.alert_message_critical_current":
    "Budget exceeded: {currentCost} / {budgetUsd} (current)",
  "budget.alert_message_critical_forecast":
    "Forecast to exceed budget: {forecastCost} / {budgetUsd} by month-end",
  "budget.alert_message_warning_forecast":
    "Forecast at 80%+: {forecastCost} / {budgetUsd} by month-end",
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
