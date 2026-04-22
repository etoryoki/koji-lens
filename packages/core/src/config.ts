import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface KojiLensConfig {
  logDir?: string;
  usdJpy?: number;
}

const KNOWN_KEYS: Array<keyof KojiLensConfig> = ["logDir", "usdJpy"];

export function configFilePath(): string {
  return join(homedir(), ".koji-lens", "config.json");
}

export function loadConfig(): KojiLensConfig {
  const file = configFilePath();
  if (!existsSync(file)) return {};
  try {
    const raw = readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return parsed as KojiLensConfig;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveConfig(cfg: KojiLensConfig): void {
  const file = configFilePath();
  const dir = join(homedir(), ".koji-lens");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(cfg, null, 2) + "\n", "utf8");
}

export function getConfigValue(key: string): unknown {
  if (!isKnownKey(key)) return undefined;
  return loadConfig()[key];
}

export function setConfigValue(key: string, value: string): KojiLensConfig {
  if (!isKnownKey(key)) {
    throw new Error(
      `Unknown config key: ${key}. Known keys: ${KNOWN_KEYS.join(", ")}`,
    );
  }
  const cfg = loadConfig();
  if (key === "usdJpy") {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
      throw new Error(`usdJpy must be a positive number, got: ${value}`);
    }
    cfg.usdJpy = num;
  } else if (key === "logDir") {
    cfg.logDir = value;
  }
  saveConfig(cfg);
  return cfg;
}

export function unsetConfigValue(key: string): KojiLensConfig {
  if (!isKnownKey(key)) {
    throw new Error(
      `Unknown config key: ${key}. Known keys: ${KNOWN_KEYS.join(", ")}`,
    );
  }
  const cfg = loadConfig();
  delete cfg[key];
  saveConfig(cfg);
  return cfg;
}

export function listKnownConfigKeys(): string[] {
  return [...KNOWN_KEYS];
}

function isKnownKey(key: string): key is keyof KojiLensConfig {
  return (KNOWN_KEYS as string[]).includes(key);
}
