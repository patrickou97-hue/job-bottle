import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveResumeAiAccess } from "@/lib/resume-ai-access";
import {
  applyTranslationValues,
  createTranslationPlan,
  getTranslationOutputLimit,
  type TranslationChunk,
  type TranslationPlan,
} from "@/lib/resume-translation-plan";

export const maxDuration = 180;

const REQUEST_TIMEOUT_MS = 150_000;
const CHUNK_TIMEOUT_MS = 60_000;
const MAX_CHUNK_OUTPUT_TOKENS = 2_200;
const TRANSLATION_CONCURRENCY = 2;

const boundedText = (max: number) => z.string().trim().max(max);
const translatedText = (sourceMax: number) => z.string().trim().max(getTranslationOutputLimit(sourceMax));
const bullets = z.array(translatedText(1_000)).max(12);
const basicsSchema = z.object({
  name: translatedText(100),
  englishName: translatedText(120),
  gender: boundedText(40),
  nationality: translatedText(120),
  preferredLocations: translatedText(300),
  city: translatedText(120),
  targetRole: translatedText(180),
}).strict();
const educationSchema = z.object({
  school: translatedText(180),
  college: translatedText(180).optional().default(""),
  degreeLevel: translatedText(40).optional().default(""),
  degree: translatedText(100),
  major: translatedText(180),
  startDate: boundedText(40),
  endDate: boundedText(40),
  gpa: boundedText(80),
  courses: translatedText(800),
  honors: translatedText(800),
}).strict();
const experienceSchema = z.object({
  experienceType: z.enum(["internship", "employment", "other"]),
  company: translatedText(180),
  title: translatedText(180),
  location: translatedText(120),
  startDate: boundedText(40),
  endDate: boundedText(40),
  current: z.boolean(),
  bullets,
}).strict();
const projectSchema = z.object({
  name: translatedText(180),
  role: translatedText(180),
  url: boundedText(500),
  startDate: boundedText(40),
  endDate: boundedText(40),
  bullets,
  keywords: translatedText(500),
}).strict();
const skillSchema = z.object({
  category: translatedText(120),
  skills: z.array(translatedText(120)).max(30),
}).strict();
const customSectionSchema = z.object({
  title: translatedText(180),
  role: translatedText(180).optional().default(""),
  date: boundedText(80).optional().default(""),
  bullets,
}).strict();
const resumeSchema = z.object({
  title: translatedText(180),
  targetRole: translatedText(180),
  jobTarget: translatedText(500),
  basics: basicsSchema,
  education: z.array(educationSchema).max(8),
  work: z.array(experienceSchema).max(12),
  projects: z.array(projectSchema).max(12),
  skills: z.array(skillSchema).max(12),
  campus: z.array(customSectionSchema).max(8),
  awards: z.array(customSectionSchema).max(8),
  certifications: z.array(customSectionSchema).max(8),
  languages: z.array(customSectionSchema).max(8),
  customSections: z.array(customSectionSchema).max(8),
}).strict();
const inputSchema = z.object({
  sourceLanguage: z.enum(["zh-CN", "en-US"]),
  targetLanguage: z.enum(["zh-CN", "en-US"]),
  resume: resumeSchema,
  progressMode: z.literal("ndjson").optional(),
}).strict().refine((value) => value.sourceLanguage !== value.targetLanguage, {
  message: "source and target languages must differ",
});
const resultSchema = z.object({
  summary: boundedText(500),
  translated: resumeSchema,
  warnings: z.array(boundedText(500)).max(20),
}).strict();
const chunkResultSchema = z.object({
  translations: z.array(z.object({
    key: z.string().regex(/^t\d+$/),
    value: translatedText(1_000),
  }).strict()).max(24),
  warnings: z.array(boundedText(500)).max(10),
}).strict();

