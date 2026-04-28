import { BarChart3, Bell, Github, Lock, Puzzle, Wallet } from "lucide-react";
import { CopyButton } from "./components/CopyButton";
import { WaitlistForm } from "./components/WaitlistForm";

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
    <header className="border-b border-slate-800 bg-[#0f172a]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 text-white">
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-slate-800 font-bold tracking-tight">
            K
          </span>
          <span className="font-semibold tracking-tight">koji-lens</span>
        </div>
        <nav className="flex items-center gap-5 text-sm text-slate-300">
          <a href="#features" className="transition hover:text-white">
            機能
          </a>
          <a href="/docs" className="transition hover:text-white">
            ドキュメント
          </a>
          <a href="#pricing" className="transition hover:text-white">
            料金
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-white"
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
    <section className="border-b border-slate-800 bg-[#0f172a]">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs text-slate-300">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            β 公開中 · OSS（MIT）
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
            月末に驚く前に、今日知る。
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 md:text-lg">
            Claude Code のセッションログをローカルで解析し、
            <br className="hidden md:block" />
            コスト・トークン・ツール使用を 1 コマンドで可視化する。
          </p>

          <div className="mt-10 flex flex-col items-center gap-3">
            <div className="flex w-full max-w-xl items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2 shadow-lg">
              <span className="select-none pl-2 font-mono text-sm text-blue-400">
                $
              </span>
              <code className="flex-1 overflow-x-auto whitespace-nowrap text-left font-mono text-sm text-slate-100">
                {INSTALL_CMD}
              </code>
              <CopyButton value={INSTALL_CMD} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#install"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
              >
                3 ステップで始める
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
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
    icon: Wallet,
    title: "今月いくら使ったか",
    body: "セッションごとの USD / JPY 換算コストと TOTAL 集計を即表示。月末の Anthropic 請求と照合できます。",
  },
  {
    icon: BarChart3,
    title: "どの作業が高くついたか",
    body: "過去 7 / 30 日のコスト推移とツール呼び出し分布。突出したセッションをワンクリックで掘れます。",
  },
  {
    icon: Lock,
    title: "データはあなたの PC だけに留まる",
    body: "クラウドへの送信なし。プロンプト本文は SQLite に保存しない設計。安心して全ログを解析できます。",
  },
  {
    icon: Puzzle,
    title: "Claude Code に今日使えて、明日も使える",
    body: "Claude Code のログ形式に完全対応。Cursor / Cline 対応も OSS で開発中（MIT ライセンス）。",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            インストールして 1 分で分かること
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
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-slate-900 text-blue-400">
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
            実際に動かすと、こう見える。
          </h2>
          <p className="mt-3 text-slate-600">
            インストールしてすぐ、こんな出力が得られます。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TerminalPane title="koji-lens summary --since 24h">
            <Line>{"$ koji-lens summary --since 24h"}</Line>
            <Line className="text-slate-400">
              koji-lens — analyzed 15 session(s)
            </Line>
            <Line className="text-slate-600">
              ============================================================
            </Line>
            <Line>{" "}</Line>
            <Line className="text-slate-300">
              Session 055a662d-f09c-4541-...
            </Line>
            <Line className="text-slate-400">{"  duration: 5m 51s"}</Line>
            <Line className="text-slate-400">
              {"  cost:     "}
              <Cost>$6.5186</Cost>
              {" (¥1,010)"}
            </Line>
            <Line className="text-slate-400">
              {"  tools:    Bash×6, Read×4"}
            </Line>
            <Line>{" "}</Line>
            <Line className="text-slate-300">
              Session 28cf16fa-26f8-4182-...
            </Line>
            <Line className="text-slate-400">{"  duration: 7h 38m 22s"}</Line>
            <Line className="text-slate-400">
              {"  cost:     "}
              <Cost>$420.6613</Cost>
              {" (¥65,202)"}
            </Line>
            <Line className="text-slate-400">
              {"  tools:    Bash×102, Edit×89, Read×59..."}
            </Line>
            <Line>{" "}</Line>
            <Line className="text-slate-500">{"(以下 13 セッション省略)"}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-600">
              ============================================================
            </Line>
            <Line className="font-semibold text-slate-100">TOTAL</Line>
            <Line className="text-slate-300">{"  sessions:  15"}</Line>
            <Line className="text-slate-300">{"  duration:  16h 24m 10s"}</Line>
            <Line className="text-slate-300">
              {"  cost:      "}
              <Cost>$874.1162</Cost>
              {" (¥135,488)"}
            </Line>
            <Line className="text-slate-300">
              {"  models:    opus×1562, sonnet×60"}
            </Line>
            <Line>{" "}</Line>
            <Line className="text-slate-500">
              {"  note: Cost is API-rate equivalent."}
            </Line>
            <Line className="text-slate-500">
              {"        Subscribers pay a flat fee regardless."}
            </Line>
          </TerminalPane>

          <TerminalPane title="koji-lens sessions --since 24h --limit 5">
            <Line>{"$ koji-lens sessions --since 24h --limit 5"}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-400">
              {"055a662d-...  duration=8m 58s     "}
              <Cost>cost=$9.6253</Cost>
            </Line>
            <Line className="text-slate-400">
              {"44c29745-...  duration=1h 7m 33s  "}
              <Cost>cost=$32.7546</Cost>
            </Line>
            <Line className="text-slate-300">
              {"28cf16fa-...  duration=7h 38m 22s "}
              <Cost>cost=$420.6613</Cost>
              <span className="text-amber-300">{"  ← 突出セッション"}</span>
            </Line>
            <Line className="text-slate-400">
              {"agent-a94b...  duration=1m 9s     "}
              <Cost>cost=$0.2880</Cost>
              <span className="text-slate-500">{"  (subagent)"}</span>
            </Line>
            <Line className="text-slate-400">
              {"22a919c7-...  duration=12m 4s     "}
              <Cost>cost=$20.7381</Cost>
            </Line>
            <Line className="text-slate-500">
              {"... (10 more; use --limit to show more)"}
            </Line>
            <Line>{" "}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-500">
              {"# 同じデータをチャートで見るなら:"}
            </Line>
            <Line>{"$ koji-lens serve"}</Line>
            <Line className="text-slate-400">
              {"  Server running at http://localhost:3210"}
            </Line>
          </TerminalPane>
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-slate-500">
          ※ Web ダッシュボード（<code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">koji-lens serve</code>）の
          スクリーンショットは近日追加予定。
        </p>
      </div>
    </section>
  );
}

