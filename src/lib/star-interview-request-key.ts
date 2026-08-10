import { createHash } from "node:crypto";

type CompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type CompletionClientModel = "mimo-v2.5" | "deepseek-v4-flash";

/**
 * Bind the client compatibility key to the actual completion payload.
 *
 * Older clients intentionally reuse the same UUID for a network retry. An
 * exact retry therefore receives the same billing key, while changing the
 * prompt, temperature, or token budget creates a different metered request.
 */
export function createCompletionBillingKey(input: {
  meterKey: string;
  clientModel: CompletionClientModel;
  messages: CompletionMessage[];
  temperature?: number | null;
  maxTokens?: number | null;
  stream: boolean;
}) {
  const payloadHash = createCompletionRequestHash(input).slice(0, 32);
  return `v2:${input.meterKey}:${payloadHash}`;
}

/**
 * Durable idempotency binding for one logical completion request.
 *
 * Stream and non-stream calls intentionally have different hashes because the
 * persisted response contracts are different (SSE versus JSON).
 */
export function createCompletionRequestHash(input: {
  clientModel: CompletionClientModel;
  messages: CompletionMessage[];
  temperature?: number | null;
  maxTokens?: number | null;
  stream: boolean;
}) {
  return createHash("sha256")
    .update(JSON.stringify({
      clientModel: input.clientModel,
      messages: input.messages,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
      stream: input.stream,
    }))
    .digest("hex");
}
