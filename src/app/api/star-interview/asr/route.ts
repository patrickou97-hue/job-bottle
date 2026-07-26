import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  fetchMimoJSON,
  getMimoConfiguration,
  mapStarInterviewError,
  StarInterviewUpstreamError,
  validateStarInterviewClient,
} from "@/lib/star-interview-server";

export const maxDuration = 30;

const requestSchema = z.object({
  audio: z.string().min(100).max(3_500_000),
  language: z.enum(["auto", "zh", "en"]).default("auto"),
}).strict();

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

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "音频片段格式无效。" }, { status: 400 });
  }
  const config = getMimoConfiguration();
  if (!config) {
    return NextResponse.json({ error: "诘星云端语音识别尚未配置。" }, { status: 503 });
  }

  try {
    const payload = await fetchMimoJSON({
      apiKey: config.apiKey,
      baseUrl: config.asrBaseUrl,
      timeoutMs: 15_000,
      body: {
        model: config.asrModel,
        messages: [{
          role: "user",
          content: [{
            type: "input_audio",
            input_audio: { data: `data:audio/wav;base64,${parsed.data.audio}` },
          }],
        }],
        asr_options: { language: parsed.data.language },
      },
    }) as { choices?: { message?: { content?: string } }[] } | null;
    const transcript = payload?.choices?.[0]?.message?.content?.trim();
    if (!transcript) throw new StarInterviewUpstreamError(502, "empty");
    return NextResponse.json(
      { transcript },
      { headers: { "Cache-Control": "no-store", "X-StarInterview-Service": "cloud-v1" } },
    );
  } catch (error) {
    return mapStarInterviewError(error, "语音识别");
  }
}
