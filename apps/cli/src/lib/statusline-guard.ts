/**
 * statusline の多重起動ガード (2026-09-24 オーナー報告: node.exe が数十件残りメモリ圧迫)
 *
 * 原因: statusline 1 回の集計が 2 秒前後 (cache 空なら 10-20 秒)・約 140MB。
 * Claude Code は会話更新のたびに statusline を呼び直し、前回分は親 (shell) だけ
 * 打ち切られて node 本体が残る。複数セッション × 更新回数だけ集計が同時に走っていた。
 *
 * 対策:
 * - 重い集計結果を snapshot として保存し、FRESH_MS 以内なら即再利用
 * - 集計はロックファイルで全プロセス合わせて同時に 1 本まで
 * - ロックを取れなかったプロセスは前回 snapshot (無ければ placeholder) を即返して終了
 * - 集計担当にも HOLDER_MAX_MS の上限を設け、超えたら自ら終了
 */

import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export const FRESH_MS = envMs("KOJI_LENS_STATUSLINE_FRESH_MS", 20_000);
export const HOLDER_MAX_MS = envMs("KOJI_LENS_STATUSLINE_MAX_MS", 60_000);
// これより古い snapshot は stale 表示にも使わない (月替わり等で大きくずれるため)
const STALE_LIMIT_MS = 24 * 60 * 60 * 1000;

function guardDir(): string {
  return path.join(homedir(), ".koji-lens");
}

function snapshotPath(): string {
  return path.join(guardDir(), "statusline-snapshot.json");
}

function lockPath(): string {
  return path.join(guardDir(), "statusline.lock");
}

interface SnapshotFile<T> {
  key: string;
  at: number;
  data: T;
}

export interface Snapshot<T> {
  data: T;
  ageMs: number;
}

export function readSnapshot<T>(key: string): Snapshot<T> | null {
  try {
    const raw = readFileSync(snapshotPath(), "utf8");
    const parsed = JSON.parse(raw) as SnapshotFile<T>;
    if (parsed.key !== key || typeof parsed.at !== "number") return null;
    const ageMs = Date.now() - parsed.at;
    if (ageMs < 0 || ageMs > STALE_LIMIT_MS) return null;
    return { data: parsed.data, ageMs };
  } catch {
    return null;
  }
}

export function writeSnapshot<T>(key: string, data: T): void {
  try {
    mkdirSync(guardDir(), { recursive: true });
    const body: SnapshotFile<T> = { key, at: Date.now(), data };
    // 他プロセスが読み途中の半端なファイルを見ないよう tmp → rename
    const tmp = `${snapshotPath()}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(body), "utf8");
    try {
      renameSync(tmp, snapshotPath());
    } catch {
      // rename 失敗時に tmp を残さない (深町 CTO Warning 3)
      try {
        unlinkSync(tmp);
      } catch {
        /* ignore */
      }
    }
  } catch {
    // snapshot は最適化のみ。失敗しても表示は継続
  }
}

function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM = 存在するが権限なし = 生きている
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function isLockStale(): boolean {
  try {
    const raw = readFileSync(lockPath(), "utf8");
    const { pid, at } = JSON.parse(raw) as { pid: number; at: number };
    if (Date.now() - at > HOLDER_MAX_MS + 5_000) return true;
    return !isPidAlive(pid);
  } catch {
    // 読めない / 壊れている lock は stale 扱い
    return true;
  }
}

/**
 * 集計担当のロックを取得する。取れたら release 関数、取れなければ null。
 * 担当プロセスが死んだ / 上限時間を超えた lock は奪い取る。
 */
export function tryAcquireLock(): (() => void) | null {
  mkdirSync(guardDir(), { recursive: true });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const fd = openSync(lockPath(), "wx");
      writeFileSync(fd, JSON.stringify({ pid: process.pid, at: Date.now() }));
      closeSync(fd);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        // 深町 CTO Critical (2026-09-24): 自分のロックのときだけ消す。
        // 集計が上限を超えて他プロセスに奪われた後で消すと、3 本目も取得でき同時集計になる
        try {
          const { pid } = JSON.parse(readFileSync(lockPath(), "utf8")) as {
            pid: number;
          };
          if (pid === process.pid) unlinkSync(lockPath());
        } catch {
          /* 既に消えている / 読めない = 他プロセスの管理下 */
        }
      };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") return null;
      if (attempt === 0 && isLockStale()) {
        try {
          unlinkSync(lockPath());
        } catch {
          /* 他プロセスが先に消した */
        }
        continue;
      }
      return null;
    }
  }
  return null;
}
