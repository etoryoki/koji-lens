import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

import type { SessionAggregate } from "./aggregate.js";

export const WEB_CACHE_VERSION = 1 as const;

export interface WebCachePayload {
  version: typeof WEB_CACHE_VERSION;
  generatedAt: string;
  claudeLogDir: string;
  sessions: SessionAggregate[];
}

export function defaultWebCachePath(): string {
  return path.join(homedir(), ".koji-lens", "web-cache.json");
}

export async function writeWebCache(
  payload: WebCachePayload,
  filePath: string = defaultWebCachePath(),
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload), "utf8");
}

export async function readWebCache(
  filePath: string = defaultWebCachePath(),
): Promise<WebCachePayload | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content) as WebCachePayload;
    if (parsed.version !== WEB_CACHE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
