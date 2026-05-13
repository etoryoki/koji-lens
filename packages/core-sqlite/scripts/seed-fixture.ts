#!/usr/bin/env tsx
/**
 * 節約効果ダッシュボード fixture 生成スクリプト
 *
 * 設計 v0.2 §6 リスク 5 整合 (`ceo/strategy/2026-05-01-savings-dashboard-design-v0.2.md`):
 * CEO の `~/.koji-lens/cache.db` から sessions テーブル全件を anonymize して
 * fixture JSON 出力。fixture 自体は git commit しない (`.gitignore` 反映)、
 * スクリプトのみ commit。
 *
 * 実行:
 *   pnpm --filter @kojihq/core-sqlite seed-fixture
 *   pnpm --filter @kojihq/core-sqlite seed-fixture -- --input <path> --output <path>
 *
 * 入力デフォルト: ~/.koji-lens/cache.db
 * 出力デフォルト: packages/core/test/fixtures/sessions-fixture.json
 *
 * anonymize:
 *   - sessionId: SHA-256 hash の先頭 12 文字に置換 (uniqueness 維持 + 個人情報除去)
 *   - filePath: /home/user/.claude/projects/project-{N}/session-{M}.jsonl 連番
 *   - その他フィールド (model 名 / tool 名 / token 数 / cost / latency) は数値・
 *     公開モデル名のみで個人情報含まないと判断、anonymize 対象外
 *
 * fixture メタ情報:
 *   - schemaVersion: 3 (core-sqlite CURRENT_SCHEMA_VERSION 整合)
 *   - generatedAt: ISO 8601 timestamp
 *   - sessionCount: anonymize 済 session 数
 *   - projectCount: anonymize 済 project 数
 *
 * memory `feedback_secrets_handling.md` 整合: スクリプトのみ commit、実 fixture
 * 生成 (実 cache.db 読み込み) はオーナー実行範囲。CEO は実装 + dry-run 確認のみ。
 */

import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

interface RawSession {
  session_id: string;
  file_path: string;
  mtime_ms: number;
  cached_at: number;
  started_at: string | null;
  ended_at: string | null;
  duration_ms: number;
  assistant_turns: number;
  user_turns: number;
  sidechain_count: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_create_tokens: number;
  cost_usd: number;
  models_json: string;
  tools_json: string;
  costs_by_model_json: string;
  model_changes_json: string;
  latency_p50_ms: number;
  latency_p95_ms: number;
}

interface FixtureSession extends RawSession {
  // anonymized fields (上書き):
  // session_id, file_path
}

interface FixturePayload {
  schemaVersion: number;
  generatedAt: string;
  sessionCount: number;
  projectCount: number;
  sessions: FixtureSession[];
}

function anonymizeSessionId(sessionId: string): string {
  const hash = createHash("sha256").update(sessionId).digest("hex");
  return `session-${hash.slice(0, 12)}`;
}

function anonymizeFilePath(projectIdx: number, sessionIdx: number): string {
  return `/home/user/.claude/projects/project-${projectIdx}/session-${sessionIdx}.jsonl`;
}

function parseArgs(argv: string[]): { input: string; output: string } {
  const args = argv.slice(2);
  let input = path.join(homedir(), ".koji-lens", "cache.db");
  let output = path.resolve(
    process.cwd(),
    "..",
    "core",
    "test",
    "fixtures",
    "sessions-fixture.json",
  );

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" && args[i + 1]) {
      input = args[i + 1];
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      output = args[i + 1];
      i++;
    }
  }

  return { input, output };
}

function main(): void {
  const { input, output } = parseArgs(process.argv);

  console.log(`[seed-fixture] Input:  ${input}`);
  console.log(`[seed-fixture] Output: ${output}`);

  if (!existsSync(input)) {
    console.error(
      `[seed-fixture] ERROR: Input cache.db not found at ${input}\n` +
        `[seed-fixture] Run \`koji-lens summary\` first to populate the cache, or specify --input <path>`,
    );
    process.exit(1);
  }

  const db = new Database(input, { readonly: true });
  const rows = db
    .prepare("SELECT * FROM sessions ORDER BY ended_at DESC")
    .all() as RawSession[];
  db.close();

  console.log(`[seed-fixture] Loaded ${rows.length} sessions from cache.db`);

  // project / session の連番マッピング (filePath の dirname でグループ化)
  const projectMap = new Map<string, number>();
  const sessionPerProject = new Map<number, number>();
  let nextProjectIdx = 1;

  const anonymized: FixtureSession[] = rows.map((row) => {
    const projectDir = path.dirname(row.file_path);
    if (!projectMap.has(projectDir)) {
      projectMap.set(projectDir, nextProjectIdx++);
    }
    const projectIdx = projectMap.get(projectDir)!;
    const sessionIdx = (sessionPerProject.get(projectIdx) ?? 0) + 1;
    sessionPerProject.set(projectIdx, sessionIdx);

    return {
      ...row,
      session_id: anonymizeSessionId(row.session_id),
      file_path: anonymizeFilePath(projectIdx, sessionIdx),
    };
  });

  const fixture: FixturePayload = {
    schemaVersion: 3,
    generatedAt: new Date().toISOString(),
    sessionCount: anonymized.length,
    projectCount: projectMap.size,
    sessions: anonymized,
  };

  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(fixture, null, 2)}\n`, "utf8");

  console.log(
    `[seed-fixture] Wrote ${anonymized.length} sessions (${projectMap.size} projects) to ${output}`,
  );
  console.log(`[seed-fixture] schemaVersion: 3, generatedAt: ${fixture.generatedAt}`);
}

main();
