/**
 * koji-lens serve E2E regression tests (2026-05-12 深町 CTO 諮問結果採用、Phase A 着手前必須)
 *
 * 背景: 2026-05-11 beta.9 で `koji-lens serve` 起動時に Turbopack hash 付き external module
 *       解決失敗 (`better-sqlite3-<hash> not found`) Critical Blocker 発覚。beta.10 で
 *       Option A (CLI JSON 出力 → web 読み込み 2 プロセス構成) 採用で構造解消
 *       (apps/web/app/page.tsx から @kojihq/core-sqlite 依存完全除去 +
 *        packages/core/src/web-cache.ts 新設 + apps/cli/src/commands/serve.ts precompute flow 追加)。
 *       本テストは同型回帰防止 = `koji-lens serve` 起動 → HTTP 200 確認 +
 *       module resolution エラーが stderr に出ていないことを確認。
 *
 * 副作用対処 (2026-05-11 プロトタイプ実装で検出):
 * - serve-e2e と statusline-hang の並列実行で statusline `--combined` が hang
 *   (stdout/stderr 空で 3 秒タイムアウト、原因は子プロセス環境 / port 干渉と推測)
 * - apps/cli/vitest.config.ts で fileParallelism: false + 本ファイル内 describe.sequential() で対処
 *
 * 実装方針:
 * - mkdtempSync で tmpHome 作成 + HOME / USERPROFILE override で fixture Claude log dir 空状態
 *   (defaultClaudeLogDir / defaultCacheDbPath / defaultWebCachePath すべて homedir() ベース)
 * - `koji-lens serve -p <PORT>` 子プロセス起動
 * - waitForServer で 30 秒以内 HTTP 200 確認 (Next.js standalone startup overhead)
 * - stderr に `Cannot find module` / `MODULE_NOT_FOUND` パターンなしを確認
 * - afterEach で子プロセス SIGKILL + tmpHome rmSync
 */
import { describe, it, expect, afterEach } from "vitest";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, "..", "dist", "index.js");
const PORT = 47834; // statusline-hang.test.ts と衝突しない番号、CI でも空き想定
const STARTUP_TIMEOUT_MS = 30_000;

let serveProc: ChildProcess | null = null;
let tmpHome: string | null = null;

function killProcessTree(pid: number): void {
  // Windows: koji-lens serve が Next.js standalone server を spawn する 2 階層子プロセス構造。
  // child.kill() は親 (koji-lens serve) のみ kill、孫 (node server.js) はゾンビ化して
  // port 占有 + CPU 占有 → 後続テスト (statusline-hang) に干渉する。
  // taskkill /T /F で process tree 全体を殺す。
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {
        // process 既に終了
      }
    }
  }
}

afterEach(async () => {
  if (serveProc && serveProc.pid && !serveProc.killed) {
    killProcessTree(serveProc.pid);
    // 子プロセスツリー kill 後の port release + system load 緩和待ち。
    // 500ms では後続 test (statusline-hang) が flaky になる事例検出 (5/12)、2000ms で安定。
    await sleep(2_000);
  }
  serveProc = null;

  if (tmpHome && existsSync(tmpHome)) {
    try {
      rmSync(tmpHome, { recursive: true, force: true });
    } catch {
      // Windows file lock 等の cleanup 失敗は test 失敗にしない
    }
  }
  tmpHome = null;
});

async function waitForServer(url: string, timeoutMs: number): Promise<Response> {
  const start = Date.now();
  let lastError: unknown;
  while (Date.now() - start < timeoutMs) {
    try {
      return await fetch(url);
    } catch (e) {
      lastError = e;
      await sleep(500);
    }
  }
  throw new Error(
    `Server did not respond within ${timeoutMs}ms: ${String(lastError)}`,
  );
}

describe.sequential(
  "koji-lens serve E2E regression (beta.9 → beta.10 Critical Blocker fix verification)",
  () => {
    it("serve starts web UI and responds 200 without module resolution errors", async () => {
      tmpHome = mkdtempSync(path.join(tmpdir(), "koji-lens-serve-e2e-"));
      mkdirSync(path.join(tmpHome, ".claude", "projects"), { recursive: true });

      let stdout = "";
      let stderr = "";

      serveProc = spawn(
        process.execPath,
        [CLI_PATH, "serve", "--port", String(PORT)],
        {
          stdio: ["pipe", "pipe", "pipe"],
          env: {
            ...process.env,
            HOME: tmpHome,
            USERPROFILE: tmpHome, // Windows: homedir() は USERPROFILE を返す
            KOJI_LENS_BUDDY: "",
          },
        },
      );

      serveProc.stdout?.on("data", (d: Buffer) => {
        stdout += d.toString();
      });
      serveProc.stderr?.on("data", (d: Buffer) => {
        stderr += d.toString();
      });

      const res = await waitForServer(
        `http://127.0.0.1:${PORT}/`,
        STARTUP_TIMEOUT_MS,
      ).catch((e) => {
        // fail 時に stdout/stderr を表示してデバッグ容易化
        console.error("\n=== serve stdout (first 4000 chars) ===");
        console.error(stdout.slice(0, 4000));
        console.error("\n=== serve stderr (first 4000 chars) ===");
        console.error(stderr.slice(0, 4000));
        throw e;
      });
      expect(res.status).toBe(200);

      // beta.9 → beta.10 fix verification: external module 解決失敗 stderr パターンなし
      expect(stderr).not.toMatch(/Cannot find module/i);
      expect(stderr).not.toMatch(/better-sqlite3.*not found/i);
      expect(stderr).not.toMatch(/MODULE_NOT_FOUND/);
    }, STARTUP_TIMEOUT_MS + 5_000);
  },
);
