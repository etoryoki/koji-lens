# SQLite キャッシュ schema マイグレーション方針

`~/.koji-lens/cache.db` のスキーマ変更ポリシーと手順。深町 CTO 指摘（2026-04-22 再レビュー）への対応。

## 現状（β 期間）

- **schema version**: 1（暗黙、`PRAGMA user_version` は未使用）
- **マイグレーション機構**: なし（`CREATE TABLE IF NOT EXISTS` のみ）
- **下位互換**: なし（schema を変更した場合、古い DB を開いたときの挙動は未定義）

β 期間中はこの状態で運用する。Schema 変更が必要になったら、ユーザーに `rm ~/.koji-lens/cache.db` を案内する運用でよい（キャッシュは再生成可能なデータなので破棄コスト低）。

## 1.0 以降の方針

安定版（1.0）では、`PRAGMA user_version` を使った schema version 判定とマイグレーションを導入する。

### 基本方針

1. **schema version は整数で管理**
   - `PRAGMA user_version` に現在のスキーマバージョンを保存
   - ソースコード側にも対応する定数 `CURRENT_SCHEMA_VERSION` を持つ

2. **起動時にバージョンチェック**
   - `openCacheDb()` 内で `PRAGMA user_version` を読み、`CURRENT_SCHEMA_VERSION` と比較
   - **同じ**: 何もしない
   - **古い**: マイグレーション関数を順番に適用し、最後に `PRAGMA user_version = <new>` で更新
   - **新しい**（古いバイナリで新しい DB を開いた場合）: エラーメッセージを出して処理中断。上書きではなく**拒否**する

3. **マイグレーションは単方向（前進のみ）**
   - ダウングレードはサポートしない
   - 壊れたマイグレーションが出た場合は「cache.db を削除して再生成」で逃がす（キャッシュデータなので破棄可能）

### 実装スケッチ

```typescript
// packages/core/src/db/schema.ts
export const CURRENT_SCHEMA_VERSION = 2;

// packages/core/src/db/migrate.ts
type Migration = (db: Database.Database) => void;

const MIGRATIONS: Record<number, Migration> = {
  2: (db) => {
    db.exec(`ALTER TABLE sessions ADD COLUMN foo TEXT`);
  },
  // 3: (db) => { ... }
};

export function migrateIfNeeded(sqlite: Database.Database): void {
  const currentVersion = (
    sqlite.pragma("user_version", { simple: true }) as number
  ) ?? 0;

  if (currentVersion === CURRENT_SCHEMA_VERSION) return;

  if (currentVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `cache.db schema version (${currentVersion}) is newer than this binary supports (${CURRENT_SCHEMA_VERSION}). ` +
      `Upgrade koji-lens or remove ~/.koji-lens/cache.db.`,
    );
  }

  sqlite.transaction(() => {
    for (let v = currentVersion + 1; v <= CURRENT_SCHEMA_VERSION; v++) {
      const migration = MIGRATIONS[v];
      if (!migration) throw new Error(`Missing migration for schema version ${v}`);
      migration(sqlite);
    }
    sqlite.pragma(`user_version = ${CURRENT_SCHEMA_VERSION}`);
  })();
}
```

### `openCacheDb` からの呼び出し

```typescript
export function openCacheDb(filePath?: string): OpenCacheDbResult {
  const resolved = filePath ?? defaultCacheDbPath();
  if (resolved !== ":memory:") {
    const dir = path.dirname(resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  const sqlite = new Database(resolved);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_TABLES_SQL);   // version 1 相当のテーブル作成
  migrateIfNeeded(sqlite);           // ← 追加
  const db = drizzle(sqlite);
  return { sqlite, db, close: () => sqlite.close() };
}
```

初回作成時は `CREATE_TABLES_SQL` で version 1 相当の構造が作られる。**`user_version = 0` のまま**なので `migrateIfNeeded` が version 1 → 現バージョンまで順に適用する（version 1 マイグレーションは空、または新規 DB のみ `user_version` を current に跳ね上げる特殊処理でよい）。

## Neon（Postgres）移行時の扱い

Day 46 以降のクラウド同期では、ローカルは引き続き SQLite、クラウド側に Postgres を使う想定。その際:

- **SQLite schema**: 上記の `user_version` 管理で継続
- **Postgres schema**: drizzle-kit の migration ファイル（`0001_xxx.sql` 形式）で管理
- **両側の同期**: アプリ層で schema version を揃える責任を持つ（Postgres 側の migration バージョンと SQLite 側の `user_version` を独立管理）

詳細は Tech Debt タスク「drizzle schema の SQLite/Postgres 分岐設計」で決める。

## チェックリスト（1.0 以降の schema 変更時）

- [ ] `CURRENT_SCHEMA_VERSION` を bump
- [ ] `MIGRATIONS` に新しいバージョン番号の migration を追加
- [ ] `schema.ts` の drizzle definition と `CREATE_TABLES_SQL` を両方更新（新規 DB 用）
- [ ] 既存 DB を読み込む integration test を追加（migration が idempotent で通ることを確認）
- [ ] CHANGELOG に schema version 変更と影響範囲を記載
- [ ] メジャー移行の場合、ユーザー向けに「初回起動時に migration が走る」旨アナウンス

## 現時点の選択

**β 期間中は実装しない。本ドキュメントで方針のみ固定する。**

Schema 変更が必要になったタイミング（例: Day 46 のクラウド同期設計時、または新しい集計次元を追加するとき）で、このドキュメントに従って実装する。
