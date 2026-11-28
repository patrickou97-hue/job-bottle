import "server-only";

export function getDeepSeekModelId() {
  return process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
}

export function getDeepSeekConfiguration() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    baseUrl: process.env.DEEPSEEK_BASE_URL?.trim() || "https://api.deepseek.com",
    model: getDeepSeekModelId(),
  };
}
