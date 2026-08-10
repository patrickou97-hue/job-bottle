import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchOpenAICompatibleJSON,
  getChatCompletionsUrl,
  getStarInterviewLLMConfiguration,
  mapStarInterviewError,
  StarInterviewCallerAbortError,
  StarInterviewUpstreamError,
  validateStarInterviewClient,
} from "@/lib/star-interview-server";
import {
  CompletionStreamCallerAbortError,
  CompletionStreamUpstreamError,
  createDurableCompletionStream,
  openCompletionSSE,
} from "@/lib/star-interview-completion-stream";
import {
  requireStarInterviewUsageAccess,
  starInterviewUsageHeaders,
  type StarInterviewUsageAccess,
} from "@/lib/star-interview-access";
import {
  commitStarInterviewCompletionStream,
  completeStarInterviewCompletion,
  failStarInterviewCompletion,
  getStarInterviewCompletion,
  markStarInterviewCompletionDispatched,
  reserveStarInterviewCompletion,
  starInterviewChargeHeaders,
  type StarInterviewCompletionReservation,
} from "@/lib/star-interview-billing";
import {
  acquireCompletionReservation,
  assertCompletionDispatchAllowed,
  CompletionDispatchBlockedError,
  parseCompletionDispatchIntent,
} from "@/lib/star-interview-completion-reservation";
import { createCompletionRequestHash } from "@/lib/star-interview-request-key";
import { assertValidCompletionPayload } from "@/lib/star-interview-completion-validation";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 240;
export const preferredRegion = "hkg1";

const JSON_CONTENT_TYPE = "application/json; charset=utf-8";
const SSE_CONTENT_TYPE = "text/event-stream; charset=utf-8";
const MAX_PERSISTED_RESPONSE_BYTES = 1_000_000;

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(40_000),
}).strict();

const requestSchema = z.object({
  // Build 37 still sends the former model identifier. The value is only a
  // compatibility marker: the server always selects the configured provider.
  model: z.enum(["mimo-v2.5", "deepseek-v4-flash"]),
  messages: z.array(messageSchema).min(1).max(4),
  temperature: z.number().min(0).max(1).optional().nullable(),
  max_tokens: z.number().int().min(1).max(3_500).optional().nullable(),
  stream: z.boolean(),
  meterKey: z.string().uuid(),
}).strict().refine(
  (value) => value.messages.reduce((sum, message) => sum + message.content.length, 0) <= 60_000,
  "消息内容过长",
);

