import {
  computeCacheRate,
  computeCompare,
  computeMonthRanges,
  defaultClaudeLogDir,
  defaultStateFilePath,
  loadConfig,
  readAgentState,
  renderStatusline,
  analyzeDirectory,
  type BuddyLocale,
  type BuddyType,
  type SessionAggregate,
  type StatuslineMode,
} from "@kojihq/core";
import { analyzeDirectoryCached, openCacheDb } from "@kojihq/core-sqlite";
import { spawn } from "node:child_process";

const VALID_BUDDY_TYPES: ReadonlyArray<BuddyType> = ["koji", "owl", "cat"];
const VALID_BUDDY_LOCALES: ReadonlyArray<BuddyLocale> = ["ja", "en"];

function parseBuddyType(input: string | undefined): BuddyType {
  const candidate = input ?? "koji";
  if ((VALID_BUDDY_TYPES as ReadonlyArray<string>).includes(candidate)) {
    return candidate as BuddyType;
  }
  throw new Error(
    `Invalid --buddy-type: "${input}". Expected: ${VALID_BUDDY_TYPES.join(", ")}`,
  );
}

function parseBuddyLocale(input: string | undefined): BuddyLocale {
  // env override: KOJI_LENS_BUDDY_LOCALE が設定されていればそちらを優先
  const fromEnv = process.env.KOJI_LENS_BUDDY_LOCALE;
  const candidate = input ?? fromEnv ?? "ja";
  if ((VALID_BUDDY_LOCALES as ReadonlyArray<string>).includes(candidate)) {
    return candidate as BuddyLocale;
  }
  throw new Error(
    `Invalid --buddy-locale: "${candidate}". Expected: ${VALID_BUDDY_LOCALES.join(", ")}`,
  );
}

// ccusage statusline output 取得 (--combined フラグ用、cross-platform、graceful fallback)
// ccusage 未インストール / 失敗時は null 返却 = koji-lens 出力のみ表示
// v0.7.1 (2026-05-08) hang fix: child unref + listener 完全解除で event loop から離脱、kill 確実化
async function runCcusageStatusline(stdinBuf: string): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let resolved = false;
    const finish = (val: string | null): void => {
      if (resolved) return;
      resolved = true;
      resolve(val);
    };
    try {
      const child = spawn("ccusage", ["statusline"], {
        stdio: ["pipe", "pipe", "ignore"],
        shell: process.platform === "win32",
      });
      // child を event loop から外す = 親 process が child を待たずに exit 可能
      child.unref?.();
      let buf = "";
      child.stdout?.on("data", (d: Buffer) => {
        buf += d.toString();
      });
      child.on("close", (code: number | null) => {
        finish(code === 0 ? buf.trim() : null);
      });
      child.on("error", () => finish(null)); // ccusage not installed
      // 1.5 秒タイムアウト (statusline は high-frequency = ハング不可、即 fallback)
      // Windows では shell 経由起動で child.kill() が cmd.exe のみ kill する可能性 → finish 後の listener 解除で event loop 離脱
      setTimeout(() => {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        finish(null);
      }, 1500);
      try {
        child.stdin?.write(stdinBuf);
        child.stdin?.end();
      } catch {
        finish(null);
      }
    } catch {
      finish(null);
    }
  });
}

async function readStdinIfAvailable(): Promise<string> {
  // Claude Code は statusline コマンドに JSON context を stdin で渡す
  // TTY 環境 (手動実行時) は stdin なし = 空文字列で OK
  if (process.stdin.isTTY) return "";
  return new Promise<string>((resolve) => {
    let buf = "";
    let resolved = false;
    const done = (val: string): void => {
      if (resolved) return;
      resolved = true;
      // v0.7.1 (2026-05-08) hang fix: listener 完全解除 + stdin pause + unref で event loop から離脱
      // これがないと Claude Code 1 秒 refresh 経由で statusline 起動時、親 process が exit せず固まる
      try {
        process.stdin.removeAllListeners("data");
        process.stdin.removeAllListeners("end");
        process.stdin.removeAllListeners("error");
        process.stdin.pause();
        process.stdin.unref?.();
      } catch {
        /* ignore */
      }
      resolve(val);
    };
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk: string) => {
      buf += chunk;
    });
    process.stdin.on("end", () => done(buf));
    process.stdin.on("error", () => done(""));
    // 500ms タイムアウト (Claude Code 経由の場合は即時データ受信、TTY 誤判定時の fallback)
    setTimeout(() => done(buf), 500);
  });
}

export interface StatuslineOptions {
  format: string;
  mode: string;
  dir?: string;
  stateFile?: string;
  state: boolean;
  spend: boolean;
  cacheRate: boolean;
  cache: boolean;
  buddy?: boolean;
  buddySpeech?: boolean;
  buddyType?: string;
  buddyLocale?: string;
  buddyOnly?: boolean;
  combined?: boolean;
}

const VALID_MODES: ReadonlyArray<StatuslineMode> = [
  "minimal",
  "normal",
  "detailed",
];

function parseMode(input: string): StatuslineMode {
  if ((VALID_MODES as ReadonlyArray<string>).includes(input)) {
    return input as StatuslineMode;
  }
  throw new Error(
    `Invalid --mode: "${input}". Expected one of: ${VALID_MODES.join(", ")}`,
  );
}

