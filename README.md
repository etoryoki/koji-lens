# koji-lens

Claude Code のローカルログ（`~/.claude/projects/**/*.jsonl`）を解析し、開発者向けに使用状況を可視化・分析する CLI + ローカル Web UI。

**ステータス**: Day 15-21 相当の CLI v0 実装完了（Day 60 MVP 出荷へ継続中）

## できること（v0）

- セッション横断のコスト・トークン・ツール使用集計
- 直近セッションの一覧（期間指定・件数制限）
- 特定セッションの詳細
- ローカル Web UI（チャート 3 種 + セッションテーブル）をワンコマンド起動
- 設定の永続化（`~/.koji-lens/config.json`）

## 要件

- Node.js 22 LTS
- pnpm 9

## セットアップ

```bash
pnpm install
pnpm --filter @kojihq/core build   # core を先にビルド
pnpm --filter @kojihq/lens build
pnpm --filter @kojihq/web build    # Web 起動まで想定するなら
```

## CLI 使い方（開発中）

```bash
# 直近 24 時間の使用状況サマリ
node ./apps/cli/dist/index.js summary --since 24h

# 直近 7 日のセッション一覧（20 件まで）
node ./apps/cli/dist/index.js sessions --since 7d --limit 20

# 特定セッションの詳細
node ./apps/cli/dist/index.js session <session-id>

# ローカル Web UI を起動（http://127.0.0.1:3210）
node ./apps/cli/dist/index.js serve --port 3210

# 設定
node ./apps/cli/dist/index.js config list
node ./apps/cli/dist/index.js config set logDir "/custom/path/to/claude/projects"
node ./apps/cli/dist/index.js config set usdJpy 160
node ./apps/cli/dist/index.js config unset usdJpy
node ./apps/cli/dist/index.js config path  # 設定ファイルの場所
```

npm 公開後は `pnpm add -g @kojihq/lens` → `koji-lens <cmd>` で使えるようになります（Day 60 予定）。

## 構成（pnpm monorepo）

```
koji-lens/
├── apps/
│   ├── cli/                       # @kojihq/lens (commander)
│   └── web/                       # Next.js 16 App Router + Tailwind v4 + Recharts
│       ├── next.config.ts         # output: 'standalone'
│       └── scripts/copy-standalone-assets.mjs
├── packages/
│   └── core/                      # @kojihq/core
│       ├── src/schema.ts          # zod による JSONL スキーマ
│       ├── src/pricing.ts         # モデル価格テーブル
│       ├── src/aggregate.ts       # 集計ロジック
│       ├── src/analyze.ts         # ファイル/ディレクトリ解析、parseSince
│       ├── src/paths.ts           # ログパス探索
│       ├── src/format.ts          # text 出力フォーマッタ
│       ├── src/config.ts          # ~/.koji-lens/config.json ストア
│       └── test/                  # vitest（21 tests）
├── decisions/                     # 実装寄り決定の置き場
├── docs/                          # ユーザー向けドキュメント（Day 31+ に公開）
└── .github/workflows/ci.yml       # install / build core / typecheck / test
```

## 設計方針

- **ローカル・ファースト**: ログはユーザー側にあるものをそのまま読む。クラウドへ送信しない（Pro プランの同期機能まで）
- **配布形態**: `next build --output standalone` で成果物を npm package に同梱、`node server.js` を CLI から spawn（CTO 深町レビュー v17 反映）
- **型安全化**: JSONL はすべて zod でパース、失敗レコードは静かにスキップ
- **プラットフォームリスク耐性**: Claude Code のスキーマ変更に備えて `packages/core` にパース層を隔離、`logDir` は `config` で上書き可能

## スクリプト

```bash
pnpm build        # 全パッケージ build
pnpm typecheck    # 全パッケージ tsc --noEmit
pnpm test         # 全パッケージ vitest run（現在は core のみ）
```

## ライセンス

MIT

## 関連

- 運営拠点（非公開）: `ai-company` リポジトリ
- 本リポジトリには OSS 化に耐える技術決定と実装コードのみを置く
