import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooterEn } from "../../../components/SiteFooterEn";
import { SiteHeaderEn } from "../../../components/SiteHeaderEn";

const GITHUB_URL = "https://github.com/etoryoki/koji-lens";
const NPM_URL = "https://www.npmjs.com/package/@kojihq/lens";
const SUPPORT_EMAIL = "support@kojihq.com";

export const metadata: Metadata = {
  title: "Docs",
  description:
    "koji-lens quickstart, command reference, configuration, and FAQ. A local CLI to analyze Claude Code session logs.",
  alternates: {
    canonical: "https://lens.kojihq.com/en/docs",
  },
};

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "commands", label: "Command reference" },
  { id: "config", label: "Config" },
  { id: "faq", label: "FAQ" },
  { id: "more", label: "More" },
];

export default function DocsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeaderEn />

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
          <Link
            href="/en"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to koji-lens
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Documentation
          </h1>
          <p className="mt-3 max-w-3xl text-pretty text-lg text-slate-600">
            Quickstart, command reference, config, and FAQ for koji-lens.
          </p>
        </div>
      </section>

      <nav
        aria-label="Docs table of contents"
        className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-3 backdrop-blur md:hidden"
      >
        <ul className="-mx-2 flex gap-1 overflow-x-auto px-2 text-sm">
          {SECTIONS.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                className="inline-block rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto flex w-full max-w-6xl gap-6 px-6 py-8 md:gap-10 md:py-12">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-8 space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 flex-1 space-y-16">
          <section id="quickstart" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Quickstart
            </h2>
            <p className="mt-3 text-slate-600">
              Up and running in 30 seconds.
            </p>
            <CodeBlock
              code={[
                "$ npm install -g @kojihq/lens",
                "$ koji-lens summary",
                "$ koji-lens serve",
              ].join("\n")}
            />
            <p className="mt-4 text-sm text-slate-600">
              Requirements: Node.js 22+ / Claude Code session logs in{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                ~/.claude/projects/
              </code>
              .
            </p>
          </section>

          <section id="commands" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Command reference
            </h2>
            <p className="mt-3 text-slate-600">
              Five subcommands. Run{" "}
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens &lt;command&gt; --help
              </code>{" "}
              for details.
            </p>

            <CommandRef
              name="summary"
              description="Show cost / token / tool usage summary for a period. Ends with a TOTAL block (overall aggregation) plus a note for subscription users (cost is API-equivalent, not actual billing)."
              flags={[
                [
                  "--since <expr>",
                  'Period (default: "24h"). E.g. 24h / 7d / 2w / ISO date',
                ],
                [
                  "--format <format>",
                  "Output format: text | json (default: text)",
                ],
                [
                  "--dir <path>",
                  "Claude Code log directory (default: config.logDir or ~/.claude/projects)",
                ],
                [
                  "--usd-jpy <rate>",
                  "USD → JPY conversion rate (default: config.usdJpy or 155)",
                ],
                ["--no-cache", "Disable SQLite cache (full scan every time)"],
              ]}
              example="koji-lens summary --since 7d --format json"
            />

            <CommandRef
              name="sessions"
              description="List sessions in a period, one line per session. Pick a session ID from this list, then drill into details with the session command."
              flags={[
                ["--since <expr>", 'Period (default: "7d")'],
                ["--limit <n>", "Number of sessions (default: 20)"],
                ["--dir <path>", "Claude Code log directory"],
                ["--no-cache", "Disable SQLite cache"],
              ]}
              example="koji-lens sessions --since 24h --limit 5"
            />

            <CommandRef
              name="session <id>"
              description="Show full details of one session ID. Subagent IDs (with the agent- prefix) are also accepted; that case shows the subagent under the parent session."
              flags={[
                ["--format <format>", "Output format: text | json"],
                ["--dir <path>", "Claude Code log directory"],
                ["--usd-jpy <rate>", "USD → JPY conversion rate"],
                ["--no-cache", "Disable SQLite cache"],
              ]}
              example="koji-lens session 055a662d-f09c-4541-b54c-7ad4a9130f3d"
            />

            <CommandRef
              name="serve"
              description="Launch a local web dashboard. Next.js standalone bundle is shipped with the CLI, so no extra install is needed. Cost trend charts, session list, and tool usage distribution are available."
              flags={[
                ["--port <port>", "Port number (default: 3210)"],
              ]}
              example="koji-lens serve --port 3210"
            />

            <CommandRef
              name="config <action> [key] [value]"
              description="Operate ~/.koji-lens/config.json from the CLI."
              flags={[
                [
                  "<action>",
                  "One of: get | set | unset | list | path",
                ],
                ["[key]", "Config key (logDir | usdJpy)"],
                ["[value]", "Config value (only for set)"],
              ]}
              example="koji-lens config set usdJpy 158"
            />
          </section>

          <section id="config" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Config
            </h2>
            <p className="mt-3 text-slate-600">
              Settings are saved to{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                ~/.koji-lens/config.json
              </code>
              . Check the path with{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config path
              </code>
              .
            </p>
            <ConfigKey
              name="logDir"
              type="string"
              desc="Path to Claude Code logs. Defaults to ~/.claude/projects when unset. Override this when the install path differs (macOS / Windows / Linux)."
            />
            <ConfigKey
              name="usdJpy"
              type="number"
              desc="USD → JPY conversion rate. Defaults to 155 when unset. Update manually if you want the latest rate."
            />
            <p className="mt-6 text-slate-600">
              List current settings:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config list
              </code>{" "}
              / Set or update:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config set usdJpy 158
              </code>
            </p>
          </section>

          <section id="faq" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              FAQ
            </h2>

            <FaqItem question="Does the cost display make sense for Claude Pro / Max (subscription) users?">
              <p>
                The displayed cost is <strong>API-equivalent</strong> (token count × Anthropic public API price).
                Subscription users pay a flat fee, so treat the displayed cost as a "usage indicator" and a
                "decision aid for choosing between Sonnet and Opus." The TOTAL block in summary output also
                shows a note to that effect.
              </p>
            </FaqItem>

            <FaqItem question="When does the cache get refreshed?">
              <p>
                The CLI checks each JSONL file's mtime and re-parses only sessions that changed. Use{" "}
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  --no-cache
                </code>{" "}
                to force a full scan. The cache DB is stored at{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  ~/.koji-lens/cache.db
                </code>
                . Cache hits are about 6× faster in practice.
              </p>
            </FaqItem>

            <FaqItem question="Can I see the parent / child relationship for subagents?">
              <p>
                Yes. Subagent session IDs are identified by the{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  agent-*
                </code>{" "}
                prefix, and the file path follows the structure{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  &lt;main-session-id&gt;/subagents/agent-&lt;id&gt;.jsonl
                </code>
                . Pass an agent- ID to the session command to drill into the subagent alone.
              </p>
            </FaqItem>

            <FaqItem question="Are prompt bodies or API keys sent anywhere?">
              <p>
                No. Everything runs locally on your machine. The SQLite cache deliberately does not store
                prompt bodies (only the metadata needed for aggregation). Safe to use under "no cloud" policies.
              </p>
            </FaqItem>

            <FaqItem question="Does it work with Cursor / Cline / Aider?">
              <p>
                Currently Claude Code only, but the internal design is adapter-based, and Cursor / Cline / Aider
                support is in OSS development. Track progress via{" "}
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Issues
                </a>
                .
              </p>
            </FaqItem>

            <FaqItem question="What's added in the Pro plan?">
              <p>
                The Pro plan, launching late May 2026, will add cloud sync (unlimited history) /
                multi-device sync / CSV / JSON export / weekly / monthly email reports, and more.
                All Free plan features remain available. Get notified at{" "}
                <Link href="/en#waitlist" className="text-blue-600 hover:underline">
                  the waitlist
                </Link>
                .
              </p>
            </FaqItem>

            <FaqItem question="Where do I report bugs or feature requests?">
              <p>
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Issues
                </a>{" "}
                or Bluesky{" "}
                <a
                  href="https://bsky.app/profile/kojihq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @kojihq.com
                </a>{" "}
                — feel free to drop a message. The support email is also{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-blue-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                .
              </p>
            </FaqItem>
          </section>

          <section id="more" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              More
            </h2>
            <ul className="mt-4 space-y-2 text-slate-700">
              <li>
                ・
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub repository
                </a>
                {" "}— source, issues, discussions
              </li>
              <li>
                ・
                <a
                  href={`${GITHUB_URL}#readme`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  README
                </a>
                {" "}— extra info for developers
              </li>
              <li>
                ・
                <a
                  href={`${GITHUB_URL}/releases`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Releases / CHANGELOG
                </a>
                {" "}— per-version change history
              </li>
              <li>
                ・
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  npm package
                </a>
                {" "}— @kojihq/lens
              </li>
              <li>
                ・
                <a
                  href="https://bsky.app/profile/kojihq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Bluesky @kojihq.com
                </a>
                {" "}— announcements and feedback
              </li>
              <li>
                ・
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-blue-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                {" "}— support contact
              </li>
            </ul>
          </section>
        </article>
      </div>

      <SiteFooterEn />
    </main>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-700 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100 md:text-sm">
      <code className="whitespace-pre font-mono">{code}</code>
    </pre>
  );
}

function CommandRef({
  name,
  description,
  flags,
  example,
}: {
  name: string;
  description: string;
  flags: [string, string][];
  example: string;
}) {
  return (
    <div className="mt-10">
      <h3 className="font-mono text-lg font-semibold text-slate-900">
        koji-lens {name}
      </h3>
      <p className="mt-2 text-pretty leading-relaxed text-slate-600">
        {description}
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Flag / arg</th>
              <th className="px-4 py-2 font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {flags.map(([flag, desc]) => (
              <tr key={flag} className="border-t border-slate-200">
                <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-slate-900">
                  {flag}
                </td>
                <td className="px-4 py-2 text-slate-600">{desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm text-slate-500">Example:</p>
      <CodeBlock code={`$ ${example}`} />
    </div>
  );
}

function ConfigKey({
  name,
  type,
  desc,
}: {
  name: string;
  type: string;
  desc: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono font-semibold text-slate-900">{name}</span>
        <span className="font-mono text-xs text-slate-500">{type}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}

function FaqItem({
  question,
  children,
}: {
  question: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <h3 className="font-medium text-slate-900">{question}</h3>
      <div className="mt-2 text-pretty leading-relaxed text-slate-600">
        {children}
      </div>
    </div>
  );
}
