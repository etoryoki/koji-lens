import { describe, it, expect } from "vitest";
import { formatAuditExplain, type AuditEvent } from "../src/audit.js";
import {
  classifyTool,
  extractTarget,
  extractAuditEvents,
  filterAuditEvents,
  formatAuditEventText,
  detectAuditAnomalies,
  extractMcpServerName,
  redactSensitiveInput,
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

describe("extractMcpServerName", () => {
  it("extracts server name from mcp__<server>__<method>", () => {
    expect(extractMcpServerName("mcp__github__create_pull_request")).toBe("github");
    expect(extractMcpServerName("mcp__vercel__list_deployments")).toBe("vercel");
  });

  it("returns null for non-mcp tools", () => {
    expect(extractMcpServerName("Bash")).toBeNull();
    expect(extractMcpServerName("")).toBeNull();
  });

  it("handles mcp__<server> without method", () => {
    expect(extractMcpServerName("mcp__plain")).toBe("plain");
  });
});

describe("detectAuditAnomalies SENSITIVE_WRITE_WHITELIST (修正案 1、2026-05-17)", () => {
  it("excludes .env.example template file (false positive 改善)", () => {
    const events: AuditEvent[] = [
      {
        sessionId: "s1",
        timestamp: "2026-05-17T10:00:00Z",
        toolName: "Write",
        category: "fs-write",
        target: "/path/to/.env.example",
        input: null,
      },
    ];
    const result = detectAuditAnomalies(events);
    expect(result.sensitiveWrites).toEqual([]); // whitelist で除外
    expect(result.severity).toBe("ok");
  });

  it("excludes various template variants", () => {
    const templates = [
      "/path/.env.example",
      "/path/.env.local.example",
      "/path/.env.production.sample",
      "/path/credentials.example",
      "/path/secrets.template",
      "/path/private_key.example",
      "/path/cert.pem.example",
    ];
    for (const target of templates) {
      const events: AuditEvent[] = [
        {
          sessionId: "s1",
          timestamp: "2026-05-17T10:00:00Z",
          toolName: "Write",
          category: "fs-write",
          target,
          input: null,
        },
      ];
      const result = detectAuditAnomalies(events);
      expect(result.sensitiveWrites).toEqual([]);
    }
  });

  it("still detects real .env (not template)", () => {
    const events: AuditEvent[] = [
      {
        sessionId: "s1",
        timestamp: "2026-05-17T10:00:00Z",
        toolName: "Write",
        category: "fs-write",
        target: "/path/.env",
        input: null,
      },
    ];
    const result = detectAuditAnomalies(events);
    expect(result.sensitiveWrites).toEqual(["/path/.env"]);
    expect(result.severity).toBe("critical");
  });

  it("still detects credentials.json (not template)", () => {
    const events: AuditEvent[] = [
      {
        sessionId: "s1",
        timestamp: "2026-05-17T10:00:00Z",
        toolName: "Write",
        category: "fs-write",
        target: "/path/credentials.json",
        input: null,
      },
    ];
    const result = detectAuditAnomalies(events);
    expect(result.sensitiveWrites).toEqual(["/path/credentials.json"]);
  });
});

describe("detectAuditAnomalies", () => {
  function mkEvent(
    overrides: Partial<AuditEvent>,
  ): AuditEvent {
    return {
      sessionId: "s1",
      timestamp: "2026-05-16T10:00:00Z",
      toolName: "Bash",
      category: "exec",
      target: "ls",
      input: {},
      ...overrides,
    };
  }

  it("detects new MCP servers not in knownMcpServers", () => {
    const events = [
      mkEvent({
        toolName: "mcp__github__list_commits",
        category: "mcp",
      }),
      mkEvent({
        toolName: "mcp__vercel__list_deployments",
        category: "mcp",
      }),
    ];
    const signal = detectAuditAnomalies(events, {
      knownMcpServers: ["github"],
    });
    expect(signal.newMcpServers).toEqual(["vercel"]);
    expect(signal.severity).toBe("warning");
  });

  it("returns no new MCP when all known", () => {
    const events = [
      mkEvent({ toolName: "mcp__github__x", category: "mcp" }),
    ];
    const signal = detectAuditAnomalies(events, {
      knownMcpServers: ["github"],
    });
    expect(signal.newMcpServers).toEqual([]);
    expect(signal.severity).toBe("ok");
  });

  it("detects high frequency exec", () => {
    const events = Array.from({ length: 201 }, (_, i) =>
      mkEvent({ timestamp: `2026-05-16T10:${String(i % 60).padStart(2, "0")}:00Z` }),
    );
    const signal = detectAuditAnomalies(events);
    expect(signal.execCount).toBe(201);
    expect(signal.highFreqExec).toBe(true);
    expect(signal.severity).toBe("warning");
  });

  it("does not flag exec below threshold", () => {
    const events = Array.from({ length: 100 }, () => mkEvent({}));
    const signal = detectAuditAnomalies(events);
    expect(signal.highFreqExec).toBe(false);
    expect(signal.severity).toBe("ok");
  });

  it("respects custom highFreqExecThreshold", () => {
    const events = Array.from({ length: 10 }, () => mkEvent({}));
    const signal = detectAuditAnomalies(events, {
      highFreqExecThreshold: 5,
    });
    expect(signal.highFreqExec).toBe(true);
  });

  it("detects sensitive writes (.env / credentials / etc)", () => {
    const events = [
      mkEvent({
        toolName: "Write",
        category: "fs-write",
        target: "/path/.env.local",
      }),
      mkEvent({
        toolName: "Edit",
        category: "fs-write",
        target: "/path/credentials.json",
      }),
      mkEvent({
        toolName: "Write",
        category: "fs-write",
        target: "/path/private_key.pem",
      }),
    ];
    const signal = detectAuditAnomalies(events);
    expect(signal.sensitiveWrites).toHaveLength(3);
    expect(signal.severity).toBe("critical");
  });

  it("critical severity outranks warning", () => {
    const events = [
      mkEvent({
        toolName: "mcp__unknown__x",
        category: "mcp",
      }),
      mkEvent({
        toolName: "Write",
        category: "fs-write",
        target: "/path/.env",
      }),
    ];
    const signal = detectAuditAnomalies(events);
    expect(signal.newMcpServers).toEqual(["unknown"]);
    expect(signal.sensitiveWrites).toHaveLength(1);
    expect(signal.severity).toBe("critical");
  });

  it("returns ok severity with empty events", () => {
    const signal = detectAuditAnomalies([]);
    expect(signal.severity).toBe("ok");
    expect(signal.newMcpServers).toEqual([]);
    expect(signal.execCount).toBe(0);
    expect(signal.highFreqExec).toBe(false);
    expect(signal.sensitiveWrites).toEqual([]);
  });
});

describe("redactSensitiveInput", () => {
  it("redacts email addresses", () => {
    const input = { msg: "Contact user@example.com for details" };
    const out = redactSensitiveInput(input);
    expect(out.msg).toBe("Contact [EMAIL] for details");
  });

  it("redacts US phone numbers", () => {
    const input = { msg: "Call 555-123-4567 today" };
    const out = redactSensitiveInput(input);
    expect(out.msg).toContain("[PHONE");
  });

  it("redacts credit card numbers", () => {
    const input = { command: "echo 4111-1111-1111-1111" };
    const out = redactSensitiveInput(input);
    expect(out.command).toBe("echo [CARD]");
  });

  it("redacts Stripe API keys", () => {
    // Use clearly-fake key constructed at runtime to avoid GitHub Push Protection
    // false-positive on static string scan (real secrets must never enter test files).
    const fakeKey = "sk_" + "live" + "_" + "F".repeat(24);
    const input = { cmd: `curl -H 'Authorization: Bearer ${fakeKey}' ...` };
    const out = redactSensitiveInput(input);
    expect(out.cmd).toContain("[API_KEY]");
    expect(out.cmd).not.toContain(fakeKey);
  });

  it("redacts Bearer tokens", () => {
    const input = { headers: "Authorization: Bearer abc123xyz789defghijklmnop" };
    const out = redactSensitiveInput(input);
    expect(out.headers).toContain("Bearer [TOKEN]");
  });

  it("redacts UUIDs", () => {
    const input = { id: "550e8400-e29b-41d4-a716-446655440000" };
    const out = redactSensitiveInput(input);
    expect(out.id).toBe("[UUID]");
  });

  it("recursively walks nested objects", () => {
    const input = {
      level1: {
        level2: {
          email: "nested@example.com",
        },
      },
    };
    const out = redactSensitiveInput(input);
    expect(
      ((out.level1 as Record<string, unknown>).level2 as Record<string, unknown>)
        .email,
    ).toBe("[EMAIL]");
  });

  it("redacts inside arrays", () => {
    const input = { emails: ["a@b.com", "c@d.org"] };
    const out = redactSensitiveInput(input);
    expect(out.emails).toEqual(["[EMAIL]", "[EMAIL]"]);
  });

  it("preserves non-string values (numbers, booleans, null)", () => {
    const input = { count: 42, flag: true, missing: null };
    const out = redactSensitiveInput(input);
    expect(out).toEqual({ count: 42, flag: true, missing: null });
  });

  it("preserves originals (no mutation)", () => {
    const input = { email: "user@example.com" };
    const out = redactSensitiveInput(input);
    expect(input.email).toBe("user@example.com"); // original unchanged
    expect(out.email).toBe("[EMAIL]");
  });

  it("redacts AWS access key IDs", () => {
    const fakeAws = "AKIA" + "ABCDEFGHIJKLMNOP";
    const input = { env: `AWS_ACCESS_KEY_ID=${fakeAws}` };
    const out = redactSensitiveInput(input);
    expect(out.env).toBe("AWS_ACCESS_KEY_ID=[AWS_KEY]");
  });

  it("redacts GitHub Personal Access Tokens", () => {
    const fakeGhp = "ghp_" + "A".repeat(36);
    const input = { headers: `Authorization: token ${fakeGhp}` };
    const out = redactSensitiveInput(input);
    expect(out.headers).toBe("Authorization: token [GITHUB_TOKEN]");
  });

  it("redacts GitHub fine-grained tokens (ghs_/gho_/ghu_/ghr_ prefix)", () => {
    const variants = ["gho_", "ghs_", "ghu_", "ghr_"];
    for (const prefix of variants) {
      const fake = prefix + "B".repeat(36);
      const out = redactSensitiveInput({ token: fake });
      expect(out.token).toBe("[GITHUB_TOKEN]");
    }
  });

  it("redacts Slack incoming webhook URLs", () => {
    // Construct at runtime to avoid GitHub Push Protection false-positive
    // on static string scan (real webhooks must never enter test files).
    const fakeSlack =
      "https://hooks.slack.com" +
      "/services/T" +
      "01234567" +
      "/B" +
      "01234567" +
      "/abcdefghijklmnopqrstuvwx";
    const input = { url: fakeSlack };
    const out = redactSensitiveInput(input);
    expect(out.url).toBe("[SLACK_WEBHOOK]");
  });

  it("redacts JWT tokens (header.payload.signature)", () => {
    const fakeJwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkw.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV";
    const input = { cookie: `auth=${fakeJwt}` };
    const out = redactSensitiveInput(input);
    expect(out.cookie).toBe("auth=[JWT]");
  });
});

// 2026-05-17 案 B 候補 4-d: formatAuditExplain tests (オーナー指摘採用 = 警告 → 解消サイクル化)
describe("formatAuditExplain", () => {
  it("returns ok message when no anomalies (severity=ok)", () => {
    const result = formatAuditExplain(
      {
        newMcpServers: [],
        execCount: 0,
        highFreqExec: false,
        sensitiveWrites: [],
        severity: "ok",
      },
      [],
    );
    expect(result).toContain("ok (no warnings)");
  });

  it("renders sensitive write hint when severity=critical", () => {
    const result = formatAuditExplain(
      {
        newMcpServers: [],
        execCount: 0,
        highFreqExec: false,
        sensitiveWrites: ["/path/.env", "/path/credentials.json"],
        severity: "critical",
      },
      [],
    );
    expect(result).toContain("🛡 機密ファイル書き込み検出 (sensitive=2)");
    expect(result).toContain("/path/.env");
    expect(result).toContain(".gitignore 追加");
    expect(result).toContain("環境変数化");
  });

  it("renders high freq exec hint with top Bash commands", () => {
    const events: AuditEvent[] = [
      ...Array(201).fill({
        category: "exec",
        target: "ls -la",
      } as AuditEvent),
    ];
    const result = formatAuditExplain(
      {
        newMcpServers: [],
        execCount: 201,
        highFreqExec: true,
        sensitiveWrites: [],
        severity: "warning",
      },
      events,
    );
    expect(result).toContain("⚠ 高頻度 exec 検出 (exec=201");
    expect(result).toContain("ls -la (201 回)");
    expect(result).toContain("script 化検討");
  });

  it("renders new MCP server hint", () => {
    const result = formatAuditExplain(
      {
        newMcpServers: ["playwright", "fetch"],
        execCount: 0,
        highFreqExec: false,
        sensitiveWrites: [],
        severity: "warning",
      },
      [],
    );
    expect(result).toContain(
      "⚠ 新規 MCP server 検出 (+2mcp = playwright, fetch)",
    );
    expect(result).toContain("--learn-mcp で学習");
  });

  it("renders all three warnings combined when present", () => {
    const result = formatAuditExplain(
      {
        newMcpServers: ["fetch"],
        execCount: 250,
        highFreqExec: true,
        sensitiveWrites: ["/secret.pem"],
        severity: "critical",
      },
      [],
    );
    expect(result).toContain("🛡 機密ファイル");
    expect(result).toContain("⚠ 高頻度 exec");
    expect(result).toContain("⚠ 新規 MCP server");
  });

  it("truncates long file path list (>10 items)", () => {
    const manyPaths = Array.from(
      { length: 15 },
      (_, i) => `/secret${i}.env`,
    );
    const result = formatAuditExplain(
      {
        newMcpServers: [],
        execCount: 0,
        highFreqExec: false,
        sensitiveWrites: manyPaths,
        severity: "critical",
      },
      [],
    );
    expect(result).toContain("(sensitive=15)");
    expect(result).toContain("5 件省略");
    expect(result).toContain("/secret0.env");
    expect(result).not.toContain("/secret14.env");
  });
});

describe("extractAuditEvents with PII redaction", () => {
  it("redacts PII in input by default", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "echo user@example.com" },
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec);
    expect((events[0].input as Record<string, unknown>).command).toBe(
      "echo [EMAIL]",
    );
  });

  it("preserves raw input with raw=true (debug mode)", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "echo user@example.com" },
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec, { raw: true });
    expect((events[0].input as Record<string, unknown>).command).toBe(
      "echo user@example.com",
    );
  });

  it("does not redact target file_path (no PII patterns matched)", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Read",
            input: { file_path: "/home/user/.env.local" },
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec);
    // target = file_path に PII patterns 無いのでそのまま
    expect(events[0].target).toBe("/home/user/.env.local");
  });

  it("redacts target when command contains PII (e.g., email in commit message)", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "git commit -m 'fix: notify user@example.com'" },
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec);
    expect(events[0].target).toContain("[EMAIL]");
    expect(events[0].target).not.toContain("user@example.com");
  });

  it("preserves raw target with raw=true (debug mode)", () => {
    const rec: ClaudeCodeRecord = {
      type: "assistant",
      timestamp: "2026-05-16T10:00:00Z",
      message: {
        content: [
          {
            type: "tool_use",
            name: "Bash",
            input: { command: "echo user@example.com" },
          } as never,
        ],
      },
    };
    const events = extractAuditEvents(rec, { raw: true });
    expect(events[0].target).toBe("echo user@example.com");
  });
});
