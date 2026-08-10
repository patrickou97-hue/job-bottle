import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveResumeAiAccess } from "@/lib/resume-ai-access";
import { cleanResumeBullet } from "@/lib/resume-import-text";

export const maxDuration = 120;

const REQUEST_TIMEOUT_MS = 100_000;
const REVIEW_PARTS_TOTAL = 2;

const text = (max: number) => z.string().trim().max(max);
const bullets = z.array(text(1_000)).max(12);
const basicsSchema = z.object({
  name: text(100),
  englishName: text(120),
  birthDate: text(40),
  phone: text(80),
  email: text(160),
  city: text(120),
  linkedin: text(300),
  github: text(300),
  website: text(300),
  targetRole: text(180),
}).strict();
const educationSchema = z.object({
  school: text(180),
  degree: text(100),
  major: text(180),
  startDate: text(40),
  endDate: text(40),
  gpa: text(80),
  courses: text(800),
  honors: text(800),
}).strict();
const experienceSchema = z.object({
  company: text(180),
  title: text(180),
  location: text(120),
  startDate: text(40),
  endDate: text(40),
  current: z.boolean(),
  bullets,
}).strict();
const projectSchema = z.object({
  name: text(180),
  role: text(180),
  startDate: text(40),
  endDate: text(40),
  bullets,
  keywords: text(500),
}).strict();
const skillSchema = z.object({ category: text(120), skills: z.array(text(120)).max(30) }).strict();
const customSectionSchema = z.object({
  title: text(180),
  role: text(180).optional().default(""),
  date: text(80).optional().default(""),
  bullets,
}).strict();
const draftSchema = z.object({
  language: z.enum(["zh-CN", "en-US"]),
  title: text(180),
  targetRole: text(180),
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
  fileName: text(240),
  sourceText: z.string().trim().min(120).max(24_000),
  localDraft: draftSchema,
  progressMode: z.enum(["json", "ndjson"]).optional().default("json"),
}).strict();
const resultSchema = z.object({
  summary: text(500),
  draft: draftSchema,
  warnings: z.array(text(500)).max(20),
}).strict();

