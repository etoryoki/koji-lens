# 節約効果ダッシュボード fixtures

このディレクトリは `@kojihq/core/compare.ts` + `@kojihq/core/insights.ts` の
テスト用 fixture データを格納する場所。

## 重要

**fixture data JSON ファイル自体は git commit しない**
(`.gitignore` で `packages/core/test/fixtures/*.json` を除外、本 README のみ commit)。

設計 v0.2 §6 リスク 5 整合 (`ceo/strategy/2026-05-01-savings-dashboard-design-v0.2.md`):
個人情報漏洩リスク回避のため、fixture は各開発者が `seed-fixture.ts` で
ローカル生成する運用。

## 再生成手順

```bash
# 1. ローカル ~/.koji-lens/cache.db に sessions データが存在することを確認
#    (なければ `koji-lens summary` 実行で populate)
ls ~/.koji-lens/cache.db

# 2. fixture 生成
pnpm --filter @kojihq/core-sqlite seed-fixture

# 3. 出力確認
ls packages/core/test/fixtures/sessions-fixture.json
```

オプション (入力 / 出力パス指定):

```bash
pnpm --filter @kojihq/core-sqlite seed-fixture -- \
  --input /path/to/custom/cache.db \
  --output /path/to/custom/output.json
```

## schema version

現在の fixture schema version = **3** (core-sqlite `CURRENT_SCHEMA_VERSION` 整合)。

schema migration 時 (例: v3 → v4 で history テーブル追加) は:

1. `packages/core-sqlite/src/schema.ts` の `CURRENT_SCHEMA_VERSION` 更新
2. `packages/core-sqlite/scripts/seed-fixture.ts` の `fixture.schemaVersion` 更新
3. fixture 再生成 (`pnpm --filter @kojihq/core-sqlite seed-fixture`)
4. テスト確認 (`pnpm --filter @kojihq/core test`)

## anonymize 仕様

`seed-fixture.ts` で以下を anonymize:

- `session_id`: SHA-256 hash の先頭 12 文字に置換 (uniqueness 維持 + 個人情報除去)
- `file_path`: `/home/user/.claude/projects/project-{N}/session-{M}.jsonl` 連番

その他フィールド (model 名 / tool 名 / token 数 / cost / latency) は数値・
公開モデル名のみで個人情報含まないため anonymize 対象外。

## fixture 形式

```json
{
  "schemaVersion": 3,
  "generatedAt": "2026-05-13T...Z",
  "sessionCount": <N>,
  "projectCount": <M>,
  "sessions": [
    {
      "session_id": "session-<12char-hash>",
      "file_path": "/home/user/.claude/projects/project-1/session-1.jsonl",
      "mtime_ms": <ms>,
      "cached_at": <ms>,
      ...
    }
  ]
}
```
