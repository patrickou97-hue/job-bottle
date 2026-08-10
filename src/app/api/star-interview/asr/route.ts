import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchOpenAICompatibleJSON,
  getStarInterviewASRConfiguration,
  mapStarInterviewError,
  StarInterviewCallerAbortError,
  StarInterviewUpstreamError,
  validateStarInterviewClient,
} from "@/lib/star-interview-server";
import {
  requireStarInterviewUsageAccess,
  starInterviewUsageHeaders,
} from "@/lib/star-interview-access";
import {
  completeStarInterviewASR,
  confirmStarInterviewASRDispatch,
  failStarInterviewASR,
  reserveStarInterviewASR,
  starInterviewChargeHeaders,
} from "@/lib/star-interview-billing";
import {
  createWavAudioBillingKey,
  normalizeBase64WavAudio,
  resolveBillableWavAudio,
  WavAudioFormatError,
} from "@/lib/wav-audio";

export const maxDuration = 30;
export const preferredRegion = "hkg1";

const requestSchema = z.object({
  audio: z.string().min(100).max(3_500_000),
  language: z.enum(["auto", "zh", "en"]).default("auto"),
  meterKey: z.string().uuid(),
  // Older clients still send this capture-clock estimate. Billing always uses
  // the duration measured from the WAV data on the server.
  durationMs: z.number().int().min(100).max(45_000).optional(),
}).strict();

class StarInterviewASRDispatchBlockedError extends Error {
  override name = "StarInterviewASRDispatchBlockedError";

  constructor(
    public code: string,
    public status: 403 | 409 | 503,
  ) {
    super("StarInterview ASR dispatch was blocked by the durable access gate");
  }
}

