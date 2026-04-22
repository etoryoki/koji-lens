export const VERSION = "0.0.0";

export {
  ClaudeCodeRecordSchema,
  MessageSchema,
  UsageSchema,
  ContentItemSchema,
  parseRecord,
  type ClaudeCodeRecord,
  type Message,
  type Usage,
  type ContentItem,
} from "./schema.js";

export {
  priceFor,
  listKnownModels,
  type ModelPrice,
} from "./pricing.js";

export {
  createEmptyAggregate,
  applyRecord,
  applyUsage,
  finalizeAggregate,
  sumAggregates,
  type SessionAggregate,
  type TotalAggregate,
} from "./aggregate.js";

export {
  defaultClaudeLogDir,
  findJsonlFiles,
  sessionIdFromPath,
} from "./paths.js";

export {
  analyzeFile,
  analyzeDirectory,
  analyzeDirectoryCached,
  parseSince,
  type AnalyzeOptions,
  type CachedAnalyzeOptions,
} from "./analyze.js";

export {
  sessions,
  CREATE_TABLES_SQL,
  defaultCacheDbPath,
  openCacheDb,
  upsertSessionCache,
  getSessionCache,
  listSessionCaches,
  isCacheFresh,
  clearSessionCache,
  type OpenCacheDbResult,
  type CachedSessionAggregate,
} from "./db/index.js";

export {
  formatDuration,
  formatUsd,
  formatJpy,
  formatTokens,
  renderSessionBlock,
  renderTotalBlock,
  renderSummary,
  type RenderOptions,
} from "./format.js";

export {
  configFilePath,
  loadConfig,
  saveConfig,
  getConfigValue,
  setConfigValue,
  unsetConfigValue,
  listKnownConfigKeys,
  type KojiLensConfig,
} from "./config.js";
