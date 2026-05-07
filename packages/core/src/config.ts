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
  budgetUsd?: number;
  // 複数プロジェクト個別予算 (Pro 機能 v0.2 §6.1)
  // key = project filter で使う slug (extractProjectKey の戻り値)、値 = USD 月予算
  // "_default" キーで全プロジェクト共通予算 (budgetUsd の dict 版)
  budgets?: Record<string, number>;
}

const KNOWN_KEYS: Array<keyof KojiLensConfig> = ["logDir", "usdJpy", "budgetUsd"];

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
  } else if (key === "budgetUsd") {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) {
      throw new Error(`budgetUsd must be a positive number, got: ${value}`);
    }
    cfg.budgetUsd = num;
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

// 複数プロジェクト個別予算 (Pro 機能 v0.2 §6.1)

const DEFAULT_BUDGET_KEY = "_default" as const;

export function setProjectBudget(projectKey: string, usd: number): KojiLensConfig {
  if (!Number.isFinite(usd) || usd <= 0) {
    throw new Error(`Project budget must be positive, got: ${usd}`);
  }
  const cfg = loadConfig();
  const budgets = cfg.budgets ?? {};
  budgets[projectKey] = usd;
  cfg.budgets = budgets;
  saveConfig(cfg);
  return cfg;
}

export function unsetProjectBudget(projectKey: string): KojiLensConfig {
  const cfg = loadConfig();
  if (cfg.budgets) {
    delete cfg.budgets[projectKey];
    if (Object.keys(cfg.budgets).length === 0) {
      delete cfg.budgets;
    }
  }
  saveConfig(cfg);
  return cfg;
}

export function listProjectBudgets(
  cfg: KojiLensConfig = loadConfig(),
): Record<string, number> {
  return { ...(cfg.budgets ?? {}) };
}

// 解決優先順位:
//   1. cfg.budgets[projectKey] (個別プロジェクト予算)
//   2. cfg.budgets._default (全プロジェクト共通予算)
//   3. cfg.budgetUsd (旧フィールド、後方互換)
//   返却 = USD 数値、未設定なら 0
export function resolveBudgetForProject(
  projectKey: string | undefined,
  cfg: KojiLensConfig = loadConfig(),
): number {
  if (cfg.budgets) {
    if (projectKey && cfg.budgets[projectKey] && cfg.budgets[projectKey] > 0) {
      return cfg.budgets[projectKey];
    }
    if (
      cfg.budgets[DEFAULT_BUDGET_KEY] &&
      cfg.budgets[DEFAULT_BUDGET_KEY] > 0
    ) {
      return cfg.budgets[DEFAULT_BUDGET_KEY];
    }
  }
  if (cfg.budgetUsd && cfg.budgetUsd > 0) return cfg.budgetUsd;
  return 0;
}
