/**
 * statusline 多重起動ガード (2026-09-24 オーナー報告: node.exe が数十件残りメモリ圧迫)
 * - 集計ロックは同時に 1 本まで
 * - 死んだプロセスのロックは次のプロセスが奪える
 * - snapshot は key 一致時のみ再利用
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  readSnapshot,
  tryAcquireLock,
  writeSnapshot,
} from "../src/lib/statusline-guard.js";

let home: string;
const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), "koji-guard-"));
  process.env.HOME = home;
  process.env.USERPROFILE = home;
});

afterEach(() => {
  process.env.HOME = saved.HOME;
  process.env.USERPROFILE = saved.USERPROFILE;
  rmSync(home, { recursive: true, force: true });
});

describe("statusline guard", () => {
  it("allows only one lock holder at a time", () => {
    const release = tryAcquireLock();
    expect(release).not.toBeNull();
    expect(tryAcquireLock()).toBeNull();
    release!();
    const again = tryAcquireLock();
    expect(again).not.toBeNull();
    again!();
  });

  it("takes over a lock left by a dead process", () => {
    const dir = path.join(home, ".koji-lens");
    mkdirSync(dir, { recursive: true });
    // 存在しない PID (上限近い値) + 現在時刻 = 時間では stale にならず、PID 死亡で判定される
    writeFileSync(
      path.join(dir, "statusline.lock"),
      JSON.stringify({ pid: 2_147_483_000, at: Date.now() }),
    );
    const release = tryAcquireLock();
    expect(release).not.toBeNull();
    release!();
  });

  it("keeps a lock held by a live process", () => {
    const dir = path.join(home, ".koji-lens");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "statusline.lock"),
      JSON.stringify({ pid: process.pid, at: Date.now() }),
    );
    expect(tryAcquireLock()).toBeNull();
  });

  it("reuses a snapshot only when the key matches", () => {
    writeSnapshot("k1", { value: 42 });
    const snap = readSnapshot<{ value: number }>("k1");
    expect(snap?.data.value).toBe(42);
    expect(snap!.ageMs).toBeGreaterThanOrEqual(0);
    expect(readSnapshot("k2")).toBeNull();
  });
});

describe("statusline guard ownership", () => {
  it("does not delete a lock that another process took over", async () => {
    const { readFileSync } = await import("node:fs");
    const release = tryAcquireLock();
    expect(release).not.toBeNull();
    // 上限超過で別プロセスが奪った状態を再現
    const lock = path.join(home, ".koji-lens", "statusline.lock");
    writeFileSync(lock, JSON.stringify({ pid: process.pid + 1, at: Date.now() }));
    release!();
    expect(JSON.parse(readFileSync(lock, "utf8")).pid).toBe(process.pid + 1);
  });
});
