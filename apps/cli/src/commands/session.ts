import {
  analyzeFile,
  defaultClaudeLogDir,
  findJsonlFiles,
  renderSessionBlock,
  sessionIdFromPath,
} from "@kojihq/core";

export interface SessionOptions {
  usdJpy: string;
  format: string;
  dir?: string;
}

export async function sessionCommand(
  id: string,
  opts: SessionOptions,
): Promise<void> {
  const dir = opts.dir ?? defaultClaudeLogDir();
  const files = findJsonlFiles(dir);
  const target = files.find((f) => sessionIdFromPath(f) === id);
  if (!target) {
    console.error(`Session not found: ${id}`);
    console.error(`Searched under: ${dir}`);
    process.exit(1);
  }
  const agg = await analyzeFile(target);
  const rate = Number(opts.usdJpy);

  if (opts.format === "json") {
    process.stdout.write(JSON.stringify(agg, null, 2) + "\n");
    return;
  }
  process.stdout.write(renderSessionBlock(agg, { usdJpy: rate }) + "\n");
}
