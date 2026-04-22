import {
  analyzeFile,
  defaultClaudeLogDir,
  findJsonlFiles,
  loadConfig,
  renderSessionBlock,
  sessionIdFromPath,
} from "@kojihq/core";

export interface SessionOptions {
  usdJpy?: string;
  format: string;
  dir?: string;
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
  const agg = await analyzeFile(target);
  const rate = opts.usdJpy !== undefined
    ? Number(opts.usdJpy)
    : cfg.usdJpy ?? DEFAULT_USD_JPY;

  if (opts.format === "json") {
    process.stdout.write(JSON.stringify(agg, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderSessionBlock(agg, { usdJpy: rate }) + "\n");
}
