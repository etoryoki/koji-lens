import { BarChart3, Bell, Github, Lock, Puzzle, Wallet } from "lucide-react";
import Image from "next/image";
import { CopyButton } from "../../components/CopyButton";
import { SiteFooterEn } from "../../components/SiteFooterEn";
import { SiteHeaderEn } from "../../components/SiteHeaderEn";
import { WaitlistFormEn } from "../../components/WaitlistFormEn";

const INSTALL_CMD = "npm install -g @kojihq/lens";
const GITHUB_URL = "https://github.com/etoryoki/koji-lens";
const NPM_URL = "https://www.npmjs.com/package/@kojihq/lens";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeaderEn />
      <Hero />
      <Problem />
      <Features />
      <Comparison />
      <Screenshots />
      <InstallSteps />
      <Pricing />
      <Waitlist />
      <Links />
      <SiteFooterEn />
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
            β release · OSS (MIT)
          </div>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight text-white md:text-6xl">
            Know your AI coding budget — before month-end.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-slate-400 md:text-lg">
            A local-only CLI that parses your Claude Code session logs
            <br className="hidden md:block" />
            and visualizes cost, tokens, and tool usage in one command.
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
              <CopyButton value={INSTALL_CMD} label="Copy" copiedLabel="Copied" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href="#install"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
              >
                Get started in 3 steps
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 bg-transparent px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
              >
                <Github className="size-4" />
                View on GitHub
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
    { num: "01", text: "How much did Claude Code cost you this month?" },
    { num: "02", text: "What was your biggest cost day, and what were you building?" },
    { num: "03", text: "Which tool calls are burning the most tokens?" },
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
          parses the Claude Code session logs stored locally on your machine
          and visualizes how you actually use AI coding — in a single command.
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
    title: "How much you spent this month",
    body: "Per-session cost in USD with a TOTAL aggregate. Reconciles cleanly against your end-of-month Anthropic bill.",
  },
  {
    icon: BarChart3,
    title: "Which work cost you the most",
    body: "Cost trends over the last 7 / 30 days plus tool call distribution. Drill into outlier sessions in one click.",
  },
  {
    icon: Lock,
    title: "Your data stays on your machine, always",
    body: "No cloud uploads. Prompt bodies are never written to SQLite. Safe to analyze your full log history.",
  },
  {
    icon: Puzzle,
    title: "Claude Code today. Cursor and Cline next.",
    body: "First-class support for Claude Code logs. Cursor / Cline support is actively developed as open-source (MIT).",
  },
];

function Features() {
  return (
    <section id="features" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            What you'll see in the first minute
          </h2>
          <p className="mt-3 text-slate-600">
            One terminal command to grasp how your AI coding actually plays out.
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
      label: "Time range aggregation",
      official: "24h / week (fixed)",
      kojilens: "--since with 24h / 7d / 30d / arbitrary ISO date",
    },
    {
      label: "Cross-cut by project / model / tool / subagent",
      official: "✗",
      kojilens: "✓ (aggregates by path, model, tool name, parent-child structure)",
    },
    {
      label: "Cost visibility for subscribers",
      official: "Usage only, no cost numbers",
      kojilens: "Shows API-equivalent cost as reference (with note)",
    },
    {
      label: "Local-only (no data leaves your machine)",
      official: "Console / dashboard goes through the cloud",
      kojilens: "✓ (parses JSONL locally, Free tier permanent)",
    },
    {
      label: "Relationship with ccusage",
      official: "—",
      kojilens: "Reads the same JSONL files. ccusage users don't need to import — full history is visible from day one",
    },
    {
      label: "JSON export / shell pipelining",
      official: "✗",
      kojilens: "--format json / --summary-only",
    },
  ];
  return (
    <section className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            How koji-lens compares to /usage and ccusage
          </h2>
          <p className="mt-3 text-slate-600">
            Comparison against the Claude Code{" "}
            <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">
              /usage
            </code>{" "}
            command, Anthropic Console, and the popular OSS tool ccusage.
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
                  Item
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-left font-medium"
                >
                  Official (<code className="font-mono text-xs">/usage</code> /
                  Anthropic Console)
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
          The official{" "}
          <code className="font-mono text-[11px]">/usage</code>{" "}
          ships in v2.1.105+. Anthropic Console shows monthly billed totals
          for API users.{" "}
          <a
            href="https://github.com/ryoppippi/ccusage"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-700"
          >
            ccusage
          </a>{" "}
          is a popular OSS tool for token / cost aggregation (13k+ stars).
          koji-lens reads the same JSONL files, so you can run both side by side
          without any data migration.
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
            What you actually see when you run it
          </h2>
          <p className="mt-3 text-slate-600">
            Right after install, here's what you get. Cost is shown in API-equivalent
            terms — subscribers can use it as a usage visualization tool.
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
            <Line className="text-slate-500">{"(13 more sessions omitted)"}</Line>
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
              <span className="text-amber-300">{"  ← outlier"}</span>
            </Line>
            <Line className="text-slate-400">
              {"agent-a94b...  1m 9s       "}
              <Cost>$0.2880</Cost>
              <span className="text-slate-500">
                {"  ↳ subagent of 9b630739"}
              </span>
            </Line>
            <Line className="text-slate-400">
              {"22a919c7-...   12m 4s      "}
              <Cost>$20.7381</Cost>
            </Line>
            <Line className="text-slate-500">{"... (10 more)"}</Line>
            <Line>{" "}</Line>
            <Line className="text-slate-500">
              {"# To see charts:"}
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
              The same data, in a browser.
            </h3>
            <p className="mt-3 text-slate-600">
              Run{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens serve
              </code>{" "}
              to launch a local web dashboard. The full picture in one screen,
              with charts and aggregate numbers.
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
                  alt="koji-lens web dashboard — total cost, KPI cards, per-session cost and tool usage charts in a single view"
                  fill
                  className="object-cover object-top"
                  sizes="(min-width: 1024px) 56rem, 100vw"
                />
              </div>
            </div>
            <figcaption className="mt-3 text-center text-xs text-slate-500">
              Screenshot from real data (last 30 sessions aggregated)
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
    { n: 1, title: "Install", cmd: "npm install -g @kojihq/lens" },
    { n: 2, title: "See your session summary", cmd: "koji-lens summary" },
    { n: 3, title: "Launch the dashboard", cmd: "koji-lens serve" },
  ];

  return (
    <section id="install" className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Get started in 3 steps
          </h2>
          <p className="mt-3 text-slate-600">
            If you're already using Claude Code, it works out of the box — no extra setup.
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
                <CopyButton value={s.cmd} label="Copy" copiedLabel="Copied" />
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
    price: "$0",
    features: [
      "All local CLI features",
      "Local web dashboard",
      "Full Claude Code log support",
    ],
  },
  {
    name: "Pro Monthly",
    price: "$7",
    unit: "/month",
    features: [
      "All your machines in one timeline (multi-device sync)",
      "Cloud sync (unlimited history)",
      "CSV / JSON export",
      "Weekly / monthly reports",
    ],
    highlight: true,
  },
  {
    name: "Pro Annual",
    price: "$70",
    unit: "/year",
    note: "~17% off vs monthly",
    features: ["Everything in Pro Monthly", "Annual billing discount"],
  },
];

