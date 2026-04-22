# koji-lens

Claude Code のローカルログを解析し、開発者向けに使用状況を可視化・分析する CLI + ローカル Web UI。

**ステータス**: scaffold（Day 14 完了、Day 15-21 で CLI v0 実装予定）

## 構成（pnpm monorepo）

```
koji-lens/
├── apps/
│   ├── cli/         # @kojihq/lens CLI（commander）
│   └── web/         # Next.js 16 ローカル Web UI（standalone build）
├── packages/
│   └── core/        # JSONL パーサー・型定義（zod）
├── decisions/       # 実装寄り技術決定
└── docs/            # ユーザー向けドキュメント
```

## 要件

- Node.js 22 LTS
- pnpm 9

## セットアップ

```bash
pnpm install
```

## 型検査

```bash
pnpm typecheck
```

## ビルド

```bash
pnpm build
```

## 配布（将来）

- npm: `pnpm add -g @kojihq/lens`
- ドキュメント: `lens.kojihq.com/docs`（Day 31+）

## ライセンス

MIT

## 関連

- 運営拠点（非公開）: `ai-company` リポジトリ（CEO 文書・決裁・ロードマップ）
- 本リポジトリには OSS 化に耐える技術決定と実装コードのみを置く
