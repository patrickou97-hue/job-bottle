import "server-only";
import type { getDeepSeekConfiguration } from "./deepseek-config";

export type AiConfig = NonNullable<ReturnType<typeof getDeepSeekConfiguration>>;
export type ChatMessage = { role: "system" | "user"; content: string };

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

export class UpstreamError extends Error {
  constructor(public status: number, public kind = "http") {
    super(`AI upstream ${status}`);
  }
}

export async function callDeepSeek({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  externalSignal,
  timeoutMs,
}: AiConfig & { messages: ChatMessage[]; maxTokens: number; externalSignal?: AbortSignal; timeoutMs: number }) {
  const controller = new AbortController();
  const cancelFromOutside = () => controller.abort();
  externalSignal?.addEventListener("abort", cancelFromOutside, { once: true });
  if (externalSignal?.aborted) cancelFromOutside();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        stream: false,
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new UpstreamError(response.status);
    const payload = await response.json().catch(() => null) as { choices?: { message?: { content?: string }; finish_reason?: string }[] } | null;
    const choice = payload?.choices?.[0];
    const content = choice?.message?.content;
    if (choice?.finish_reason === "length") throw new UpstreamError(502, "invalid");
    if (typeof content !== "string" || !content.trim()) throw new UpstreamError(502, "empty");
    return content;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", cancelFromOutside);
  }
}
