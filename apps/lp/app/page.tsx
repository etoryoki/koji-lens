import {
  BarChart3,
  DollarSign,
  Github,
  Lock,
  Package,
  Puzzle,
  Terminal,
} from "lucide-react";
import { CopyButton } from "./components/CopyButton";

const INSTALL_CMD = "npm install -g @kojihq/lens";
const GITHUB_URL = "https://github.com/etoryoki/koji-lens";
const NPM_URL = "https://www.npmjs.com/package/@kojihq/lens";
const SUPPORT_EMAIL = "support@kojihq.com";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col">
      <Header />
      <Hero />
      <Problem />
      <Features />
      <Screenshots />
      <InstallSteps />
      <Pricing />
      <Waitlist />
      <Links />
      <Footer />
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-slate-900">
          <Terminal className="size-5 text-blue-600" />
          <span className="font-semibold tracking-tight">koji-lens</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-slate-600">
          <a href="#features" className="hover:text-slate-900">
            機能
          </a>
          <a href="#install" className="hover:text-slate-900">
            インストール
          </a>
          <a href="#pricing" className="hover:text-slate-900">
            料金
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-slate-900"
          >
            <Github className="size-4" />
            GitHub
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            β 公開中 · OSS（MIT）
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
            AI コーディングの使い方を、
            <br className="hidden md:block" />
            見える化する。
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            セッションごとのコスト・トークン・ツール使用を、ローカルで完結するダッシュボードで把握する。
            Claude Code ユーザー向け、オープンソースの観測ツール。
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border border-slate-300 bg-white p-2 shadow-sm">
              <span className="select-none pl-2 font-mono text-sm text-slate-400">
                $
              </span>
              <code className="flex-1 overflow-x-auto whitespace-nowrap text-left font-mono text-sm text-slate-900">
                {INSTALL_CMD}
              </code>
              <CopyButton value={INSTALL_CMD} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#install"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                3 ステップで始める
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                <Github className="size-4" />
                GitHub で見る
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Problem() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ul className="space-y-3 text-lg text-slate-700 md:text-xl">
          <li>Claude Code、月いくら使ってますか？</li>
          <li>何にトークンを使った日が高くついてましたか？</li>
          <li>どのツール呼び出しが時間を食っていますか？</li>
        </ul>
        <p className="mt-8 text-pretty leading-relaxed text-slate-600">
          <span className="font-semibold text-slate-900">koji-lens</span>{" "}
          は、ローカルに保存された Claude Code のセッションログを解析し、
          あなたの AI コーディングの使い方を 1 コマンドで可視化します。
        </p>
      </div>
    </section>
  );
}

type Feature = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
};

const FEATURES: Feature[] = [
  {
    icon: DollarSign,
    title: "コスト可視化",
    body: "セッション単位の入出力トークン・キャッシュ読み書き・推定コスト（USD / JPY）を即座に算出。",
  },
  {
    icon: BarChart3,
    title: "セッション分析",
    body: "直近 7 日 / 30 日のコスト推移、ツール呼び出し分布、コストが突出したセッションの内訳。",
  },
  {
    icon: Lock,
    title: "ローカル完結",
    body: "既定でデータはあなたの PC に閉じる。プロンプト本文は SQLite に保存しない設計。",
  },
  {
    icon: Puzzle,
    title: "拡張性",
    body: "アダプタ式で将来 Cursor / Cline / Aider 等に対応予定。OSS（MIT）で透明。",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            できること
          </h2>
          <p className="mt-3 text-slate-600">
            ターミナル 1 コマンドで、AI コーディングの実態を掴む。
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-slate-200 bg-white p-6"
            >
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {f.title}
              </h3>
              <p className="mt-2 text-pretty leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Screenshots() {
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            実際の画面
          </h2>
          <p className="mt-3 text-slate-600">
            CLI のサマリ出力と、ローカル Web ダッシュボード。
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ScreenshotPlaceholder
            label="CLI: koji-lens summary"
            hint="スクリーンショット Day 2 差し替え予定"
          />
          <ScreenshotPlaceholder
            label="Web: koji-lens serve"
            hint="スクリーンショット Day 2 差し替え予定"
          />
        </div>
      </div>
    </section>
  );
}

function ScreenshotPlaceholder({
  label,
  hint,
}: {
  label: string;
  hint: string;
}) {
  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
        <Terminal className="size-8" />
        <div className="font-mono text-sm text-slate-500">{label}</div>
        <div className="text-xs">{hint}</div>
      </div>
    </div>
  );
}

