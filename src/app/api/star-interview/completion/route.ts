import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchMimoJSON,
  getChatCompletionsUrl,
  getMimoConfiguration,
  mapStarInterviewError,
  StarInterviewUpstreamError,
  validateStarInterviewClient,
} from "@/lib/star-interview-server";
import {
  CompletionStreamUpstreamError,
  openCompletionSSE,
  runBeforeExposingCompletionStream,
} from "@/lib/star-interview-completion-stream";
import {
  chargeStarInterviewUsage,
  requireStarInterviewUsageAccess,
  starInterviewUsageHeaders,
  type StarInterviewUsageAccess,
} from "@/lib/star-interview-access";
import { starInterviewChargeHeaders } from "@/lib/star-interview-billing";

export const maxDuration = 60;
export const preferredRegion = "hkg1";

const messageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(40_000),
}).strict();

const requestSchema = z.object({
  model: z.literal("mimo-v2.5"),
  messages: z.array(messageSchema).min(1).max(4),
  temperature: z.number().min(0).max(1).optional().nullable(),
  max_tokens: z.number().int().min(1).max(3_500).optional().nullable(),
  stream: z.boolean(),
  meterKey: z.string().uuid(),
}).strict().refine(
  (value) => value.messages.reduce((sum, message) => sum + message.content.length, 0) <= 60_000,
  "消息内容过长",
);

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
  const config = getMimoConfiguration();
  if (!config) {
    return NextResponse.json({ error: "诘星云端 AI 服务尚未配置。" }, { status: 503 });
  }

  try {
    if (parsed.data.stream) {
      return await streamCompletion({
        authorization: authorization.access,
        config,
        input: parsed.data,
      });
    }
    const payload = await fetchMimoJSON({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: 55_000,
      body: {
        model: config.llmModel,
        messages: parsed.data.messages,
        temperature: parsed.data.temperature,
        max_tokens: parsed.data.max_tokens,
        stream: false,
        response_format: { type: "json_object" },
      },
    });
    const charge = await chargeStarInterviewUsage(authorization.access, {
      feature: "completion",
      meterKey: parsed.data.meterKey,
      units: 1,
    });
    if ("response" in charge) return charge.response;
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-StarInterview-Service": "cloud-v1",
        ...starInterviewUsageHeaders(authorization.access),
        ...starInterviewChargeHeaders(charge.result),
      },
    });
  } catch (error) {
    return mapStarInterviewError(error, "AI 生成");
  }
}

async function streamCompletion({
  authorization,
  config,
  input,
}: {
  authorization: StarInterviewUsageAccess;
  config: NonNullable<ReturnType<typeof getMimoConfiguration>>;
  input: z.infer<typeof requestSchema>;
}) {
  let upstream: ReadableStream<Uint8Array>;
  try {
    upstream = await openCompletionSSE({
      url: getChatCompletionsUrl(config.baseUrl),
      apiKey: config.apiKey,
      timeoutMs: 55_000,
      body: {
        model: config.llmModel,
        messages: input.messages,
        temperature: input.temperature,
        max_tokens: input.max_tokens,
        stream: true,
        response_format: { type: "json_object" },
      },
    });
  } catch (error) {
    if (error instanceof CompletionStreamUpstreamError) {
      throw new StarInterviewUpstreamError(error.status);
    }
    throw error;
  }

  const charge = await runBeforeExposingCompletionStream(
    upstream,
    () => chargeStarInterviewUsage(authorization, {
      feature: "completion",
      meterKey: input.meterKey,
      units: 1,
    }),
  );
  if ("response" in charge) {
    await upstream.cancel("completion charge rejected").catch(() => undefined);
    return charge.response;
  }

  return new Response(upstream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-StarInterview-Service": "cloud-v1-stream",
      ...starInterviewUsageHeaders(authorization),
      ...starInterviewChargeHeaders(charge.result),
    },
  });
}