type ImportInput = z.infer<typeof inputSchema>;
type ReviewProgress = { completed: number; total: number; label: string; fallback: boolean };

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 80_000) {
    return NextResponse.json({ error: "简历文字内容过长，请使用 8 MB 以内的精简版本" }, { status: 413 });
  }

  const access = await resolveResumeAiAccess(request);
  if (!access) return NextResponse.json({ error: "请先登录，再使用智能导入" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "简历文字过少、过长或格式无效，请换一个文件重试" }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL;
  const model = process.env.MIMO_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json({ error: "智能导入尚未配置，请联系管理员检查服务设置" }, { status: 503 });
  }

  const { data: rateSlot, error: rateSlotError } = await access.takeRateSlot();
  if (rateSlotError) {
    logServerError("resume_import_rate_slot", rateSlotError);
    return NextResponse.json({ error: "AI 请求保护服务暂时不可用，请稍后重试" }, { status: 503 });
  }
  if (!rateSlot) {
    return NextResponse.json({ error: "智能导入请求较频繁，请十分钟后再试" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  if (parsed.data.progressMode === "ndjson") {
    return createProgressResponse(parsed.data, { apiKey, baseUrl, model }, request.signal);
  }

  const startedAt = Date.now();
  try {
    const result = await reviewResumeInParts(
      parsed.data,
      { apiKey, baseUrl, model },
      undefined,
      request.signal,
    );
    logImportTiming("success", parsed.data, Date.now() - startedAt);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("resume_import_upstream", error, parsed.data, Date.now() - startedAt);
    return mapUpstreamError(error);
  }
}

function createProgressResponse(input: ImportInput, config: AiConfig, requestSignal: AbortSignal) {
  const encoder = new TextEncoder();
  const taskController = new AbortController();
  const abortFromRequest = () => taskController.abort();
  requestSignal.addEventListener("abort", abortFromRequest, { once: true });
  if (requestSignal.aborted) abortFromRequest();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      };
      send({ type: "start", completed: 0, total: REVIEW_PARTS_TOTAL, label: "AI 正在通读整份简历并判断区块归属" });
      const startedAt = Date.now();
      void reviewResumeInParts(input, config, (progress) => send({ type: "progress", ...progress }), taskController.signal)
        .then((result) => {
          logImportTiming("success", input, Date.now() - startedAt);
          send({ type: "result", data: result });
        })
        .catch((error) => {
          logServerError("resume_import_stream", error, input, Date.now() - startedAt);
          send({ type: "error", error: getUpstreamErrorMessage(error) });
        })
        .finally(() => {
          requestSignal.removeEventListener("abort", abortFromRequest);
          if (!closed) controller.close();
          closed = true;
        });
    },
    cancel() {
      closed = true;
      taskController.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

type AiConfig = { apiKey: string; baseUrl: string; model: string };
type ChatMessage = { role: "system" | "user"; content: string };

async function reviewResumeInParts(
  input: ImportInput,
  config: AiConfig,
  onProgress?: (progress: ReviewProgress) => void,
  signal?: AbortSignal,
) {
  const content = await callMimo({
    ...config,
    messages: buildWholeResumeMessages(input),
    maxTokens: 7_600,
    externalSignal: signal,
  });
  onProgress?.({
    completed: 1,
    total: REVIEW_PARTS_TOTAL,
    fallback: false,
    label: "AI 已理解全文，正在校验每个区块与原文的对应关系",
  });

  const parsed = parseWholeResumeResult(content);
  if (!parsed) throw new UpstreamError(502, "invalid");
  const verified = resultSchema.safeParse({
    ...parsed,
    draft: sanitizeReviewedDraft({
      ...parsed.draft,
      basics: preserveDeterministicBasics(parsed.draft.basics, input.localDraft.basics),
    }),
  });
  if (!verified.success) throw new UpstreamError(502, "invalid");
  onProgress?.({
    completed: REVIEW_PARTS_TOTAL,
    total: REVIEW_PARTS_TOTAL,
    fallback: false,
    label: "全部区块已完成智能整理，可以核对后导入",
  });
  return verified.data;
}

async function callMimo({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  externalSignal,
}: AiConfig & { messages: ChatMessage[]; maxTokens: number; externalSignal?: AbortSignal }) {
  const controller = new AbortController();
  const cancelFromOutside = () => controller.abort();
  externalSignal?.addEventListener("abort", cancelFromOutside, { once: true });
  if (externalSignal?.aborted) cancelFromOutside();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(getChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        stream: false,
        max_tokens: maxTokens,
        chat_template_kwargs: { enable_thinking: false },
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new UpstreamError(response.status);
    const payload = await response.json().catch(() => null) as { choices?: { message?: { content?: string } }[] } | null;
    const content = payload?.choices?.[0]?.message?.content;
    if (!content?.trim()) throw new UpstreamError(502, "empty");
    return content;
  } finally {
    clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", cancelFromOutside);
  }
}

function buildWholeResumeMessages(input: ImportInput): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "请先通读全文、判断各段边界，再一次性填写全部拾星简历区块。不要把尚未完成的局部结果当作最终答案。",
        `文件名：${input.fileName}`,
        `程序本地识别线索（仅用于定位，不是事实来源）：${JSON.stringify(buildWholeReviewHints(input.localDraft))}`,
        "以下是从用户文件直接提取的完整原文：",
        "<resume_text>",
        input.sourceText,
        "</resume_text>",
        FULL_RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function buildWholeReviewHints(draft: z.infer<typeof draftSchema>) {
  const compact = <T extends Record<string, unknown>>(value: T) => Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== "" && item !== null && item !== undefined),
  );
  return {
    language: draft.language,
    title: draft.title,
    targetRole: draft.targetRole,
    basics: compact(draft.basics),
    detectedCounts: {
      education: draft.education.length,
      work: draft.work.length,
      projects: draft.projects.length,
      skills: draft.skills.length,
      campus: draft.campus.length,
      awards: draft.awards.length,
      certifications: draft.certifications.length,
      languages: draft.languages.length,
      customSections: draft.customSections.length,
    },
  };
}

function parseWholeResumeResult(content: string) {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const value = JSON.parse(candidate);
    const parsed = resultSchema.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function sanitizeReviewedDraft(draft: z.infer<typeof draftSchema>) {
  return sanitizeReviewedValue(draft) as z.infer<typeof draftSchema>;
}

function sanitizeReviewedValue(value: unknown, field = ""): unknown {
  if (typeof value === "string") {
    return field === "bullets"
      ? cleanResumeBullet(value)
      : value.replace(/\u00ad/g, "").replace(/[ \t]+/g, " ").trim();
  }
  if (Array.isArray(value)) return value.map((item) => sanitizeReviewedValue(item, field));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitizeReviewedValue(item, key)]));
  }
  return value;
}