type CompletionInput = z.infer<typeof requestSchema>;
type CompletionClaim = {
  access: StarInterviewUsageAccess;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
};

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 100_000) {
    return NextResponse.json({ error: "请求内容过长，请精简后重试。" }, { status: 413 });
  }
  const rejected = validateStarInterviewClient(request, {
    installLimit: 24,
    ipLimit: 80,
    windowMs: 10 * 60 * 1_000,
  });
  if (rejected) return rejected;
  const authorization = await requireStarInterviewUsageAccess(request, "completion");
  if ("response" in authorization) return authorization.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "诘星请求格式无效或内容过长。" }, { status: 400 });
  }
  const requestHash = createCompletionRequestHash({
    clientModel: parsed.data.model,
    messages: parsed.data.messages,
    temperature: parsed.data.temperature,
    maxTokens: parsed.data.max_tokens,
    stream: parsed.data.stream,
  });
  const reservationInput = {
    userId: authorization.access.userId,
    meterKey: parsed.data.meterKey,
    requestHash,
  };
  let claim: CompletionClaim | null = null;
  let upstreamFetchStarted = false;

  try {
    const reservation = await acquireCompletionReservation({
      reserve: () => reserveStarInterviewCompletion({
        ...reservationInput,
        stream: parsed.data.stream,
        mode: authorization.access.mode,
      }),
      inspect: () => getStarInterviewCompletion(reservationInput),
      signal: request.signal,
    });
    const existingResponse = reservationOutcomeResponse({
      reservation,
      access: authorization.access,
      stream: parsed.data.stream,
    });
    if (existingResponse) return existingResponse;
    if (reservation.action !== "claimed" || !reservation.reservationToken) {
      throw new Error("Completion reservation was not claimed");
    }

    claim = {
      access: authorization.access,
      meterKey: parsed.data.meterKey,
      requestHash,
      reservationToken: reservation.reservationToken,
    };
    const markDispatchIntent = async () => {
      if (!claim) throw new Error("Completion claim is unavailable");
      const intent = await markStarInterviewCompletionDispatchIntent({
        userId: claim.access.userId,
        meterKey: claim.meterKey,
        requestHash: claim.requestHash,
        reservationToken: claim.reservationToken,
      });
      assertCompletionDispatchAllowed(intent);
    };
    const markDispatched = async () => {
      if (!claim) throw new Error("Completion claim is unavailable");
      const dispatched = await markStarInterviewCompletionDispatched({
        userId: claim.access.userId,
        meterKey: claim.meterKey,
        requestHash: claim.requestHash,
        reservationToken: claim.reservationToken,
      });
      if (dispatched.action !== "dispatched") {
        throw new Error(`Completion dispatch rejected: ${dispatched.action}`);
      }
    };
    const markFetchStarted = () => { upstreamFetchStarted = true; };
    const config = getStarInterviewLLMConfiguration();
    if (!config) {
      await releaseCompletionClaim(claim, new Error("completion service is not configured"));
      claim = null;
      return NextResponse.json({ error: "诘星云端 AI 服务尚未配置。" }, { status: 503 });
    }

    if (parsed.data.stream) {
      return await streamCompletion({
        claim,
        config,
        input: parsed.data,
        signal: request.signal,
        beforeDispatch: markDispatchIntent,
        onFetchStarted: markFetchStarted,
        afterDispatch: markDispatched,
      });
    }

    const payload = await fetchOpenAICompatibleJSON({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: 150_000,
      signal: request.signal,
      beforeDispatch: markDispatchIntent,
      onFetchStarted: markFetchStarted,
      afterDispatch: markDispatched,
      body: {
        model: config.model,
        messages: parsed.data.messages,
        temperature: parsed.data.temperature,
        thinking: { type: "disabled" },
        max_tokens: parsed.data.max_tokens,
        stream: false,
        response_format: { type: "json_object" },
      },
    });
    assertValidCompletionPayload(payload);
    const completed = await completeStarInterviewCompletion({
      ...reservationInput,
      reservationToken: claim.reservationToken,
      responseBody: JSON.stringify(payload ?? null),
      responseContentType: JSON_CONTENT_TYPE,
    });
    if (completed.action !== "completed" && completed.action !== "cached") {
      throw new Error(`Completion persistence rejected: ${completed.action}`);
    }
    return persistedCompletionResponse({
      reservation: completed,
      access: authorization.access,
      stream: false,
      replayed: completed.action === "cached",
    });
  } catch (error) {
    if (claim) {
      await releaseCompletionClaim(claim, error, {
        refund: !(upstreamFetchStarted && isCallerAbortError(error)),
      });
    }
    if (error instanceof CompletionDispatchBlockedError) {
      return NextResponse.json(
        {
          error: "账户权限在生成前发生变化，本次未调用 AI 且已安全释放预留，请刷新后重试。",
          code: "STAR_INTERVIEW_ACCOUNT_STATE_CHANGED",
        },
        {
          status: 409,
          headers: { "Cache-Control": "no-store", "Retry-After": "1" },
        },
      );
    }
    return mapStarInterviewError(error, "AI 生成");
  }
}

async function markStarInterviewCompletionDispatchIntent(input: {
  userId: string;
  meterKey: string;
  requestHash: string;
  reservationToken: string;
}) {
  const { data, error } = await createAdminClient().rpc(
    "mark_star_interview_completion_dispatch_intent",
    {
      p_user_id: input.userId,
      p_meter_key: input.meterKey,
      p_request_hash: input.requestHash,
      p_reservation_token: input.reservationToken,
    },
  );
  if (error) throw error;
  return parseCompletionDispatchIntent(data);
}

