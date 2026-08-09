import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveResumeAiAccess } from "@/lib/resume-ai-access";

export const maxDuration = 90;

const REQUEST_TIMEOUT_MS = 70_000;
const REVIEW_PARTS_TOTAL = 3;

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

const coreResultSchema = z.object({
  summary: text(500),
  warnings: z.array(text(500)).max(10),
  draft: z.object({
    language: z.enum(["zh-CN", "en-US"]),
    title: text(180),
    targetRole: text(180),
    basics: basicsSchema,
    education: z.array(educationSchema).max(8),
  }).strict(),
}).strict();
const experienceResultSchema = z.object({
  summary: text(500),
  warnings: z.array(text(500)).max(10),
  draft: z.object({
    work: z.array(experienceSchema).max(12),
    projects: z.array(projectSchema).max(12),
  }).strict(),
}).strict();
const extrasResultSchema = z.object({
  summary: text(500),
  warnings: z.array(text(500)).max(10),
  draft: z.object({
    skills: z.array(skillSchema).max(12),
    campus: z.array(customSectionSchema).max(8),
    awards: z.array(customSectionSchema).max(8),
    certifications: z.array(customSectionSchema).max(8),
    languages: z.array(customSectionSchema).max(8),
    customSections: z.array(customSectionSchema).max(8),
  }).strict(),
}).strict();

type ImportInput = z.infer<typeof inputSchema>;
type ReviewPartKind = "core" | "experience" | "extras";
type ReviewProgress = { completed: number; total: number; label: string; fallback: boolean };
type ReviewPartResult = {
  kind: ReviewPartKind;
  summary: string;
  warnings: string[];
  draft: Record<string, unknown>;
  fallback: boolean;
};

const REVIEW_PARTS: Array<{ kind: ReviewPartKind; label: string; maxTokens: number }> = [
  { kind: "core", label: "基础信息与教育经历", maxTokens: 1_900 },
  { kind: "experience", label: "工作与项目经历", maxTokens: 2_900 },
  { kind: "extras", label: "技能与其他内容", maxTokens: 2_000 },
];

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
    return createProgressResponse(parsed.data, { apiKey, baseUrl, model });
  }

  const startedAt = Date.now();
  try {
    const result = await reviewResumeInParts(parsed.data, { apiKey, baseUrl, model });
    logImportTiming("success", parsed.data, Date.now() - startedAt);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("resume_import_upstream", error, parsed.data, Date.now() - startedAt);
    return mapUpstreamError(error);
  }
}