function TerminalPane({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-lg">
      <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-800 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 truncate font-mono text-xs text-slate-400">
          {title}
        </span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-xs leading-relaxed text-slate-200 md:text-sm">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function Line({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className ?? "text-slate-200"}>
      {children}
      {"\n"}
    </div>
  );
}

function Cost({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-emerald-400">{children}</span>;
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
              <div className="flex flex-1 items-center gap-2 rounded-md border border-slate-700 bg-slate-800 p-2">
                <span className="select-none pl-1 font-mono text-sm text-blue-400">
                  $
                </span>
                <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-slate-100">
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
    highlight: true,
  },
  {
    name: "Pro 年額",
    price: "$80",
    unit: "/年",
    note: "月額比 16% 割引",
    features: ["Pro 月額のすべて", "年額契約で割安"],
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

        <div className="mx-auto mb-12 max-w-3xl rounded-2xl border border-blue-100 bg-blue-50/60 p-6 md:p-8">
          <h3 className="text-lg font-medium text-slate-800 md:text-xl">
            こんな状況に心当たりがあれば、Pro をどうぞ
          </h3>
          <ul className="mt-4 space-y-2.5 text-slate-700">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>月末の Anthropic 請求を見るまでコストが分からない</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>どのプロジェクトで使いすぎているか把握できない</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>複数の PC で使っているのにログが分散している</span>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            → Pro では予算残量の追跡、複数デバイス間の同期、月次レポートのメール配信が使えるようになります。
            <span className="ml-1 text-slate-500">
              （2026 年 5 月下旬リリース予定）
            </span>
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
                  おすすめ
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
  const enabled = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID_WAITLIST,
  );
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            <Bell className="size-3.5" />
            Pro リリース先行通知
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Pro プラン販売開始の通知を受け取る
          </h2>
          <p className="mt-3 text-pretty leading-relaxed text-slate-600">
            Pro プラン（月額 $8 / 年額 $80）は 2026 年 5 月下旬に提供開始予定です。
            メールアドレスを登録しておくと、販売開始のタイミングで先行案内をお送りします。
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            β 期間中のフィードバックをくれた方には、Pro リリース時にお得なお知らせが届く可能性があります。
          </p>
          <WaitlistForm enabled={enabled} />
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
      href: "/docs",
      desc: "クイックスタート・コマンドリファレンス・FAQ",
    },
    {
      label: "お問い合わせ",
      href: "/contact",
      desc: "サポート窓口・料金や契約のご質問",
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
              <a href="/contact" className="text-blue-600 hover:underline">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
            <a href="/contact" className="hover:text-slate-900">
              お問い合わせ
            </a>
            <a href="/docs" className="hover:text-slate-900">
              ドキュメント
            </a>
            <a href="/legal/tos" className="hover:text-slate-900">
              利用規約
            </a>
            <a href="/legal/privacy" className="hover:text-slate-900">
              プライバシーポリシー
            </a>
            <a href="/legal/tokushoho" className="hover:text-slate-900">
              特定商取引法に基づく表記
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