async function streamCompletion({
  claim,
  config,
  input,
  signal,
  beforeDispatch,
  onFetchStarted,
  afterDispatch,
}: {
  claim: CompletionClaim;
  config: NonNullable<ReturnType<typeof getStarInterviewLLMConfiguration>>;
  input: CompletionInput;
  signal: AbortSignal;
  beforeDispatch: () => Promise<void>;
  onFetchStarted: () => void;
  afterDispatch: () => Promise<void>;
}) {
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await openCompletionSSE({
      url: getChatCompletionsUrl(config.baseUrl),
      apiKey: config.apiKey,
      firstContentTimeoutMs: 55_000,
      totalTimeoutMs: 150_000,
      signal,
      beforeDispatch,
      onFetchStarted,
      afterDispatch,
      body: {
        model: config.model,
        messages: input.messages,
        temperature: input.temperature,
        thinking: { type: "disabled" },
        max_tokens: input.max_tokens,
        stream: true,
        response_format: { type: "json_object" },
      },
    });
  } catch (error) {
    if (error instanceof CompletionStreamUpstreamError) {
      throw new StarInterviewUpstreamError(error.status);
    }
    if (error instanceof CompletionStreamCallerAbortError) {
      throw new StarInterviewCallerAbortError(error.reason);
    }
    throw error;
  }

  if (signal.aborted) {
    await upstream.cancel(signal.reason).catch(() => undefined);
    throw signal.reason instanceof Error
      ? signal.reason
      : new DOMException("Request aborted", "AbortError");
  }

  // Preserve the historical billing boundary: a successful upstream open is
  // formally charged before any model byte can reach the client.
  const committed = await commitStarInterviewCompletionStream({
    userId: claim.access.userId,
    meterKey: claim.meterKey,
    requestHash: claim.requestHash,
    reservationToken: claim.reservationToken,
  });
  if (committed.action !== "committed") {
    await upstream.cancel("completion stream charge was not committed").catch(() => undefined);
    const existingResponse = reservationOutcomeResponse({
      reservation: committed,
      access: claim.access,
      stream: true,
    });
    if (existingResponse) return existingResponse;
    throw new Error(`Completion stream commit rejected: ${committed.action}`);
  }

  const output = createDurableCompletionStream({
    upstream,
    maxBytes: MAX_PERSISTED_RESPONSE_BYTES,
    complete: async (responseBody) => {
      const completed = await completeStarInterviewCompletion({
        userId: claim.access.userId,
        meterKey: claim.meterKey,
        requestHash: claim.requestHash,
        reservationToken: claim.reservationToken,
        responseBody,
        responseContentType: SSE_CONTENT_TYPE,
      });
      if (completed.action !== "completed" && completed.action !== "cached") {
        throw new Error(`Completion stream persistence rejected: ${completed.action}`);
      }
    },
    fail: async (reason) => {
      await failStarInterviewCompletion({
        userId: claim.access.userId,
        meterKey: claim.meterKey,
        requestHash: claim.requestHash,
        reservationToken: claim.reservationToken,
        reason,
      });
    },
  });

  return new Response(output, {
    status: 200,
    headers: {
      "Content-Type": SSE_CONTENT_TYPE,
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-StarInterview-Service": "cloud-v1-stream",
      ...starInterviewUsageHeaders(claim.access),
      ...starInterviewChargeHeaders(committed),
    },
  });
}

function isCallerAbortError(error: unknown) {
  return error instanceof StarInterviewCallerAbortError
    || error instanceof CompletionStreamCallerAbortError;
}

