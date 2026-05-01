import { statSync } from "node:fs";
import {
  analyzeFile,
  defaultClaudeLogDir,
  findJsonlFiles,
  loadConfig,
  renderSessionBlock,
  sessionIdFromPath,
  type SessionAggregate,
} from "@kojihq/core";
import {
  getSessionCache,
  isCacheFresh,
  openCacheDb,
  upsertSessionCache,
} from "@kojihq/core-sqlite";

export interface SessionOptions {
  usdJpy?: string;
  format: string;
  dir?: string;
  cache: boolean;
}

const DEFAULT_USD_JPY = 155;

export async function sessionCommand(
  id: string,
  opts: SessionOptions,
): Promise<void> {
  const cfg = loadConfig();
  const dir = opts.dir ?? cfg.logDir ?? defaultClaudeLogDir();
  const files = findJsonlFiles(dir);
  const target = files.find((f) => sessionIdFromPath(f) === id);
  if (!target) {
    console.error(`Session not found: ${id}`);
    console.error(`Searched under: ${dir}`);
    process.exit(1);
  }

  let agg: SessionAggregate | null = null;
  if (opts.cache === false) {
    agg = await analyzeFile(target);
  } else {
    const cache = openCacheDb();
    try {
      const mtimeMs = statSync(target).mtimeMs;
      if (isCacheFresh(cache.db, id, mtimeMs)) {
        agg = getSessionCache(cache.db, id);
      }
      if (!agg) {
        agg = await analyzeFile(target);
        upsertSessionCache(cache.db, agg, mtimeMs);
      }
    } finally {
      cache.close();
    }
  }

  const rate = opts.usdJpy !== undefined
    ? Number(opts.usdJpy)
    : cfg.usdJpy ?? DEFAULT_USD_JPY;

  if (opts.format === "json") {
    process.stdout.write(JSON.stringify(agg, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderSessionBlock(agg, { usdJpy: rate }) + "\n");
}
