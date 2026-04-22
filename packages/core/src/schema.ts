import { z } from "zod";

export const UsageSchema = z
  .object({
    input_tokens: z.number().optional(),
    output_tokens: z.number().optional(),
    cache_read_input_tokens: z.number().optional(),
    cache_creation_input_tokens: z.number().optional(),
  })
  .passthrough();

export type Usage = z.infer<typeof UsageSchema>;

export const ContentItemSchema = z
  .object({
    type: z.string(),
    name: z.string().optional(),
  })
  .passthrough();

export type ContentItem = z.infer<typeof ContentItemSchema>;

export const MessageSchema = z
  .object({
    model: z.string().optional(),
    usage: UsageSchema.optional(),
    content: z.array(ContentItemSchema).optional(),
  })
  .passthrough();

export type Message = z.infer<typeof MessageSchema>;

export const ClaudeCodeRecordSchema = z
  .object({
    type: z.string(),
    sessionId: z.string().optional(),
    uuid: z.string().optional(),
    timestamp: z.string().optional(),
    isSidechain: z.boolean().optional(),
    message: MessageSchema.optional(),
  })
  .passthrough();

export type ClaudeCodeRecord = z.infer<typeof ClaudeCodeRecordSchema>;

export function parseRecord(line: string): ClaudeCodeRecord | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(trimmed);
  } catch {
    return null;
  }
  const parsed = ClaudeCodeRecordSchema.safeParse(raw);
  if (!parsed.success) return null;
  return parsed.data;
}