interface DateRange {
  from: Date;
  to: Date;
}

function filterByRange(
  aggs: SessionAggregate[],
  range: DateRange,
): SessionAggregate[] {
  return aggs.filter((agg) => {
    if (!agg.endedAt) return false;
    const ts = new Date(agg.endedAt).getTime();
    return ts >= range.from.getTime() && ts <= range.to.getTime();
  });
}

export async function statuslineCommand(
  opts: StatuslineOptions,
): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const ranges = computeMonthRanges();

  let all: SessionAggregate[];
  if (opts.cache === false) {
    all = await analyzeDirectory(dir);
  } else {
    const cache = openCacheDb();
    try {
      all = await analyzeDirectoryCached(dir, cache.db);
    } finally {
      cache.close();
    }
  }

  const beforeAggs = filterByRange(all, ranges.lastMonth);
  const afterAggs = filterByRange(all, ranges.thisMonth);

  const result = computeCompare(
    beforeAggs,
    afterAggs,
    ranges.lastMonth,
    ranges.thisMonth,
  );

  const mode = parseMode(opts.mode);

  const stateRead =
    opts.state === false
      ? { icon: null, state: null, staleMs: null }
      : readAgentState(opts.stateFile ?? defaultStateFilePath());

  const cacheRate =
    opts.cacheRate === false ? null : computeCacheRate(afterAggs);

  // 起案 v0.4 §3 楽しさ別チャネル化整合: --buddy で opt-in、env KOJI_LENS_BUDDY=1 で永続化
  // v0.7 (2026-05-08) --buddy-only: buddy + speech 強制有効 + 他 signal すべて非表示の 1 フラグ
  const buddyOnly = opts.buddyOnly === true;
  const buddyEnabled =
    buddyOnly ||
    opts.buddy === true ||
    process.env.KOJI_LENS_BUDDY === "1";
  const buddyType = parseBuddyType(opts.buddyType);
  const buddyLocale = parseBuddyLocale(opts.buddyLocale);
  const buddySpeechEnabled = buddyOnly || opts.buddySpeech === true;

  // v0.7 (2026-05-08) --combined: ccusage 同時表示の簡易化
  // ccusage 未インストール時は graceful fallback で koji-lens のみ表示、cross-platform 対応
  // buddy-only mode 時は ccusage も非表示 (純粋に buddy のみ)
  const combinedEnabled = opts.combined === true && !buddyOnly;
  const stdinBuf = combinedEnabled ? await readStdinIfAvailable() : "";
  const ccusagePrefix = combinedEnabled
    ? await runCcusageStatusline(stdinBuf)
    : null;

  // per-signal opt-out (--no-state / --no-spend / --no-cache-rate) + --buddy-only shortcut
  const showState = !buddyOnly && opts.state !== false;
  const showSpend = !buddyOnly && opts.spend !== false;
  const showCache = !buddyOnly && opts.cacheRate !== false;

  if (opts.format === "json") {
    process.stdout.write(
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          mode,
          ranges: {
            lastMonth: {
              from: ranges.lastMonth.from.toISOString(),
              to: ranges.lastMonth.to.toISOString(),
            },
            thisMonth: {
              from: ranges.thisMonth.from.toISOString(),
              to: ranges.thisMonth.to.toISOString(),
            },
          },
          before: result.before,
          after: result.after,
          delta: result.delta,
          agentState: stateRead,
          cacheRate,
          statusline: renderStatusline(result, mode, {
            stateIcon: showState ? stateRead.icon : null,
            cacheRate: showCache ? cacheRate : null,
            spendVisible: showSpend,
            buddy: buddyEnabled
              ? {
                  enabled: true,
                  type: buddyType,
                  speech: buddySpeechEnabled,
                  locale: buddyLocale,
                  agentState: stateRead.state,
                }
              : undefined,
          }),
          ccusagePrefix: combinedEnabled ? ccusagePrefix : undefined,
        },
        null,
        2,
      ) + "\n",
    );
    return;
  }

  const kojiOutput = renderStatusline(result, mode, {
    stateIcon: showState ? stateRead.icon : null,
    cacheRate: showCache ? cacheRate : null,
    spendVisible: showSpend,
    buddy: buddyEnabled
      ? {
          enabled: true,
          type: buddyType,
          speech: buddySpeechEnabled,
          locale: buddyLocale,
          agentState: stateRead.state,
        }
      : undefined,
  });

  // v0.7 --combined: ccusage 出力を前置、graceful fallback (ccusage 未インストール時は koji-lens のみ)
  const finalOutput = ccusagePrefix
    ? `${ccusagePrefix}  ${kojiOutput}`
    : kojiOutput;

  process.stdout.write(finalOutput + "\n");

  // v0.7.1 (2026-05-08) hang fix: --combined で stdin / spawn の event loop が残ると process exit せず Claude Code 側が固まる
  // 明示的に exit して確実に process 終了 (stdout flush 後)
  // beta.8 idempotency (2026-05-10、深町 CTO Nit): drain と setImmediate の二重発火を排他ガード
  if (combinedEnabled) {
    let exited = false;
    const safeExit = (): void => {
      if (exited) return;
      exited = true;
      process.exit(0);
    };
    process.stdout.once("drain", safeExit);
    setImmediate(safeExit);
  }
}
