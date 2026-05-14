import { existsSync, readdirSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";

export function defaultClaudeLogDir(): string {
  return join(homedir(), ".claude", "projects");
}

/**
 * --dir 引数の正規化 (path traversal 防止、深町 CTO 諮問推奨 2026-05-02)。
 *
 * - `path.resolve()` で相対パス → 絶対パス + `..` 解決
 * - `realpathSync()` で symlink 解決 (存在する path のみ、存在しない時は
 *   resolve 結果をそのまま返す = 新規ディレクトリ指定との互換性維持)
 *
 * koji-lens は CLI ローカル動作で `--dir` は user 自身が制御する path =
 * 厳密な攻撃ベクトルではないが、symlink / 相対パス trick による不意の挙動を
 * 防ぐ一次ガードとして実装。ホーム配下制限は採用しない (テスト fixture 互換性
 * 維持、2026-05-14 CEO 判断)。
 */
export function normalizeDirArg(dir: string): string {
  const absolute = resolve(dir);
  try {
    return realpathSync(absolute);
  } catch {
    return absolute;
  }
}

export function findJsonlFiles(rootDir: string, maxDepth = 4): string[] {
  const out: string[] = [];
  if (!existsSync(rootDir)) return out;

  const walk = (dir: string, depth: number) => {
    if (depth > maxDepth) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry);
      let isDir = false;
      let isFile = false;
      try {
        const st = statSync(full);
        isDir = st.isDirectory();
        isFile = st.isFile();
      } catch {
        continue;
      }
      if (isDir) {
        walk(full, depth + 1);
      } else if (isFile && entry.endsWith(".jsonl")) {
        out.push(full);
      }
    }
  };
  walk(rootDir, 0);
  return out.sort();
}

export function sessionIdFromPath(filePath: string): string {
  return basename(filePath).replace(/\.jsonl$/, "");
}
