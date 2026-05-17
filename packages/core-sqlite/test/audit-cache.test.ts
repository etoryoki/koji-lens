import { describe, it, expect } from "vitest";
import {
  openCacheDb,
  getAuditEventsCacheIfFresh,
  upsertAuditEventsCache,
  clearAuditEventsCache,
} from "../src/index.js";

describe("audit_events_cache (2026-05-17 改善案 A)", () => {
  it("returns null when no cache entry exists", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 1000, 500);
      expect(result).toBeNull();
    } finally {
      close();
    }
  });

  it("returns cached entry when mtime + size match (cache hit)", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      const events = [
        { sessionId: "s1", category: "exec", toolName: "Bash", target: "ls" },
      ];
      upsertAuditEventsCache(db, "/path/file.jsonl", 1000, 500, events);
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 1000, 500);
      expect(result).not.toBeNull();
      expect(result?.filePath).toBe("/path/file.jsonl");
      expect(result?.fileMtimeMs).toBe(1000);
      expect(result?.fileSize).toBe(500);
      expect(result?.events).toEqual(events);
    } finally {
      close();
    }
  });

  it("returns null when mtime changed (cache miss = invalidation)", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertAuditEventsCache(db, "/path/file.jsonl", 1000, 500, []);
      // mtime 変化 = cache miss
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 2000, 500);
      expect(result).toBeNull();
    } finally {
      close();
    }
  });

  it("returns null when size changed (cache miss = invalidation)", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertAuditEventsCache(db, "/path/file.jsonl", 1000, 500, []);
      // size 変化 = cache miss
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 1000, 600);
      expect(result).toBeNull();
    } finally {
      close();
    }
  });

  it("upsert overwrites existing entry", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertAuditEventsCache(db, "/path/file.jsonl", 1000, 500, [
        { id: 1 },
      ]);
      upsertAuditEventsCache(db, "/path/file.jsonl", 1100, 600, [
        { id: 2 },
      ]);
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 1100, 600);
      expect(result?.events).toEqual([{ id: 2 }]);
    } finally {
      close();
    }
  });

  it("clearAuditEventsCache removes all entries", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      upsertAuditEventsCache(db, "/path/a.jsonl", 1000, 500, []);
      upsertAuditEventsCache(db, "/path/b.jsonl", 2000, 600, []);
      clearAuditEventsCache(db);
      expect(getAuditEventsCacheIfFresh(db, "/path/a.jsonl", 1000, 500)).toBeNull();
      expect(getAuditEventsCacheIfFresh(db, "/path/b.jsonl", 2000, 600)).toBeNull();
    } finally {
      close();
    }
  });

  it("handles complex AuditEvent serialization", () => {
    const { db, close } = openCacheDb(":memory:");
    try {
      const events = [
        {
          sessionId: "abc-123",
          timestamp: "2026-05-17T10:00:00Z",
          toolName: "Bash",
          category: "exec",
          target: "echo 'hello'",
          input: { command: "echo 'hello'", description: "test" },
        },
        {
          sessionId: "abc-123",
          timestamp: "2026-05-17T10:01:00Z",
          toolName: "Edit",
          category: "fs-write",
          target: "/path/to/file.ts",
          input: { file_path: "/path/to/file.ts", old_string: "a", new_string: "b" },
        },
      ];
      upsertAuditEventsCache(db, "/path/file.jsonl", 1000, 500, events);
      const result = getAuditEventsCacheIfFresh(db, "/path/file.jsonl", 1000, 500);
      expect(result?.events).toEqual(events);
    } finally {
      close();
    }
  });
});
