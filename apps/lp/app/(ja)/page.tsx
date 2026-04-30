import { BarChart3, Bell, Github, Lock, Puzzle, Wallet } from "lucide-react";
import Image from "next/image";
import { CopyButton } from "../components/CopyButton";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import { WaitlistForm } from "../components/WaitlistForm";

const INSTALL_CMD = "npm install -g @kojihq/lens";
const GITHUB_URL = "https://github.com/etoryoki/koji-lens";
const NPM_URL = "https://www.npmjs.com/package/@kojihq/lens";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />
      <Hero />
      <Problem />
      <Features />
      <Comparison />
      <Screenshots />
      <InstallSteps />
      <Pricing />
      <Waitlist />
      <Links />
      <SiteFooter />
    </main>
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
                <span
                  aria-hidden="true"
                  className="terminal-cursor ml-1 inline-block text-blue-400"
                >
                  ▍
                </span>
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
  const questions: { num: string; text: string }[] = [
    { num: "01", text: "Claude Code、月いくら使ってますか？" },
    { num: "02", text: "何にトークンを使った日が高くついてましたか？" },
    { num: "03", text: "どのツール呼び出しが時間を食っていますか？" },
  ];
  return (
    <section className="border-b border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <ul className="divide-y divide-slate-800">
          {questions.map(({ num, text }) => (
            <li key={num} className="flex items-baseline gap-6 py-6">
              <span className="font-mono text-sm tabular-nums text-slate-600">
                {num}
              </span>
              <span className="text-lg text-slate-200 md:text-xl">{text}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-pretty leading-relaxed text-slate-400">
          <span className="font-semibold text-white">koji-lens</span>{" "}
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
              className="rounded-xl border border-slate-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
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

function Comparison() {
  const rows: Array<{
    label: string;
    official: string;
    kojilens: string;
  }> = [
    {
      label: "期間集計",
      official: "24h / 週単位（固定）",
      kojilens: "--since で 24h / 7d / 30d / 任意 ISO 日付",
    },
    {
      label: "プロジェクト / モデル / ツール / subagent 横断",
      official: "✗",
      kojilens: "✓（パス・モデル・ツール名・親子構造で集計）",
    },
    {
      label: "サブスク利用者のコスト見え方",
      official: "利用状況のみ、コスト数値なし",
      kojilens: "API 換算値で参考表示（注記付き）",
    },
    {
      label: "ローカル完結（社外送信なし）",
      official: "Console / dashboard はクラウド経由",
      kojilens: "✓（JSONL ローカル解析、Free 永続）",
    },
    {
      label: "ccusage との関係",
      official: "—",
      kojilens: "同じ JSONL を読む設計。ccusage ユーザーはインポート不要、入れた日から全履歴が見えます",
    },
    {
      label: "JSON エクスポート / シェル連携",
      official: "✗",
      kojilens: "--format json / --summary-only",
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            公式の usage と、何が違うか。
          </h2>
          <p className="mt-3 text-slate-600">
            Claude Code の{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">
              /usage
            </code>{" "}
            コマンドと Anthropic Console との比較。
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th
                  scope="col"
                  className="px-5 py-3 text-left font-medium"
                >
                  項目
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left font-medium"
                >
                  公式（<code className="font-mono text-xs">/usage</code> /
                  Anthropic Console）
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left font-medium text-blue-700"
                >
                  koji-lens
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-slate-100">
                  <td className="px-5 py-3 align-top font-medium text-slate-900">
                    {row.label}
                  </td>
                  <td className="px-5 py-3 align-top text-slate-600">
                    {row.official}
                  </td>
                  <td className="px-5 py-3 align-top text-slate-900">
                    {row.kojilens}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          公式の{" "}
          <code className="font-mono text-[11px]">/usage</code>{" "}
          は v2.1.105 以降搭載。Anthropic Console は API
          ユーザー向け請求確定値を月次で表示。{" "}
          <a
            href="https://github.com/ryoppippi/ccusage"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-700"
          >
            ccusage
          </a>{" "}
          はトークン・コスト集計に特化した OSS（13k+ スター）。koji-lens は ccusage と同じ JSONL を読むため、データ移行なしで併用できます。
        </p>
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
            インストールしてすぐ、こんな出力が得られます。コスト表示は API 換算で、サブスクリプション利用者は使い方の可視化として活用できます。
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TerminalPane title="koji-lens summary --since 24h">
            <Line>{"$ koji-lens summary --since 24h"}</Line>
            <Line className="text-slate-400">
              koji-lens — analyzed 15 session(s)
            </Line>
            <Line className="text-slate-400">
              period: 2026-04-27 15:00 → 2026-04-28 15:00 local (last 24h)
            </Line>
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
              {"  cost by model: opus="}
              <Cost>$865.4523</Cost>
              {", sonnet="}
              <Cost>$8.6639</Cost>
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
          </TerminalPane>

          <TerminalPane title="koji-lens sessions --since 24h --limit 5">
            <Line>{"$ koji-lens sessions --since 24h --limit 5"}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-400">
              {"055a662d-...   8m 58s      "}
              <Cost>$9.6253</Cost>
            </Line>
            <Line className="text-slate-400">
              {"44c29745-...   1h 7m 33s   "}
              <Cost>$32.7546</Cost>
            </Line>
            <Line className="text-slate-300">
              {"28cf16fa-...   7h 38m 22s  "}
              <Cost>$420.6613</Cost>
              <span className="text-amber-300">{"  ← 突出"}</span>
            </Line>
            <Line className="text-slate-400">
              {"agent-a94b...  1m 9s       "}
              <Cost>$0.2880</Cost>
              <span className="text-slate-500">
                {"  ↳ subagent 9b630739"}
              </span>
            </Line>
            <Line className="text-slate-400">
              {"22a919c7-...   12m 4s      "}
              <Cost>$20.7381</Cost>
            </Line>
            <Line className="text-slate-500">{"... (10 more)"}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-500">
              {"# チャートで見るなら:"}
            </Line>
            <Line>{"$ koji-lens serve"}</Line>
            <Line className="text-slate-400">
              {"  → http://localhost:3210"}
            </Line>
          </TerminalPane>
        </div>

        <div className="mt-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
              ブラウザでも、同じデータを。
            </h3>
            <p className="mt-3 text-slate-600">
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens serve
              </code>{" "}
              でローカルに Web ダッシュボードを起動。チャートと集計数値で全体像を一画面に。
            </p>
          </div>

          <figure className="mx-auto max-w-4xl">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-[#0f172a] shadow-2xl">
              <div className="flex items-center gap-1.5 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="size-2.5 rounded-full bg-slate-700" />
                <span className="ml-3 select-none font-mono text-[11px] text-slate-500">
                  http://localhost:3210
                </span>
              </div>
              <div className="relative aspect-[16/10] w-full overflow-hidden">
                <Image
                  src="/screenshots/screenshots.png"
                  alt="koji-lens Web ダッシュボード — 合計コスト・KPI カード・セッション別コストとツール使用のチャートを 1 画面で可視化"
                  fill
                  className="object-cover object-top"
                  sizes="(min-width: 1024px) 56rem, 100vw"
                />
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-slate-500">
              実データのスクリーンショット（直近 30 セッション集計）
            </figcaption>
          </figure>
        </div>
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
      <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-xs leading-relaxed text-slate-200 md:text-sm">
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
    price: "$7",
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
    price: "$70",
    unit: "/年",
    note: "月額比 約 17% 割引",
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
          <a
            href="#waitlist"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            メール通知に登録する
            <span aria-hidden>→</span>
          </a>
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
    <section id="waitlist" className="border-b border-slate-200 bg-slate-50">
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
            Pro プラン（月額 $7 / 年額 $70）は 2026 年 5 月下旬に提供開始予定です。
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

