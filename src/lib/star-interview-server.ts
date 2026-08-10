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

export class StarInterviewCallerAbortError extends Error {
  override name = "StarInterviewCallerAbortError";
  reason?: unknown;

  constructor(reason?: unknown) {
    super("StarInterview request was cancelled by the caller");
    this.reason = reason;
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

export function getStarInterviewLLMConfiguration() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim()
    || "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-v4-flash";
  if (!apiKey) return null;
  return { apiKey, baseUrl, model };
}

export function getStarInterviewASRConfiguration() {
  const apiKey = process.env.MIMO_API_KEY?.trim();
  const baseUrl = process.env.MIMO_ASR_BASE_URL?.trim()
    || "https://token-plan-cn.xiaomimimo.com/v1";
  const model = process.env.MIMO_ASR_MODEL?.trim() || "mimo-v2.5-asr";
  if (!apiKey) return null;
  return { apiKey, baseUrl, model };
}

export function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions")
    ? normalized
    : `${normalized}/chat/completions`;
}

export async function fetchOpenAICompatibleJSON({
  apiKey,
  baseUrl,
  body,
  timeoutMs,
  signal,
  beforeDispatch,
  onFetchStarted,
  afterDispatch,
}: {
  apiKey: string;
  baseUrl: string;
  body: unknown;
  timeoutMs: number;
  signal?: AbortSignal;
  beforeDispatch?: () => Promise<void>;
  onFetchStarted?: () => void;
  afterDispatch?: () => Promise<void>;
}) {
  throwIfAborted(signal);
  await beforeDispatch?.();
  throwIfAborted(signal);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let fetchOutcome: "pending" | "success" | "upstream_error" | "transport_error" = "pending";
  let callerAbortWon = false;
  const abortFromCaller = () => {
    // A caller cancellation wins only while a successful response is still
    // being opened/read. Once fetch has already produced a transport error or
    // non-2xx response, a later client abort must not change refund semantics.
    if (fetchOutcome === "pending" || fetchOutcome === "success") callerAbortWon = true;
    controller.abort(signal?.reason);
  };
  if (signal?.aborted) abortFromCaller();
  else signal?.addEventListener("abort", abortFromCaller, { once: true });
  let responsePromise: Promise<Response> | null = null;
  try {
    responsePromise = fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    // Record settlement and attach both handlers in the same tick as fetch().
    // The durable dispatch marker below may otherwise outlive a fast rejection
    // and let Node report it as unhandled before this function awaits it.
    void responsePromise.then(
      (response) => { fetchOutcome = response.ok ? "success" : "upstream_error"; },
      () => { fetchOutcome = "transport_error"; },
    );
    onFetchStarted?.();
    // Let an already-settled fetch publish its causal outcome before the
    // dispatched-marker RPC yields to external work.
    await Promise.resolve();
    await afterDispatch?.();
    if (callerAbortWon) throw new StarInterviewCallerAbortError(signal?.reason);
    const response = await responsePromise;
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch (error) {
      if (callerAbortWon) throw new StarInterviewCallerAbortError(signal?.reason ?? error);
    }
    if (!response.ok) {
      throw new StarInterviewUpstreamError(response.status);
    }
    return payload;
  } catch (error) {
    const surfacedError = callerAbortWon && !(error instanceof StarInterviewCallerAbortError)
      ? new StarInterviewCallerAbortError(signal?.reason ?? error)
      : error;
    controller.abort(surfacedError);
    await responsePromise?.catch(() => undefined);
    throw surfacedError;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;
  if (signal.reason instanceof Error) throw signal.reason;
  throw new DOMException("Request aborted", "AbortError");
}

export function mapStarInterviewError(error: unknown, action: string) {
  logStarInterviewError(action, error);
  if (error instanceof StarInterviewCallerAbortError) {
    return NextResponse.json({ error: `${action}已取消。` }, { status: 499 });
  }
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
