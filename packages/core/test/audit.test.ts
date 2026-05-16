import { describe, it, expect } from "vitest";
import {
  classifyTool,
  extractTarget,
  extractAuditEvents,
  filterAuditEvents,
  formatAuditEventText,
  type AuditEvent,
  type ClaudeCodeRecord,
} from "../src/index.js";

describe("classifyTool", () => {
  it("classifies filesystem read tools", () => {
    expect(classifyTool("Read")).toBe("fs-read");
    expect(classifyTool("Glob")).toBe("fs-read");
    expect(classifyTool("Grep")).toBe("fs-read");
    expect(classifyTool("NotebookRead")).toBe("fs-read");
  });

  it("classifies filesystem write tools", () => {
    expect(classifyTool("Write")).toBe("fs-write");
    expect(classifyTool("Edit")).toBe("fs-write");
    expect(classifyTool("NotebookEdit")).toBe("fs-write");
  });

  it("classifies exec tools", () => {
    expect(classifyTool("Bash")).toBe("exec");
    expect(classifyTool("PowerShell")).toBe("exec");
  });

  it("classifies fetch tools", () => {
    expect(classifyTool("WebFetch")).toBe("fetch");
    expect(classifyTool("WebSearch")).toBe("fetch");
  });

  it("classifies task tools", () => {
    expect(classifyTool("Task")).toBe("task");
    expect(classifyTool("Agent")).toBe("task");
    expect(classifyTool("TaskCreate")).toBe("task");
  });

  it("classifies mcp__* tools", () => {
    expect(classifyTool("mcp__github__create_pull_request")).toBe("mcp");
    expect(classifyTool("mcp__vercel__list_deployments")).toBe("mcp");
  });

  it("classifies unknown tools as other", () => {
    expect(classifyTool("CustomTool")).toBe("other");
    expect(classifyTool("")).toBe("other");
  });
});

describe("extractTarget", () => {
  it("extracts file_path for fs-read / fs-write", () => {
    expect(extractTarget("fs-read", { file_path: "/path/a.ts" })).toBe(
      "/path/a.ts",
    );
    expect(extractTarget("fs-write", { file_path: "/path/b.ts" })).toBe(
      "/path/b.ts",
    );
  });

  it("falls back to path / pattern for fs-read", () => {
    expect(extractTarget("fs-read", { path: "/path/c" })).toBe("/path/c");
    expect(extractTarget("fs-read", { pattern: "**/*.ts" })).toBe("**/*.ts");
  });

  it("extracts command for exec", () => {
    expect(extractTarget("exec", { command: "ls -la" })).toBe("ls -la");
  });

  it("extracts url / query for fetch", () => {
    expect(extractTarget("fetch", { url: "https://example.com" })).toBe(
      "https://example.com",
    );
    expect(extractTarget("fetch", { query: "claude code" })).toBe(
      "claude code",
    );
  });

  it("extracts subagent_type for task", () => {
    expect(extractTarget("task", { subagent_type: "Explore" })).toBe("Explore");
    expect(extractTarget("task", { description: "fix bug" })).toBe("fix bug");
  });

  it("returns null for mcp / other / missing", () => {
    expect(extractTarget("mcp", { anything: "x" })).toBeNull();
    expect(extractTarget("other", {})).toBeNull();
    expect(extractTarget("fs-read", {})).toBeNull();
  });
});

describe("extractAuditEvents", () => {
  it("extracts events from assistant record with tool_use content", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      sessionId: "session-1",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "ls -la" },
          } as never,
          {
            type: "tool_use",
            name: "Read",
            input: { file_path: "/a.ts" },
          } as never,
          {
            type: "text",
            text: "ignored",
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      sessionId: "session-1",
      timestamp: "2026-05-16T10:00:00Z",
      toolName: "Bash",
      category: "exec",
      target: "ls -la",
    });
    expect(events[1]).toMatchObject({
      toolName: "Read",
      category: "fs-read",
      target: "/a.ts",
    });
  });

  it("returns empty for user record", () => {
    const rec: ClaudeCodeRecord = {
      type: "user",
      timestamp: "2026-05-16T10:00:00Z",
    };
    expect(extractAuditEvents(rec)).toEqual([]);
  });

  it("returns empty when no content", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {},
    };
    expect(extractAuditEvents(rec)).toEqual([]);
  });

  it("returns empty when no timestamp", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      message: { content: [{ type: "tool_use", name: "Bash" } as never] },
    };
    expect(extractAuditEvents(rec)).toEqual([]);
  });
});

describe("filterAuditEvents", () => {
  const baseEvents: AuditEvent[] = [
    {
      sessionId: "s1",
      timestamp: "2026-05-16T10:00:00Z",
      toolName: "Bash",
      category: "exec",
      target: "ls",
      input: {},
    },
    {
      sessionId: "s1",
      timestamp: "2026-05-16T11:00:00Z",
      toolName: "Read",
      category: "fs-read",
      target: "/a.ts",
      input: {},
    },
    {
      sessionId: "s1",
      timestamp: "2026-05-16T12:00:00Z",
      toolName: "WebFetch",
      category: "fetch",
      target: "https://example.com",
      input: {},
    },
  ];

  it("filters by sinceMs", () => {
    const sinceMs = new Date("2026-05-16T10:30:00Z").getTime();
    const filtered = filterAuditEvents(baseEvents, { sinceMs });
    expect(filtered).toHaveLength(2);
    expect(filtered[0].toolName).toBe("Read");
  });

  it("filters by category", () => {
    const filtered = filterAuditEvents(baseEvents, { category: "fs-read" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].toolName).toBe("Read");
  });

  it("filters by tool name", () => {
    const filtered = filterAuditEvents(baseEvents, { tool: "Bash" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].toolName).toBe("Bash");
  });

  it("combines filters (AND)", () => {
    const sinceMs = new Date("2026-05-16T10:30:00Z").getTime();
    const filtered = filterAuditEvents(baseEvents, {
      sinceMs,
      category: "fetch",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].toolName).toBe("WebFetch");
  });

  it("returns all when no filters", () => {
    expect(filterAuditEvents(baseEvents, {})).toHaveLength(3);
  });
});

describe("formatAuditEventText", () => {
  it("formats event with target", () => {
    const e: AuditEvent = {
      sessionId: "s1",
      timestamp: "2026-05-16T10:00:00.000Z",
      toolName: "Bash",
      category: "exec",
      target: "ls -la",
      input: {},
    };
    const text = formatAuditEventText(e);
    expect(text).toContain("2026-05-16T10:00:00.000Z");
    expect(text).toContain("exec");
    expect(text).toContain("Bash");
    expect(text).toContain("ls -la");
  });

  it("formats event with null target", () => {
    const e: AuditEvent = {
      sessionId: "s1",
      timestamp: "2026-05-16T10:00:00.000Z",
      toolName: "mcp__github__list_commits",
      category: "mcp",
      target: null,
      input: {},
    };
    const text = formatAuditEventText(e);
    expect(text).toContain("mcp");
    expect(text).toContain("mcp__github__list_commits");
  });
});
