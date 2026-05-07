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
  type ModelChange,
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

export {
  computePeriodSummary,
  computeCompare,
  type PeriodSummary,
  type CompareResult,
} from "./compare.js";

export { generateInsights } from "./insights.js";

export {
  computeWeeklyTrend,
  detectTrendRegressions,
  renderWeeklyTrendText,
  type WeeklyTrendResult,
  type WeeklyTrendBucket,
  type TrendRegression,
  type TrendRegressionWithAttribution,
  type UserPatternChange,
  type TrendAttribution,
} from "./trend.js";

export {
  analyzeUserPatternChange,
  attributeRegression,
  detectTrendRegressionsWithAttribution,
  type DetectOptions,
} from "./attribution.js";

export {
  computeBudgetForecast,
  computeDailyBudgetTrend,
  checkBudgetAlert,
  type BudgetForecast,
  type BudgetAlert,
  type DailyBudgetPoint,
} from "./budget.js";

export {
  computeCacheRate,
  type CacheRateResult,
} from "./cache-rate.js";

export {
  computeMonthRanges,
  renderStatusline,
  type MonthRanges,
  type StatuslineMode,
  type RenderOptions as StatuslineRenderOptions,
} from "./statusline.js";

export {
  defaultStateFilePath,
  readAgentState,
  type AgentState,
  type AgentStateFile,
  type AgentStateRead,
} from "./state.js";

export {
  rollupSubagents,
  type SessionAggregateWithChildren,
} from "./rollup.js";
