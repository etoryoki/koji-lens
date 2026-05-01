import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

const GITHUB_URL = "https://github.com/etoryoki/koji-lens";
const NPM_URL = "https://www.npmjs.com/package/@kojihq/lens";
const SUPPORT_EMAIL = "support@kojihq.com";

export const metadata: Metadata = {
  title: "ドキュメント",
  description:
    "koji-lens のクイックスタート、コマンドリファレンス、設定ファイル、FAQ。Claude Code のセッションログをローカルで集計するツールの使い方。",
  alternates: {
    canonical: "https://lens.kojihq.com/docs",
  },
};

const SECTIONS = [
  { id: "quickstart", label: "クイックスタート" },
  { id: "commands", label: "コマンドリファレンス" },
  { id: "config", label: "設定ファイル" },
  { id: "faq", label: "FAQ" },
  { id: "more", label: "さらに詳しく" },
];

export default function DocsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <SiteHeader />

      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-6 py-10 md:py-16">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:underline"
          >
            ← koji-lens トップへ
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            ドキュメント
          </h1>
          <p className="mt-3 max-w-3xl text-pretty text-lg text-slate-600">
            koji-lens のクイックスタート、コマンドリファレンス、設定ファイル、
            FAQ をまとめています。
          </p>
        </div>
      </section>

      <nav
        aria-label="ドキュメント目次"
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

        <article className="flex-1 space-y-16">
          <section id="quickstart" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              クイックスタート
            </h2>
            <p className="mt-3 text-slate-600">
              30 秒で動作確認できます。
            </p>
            <CodeBlock
              code={[
                "$ npm install -g @kojihq/lens",
                "$ koji-lens summary",
                "$ koji-lens serve",
              ].join("\n")}
            />
            <p className="mt-4 text-sm text-slate-600">
              動作要件: Node.js 22+ / Claude Code のセッションログ
              （<code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">~/.claude/projects/</code>）
              が存在する環境。
            </p>
          </section>

          <section id="commands" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              コマンドリファレンス
            </h2>
            <p className="mt-3 text-slate-600">
              5 つのサブコマンドが使えます。各コマンドは
              <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens &lt;command&gt; --help
              </code>
              でも詳細を確認できます。
            </p>

            <CommandRef
              name="summary"
              description="期間内のコスト・トークン・ツール使用量のサマリを表示します。末尾に TOTAL ブロック（全体集計）と、サブスク利用者向けの注記（API 換算コストである旨）が表示されます。"
              flags={[
                [
                  "--since <expr>",
                  '期間指定 (デフォルト: "24h")。例: 24h / 7d / 2w / ISO date',
                ],
                [
                  "--format <format>",
                  "出力フォーマット: text | json (デフォルト: text)",
                ],
                [
                  "--dir <path>",
                  "Claude Code ログディレクトリ (デフォルト: config.logDir または ~/.claude/projects)",
                ],
                [
                  "--usd-jpy <rate>",
                  "USD → JPY 変換レート (デフォルト: config.usdJpy または 155)",
                ],
                ["--no-cache", "SQLite cache を無効化（毎回フルスキャン）"],
              ]}
              example="koji-lens summary --since 7d --format json"
            />

            <CommandRef
              name="sessions"
              description="期間内のセッション一覧を 1 行 1 セッションで表示します。一覧から気になるセッション ID を引いて、session コマンドで詳細を見る使い方が想定です。"
              flags={[
                ["--since <expr>", '期間指定 (デフォルト: "7d")'],
                ["--limit <n>", "表示件数 (デフォルト: 20)"],
                ["--dir <path>", "Claude Code ログディレクトリ"],
                ["--no-cache", "SQLite cache を無効化"],
              ]}
              example="koji-lens sessions --since 24h --limit 5"
            />

            <CommandRef
              name="session <id>"
              description="指定セッション ID の詳細を表示します。subagent の ID（agent- プレフィックス）も指定可能で、その場合はメインセッション配下のサブエージェントを表示します。"
              flags={[
                ["--format <format>", "出力フォーマット: text | json"],
                ["--dir <path>", "Claude Code ログディレクトリ"],
                ["--usd-jpy <rate>", "USD → JPY 変換レート"],
                ["--no-cache", "SQLite cache を無効化"],
              ]}
              example="koji-lens session 055a662d-f09c-4541-b54c-7ad4a9130f3d"
            />

            <CommandRef
              name="serve"
              description="ローカル Web ダッシュボードを起動します。Next.js standalone bundle 同梱なので、追加インストール不要で動きます。コスト推移チャート / セッション一覧 / ツール呼び出し分布を見られます。"
              flags={[
                ["--port <port>", "ポート番号 (デフォルト: 3210)"],
              ]}
              example="koji-lens serve --port 3210"
            />

            <CommandRef
              name="config <action> [key] [value]"
              description="設定ファイル ~/.koji-lens/config.json を CLI から操作します。"
              flags={[
                [
                  "<action>",
                  "get | set | unset | list | path のいずれか",
                ],
                ["[key]", "設定キー (logDir | usdJpy)"],
                ["[value]", "設定値 (set のみ必要)"],
              ]}
              example="koji-lens config set usdJpy 158"
            />
          </section>

          <section id="config" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              設定ファイル
            </h2>
            <p className="mt-3 text-slate-600">
              設定は{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                ~/.koji-lens/config.json
              </code>{" "}
              に保存されます。設定パスは{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config path
              </code>{" "}
              で確認できます。
            </p>
            <ConfigKey
              name="logDir"
              type="string"
              desc="Claude Code のログディレクトリパス。未設定時は ~/.claude/projects を参照します。Claude Code のインストール位置や macOS / Windows / Linux で異なる場合に明示指定してください。"
            />
            <ConfigKey
              name="usdJpy"
              type="number"
              desc="USD → JPY 変換レート。未設定時は 155 を使用します。最新レートを反映したい場合は手動更新してください。"
            />
            <p className="mt-6 text-slate-600">
              現在の設定一覧:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config list
              </code>{" "}
              / 設定の追加・更新:{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                koji-lens config set usdJpy 158
              </code>
            </p>
          </section>

          <section id="faq" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              FAQ
            </h2>

            <FaqItem question="Claude Pro / Max（サブスク）で使ってもコスト表示は意味がありますか？">
              <p>
                表示されるコスト値は <strong>API 換算</strong>
                （トークン量 × Anthropic 公式 API 価格）です。
                サブスク利用者は実際の請求が定額なので、表示コストはあくまで
                「使用量の目安」「Sonnet と Opus の使い分け判断材料」として参考にしてください。
                summary の TOTAL ブロック末尾にも同趣旨の注記を表示しています。
              </p>
            </FaqItem>

            <FaqItem question="cache はいつ更新されますか？">
              <p>
                JSONL ファイルの mtime（更新時刻）を見て、変更があったセッションのみ再パースします。
                <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  --no-cache
                </code>
                フラグでフルスキャンに切り替え可能です。cache の DB は{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  ~/.koji-lens/cache.db
                </code>{" "}
                に保存されます。実測では cache hit で約 6 倍高速化します。
              </p>
            </FaqItem>

            <FaqItem question="subagent の親子関係は見られますか？">
              <p>
                はい。subagent のセッション ID は{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  agent-*
                </code>{" "}
                プレフィックスで識別され、ファイルパスは{" "}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                  &lt;main-session-id&gt;/subagents/agent-&lt;id&gt;.jsonl
                </code>{" "}
                の構造になっています。session コマンドで agent- ID を指定すれば、
                サブエージェント単独の詳細も取得可能です。
              </p>
            </FaqItem>

            <FaqItem question="プロンプト本文や API キーは外部に送信されますか？">
              <p>
                送信されません。すべての処理はローカル PC 内で完結します。
                SQLite cache にもプロンプト本文は保存しない設計です（集計に必要な
                メタデータのみ保持）。クラウド送信 NG ポリシーの環境でもそのまま使えます。
              </p>
            </FaqItem>

            <FaqItem question="Cursor / Cline / Aider でも使えますか？">
              <p>
                現在は Claude Code 専用ですが、内部はアダプタ式設計のため
                Cursor / Cline / Aider 等への対応を OSS で開発中です。進捗は{" "}
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Issues
                </a>{" "}
                で追跡できます。
              </p>
            </FaqItem>

            <FaqItem question="Pro プランでは何が増えますか？">
              <p>
                2026 年 5 月下旬に提供開始予定の Pro プランでは、
                クラウド同期（履歴無制限）/ 複数デバイス間同期 / CSV・JSON エクスポート /
                週次・月次レポートのメール配信 等を予定しています。
                Free プランの全機能はそのまま使えます。先行通知は{" "}
                <Link href="/#waitlist" className="text-blue-600 hover:underline">
                  waitlist
                </Link>{" "}
                でお受けしています。
              </p>
            </FaqItem>

            <FaqItem question="バグや要望はどこに報告すればよいですか？">
              <p>
                <a
                  href={`${GITHUB_URL}/issues`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  GitHub Issues
                </a>{" "}
                か、Bluesky{" "}
                <a
                  href="https://bsky.app/profile/kojihq.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  @kojihq.com
                </a>{" "}
                にお気軽にどうぞ。サポート窓口は{" "}
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-blue-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>{" "}
                でも受け付けています。
              </p>
            </FaqItem>
          </section>

          <section id="more" className="scroll-mt-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              さらに詳しく
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
                  GitHub リポジトリ
                </a>
                {" "}— ソースコード、Issues、Discussions
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
                {" "}— 開発者向けの追加情報
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
                {" "}— バージョンごとの変更履歴
              </li>
              <li>
                ・
                <a
                  href={NPM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  npm パッケージ
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
                {" "}— お知らせ・フィードバック
              </li>
              <li>
                ・
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-blue-600 hover:underline"
                >
                  {SUPPORT_EMAIL}
                </a>
                {" "}— サポート窓口
              </li>
            </ul>
          </section>
        </article>
      </div>

      <SiteFooter />
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
              <th className="px-4 py-2 font-medium">フラグ / 引数</th>
              <th className="px-4 py-2 font-medium">説明</th>
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
      <p className="mt-3 text-sm text-slate-500">例:</p>
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