function InstallSteps() {
  const steps: { n: number; title: string; cmd: string }[] = [
    { n: 1, title: "インストール", cmd: "npm install -g @kojihq/lens" },
    { n: 2, title: "セッションサマリを見る", cmd: "koji-lens summary" },
    { n: 3, title: "ダッシュボードを起動", cmd: "koji-lens serve" },
  ];

  return (
    <section id="install" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            3 ステップで始める
          </h2>
          <p className="mt-3 text-slate-600">
            Claude Code を使っていれば、追加設定なしですぐ動きます。
          </p>
        </div>
        <ol className="space-y-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 md:flex-row md:items-center"
            >
              <div className="flex items-center gap-3 md:w-56">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-blue-600 font-mono text-sm font-semibold text-white">
                  {s.n}
                </span>
                <span className="font-medium text-slate-900">{s.title}</span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 p-2">
                <span className="select-none pl-1 font-mono text-sm text-slate-400">
                  $
                </span>
                <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-slate-900">
                  {s.cmd}
                </code>
                <CopyButton value={s.cmd} />
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

type Plan = {
  name: string;
  price: string;
  unit?: string;
  note?: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "¥0",
    features: [
      "ローカル CLI 全機能",
      "ローカル Web ダッシュボード",
      "Claude Code ログの完全対応",
    ],
  },
  {
    name: "Pro 月額",
    price: "$8",
    unit: "/月",
    features: [
      "クラウド同期（履歴無制限）",
      "複数デバイス同期",
      "CSV / JSON エクスポート",
      "週次 / 月次レポート",
    ],
  },
  {
    name: "Pro 年額",
    price: "$80",
    unit: "/年",
    note: "月額比 16% 割引",
    features: ["Pro 月額のすべて", "年額契約で割安"],
  },
  {
    name: "Pro 生涯（β 限定）",
    price: "$150",
    unit: "一括",
    note: "先着 20 名",
    features: [
      "永続ライセンス",
      "サービス提供期間中は追加課金なし",
      "β 期間中の限定枠",
    ],
    highlight: true,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-4 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            料金
          </h2>
          <p className="mt-3 text-slate-600">
            Pro プランは 2026 年 5 月下旬に提供開始予定。
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                p.highlight
                  ? "relative flex flex-col rounded-xl border-2 border-blue-600 bg-white p-6 shadow-sm"
                  : "flex flex-col rounded-xl border border-slate-200 bg-white p-6"
              }
            >
              {p.highlight ? (
                <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                  β 限定
                </div>
              ) : null}
              <div className="mb-4">
                <div className="font-semibold text-slate-900">{p.name}</div>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {p.price}
                  </span>
                  {p.unit ? (
                    <span className="text-sm text-slate-500">{p.unit}</span>
                  ) : null}
                </div>
                {p.note ? (
                  <div className="mt-1 text-xs text-blue-600">{p.note}</div>
                ) : null}
              </div>
              <ul className="flex-1 space-y-2 text-sm text-slate-600">
                {p.features.map((ft) => (
                  <li key={ft} className="flex gap-2">
                    <span className="mt-1.5 size-1 rounded-full bg-slate-400" />
                    <span>{ft}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Waitlist() {
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Package className="size-3.5" />
            生涯ライセンス先行通知
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            生涯ライセンス（$150）販売開始の通知を受け取る
          </h2>
          <p className="mt-3 text-pretty leading-relaxed text-slate-600">
            先着 20 名限定の生涯ライセンスは、販売開始と同時に枠が埋まる可能性があります。
            メールアドレスを登録しておくと、販売開始の瞬間に通知をお送りします。
          </p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              disabled
              aria-describedby="waitlist-note"
            />
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white opacity-60"
            >
              通知を受け取る
            </button>
          </form>
          <p id="waitlist-note" className="mt-3 text-xs text-slate-500">
            ※ フォーム受付は Day 2 以降に有効化されます（現在は UI プレビュー）。通知メールのみに使用し、登録はいつでも解除可能です。
          </p>
        </div>
      </div>
    </section>
  );
}

function Links() {
  const items = [
    {
      label: "GitHub",
      href: GITHUB_URL,
      desc: "ソースコード・Issue・Discussions",
    },
    {
      label: "npm",
      href: NPM_URL,
      desc: "@kojihq/lens · 最新 β 版",
    },
    {
      label: "ドキュメント",
      href: `${GITHUB_URL}#readme`,
      desc: "README で使い方を確認",
    },
    {
      label: "サポート",
      href: `mailto:${SUPPORT_EMAIL}`,
      desc: SUPPORT_EMAIL,
    },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-slate-900">
          リンク
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          {items.map((it) => (
            <a
              key={it.label}
              href={it.href}
              target={it.href.startsWith("http") ? "_blank" : undefined}
              rel={
                it.href.startsWith("http") ? "noopener noreferrer" : undefined
              }
              className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-400 hover:bg-slate-50"
            >
              <div className="font-medium text-slate-900">{it.label}</div>
              <div className="mt-1 text-sm text-slate-500">{it.desc}</div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-auto bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="text-sm leading-relaxed text-slate-600">
            <div className="font-semibold text-slate-900">koji-lens</div>
            <div className="mt-1">
              Koji が開発・提供する OSS プロジェクトです。
            </div>
            <div className="mt-1">運営: 株式会社クインクエ</div>
            <div className="mt-1">
              お問い合わせ:{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-blue-600 hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <a href="/legal/tos" className="hover:text-slate-900">
              利用規約（準備中）
            </a>
            <a href="/legal/privacy" className="hover:text-slate-900">
              プライバシーポリシー（準備中）
            </a>
            <a href="/legal/tokushoho" className="hover:text-slate-900">
              特定商取引法に基づく表記（準備中）
            </a>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © 2026 Quinque, Inc.
        </div>
      </div>
    </footer>
  );
}
