export {
  sessions,
  auditEventsCache,
  CREATE_TABLES_SQL,
  CURRENT_SCHEMA_VERSION,
} from "./schema.js";
export {
  defaultCacheDbPath,
  openCacheDb,
  type OpenCacheDbResult,
} from "./client.js";
export {
  upsertSessionCache,
  getSessionCache,
  listSessionCaches,
  isCacheFresh,
  clearSessionCache,
  getAuditEventsCacheIfFresh,
  upsertAuditEventsCache,
  clearAuditEventsCache,
  type CachedSessionAggregate,
  type AuditEventsCacheEntry,
} from "./cache.js";
export {
  analyzeDirectoryCached,
  type CachedAnalyzeOptions,
} from "./analyze-cached.js";
export { collectAuditEventsCached } from "./audit-collect.js";