function createProgressResponse(input: ImportInput, config: AiConfig) {
  const encoder = new TextEncoder();
  const taskController = new AbortController();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (value: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`));
      };
      send({ type: "start", completed: 0, total: REVIEW_PARTS_TOTAL, label: "已拆分为 3 个复核区块，正在并行处理" });
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
          if (!closed) controller.close();
          closed = true;
        });
    },
    cancel() {
      closed = true;
      taskController.abort("client_cancelled");
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
  let completed = 0;
  const failures: unknown[] = [];
  const parts = await Promise.all(REVIEW_PARTS.map(async (part) => {
    let result: ReviewPartResult;
    try {
      const content = await callMimo({
        ...config,
        messages: buildPartMessages(input, part.kind),
        maxTokens: part.maxTokens,
        externalSignal: signal,
      });
      const parsedPart = parsePartResult(part.kind, content);
      if (!parsedPart) throw new UpstreamError(502, "invalid");
      result = parsedPart;
    } catch (error) {
      failures.push(error);
      logServerError(`resume_import_${part.kind}`, error, input);
      result = createFallbackPart(part.kind, input.localDraft);
    }
    completed += 1;
    onProgress?.({
      completed,
      total: REVIEW_PARTS_TOTAL,
      fallback: result.fallback,
      label: result.fallback
        ? `${part.label}暂用本地识别结果，其余区块继续处理`
        : `${part.label}复核完成`,
    });
    return result;
  }));

  if (parts.every((part) => part.fallback)) {
    throw failures[0] ?? new UpstreamError(502, "invalid");
  }

  const core = parts.find((part) => part.kind === "core")!;
  const experience = parts.find((part) => part.kind === "experience")!;
  const extras = parts.find((part) => part.kind === "extras")!;
  const combined = resultSchema.safeParse({
    summary: parts.every((part) => !part.fallback)
      ? "已分区核对基础信息、经历与其他内容；生成后请逐项对照原文。"
      : `已完成 ${parts.filter((part) => !part.fallback).length}/3 个智能复核区块；其余内容沿用本地识别结果。`,
    draft: {
      ...core.draft,
      ...experience.draft,
      ...extras.draft,
      basics: preserveDeterministicBasics(
        core.draft.basics as z.infer<typeof basicsSchema>,
        input.localDraft.basics,
      ),
    },
    warnings: [...new Set(parts.flatMap((part) => part.warnings))].slice(0, 20),
  });
  if (!combined.success) throw new UpstreamError(502, "invalid");
  return combined.data;
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
  const cancelFromOutside = () => controller.abort("cancelled");
  externalSignal?.addEventListener("abort", cancelFromOutside, { once: true });
  const timeout = setTimeout(() => controller.abort("timeout"), REQUEST_TIMEOUT_MS);
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

function buildPartMessages(input: ImportInput, kind: ReviewPartKind): ChatMessage[] {
  const part = REVIEW_PARTS.find((item) => item.kind === kind)!;
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `本批只复核：${part.label}。不要输出其他区块。`,
        `文件名：${input.fileName}`,
        `程序本地识别线索：${JSON.stringify(buildLocalReviewHints(input.localDraft, kind))}`,
        "以下是从用户文件直接提取的完整原文：",
        "<resume_text>",
        input.sourceText,
        "</resume_text>",
        PART_RESULT_SHAPES[kind],
      ].join("\n"),
    },
  ];
}

function buildLocalReviewHints(draft: z.infer<typeof draftSchema>, kind: ReviewPartKind) {
  const compact = <T extends Record<string, unknown>>(value: T) => Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== "" && item !== null && item !== undefined),
  );
  const anchors = <T extends { bullets: string[] }>(items: T[]) => items.map(({ bullets: itemBullets, ...item }) => ({
    ...compact(item),
    bulletCount: itemBullets.length,
  }));
  if (kind === "core") {
    return { language: draft.language, title: draft.title, targetRole: draft.targetRole, basics: compact(draft.basics), education: draft.education.map(compact) };
  }
  if (kind === "experience") return { work: anchors(draft.work), projects: anchors(draft.projects) };
  return {
    skills: draft.skills.map((item) => ({ category: item.category, skillCount: item.skills.length })),
    campus: anchors(draft.campus),
    awards: anchors(draft.awards),
    certifications: anchors(draft.certifications),
    languages: anchors(draft.languages),
    customSections: anchors(draft.customSections),
  };
}

function parsePartResult(kind: ReviewPartKind, content: string): ReviewPartResult | null {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const value = JSON.parse(candidate);
    const schema = kind === "core" ? coreResultSchema : kind === "experience" ? experienceResultSchema : extrasResultSchema;
    const parsed = schema.safeParse(value);
    return parsed.success ? { kind, ...parsed.data, fallback: false } : null;
  } catch {
    return null;
  }
}

function createFallbackPart(kind: ReviewPartKind, draft: z.infer<typeof draftSchema>): ReviewPartResult {
  if (kind === "core") {
    return {
      kind,
      summary: "基础信息暂用本地识别结果",
      warnings: ["基础信息与教育经历智能复核未完成，已保留本地识别结果。"],
      draft: { language: draft.language, title: draft.title, targetRole: draft.targetRole, basics: draft.basics, education: draft.education },
      fallback: true,
    };
  }
  if (kind === "experience") {
    return {
      kind,
      summary: "经历暂用本地识别结果",
      warnings: ["工作与项目经历智能复核未完成，已保留本地识别结果。"],
      draft: { work: draft.work, projects: draft.projects },
      fallback: true,
    };
  }
  return {
    kind,
    summary: "其他内容暂用本地识别结果",
    warnings: ["技能与其他内容智能复核未完成，已保留本地识别结果。"],
    draft: {
      skills: draft.skills,
      campus: draft.campus,
      awards: draft.awards,
      certifications: draft.certifications,
      languages: draft.languages,
      customSections: draft.customSections,
    },
    fallback: true,
  };
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
  console.info("[resume_import_timing]", { outcome, elapsedMs, strategy: "parallel_parts_v2", ...getImportMetrics(input) });
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
  if (error instanceof DOMException && error.name === "AbortError") return "结构复核等待超时。本地识别结果仍可直接导入，也可稍后重试。";
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

const PART_RESULT_SHAPES: Record<ReviewPartKind, string> = {
  core: `只返回严格 JSON：{"summary":"string","warnings":["string"],"draft":{"language":"zh-CN|en-US","title":"string","targetRole":"string","basics":{"name":"string","englishName":"string","birthDate":"仅原文明确标注时返回 YYYY-MM-DD，否则空字符串","phone":"string","email":"string","city":"string","linkedin":"string","github":"string","website":"string","targetRole":"string"},"education":[{"school":"string","degree":"string","major":"string","startDate":"string","endDate":"string","gpa":"string","courses":"string","honors":"string"}]}}`,
  experience: `只返回严格 JSON：{"summary":"string","warnings":["string"],"draft":{"work":[{"company":"string","title":"string","location":"string","startDate":"string","endDate":"string","current":false,"bullets":["string"]}],"projects":[{"name":"string","role":"string","startDate":"string","endDate":"string","bullets":["string"],"keywords":"string"}]}}`,
  extras: `只返回严格 JSON：{"summary":"string","warnings":["string"],"draft":{"skills":[{"category":"string","skills":["string"]}],"campus":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"awards":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"certifications":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"languages":[{"title":"string","role":"string","date":"string","bullets":["string"]}],"customSections":[{"title":"string","role":"string","date":"string","bullets":["string"]}]}}`,
};

const SYSTEM_PROMPT = `你是拾星简历导入校对器。程序已经先从用户自己的文件提取文本并生成本地草稿；你的任务是依据原文复核、拆分并映射为拾星简历结构。
规则：
1. 只能使用 <resume_text> 中明确存在的信息。不得虚构姓名、学校、组织、岗位、时间、数字、成果、技能、证书或语言水平。
2. localDraft 只是候选，不是事实来源；若它与原文冲突，以原文为准。但邮箱、手机号、LinkedIn、GitHub 和个人网站应保留原文精确字符。
3. 保持每段经历的公司/项目、岗位、日期和 bullet 绑定，不跨教育、工作、项目、校园、奖项、证书、语言区块猜测。
4. 可以规范日期格式和去除项目符号，可以把同一段连续文字拆成 bullet；不得润色事实、增加结果或升级责任等级。
5. 无法确认的字段返回空字符串；不确定的映射写入 warnings。不要把简历页眉页脚、页码或联系方式误当经历。
6. birthDate 只有原文以出生日期、生日、date of birth 或 DOB 明确标注时才填写并规范为 YYYY-MM-DD；不得根据年龄、教育日期或证件号码推断。
7. title 使用文件名或“姓名 · 目标岗位”；targetRole 只有原文明确写出求职意向时才填写。
8. language 必须根据原文主要叙述语言返回 zh-CN 或 en-US；中英混合时按经历描述、项目描述等正文占比判断。
9. 只返回本批要求的完整严格 JSON；没有内容的数组返回 []，不要 Markdown 或额外解释。`;