function reservationOutcomeResponse(input: {
  reservation: StarInterviewCompletionReservation;
  access: StarInterviewUsageAccess;
  stream: boolean;
}) {
  const { reservation } = input;
  if (reservation.action === "cached") {
    return persistedCompletionResponse({
      reservation,
      access: input.access,
      stream: input.stream,
      replayed: true,
    });
  }
  if (reservation.action === "insufficient") {
    return NextResponse.json(
      {
        error: "诘星余额不足，请充值后继续。",
        code: "STAR_INTERVIEW_BALANCE_INSUFFICIENT",
        balanceFen: reservation.balanceFen,
        requiredFen: reservation.requiredFen,
        action: "OPEN_BILLING_IN_APP",
      },
      {
        status: 402,
        headers: {
          "Cache-Control": "no-store",
          ...starInterviewChargeHeaders(reservation),
        },
      },
    );
  }
  if (reservation.action === "conflict") {
    return NextResponse.json(
      {
        error: "本次请求标识已用于其他内容，请重新发起生成。",
        code: "STAR_INTERVIEW_METER_KEY_CONFLICT",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (reservation.action === "stale") {
    return NextResponse.json(
      {
        error: "账户权限或本次生成状态已经变化，请刷新后重新发起。",
        code: "STAR_INTERVIEW_ACCOUNT_STATE_CHANGED",
      },
      {
        status: 409,
        headers: { "Cache-Control": "no-store", "Retry-After": "1" },
      },
    );
  }
  if (reservation.action === "in_progress") {
    return NextResponse.json(
      {
        error: "同一内容正在生成，请稍后重试。",
        code: "STAR_INTERVIEW_REQUEST_IN_PROGRESS",
      },
      {
        status: 409,
        headers: { "Cache-Control": "no-store", "Retry-After": "2" },
      },
    );
  }
  if (reservation.action === "expired"
    || reservation.action === "failed"
    || reservation.action === "missing") {
    return NextResponse.json(
      {
        error: "上一次生成已经结束，请重新发起本次问题。",
        code: "STAR_INTERVIEW_RETRY_REQUIRED",
      },
      {
        status: 409,
        headers: { "Cache-Control": "no-store", "Retry-After": "1" },
      },
    );
  }
  if (reservation.action === "expired_result") {
    return NextResponse.json(
      {
        error: "本次生成结果已超过安全保留时间，请发起新的问题。",
        code: "STAR_INTERVIEW_RESULT_EXPIRED",
      },
      { status: 410, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (reservation.action === "consumed") {
    return NextResponse.json(
      {
        error: "本次请求已经处理过，但没有可安全重放的结果，请发起新的问题。",
        code: "STAR_INTERVIEW_RESULT_UNAVAILABLE",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  return null;
}

function persistedCompletionResponse(input: {
  reservation: StarInterviewCompletionReservation;
  access: StarInterviewUsageAccess;
  stream: boolean;
  replayed: boolean;
}) {
  const expectedContentType = input.stream ? SSE_CONTENT_TYPE : JSON_CONTENT_TYPE;
  if (!input.reservation.responseBody
    || input.reservation.responseContentType !== expectedContentType) {
    throw new Error("Persisted completion response is invalid");
  }
  return new Response(input.reservation.responseBody, {
    status: 200,
    headers: {
      "Content-Type": expectedContentType,
      "Cache-Control": input.stream ? "no-store, no-transform" : "no-store",
      ...(input.stream ? {
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      } : {}),
      "X-StarInterview-Service": input.stream ? "cloud-v1-stream" : "cloud-v1",
      "X-StarInterview-Replayed": input.replayed ? "true" : "false",
      ...starInterviewUsageHeaders(input.access),
      ...starInterviewChargeHeaders(input.reservation),
    },
  });
}

async function releaseCompletionClaim(
  claim: CompletionClaim,
  error: unknown,
  options: { refund?: boolean } = {},
) {
  try {
    await failStarInterviewCompletion({
      userId: claim.access.userId,
      meterKey: claim.meterKey,
      requestHash: claim.requestHash,
      reservationToken: claim.reservationToken,
      reason: error instanceof Error ? error.message : "completion failed",
      refund: options.refund,
    });
  } catch (releaseError) {
    console.error("[star_interview]", {
      action: "completion reservation release",
      name: releaseError instanceof Error ? releaseError.name : "unknown",
    });
  }
}