function preserveDeterministicBasics(ai: z.infer<typeof basicsSchema>, local: z.infer<typeof basicsSchema>) {
  return {
    ...ai,
    name: local.name || ai.name,
    birthDate: local.birthDate,
    phone: local.phone || ai.phone,
    email: local.email || ai.email,
    linkedin: local.linkedin || ai.linkedin,
    github: local.github || ai.github,
    website: local.website || ai.website,
  };
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

class UpstreamError extends Error {
  constructor(public status: number, public kind = "http") {
    super(`AI upstream ${status}`);
  }
}

function logServerError(scope: string, error: unknown, input?: ImportInput, elapsedMs?: number) {
  const details = error && typeof error === "object"
    ? {
        code: "code" in error ? String(error.code) : undefined,
        name: "name" in error ? String(error.name) : undefined,
        status: "status" in error ? Number(error.status) : undefined,
        kind: "kind" in error ? String(error.kind) : undefined,
        elapsedMs,
        ...(input ? getImportMetrics(input) : {}),
      }
    : {};
  console.error(`[${scope}]`, details);
}

function logImportTiming(outcome: "success", input: ImportInput, elapsedMs: number) {
  console.info("[resume_import_timing]", { outcome, elapsedMs, strategy: "holistic_structure_v3", ...getImportMetrics(input) });
}

function getImportMetrics(input: ImportInput) {
  const bulletCount = [
    ...input.localDraft.work,
    ...input.localDraft.projects,
    ...input.localDraft.campus,
    ...input.localDraft.awards,
    ...input.localDraft.certifications,
    ...input.localDraft.languages,
    ...input.localDraft.customSections,
  ].reduce((total, item) => total + item.bullets.length, 0);
  return {
    sourceChars: input.sourceText.length,
    educationCount: input.localDraft.education.length,
    workCount: input.localDraft.work.length,
    projectCount: input.localDraft.projects.length,
    bulletCount,
  };
}

function getUpstreamErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return "AI 智能整理等待超时。本地识别结果仍可直接导入，也可稍后重试。";
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return "AI 服务鉴权失败，请联系管理员检查配置";
    if (error.status === 429) return "AI 服务繁忙，请稍后重试";
    if (error.kind === "empty") return "AI 未返回内容，未创建简历，请重新导入";
    if (error.kind === "invalid") return "AI 返回的简历结构无法识别，未创建简历，请重试";
  }
  return "智能导入暂时不可用，未创建简历，请稍后重试";
}

function mapUpstreamError(error: unknown) {
  const status = error instanceof DOMException && error.name === "AbortError"
    ? 504
    : error instanceof UpstreamError && error.status === 429 ? 429 : 502;
  return NextResponse.json({ error: getUpstreamErrorMessage(error) }, { status });
}

const FULL_RESULT_SHAPE = `只返回一个完整严格 JSON，不要省略任何键：{"summary":"string","warnings":["string"],"draft":{"language":"zh-CN|en-US","title":"string","targetRole":"string","basics":{"name":"string","englishName":"string","birthDate":"仅原文明确标注时返回 YYYY-MM-DD，否则空字符串","phone":"string","email":"string","city":"string","linkedin":"string","github":"string","website":"string","targetRole":"string"},"education":[{"school":"string","degree":"string","major":"string","startDate":"string","endDate":"string","gpa":"string","courses":"string","honors":"string"}],"work":[{"company":"string","title":"string","location":"string","startDate":"string","endDate":"string","current":false,"bullets":["string"]}],"projects":[{"name":"string","role":"string","startDate":"string","endDate":"string","bullets":["string"],"keywords":"string"}],"skills":[{"category":"string","skills":["string"]}],"campus":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"awards":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"certifications":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"languages":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"customSections":[{"title":"string","role":"string","date":"string","bullets":["string"]}]}}`;

const SYSTEM_PROMPT = `你是拾星简历智能整理器。你必须先通读用户整份简历，理解标题、版面顺序和每段经历的语义边界，再把原文一次性映射为完整的拾星简历结构；不能把任务拆成彼此不知道上下文的局部猜测。
规则：
1. 只能使用 <resume_text> 中明确存在的信息。不得虚构姓名、学校、组织、岗位、时间、数字、成果、技能、证书或语言水平。
2. localDraft 只是候选，不是事实来源；若它与原文冲突，以原文为准。但邮箱、手机号、LinkedIn、GitHub 和个人网站应保留原文精确字符。
3. 必须先识别 EDUCATION、EXPERIENCE、PROJECTS、SKILLS 等标题与相邻内容的真实范围，再决定每一条应该进入 education、work、projects、skills、campus、awards、certifications、languages 或 customSections。网站地址、联系方式、页眉、页脚和下一节标题绝不能成为公司或经历。
4. 保持每段经历的公司/项目、岗位、地点、日期和 bullet 绑定；一个公司或项目结束后，后续组织、岗位和日期必须新建对应记录，不得粘到上一条经历中。
5. PDF 提取可能把项目符号错误显示为 ü、、、· ü 或把一句话按视觉换行拆开。它们只是排版噪声：输出中必须去掉这些符号，并在不改写原意的前提下合并同一句的换行。
6. 可以规范日期格式和去除项目符号，可以把同一段连续文字拆成 bullet；不得润色事实、增加结果或升级责任等级。
7. 无法确认的字段返回空字符串；不确定的映射写入 warnings。不要把简历页眉页脚、页码或联系方式误当经历。
8. birthDate 只有原文以出生日期、生日、date of birth 或 DOB 明确标注时才填写并规范为 YYYY-MM-DD；不得根据年龄、教育日期或证件号码推断。
9. title 使用文件名或“姓名 · 目标岗位”；targetRole 只有原文明确写出求职意向时才填写。
10. language 必须根据原文主要叙述语言返回 zh-CN 或 en-US；中英混合时按经历描述、项目描述等正文占比判断。
11. 必须返回全部区块的完整严格 JSON；没有内容的数组返回 []，不要 Markdown、注释、省略号或额外解释。`;
