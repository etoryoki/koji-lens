/**
 * `koji-lens logout` (2026-09-25): auth.json と sync-state.json だけを消し、
 * キャッシュと設定は残す。未ログインでもエラーにしない
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist", "index.js");

let home: string;
let dir: string;

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: "utf8",
    env: { ...process.env, HOME: home, USERPROFILE: home },
    timeout: 15_000,
  });
}

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), "koji-logout-"));
  dir = path.join(home, ".koji-lens");
  mkdirSync(dir, { recursive: true });
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
});

describe("koji-lens logout", () => {
  it("removes login and sync state but keeps cache and config", () => {
    for (const f of ["auth.json", "sync-state.json", "cache.db", "config.json"]) {
      writeFileSync(path.join(dir, f), "{}");
    }
    const r = run(["logout"]);
    expect(r.status).toBe(0);
    expect(existsSync(path.join(dir, "auth.json"))).toBe(false);
    expect(existsSync(path.join(dir, "sync-state.json"))).toBe(false);
    expect(existsSync(path.join(dir, "cache.db"))).toBe(true);
    expect(existsSync(path.join(dir, "config.json"))).toBe(true);
    expect(r.stdout).toContain("ログアウトしました");
  });

  it("succeeds quietly when not logged in", () => {
    const r = run(["logout"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("ログインしていません");
  });
});
