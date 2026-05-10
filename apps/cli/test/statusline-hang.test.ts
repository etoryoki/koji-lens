/**
 * statusline hang regression tests (2026-05-09 深町 CTO 諮問結果採用、Phase A 着手前必須)
 *
 * 背景: beta.7 → beta.8 で `statusline --combined` を Claude Code から呼び出すと
 *       stdin / spawn 由来の event loop が残り process exit せずに hang する Critical バグ発生。
 *       beta.8 で `process.stdout.drain` + `setImmediate` の明示 exit で対処済み (commit `fcfe...`)。
 *       本テストは同型回帰を防ぐ E2E hang テスト = non-TTY stdin で 3 秒以内に exit することを確認。
 *
 * 実装方針:
 * - `node ./dist/index.js statusline ...` を子プロセスで起動
 * - stdin を即 end (= non-TTY)
 * - 3 秒のタイムアウト内に exit code 0 で終了することを確認
 * - ccusage 未インストール環境前提 (graceful fallback で空文字 prefix)
 * - buddy / state / cache 等の外部依存は env で抑制 (fixture 不要)
 */
import { describe, it, expect } from "vitest";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, "..", "dist", "index.js");
const TIMEOUT_MS = 3000;

type RunResult = {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

function runCli(args: string[]): Promise<RunResult> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [CLI_PATH, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        // 外部依存抑制: buddy / state / 等を簡素化
        KOJI_LENS_BUDDY: "",
        // ccusage path を強制的に存在しない場所にして graceful fallback を発火
        PATH: process.platform === "win32" ? "C:\\Windows\\System32" : "/usr/bin:/bin",
      },
    });

    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr.on("data", (d: Buffer) => {
      stderr += d.toString();
    });

    // non-TTY stdin: 即 end (Claude Code が statusline 呼び出し時の挙動模倣)
    proc.stdin.end();

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(
        new Error(
          `statusline did not exit within ${TIMEOUT_MS}ms (hang regression detected). args=${JSON.stringify(args)}, stdout=${stdout.slice(0, 200)}, stderr=${stderr.slice(0, 200)}`
        )
      );
    }, TIMEOUT_MS);

    proc.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        signal,
        stdout,
        stderr,
        durationMs: Date.now() - start,
      });
    });

    proc.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

describe("statusline hang regression (beta.7 → beta.8 fix verification)", () => {
  it("statusline --combined exits within 3s on non-TTY stdin (ccusage absent)", async () => {
    const result = await runCli(["statusline", "--combined"]);
    expect(result.durationMs).toBeLessThan(TIMEOUT_MS);
    expect(result.exitCode).toBe(0);
    // graceful fallback で何かしら stdout に出力されているはず (koji-lens 単独出力)
    expect(result.stdout.length).toBeGreaterThan(0);
  }, TIMEOUT_MS + 1000);

  it("statusline (single mode) exits within 3s on non-TTY stdin", async () => {
    const result = await runCli(["statusline"]);
    expect(result.durationMs).toBeLessThan(TIMEOUT_MS);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.length).toBeGreaterThan(0);
  }, TIMEOUT_MS + 1000);
});