type ResumeDraft = z.infer<typeof resumeSchema>;
type TranslationResult = z.infer<typeof resultSchema>;
type ChatMessage = { role: "system" | "user"; content: string };
type ChunkResult = { values: Map<string, string>; warnings: string[] };
type TranslationProgress = { completed: number; total: number; label: string };
type ChatCompletionPayload = {
  choices?: Array<{
    finish_reason?: string | null;
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
    };
  }>;
};

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 80_000) {
    return NextResponse.json({ error: "整份简历内容过长，请精简后再翻译" }, { status: 413 });
  }

  const access = await resolveResumeAiAccess(request);
  if (!access) {
    return NextResponse.json({ error: "请先登录，再使用翻译功能。" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "当前简历格式无效或内容过长，请检查后重试" }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL;
  const model = process.env.MIMO_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ error: "翻译暂时不可用，原简历未改动。" }, { status: 503 });
  }

  const { data: rateSlot, error: rateSlotError } = await access.takeRateSlot();
  if (rateSlotError) {
    logServerError("resume_translate_rate_slot", rateSlotError);
    return NextResponse.json({ error: "翻译请求保护服务暂时不可用，请稍后重试。" }, { status: 503 });
  }
  if (!rateSlot) {
    return NextResponse.json({ error: "翻译请求较频繁，请十分钟后再试。" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  const plan = createTranslationPlan(parsed.data.resume, parsed.data.targetLanguage);
  const options = {
    apiKey,
    baseUrl,
    model,
    sourceLanguage: parsed.data.sourceLanguage,
    targetLanguage: parsed.data.targetLanguage,
    plan,
  };

  if (parsed.data.progressMode === "ndjson") {
    return createProgressResponse(options, request.signal);
  }

  try {
    const result = await executeTranslationPlan({ ...options, signal: request.signal });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("resume_translate_upstream", error);
    return mapUpstreamError(error);
  }
}

function createProgressResponse(
  options: TranslationExecutionOptions,
  requestSignal: AbortSignal,
) {
  const encoder = new TextEncoder();
  let abortTranslation = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const translationController = new AbortController();
      let closed = false;
      abortTranslation = () => translationController.abort();
      const abortFromRequest = () => translationController.abort();
      requestSignal.addEventListener("abort", abortFromRequest, { once: true });
      if (requestSignal.aborted) abortFromRequest();
      const send = (event: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
          translationController.abort();
        }
      };

      send({
        type: "start",
        completed: 0,
        total: options.plan.chunks.length,
        label: "正在准备翻译区块",
      });

      void executeTranslationPlan({
        ...options,
        signal: translationController.signal,
        onProgress: (progress) => send({ type: "progress", ...progress }),
      }).then((result) => {
        send({ type: "result", result });
      }).catch((error) => {
        logServerError("resume_translate_stream", error);
        send({ type: "error", error: getUpstreamErrorInfo(error).message });
      }).finally(() => {
        requestSignal.removeEventListener("abort", abortFromRequest);
        if (!closed) {
          closed = true;
          controller.close();
        }
      });
    },
    cancel() {
      abortTranslation();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, no-transform",
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

type TranslationExecutionOptions = {
  apiKey: string;
  baseUrl: string;
  model: string;
  sourceLanguage: "zh-CN" | "en-US";
  targetLanguage: "zh-CN" | "en-US";
  plan: TranslationPlan;
  signal?: AbortSignal;
  onProgress?: (progress: TranslationProgress) => void;
};

async function executeTranslationPlan({
  apiKey,
  baseUrl,
  model,
  sourceLanguage,
  targetLanguage,
  plan,
  signal,
  onProgress,
}: TranslationExecutionOptions): Promise<TranslationResult> {
  if (plan.chunks.length === 0) {
    return resultSchema.parse({
      summary: "没有发现需要翻译的文字，已保留原简历内容。",
      translated: structuredClone(plan.source),
      warnings: ["没有发现需要翻译的文字。"],
    });
  }

  const batchController = new AbortController();
  const abortFromOutside = () => batchController.abort();
  signal?.addEventListener("abort", abortFromOutside, { once: true });
  if (signal?.aborted) batchController.abort();
  const overallTimeout = setTimeout(() => batchController.abort(), REQUEST_TIMEOUT_MS);
  const chunkResults: Array<ChunkResult | undefined> = new Array(plan.chunks.length);
  let nextChunkIndex = 0;
  let completedChunks = 0;

  const worker = async () => {
    while (!batchController.signal.aborted) {
      const chunkIndex = nextChunkIndex++;
      if (chunkIndex >= plan.chunks.length) return;
      const chunk = plan.chunks[chunkIndex];
      const result = await translateChunk({
        apiKey,
        baseUrl,
        model,
        sourceLanguage,
        targetLanguage,
        chunk,
        signal: batchController.signal,
      });
      chunkResults[chunkIndex] = result;
      completedChunks += 1;
      onProgress?.({
        completed: completedChunks,
        total: plan.chunks.length,
        label: chunk.label,
      });
    }
  };

  try {
    await Promise.all(
      Array.from(
        { length: Math.min(TRANSLATION_CONCURRENCY, plan.chunks.length) },
        () => worker(),
      ),
    );
  } catch (error) {
    batchController.abort();
    throw error;
  } finally {
    clearTimeout(overallTimeout);
    signal?.removeEventListener("abort", abortFromOutside);
  }

  if (batchController.signal.aborted && completedChunks < plan.chunks.length) {
    throw createAbortError();
  }
  if (chunkResults.some((result) => !result)) {
    throw new UpstreamError(502, "invalid_result");
  }

  const values = new Map<string, string>();
  const warnings = new Set<string>();
  chunkResults.forEach((result) => {
    result?.values.forEach((value, key) => values.set(key, value));
    result?.warnings.forEach((warning) => warnings.add(warning));
  });

  let translated;
  try {
    translated = applyTranslationValues(plan, values);
  } catch {
    throw new UpstreamError(502, "invalid_result");
  }

  const candidate = {
    summary: `已按 ${plan.chunks.length} 个区块完成整份简历翻译，共处理 ${plan.leafCount} 项文字。`,
    translated,
    warnings: Array.from(warnings).slice(0, 20),
  };
  const parsed = resultSchema.safeParse(candidate);
  if (!parsed.success || !hasMatchingStructure(plan.source, parsed.data.translated)) {
    throw new UpstreamError(502, "invalid_result");
  }
  return parsed.data;
}

async function translateChunk({
  apiKey,
  baseUrl,
  model,
  sourceLanguage,
  targetLanguage,
  chunk,
  signal,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  sourceLanguage: "zh-CN" | "en-US";
  targetLanguage: "zh-CN" | "en-US";
  chunk: TranslationChunk;
  signal: AbortSignal;
}): Promise<ChunkResult> {
  const messages = buildChunkMessages(sourceLanguage, targetLanguage, chunk);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callMimo({ apiKey, baseUrl, model, messages, signal });
      const result = parseChunkResult(content, chunk);
      if (result) return result;
      if (attempt === 1) throw new UpstreamError(502, "invalid_result");
    } catch (error) {
      const retryable = error instanceof UpstreamError
        && (error.kind === "empty" || error.kind === "invalid_json" || error.kind === "invalid_result");
      if (!retryable || attempt === 1) throw error;
    }
  }
  throw new UpstreamError(502, "invalid_result");
}