function Pricing() {
  return (
    <section id="pricing" className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-4 max-w-2xl text-center">
          <p className="mb-2 text-sm leading-relaxed text-slate-500">
            Know your AI coding budget — before month-end. And know it across all your machines.
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Pricing
          </h2>
          <p className="mt-3 text-slate-600">
            Pro plan launches in late May 2026.
          </p>
        </div>

        <div className="mx-auto mb-12 max-w-3xl rounded-2xl border border-blue-100 bg-blue-50/60 p-6 md:p-8">
          <h3 className="text-lg font-medium text-slate-800 md:text-xl">
            If any of these sound familiar, Pro is for you
          </h3>
          <ul className="mt-4 space-y-2.5 text-slate-700">
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>You don't know your cost until the Anthropic bill arrives</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>You can't see which project is eating your budget</span>
            </li>
            <li className="flex gap-3">
              <span
                aria-hidden
                className="mt-1 inline-flex size-4 shrink-0 items-center justify-center rounded border border-slate-400 text-xs"
              />
              <span>Logs are scattered across multiple machines you use</span>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-slate-600">
            → Pro syncs all your machines into one timeline, tracks before/after deltas when you change your setup (e.g. Opus → Sonnet), and delivers monthly reports with real usage. Budget alerts included.
            <span className="ml-1 text-slate-500">
              (Launching late May 2026)
            </span>
          </p>
          <a
            href="#waitlist"
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            Sign up for launch notification
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
                  Recommended
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
            Early access notification
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Free is live now. Pro launches May 26.
          </h2>
          <p className="mt-3 text-pretty leading-relaxed text-slate-600">
            <strong className="font-semibold text-slate-900">
              Install the Free CLI today
            </strong>{" "}
            (
            <a
              href="#install"
              className="text-blue-600 underline-offset-2 hover:underline"
            >
              jump to install
            </a>
            ) — it's the full thing, no waitlist needed.
            Or drop your email below and we'll send you an early-access notice
            when Pro ($7/month, $70/year) launches.
          </p>
          <WaitlistFormEn enabled={enabled} />
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
      desc: "Source code · Issues · Discussions",
    },
    {
      label: "npm",
      href: NPM_URL,
      desc: "@kojihq/lens · latest β release",
    },
    {
      label: "Documentation",
      href: "https://github.com/etoryoki/koji-lens#koji-lens",
      desc: "README on GitHub · Quickstart · CLI reference",
    },
    {
      label: "Contact",
      href: "/contact",
      desc: "Support · Pricing & contract questions",
    },
  ];
  return (
    <section className="border-b border-slate-200">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight text-slate-900">
          Links
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

