import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export function defaultClaudeLogDir(): string {
  return join(homedir(), ".claude", "projects");
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
