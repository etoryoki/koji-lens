# Technical Decisions (koji-lens)

本ディレクトリには **実装寄りの技術決定** を記録します。

## ai-company リポジトリとの役割分担

- **戦略・事業系の決定** → `ai-company/operations/projects/koji-lens/decisions/`（非公開）
- **実装・アーキテクチャ系の決定** → 本ディレクトリ（OSS 化時に公開されて問題ない内容）

## 命名規則

`YYYY-MM-DD-<topic>.md`

## 書き方

- 背景 / 選択肢 / 決定 / 理由 / 再決定の契機 を最低限含める
- コードサンプルは最小限に、詳細は実装に寄せる
- 破棄する場合は削除せず「superseded by ...」と追記して残す

## 既存の関連決裁（ai-company 側）

実装時に参照する主な決裁:

- 技術スタック: `ai-company/operations/projects/koji-lens/decisions/2026-04-21-tech-stack.md`
- モノレポ構成: `ai-company/operations/projects/koji-lens/decisions/2026-04-21-repo-location.md`
- サブドメイン: `ai-company/operations/projects/koji-lens/decisions/2026-04-21-subdomain.md`