async function callMimo({
  apiKey,
  baseUrl,
  model,
  messages,
  signal,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
  signal: AbortSignal;
}) {
  const controller = new AbortController();
  const abortFromBatch = () => controller.abort();
  signal.addEventListener("abort", abortFromBatch, { once: true });
  if (signal.aborted) controller.abort();
  const timeout = setTimeout(() => controller.abort(), CHUNK_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        stream: false,
        max_tokens: MAX_CHUNK_OUTPUT_TOKENS,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new UpstreamError(response.status, "http", Date.now() - startedAt);

    let payload: ChatCompletionPayload;
    try {
      payload = await response.json() as ChatCompletionPayload;
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new UpstreamError(502, "invalid_json", Date.now() - startedAt);
    }

    const choice = payload.choices?.[0];
    const content = choice?.message?.content;
    if (!content?.trim()) {
      throw new UpstreamError(
        502,
        "empty",
        Date.now() - startedAt,
        choice?.finish_reason ?? undefined,
        choice?.message?.reasoning_content?.length ?? 0,
      );
    }
    return content;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", abortFromBatch);
  }
}

function buildChunkMessages(
  sourceLanguage: "zh-CN" | "en-US",
  targetLanguage: "zh-CN" | "en-US",
  chunk: TranslationChunk,
): ChatMessage[] {
  const entries = chunk.entries.map(({ key, kind, value }) => ({ key, kind, value }));
  return [
    { role: "system", content: CHUNK_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `源语言：${sourceLanguage}`,
        `目标语言：${targetLanguage}`,
        `区块：${chunk.label}`,
        `entries：${JSON.stringify(entries)}`,
        CHUNK_RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function parseChunkResult(content: string, chunk: TranslationChunk): ChunkResult | null {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = chunkResultSchema.safeParse(JSON.parse(candidate));
    if (!parsed.success || parsed.data.translations.length !== chunk.entries.length) return null;
    const expectedByKey = new Map(chunk.entries.map((entry) => [entry.key, entry]));
    const values = new Map<string, string>();
    for (const item of parsed.data.translations) {
      const expected = expectedByKey.get(item.key);
      if (!expected || values.has(item.key) || !item.value || item.value.length > expected.maxLength) return null;
      if (expected.kind === "person_name_pinyin" && !isSafeLatinName(item.value)) return null;
      values.set(item.key, item.value);
    }
    if (values.size !== expectedByKey.size) return null;
    return { values, warnings: parsed.data.warnings };
  } catch {
    return null;
  }
}

function isSafeLatinName(value: string) {
  return /^[A-Za-z][A-Za-z .'-]*$/u.test(value);
}

function hasMatchingStructure(source: TranslationPlan["source"], translated: ResumeDraft) {
  const sameBulletShape = (left: { bullets: string[] }[], right: { bullets: string[] }[]) =>
    left.length === right.length && left.every((item, index) => item.bullets.length === right[index]?.bullets.length);
  return source.education.length === translated.education.length
    && sameBulletShape(source.work, translated.work)
    && sameBulletShape(source.projects, translated.projects)
    && source.skills.length === translated.skills.length
    && source.skills.every((item, index) => item.skills.length === translated.skills[index]?.skills.length)
    && sameBulletShape(source.campus, translated.campus)
    && sameBulletShape(source.awards, translated.awards)
    && sameBulletShape(source.certifications, translated.certifications)
    && sameBulletShape(source.languages, translated.languages)
    && sameBulletShape(source.customSections, translated.customSections);
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

class UpstreamError extends Error {
  constructor(
    public status: number,
    public kind = "http",
    public elapsedMs?: number,
    public finishReason?: string,
    public reasoningLength?: number,
  ) {
    super(`translation upstream ${status}`);
  }
}

function createAbortError() {
  return new DOMException("Translation aborted", "AbortError");
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function logServerError(scope: string, error: unknown) {
  const upstreamError = error instanceof UpstreamError ? error : null;
  const details = error && typeof error === "object"
    ? {
        code: "code" in error ? String(error.code) : undefined,
        name: "name" in error ? String(error.name) : undefined,
        status: "status" in error ? Number(error.status) : undefined,
        kind: upstreamError?.kind,
        elapsedMs: upstreamError?.elapsedMs,
        finishReason: upstreamError?.finishReason,
        reasoningLength: upstreamError?.reasoningLength,
      }
    : {};
  console.error(`[${scope}]`, details);
}

function getUpstreamErrorInfo(error: unknown) {
  if (isAbortError(error)) {
    return { status: 504, message: "翻译请求超时，原简历未改动，请重试。" };
  }
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return { status: 502, message: "翻译服务鉴权失败，请联系管理员检查配置。" };
    if (error.status === 429) return { status: 429, message: "翻译服务繁忙，请稍后重试。" };
    if (error.kind === "invalid_json") return { status: 502, message: "翻译服务返回异常，原简历未改动，请重试。" };
    if (error.kind === "invalid_result") return { status: 502, message: "译文未通过结构校验，原简历未改动，请重试。" };
    if (error.kind === "empty") return { status: 502, message: "译文生成未完成，原简历未改动，请重试。" };
  }
  return { status: 502, message: "翻译暂时不可用，原简历未改动。" };
}

function mapUpstreamError(error: unknown) {
  const info = getUpstreamErrorInfo(error);
  return NextResponse.json({ error: info.message }, { status: info.status });
}

const CHUNK_RESULT_SHAPE = `只返回以下严格 JSON，不要 Markdown：
{"translations":[{"key":"t0","value":"译文"}],"warnings":["无法确认的专有名词"]}`;

const CHUNK_SYSTEM_PROMPT = `你是严谨的双语简历翻译器。用户会提供一个简历文字区块 entries。
规则：
1. 逐项翻译每个 value，只返回同样数量的 translations；key 必须原样返回且不得新增、遗漏、重复或改序。
2. kind 只用于说明文字类型，不需要翻译或返回。
3. 保留所有事实、数字、组织、岗位层级、技术名词和责任边界；不得润色、夸大、补写、合并或拆分内容。
4. 公司、学校、专业、证书等有明确通行译名时使用通行译名；无法确认时保留原文并写入 warnings。
5. 中文转英文使用简洁职业表达，英文转中文使用自然克制的简历语言；空值不会出现在输入中。
6. kind 为 person_name_pinyin 时，只把中文姓名转为汉语拼音，姓在前、名在后，首字母大写；例如“王小星”返回“Wang Xiaoxing”。不得创造英文名，也不得保留汉字。
7. 始终返回严格 JSON，不输出 Markdown、代码块或额外解释。`;
