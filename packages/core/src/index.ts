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
  parseSince,
  type AnalyzeOptions,
} from "./analyze.js";

export {
  formatDuration,
  formatLocalDateTime,
  formatUsd,
  formatJpy,
  formatTokens,
  extractParentFromPath,
  renderSessionBlock,
  renderTotalBlock,
  renderSummary,
  type RenderOptions,
  type RenderSummaryOptions,
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
