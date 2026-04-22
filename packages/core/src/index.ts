import { z } from "zod";

export const VERSION = "0.0.0";

export const ClaudeCodeRecordSchema = z
  .object({
    type: z.string(),
    sessionId: z.string().optional(),
    uuid: z.string().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

export type ClaudeCodeRecord = z.infer<typeof ClaudeCodeRecordSchema>;

export interface SessionSummary {
  sessionId: string;
  startedAt: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}
