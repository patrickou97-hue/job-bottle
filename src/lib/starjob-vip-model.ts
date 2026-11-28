import "server-only";
import { getDeepSeekConfiguration } from "@/lib/deepseek-config";
import { VIP_ADVANCED_MODEL } from "@/lib/starjob-vip";

export type VipModelChoice = "flash" | "astra";
type Message = { role: "system" | "user"; content: string };

export function getVipModel(choice: VipModelChoice) {
  if (choice === "flash") {
    const config = getDeepSeekConfiguration();
    return config ? { ...config, provider: "deepseek" as const } : null;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.STARJOB_VIP_OPENAI_BASE_URL || "https://api.openai.com/v1";
  return apiKey ? { model: VIP_ADVANCED_MODEL.id, apiKey, baseUrl, provider: "openai" as const } : null;
}

export async function requestVipModel(
  config: NonNullable<ReturnType<typeof getVipModel>>,
  messages: Message[],
  maxTokens: number,
  signal: AbortSignal,
) {
  const baseUrl = config.baseUrl.trim().replace(/\/+$/, "");
  const url = baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl}/chat/completions`;
  const generation = config.provider === "openai"
    ? { max_completion_tokens: maxTokens, reasoning_effort: "low", store: false }
    : {
        max_tokens: maxTokens,
        thinking: { type: "disabled" },
      };
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      messages,
      response_format: { type: "json_object" },
      stream: false,
      ...generation,
    }),
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`VIP_MODEL_HTTP_${response.status}`);
  const payload = await response.json();
  const choice = payload?.choices?.[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason === "length" || typeof content !== "string" || !content.trim()) {
    throw new Error("VIP_MODEL_OUTPUT_INCOMPLETE");
  }
  return content;
}
