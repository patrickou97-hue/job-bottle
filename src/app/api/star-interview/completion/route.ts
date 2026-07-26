import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchMimoJSON,
  getMimoConfiguration,
  mapStarInterviewError,
  validateStarInterviewClient,
} from "@/lib/star-interview-server";
import {
  requireStarInterviewUsageAccess,
  starInterviewUsageHeaders,
} from "@/lib/star-interview-access";

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
  stream: z.literal(false),
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
    const payload = await fetchMimoJSON({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      timeoutMs: 55_000,
      body: {
        ...parsed.data,
        model: config.llmModel,
        stream: false,
        response_format: { type: "json_object" },
      },
    });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store",
        "X-StarInterview-Service": "cloud-v1",
        ...starInterviewUsageHeaders(authorization.access),
      },
    });
  } catch (error) {
    return mapStarInterviewError(error, "AI 生成");
  }
}
