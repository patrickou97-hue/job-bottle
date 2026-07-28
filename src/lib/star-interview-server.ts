import "server-only";
import { NextRequest, NextResponse } from "next/server";

type RateBucket = { count: number; resetAt: number };
type RateStore = Map<string, RateBucket>;

const globalRateState = globalThis as typeof globalThis & {
  __starInterviewInstallRate?: RateStore;
  __starInterviewIpRate?: RateStore;
};

const installRates = globalRateState.__starInterviewInstallRate ??= new Map();
const ipRates = globalRateState.__starInterviewIpRate ??= new Map();

export class StarInterviewUpstreamError extends Error {
  constructor(public status: number, public detail?: string) {
    super(`StarInterview upstream ${status}`);
  }
}

export function validateStarInterviewClient(
  request: NextRequest,
  limits: {
    installLimit: number;
    ipLimit: number;
    windowMs: number;
  },
) {
  if (request.headers.get("x-starinterview-client") !== "macos-v1") {
    return NextResponse.json({ error: "当前诘星版本不受支持，请更新后重试。" }, { status: 403 });
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin && origin !== "https://www.starjob.space") {
    return NextResponse.json({ error: "请求来源无法验证。" }, { status: 403 });
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return NextResponse.json({ error: "请求来源无法验证。" }, { status: 403 });
  }

  const installId = request.headers.get("x-starinterview-install-id")?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(installId)) {
    return NextResponse.json({ error: "安装标识无法验证，请重新打开诘星。" }, { status: 403 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
  if (!takeRateSlot(installRates, installId, limits.installLimit, limits.windowMs)
      || !takeRateSlot(ipRates, ip, limits.ipLimit, limits.windowMs)) {
    const retryAfter = Math.ceil(limits.windowMs / 1_000);
    return NextResponse.json(
      { error: "请求过于频繁，请稍后再试。" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  return null;
}

export function getMimoConfiguration() {
  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL;
  // StarInterview uses the low-latency base model for the combined
  // question-boundary assessment and answer response. URL and API key remain
  // server-controlled and unchanged.
  const llmModel = "mimo-v2.5";
  const asrModel = process.env.MIMO_ASR_MODEL || "mimo-v2.5-asr";
  const asrBaseUrl = process.env.MIMO_ASR_BASE_URL
    || "https://token-plan-cn.xiaomimimo.com/v1";
  if (!apiKey || !baseUrl) return null;
  return { apiKey, baseUrl, llmModel, asrModel, asrBaseUrl };
}

export const STAR_INTERVIEW_FAST_ANSWER_MODEL = "mimo-v2.5-pro-ultraspeed";

export function getMimoCompletionConfiguration(
  requestedModel: "mimo-v2.5" | typeof STAR_INTERVIEW_FAST_ANSWER_MODEL,
) {
  if (requestedModel === STAR_INTERVIEW_FAST_ANSWER_MODEL) {
    const apiKey = process.env.MIMO_FAST_ANSWER_API_KEY;
    if (!apiKey) return null;
    return {
      apiKey,
      baseUrl: process.env.MIMO_FAST_ANSWER_BASE_URL
        || "https://api.xiaomimimo.com/v1",
      llmModel: STAR_INTERVIEW_FAST_ANSWER_MODEL,
    };
  }

  const config = getMimoConfiguration();
  if (!config) return null;
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    llmModel: config.llmModel,
  };
}

export function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export async function fetchMimoJSON({
  apiKey,
  baseUrl,
  body,
  timeoutMs,
}: {
  apiKey: string;
  baseUrl: string;
  body: unknown;
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new StarInterviewUpstreamError(response.status);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

export function mapStarInterviewError(error: unknown, action: string) {
  logStarInterviewError(action, error);
  if (error instanceof DOMException && error.name === "AbortError") {
    return NextResponse.json({ error: `${action}超时，请检查网络后重试。` }, { status: 504 });
  }
  if (error instanceof StarInterviewUpstreamError) {
    if (error.status === 401 || error.status === 403) {
      return NextResponse.json({ error: "诘星云端模型配置无效，请联系管理员。" }, { status: 503 });
    }
    if (error.status === 429) {
      return NextResponse.json(
        { error: "模型服务正忙，请稍后重试。" },
        { status: 429, headers: { "Retry-After": "30" } },
      );
    }
  }
  return NextResponse.json({ error: `${action}暂时不可用，请稍后重试。` }, { status: 502 });
}

function takeRateSlot(store: RateStore, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    pruneRateStore(store, now);
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

function pruneRateStore(store: RateStore, now: number) {
  if (store.size < 2_000) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

function logStarInterviewError(action: string, error: unknown) {
  const detail = error && typeof error === "object"
    ? {
        name: "name" in error ? String(error.name) : undefined,
        status: "status" in error ? Number(error.status) : undefined,
      }
    : {};
  console.error("[star_interview]", { action, ...detail });
}
