import { readFileSync, statSync } from "node:fs";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import {
  findJsonlFiles,
  sessionIdFromPath,
  parseRecord,
  extractAuditEvents,
  filterAuditEvents,
  type AuditEvent,
  type CollectAuditOptions,
  type ClaudeCodeRecord,
} from "@kojihq/core";
import {
  getAuditEventsCacheIfFresh,
  upsertAuditEventsCache,
} from "./cache.js";

/**
 * 2026-05-17 改善案 A: collectAuditEvents の SQLite cache 版
 *
 * file 単位で cache 判定 (mtime + size invalidation):
 * - cache hit = JSON.parse + push (parse skip)
 * - cache miss = JSONL parse + extract + cache 保存
 *
 * raw mode = cache 経路非経由 (PII redaction skip と整合性確保)
 *
 * 期待効果: cache hit -75-88% (4 秒 → 500ms-1 sec、5/17 計測ベース)
 */
export function collectAuditEventsCached(
  rootDir: string,
  db: BetterSQLite3Database,
  opts: CollectAuditOptions = {},
): AuditEvent[] {
  // raw mode = cache 経路非経由 (PII redaction なしの events は cache 整合性問題)
  if (opts.raw) {
    return collectAuditEventsNoCache(rootDir, opts);
  }

  const files = findJsonlFiles(rootDir);
  const allEvents: AuditEvent[] = [];

  for (const file of files) {
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(file);
    } catch {
      continue;
    }
    const mtimeMs = stat.mtimeMs;
    const size = stat.size;

    // cache lookup
    const cached = getAuditEventsCacheIfFresh(db, file, mtimeMs, size);
    if (cached) {
      // cache hit
      allEvents.push(...(cached.events as AuditEvent[]));
      continue;
    }

    // cache miss = parse + extract + cache 保存
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const fallbackSessionId = sessionIdFromPath(file);
    const fileEvents: AuditEvent[] = [];
    for (const line of content.split("\n")) {
      const rec = parseRecord(line);
      if (!rec) continue;
      const augmented: ClaudeCodeRecord = rec.sessionId
        ? rec
        : { ...rec, sessionId: fallbackSessionId };
      fileEvents.push(...extractAuditEvents(augmented, { raw: opts.raw }));
    }

    // cache 保存 (PII redaction 済 events)
    upsertAuditEventsCache(db, file, mtimeMs, size, fileEvents);
    allEvents.push(...fileEvents);
  }

  return filterAuditEvents(allEvents, opts);
}

/**
 * cache 非経由版 (raw mode 用)
 */
function collectAuditEventsNoCache(
  rootDir: string,
  opts: CollectAuditOptions,
): AuditEvent[] {
  const files = findJsonlFiles(rootDir);
  const events: AuditEvent[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = readFileSync(file, "utf-8");
    } catch {
      continue;
    }
    const fallbackSessionId = sessionIdFromPath(file);
    for (const line of content.split("\n")) {
      const rec = parseRecord(line);
      if (!rec) continue;
      const augmented: ClaudeCodeRecord = rec.sessionId
        ? rec
        : { ...rec, sessionId: fallbackSessionId };
      events.push(...extractAuditEvents(augmented, { raw: opts.raw }));
    }
  }
  return filterAuditEvents(events, opts);
}
