import { z } from "zod";

export const MAX_BODY = 128 * 1024;
export const MAX_RESPONSE = 256 * 1024;
const safeText = (max: number) => z.string().max(max).refine(value =>
  !/(?:\/(?:Users|home|private|Volumes|var|tmp|etc)\/|~\/|\bBearer\s+|\b(?:sk|api[-_]?key|access[-_]?token|refresh[-_]?token)[-_: =]+[\w-]{8,}|[\w.+-]+@[\w.-]+\.[a-z]{2,})/i.test(value), "private metadata");
export const adviceRequestSchema = z.strictObject({
  schema_version: z.literal(1), request_id: z.string().regex(/^req_[0-9a-f]{32}$/),
  run_id: safeText(128).min(1), rules_version: safeText(64).min(1),
  scope: z.strictObject({ kind: z.literal("group_review"), mode: z.enum(["local_safety_only", "local_plus_uncertain", "review_every_group"]), group_count: z.number().int().min(1).max(200) }),
  groups: z.array(z.strictObject({
    group_id: z.uuid(), display_name: safeText(120),
    category: z.enum(["app_cache", "user_cache", "logs", "temporary_files", "downloaded_installer", "developer_artifact", "package_manager_cache", "large_file", "old_file", "application_leftover", "login_item", "launch_item", "shared_container", "duplicate_file", "unknown"]),
    bundle_id: safeText(128).nullable().optional(), root_path_summary: safeText(160),
    file_count: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER), total_bytes: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    local_rule_id: safeText(128), local_risk: z.enum(["Low", "Medium", "High", "Blocked"]),
    ownership_evidence: z.array(safeText(200)).max(16),
  })).min(1).max(200),
}).refine(v => v.scope.group_count === v.groups.length && new Set(v.groups.map(g => g.group_id.toLowerCase())).size === v.groups.length, "group identity mismatch");
export type AdviceRequest = z.infer<typeof adviceRequestSchema>;
export const adviceSchema = z.strictObject({ advice: z.array(z.strictObject({
  group_id: z.uuid(), decision: z.enum(["CLEANUP_CANDIDATE", "REVIEW", "KEEP", "UNKNOWN"]),
  confidence: z.number().min(0).max(1), explanation: safeText(2000),
  reason_codes: z.array(safeText(64)).max(16), concerns: z.array(safeText(200)).max(16),
  appears_regeneratable: z.boolean().nullable().optional(),
})).max(200) });
export function validateAdvice(input: unknown, request: AdviceRequest) {
  const result = adviceSchema.parse(input);
  const expected = new Set(request.groups.map(g => g.group_id.toLowerCase()));
  if (result.advice.length !== expected.size || new Set(result.advice.map(a => a.group_id.toLowerCase())).size !== expected.size || result.advice.some(a => !expected.has(a.group_id.toLowerCase()))) throw new Error("advice identity mismatch");
  return result.advice.map(a => ({ ...a, source: "backend-ai" }));
}
export class ServiceError extends Error {
  status: number; code: string;
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code; }
}
export async function boundedJSON(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ServiceError(400, "invalid_content_type");
  return JSON.parse(await boundedText(request.body, MAX_BODY));
}
export async function boundedText(stream: ReadableStream<Uint8Array> | null, limit: number) {
  if (!stream) throw new ServiceError(400, "empty_body");
  const reader = stream.getReader(); const chunks: Uint8Array[] = []; let bytes = 0;
  try {
    for (;;) { const { done, value } = await reader.read(); if (done) break; bytes += value.length;
      if (bytes > limit) { await reader.cancel(); throw new ServiceError(413, "body_too_large"); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks).toString("utf8");
}