export async function POST(request: NextRequest) {
  if (Number(request.headers.get("content-length") ?? 0) > 3_700_000) {
    return NextResponse.json({ error: "音频片段过长，请重新开始识别。" }, { status: 413 });
  }
  const rejected = validateStarInterviewClient(request, {
    installLimit: 600,
    ipLimit: 3_000,
    windowMs: 10 * 60 * 1_000,
  });
  if (rejected) return rejected;
  const authorization = await requireStarInterviewUsageAccess(request, "asr");
  if ("response" in authorization) return authorization.response;

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "音频片段格式无效。" }, { status: 400 });
  }
  let measuredDurationMs: number;
  let clientDurationMismatch: boolean;
  let billingMeterKey: string;
  let normalizedAudio: string;
  try {
    ({ durationMs: measuredDurationMs, clientDurationMismatch } = resolveBillableWavAudio(
      parsed.data.audio,
      parsed.data.durationMs,
    ));
    billingMeterKey = createWavAudioBillingKey(
      parsed.data.audio,
      parsed.data.language,
      parsed.data.meterKey,
    );
    normalizedAudio = normalizeBase64WavAudio(parsed.data.audio);
  } catch (error) {
    if (error instanceof WavAudioFormatError) {
      return NextResponse.json({ error: "音频片段不是有效的 WAV 音频。" }, { status: 400 });
    }
    throw error;
  }
  if (measuredDurationMs < 100) {
    return NextResponse.json({ error: "音频片段过短，请重新录制。" }, { status: 400 });
  }
  if (measuredDurationMs > 45_000) {
    return NextResponse.json({ error: "音频片段过长，请重新开始识别。" }, { status: 413 });
  }
  if (clientDurationMismatch) {
    console.warn("[star_interview_asr_duration_mismatch]", {
      measuredDurationMs,
      clientDurationMs: parsed.data.durationMs,
      deltaMs: Math.abs(measuredDurationMs - (parsed.data.durationMs ?? measuredDurationMs)),
    });
  }
  let reservation;
  try {
    reservation = await reserveStarInterviewASR({
      userId: authorization.access.userId,
      meterKey: billingMeterKey,
      units: measuredDurationMs,
      mode: authorization.access.mode,
    });
  } catch (error) {
    return mapStarInterviewError(error, "语音识别计费预留");
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
  if (reservation.action === "in_progress") {
    return NextResponse.json(
      {
        error: "同一段音频正在识别，请等待当前请求完成。",
        code: "STAR_INTERVIEW_ASR_IN_PROGRESS",
      },
      {
        status: 409,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(retryAfterSeconds(reservation.leaseExpiresAt)),
        },
      },
    );
  }
  if (reservation.action === "cached" && reservation.responseBody) {
    return NextResponse.json(
      { transcript: reservation.responseBody },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-StarInterview-Service": "cloud-v1",
          "X-StarInterview-Audio-Duration-Ms": String(measuredDurationMs),
          "X-StarInterview-Replayed": "true",
          ...starInterviewUsageHeaders(authorization.access),
          ...starInterviewChargeHeaders(reservation),
        },
      },
    );
  }
  if (reservation.action === "consumed") {
    return NextResponse.json(
      {
        error: "该音频请求已经处理，但识别结果未保留。请重新录制后再试。",
        code: "STAR_INTERVIEW_ASR_RESULT_CONSUMED",
      },
      { status: 409, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (reservation.action === "forbidden") {
    return NextResponse.json(
      {
        error: "账户状态正在更新，请稍后重新发起识别。",
        code: reservation.code ?? "STAR_INTERVIEW_ASR_ACCESS_CHANGED",
      },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (reservation.action !== "claimed" || !reservation.reservationToken) {
    return NextResponse.json(
      { error: "语音识别计费状态暂时无法确认，请稍后重试。" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const reservationIdentity = {
    userId: authorization.access.userId,
    meterKey: billingMeterKey,
    reservationToken: reservation.reservationToken,
  };
  const config = getStarInterviewASRConfiguration();
  if (!config) {
    await settleFailedASRReservation(
      reservationIdentity,
      new Error("ASR configuration missing"),
      false,
    );
    return NextResponse.json({ error: "诘星云端语音识别尚未配置。" }, { status: 503 });
  }

  let upstreamFetchStarted = false;
  let transcript: string;
  try {
    const payload = await fetchOpenAICompatibleJSON({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: 15_000,
      signal: request.signal,
      beforeDispatch: async () => {
        const confirmation = await confirmStarInterviewASRDispatch(reservationIdentity);
        if (confirmation.action === "confirmed") return;
        if (confirmation.action === "forbidden") {
          throw new StarInterviewASRDispatchBlockedError(
            confirmation.code ?? "STAR_INTERVIEW_ASR_ACCESS_CHANGED",
            403,
          );
        }
        throw new StarInterviewASRDispatchBlockedError(
          "STAR_INTERVIEW_ASR_RESERVATION_STALE",
          confirmation.action === "stale" ? 409 : 503,
        );
      },
      onFetchStarted: () => { upstreamFetchStarted = true; },
      body: {
        model: config.model,
        messages: [{
          role: "user",
          content: [{
            type: "input_audio",
            input_audio: { data: `data:audio/wav;base64,${normalizedAudio}` },
          }],
        }],
        asr_options: { language: parsed.data.language },
      },
    }) as { choices?: { message?: { content?: string } }[] } | null;
    transcript = payload?.choices?.[0]?.message?.content?.trim() ?? "";
    if (!transcript) throw new StarInterviewUpstreamError(502, "empty");
  } catch (error) {
    await settleFailedASRReservation(
      reservationIdentity,
      error,
      upstreamFetchStarted,
    );
    if (error instanceof StarInterviewASRDispatchBlockedError) {
      return NextResponse.json(
        {
          error: error.status === 403
            ? "账户状态已发生变化，本次识别没有发送，请重新发起。"
            : "本次识别请求已失效，请重新录制后再试。",
          code: error.code,
        },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    return mapStarInterviewError(error, "语音识别");
  }

  let completed;
  try {
    completed = await completeStarInterviewASR({
      ...reservationIdentity,
      responseBody: transcript,
    });
  } catch (error) {
    // The RPC may have committed before its response was lost. Never issue a
    // compensating refund here; a genuinely abandoned hold is reclaimed by
    // the durable lease reconciler.
    return mapStarInterviewError(error, "语音识别计费确认");
  }
  if (completed.action !== "completed") {
    return NextResponse.json(
      {
        error: "语音识别结果的计费状态无法确认，请稍后重试。",
        code: "STAR_INTERVIEW_ASR_SETTLEMENT_PENDING",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { transcript },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-StarInterview-Service": "cloud-v1",
        "X-StarInterview-Audio-Duration-Ms": String(measuredDurationMs),
        ...starInterviewUsageHeaders(authorization.access),
        ...starInterviewChargeHeaders(completed),
      },
    },
  );
}

async function settleFailedASRReservation(
  identity: {
    userId: string;
    meterKey: string;
    reservationToken: string;
  },
  error: unknown,
  upstreamFetchStarted: boolean,
) {
  try {
    if (upstreamFetchStarted && error instanceof StarInterviewCallerAbortError) {
      // Once the provider request has been dispatched, caller cancellation is
      // billable. Otherwise a client could repeatedly disconnect after upload
      // and external ASR work would be refunded every time.
      await completeStarInterviewASR({
        ...identity,
        responseBody: null,
        consumed: true,
      });
      return;
    }
    const reason = error instanceof StarInterviewUpstreamError
      ? `ASR upstream ${error.status}`
      : error instanceof Error
        ? error.name
        : "ASR upstream request failed";
    await failStarInterviewASR({ ...identity, reason });
  } catch (settlementError) {
    console.error("[star_interview_asr_release]", {
      name: settlementError instanceof Error ? settlementError.name : "unknown",
    });
  }
}

function retryAfterSeconds(leaseExpiresAt: string | undefined) {
  if (!leaseExpiresAt) return 3;
  const remainingMs = new Date(leaseExpiresAt).getTime() - Date.now();
  return Number.isFinite(remainingMs) ? Math.max(1, Math.ceil(remainingMs / 1_000)) : 3;
}
