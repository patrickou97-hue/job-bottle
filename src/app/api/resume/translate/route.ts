import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const REQUEST_TIMEOUT_MS = 32_000;
const MAX_OUTPUT_TOKENS = 7_000;

const text = (max: number) => z.string().trim().max(max);
const bullets = z.array(text(1_000)).max(12);
const basicsSchema = z.object({
  name: text(100),
  englishName: text(120),
  city: text(120),
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
const customSectionSchema = z.object({ title: text(180), bullets }).strict();
const resumeSchema = z.object({
  title: text(180),
  targetRole: text(180),
  jobTarget: text(500),
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
}).strict().refine((value) => value.sourceLanguage !== value.targetLanguage, {
  message: "source and target languages must differ",
});
const resultSchema = z.object({
  summary: text(500),
  translated: resumeSchema,
  warnings: z.array(text(500)).max(20),
}).strict();

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 80_000) {
    return NextResponse.json({ error: "整份简历内容过长，请精简后再翻译" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "请先登录，再使用 AI 翻译" }, { status: 401 });
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
    return NextResponse.json({ error: "AI 翻译尚未配置，请联系管理员检查服务设置" }, { status: 503 });
  }

  const { data: rateSlot, error: rateSlotError } = await supabase.rpc("take_resume_ai_rate_slot");
  if (rateSlotError) {
    logServerError("resume_translate_rate_slot", rateSlotError);
    return NextResponse.json({ error: "AI 请求保护服务暂时不可用，请稍后重试" }, { status: 503 });
  }
  if (!rateSlot) {
    return NextResponse.json({ error: "AI 翻译请求较频繁，请十分钟后再试" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  try {
    const content = await callMimo({
      apiKey,
      baseUrl,
      model,
      messages: buildMessages(parsed.data),
    });
    const result = parseResult(content, parsed.data.resume);
    if (!result) {
      return NextResponse.json({ error: "AI 返回的译文结构无法识别，原简历未改变，请重试" }, { status: 502 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("resume_translate_upstream", error);
    return mapUpstreamError(error);
  }
}

type ChatMessage = { role: "system" | "user"; content: string };

async function callMimo({
  apiKey,
  baseUrl,
  model,
  messages,
}: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ChatMessage[];
}) {
  const controller = new AbortController();
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
        max_tokens: MAX_OUTPUT_TOKENS,
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
  }
}

function buildMessages(input: z.infer<typeof inputSchema>): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `源语言：${input.sourceLanguage}`,
        `目标语言：${input.targetLanguage}`,
        "待翻译简历 JSON：",
        JSON.stringify(input.resume),
        RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function parseResult(content: string, source: z.infer<typeof resumeSchema>) {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = resultSchema.safeParse(JSON.parse(candidate));
    if (!parsed.success || !hasMatchingStructure(source, parsed.data.translated)) return null;
    return {
      ...parsed.data,
      translated: preserveDeterministicStructure(source, parsed.data.translated),
    };
  } catch {
    return null;
  }
}

function hasMatchingStructure(source: z.infer<typeof resumeSchema>, translated: z.infer<typeof resumeSchema>) {
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

function preserveDeterministicStructure(
  source: z.infer<typeof resumeSchema>,
  translated: z.infer<typeof resumeSchema>,
) {
  return {
    ...translated,
    education: translated.education.map((item, index) => ({
      ...item,
      startDate: source.education[index]?.startDate ?? "",
      endDate: source.education[index]?.endDate ?? "",
      gpa: source.education[index]?.gpa ?? "",
    })),
    work: translated.work.map((item, index) => ({
      ...item,
      startDate: source.work[index]?.startDate ?? "",
      endDate: source.work[index]?.endDate ?? "",
      current: source.work[index]?.current ?? false,
    })),
    projects: translated.projects.map((item, index) => ({
      ...item,
      startDate: source.projects[index]?.startDate ?? "",
      endDate: source.projects[index]?.endDate ?? "",
    })),
  };
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

class UpstreamError extends Error {
  constructor(public status: number, public kind = "http") {
    super(`MiMo upstream ${status}`);
  }
}

function logServerError(scope: string, error: unknown) {
  const details = error && typeof error === "object"
    ? {
        code: "code" in error ? String(error.code) : undefined,
        name: "name" in error ? String(error.name) : undefined,
        status: "status" in error ? Number(error.status) : undefined,
      }
    : {};
  console.error(`[${scope}]`, details);
}

function mapUpstreamError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return NextResponse.json({ error: "AI 翻译请求超时，原简历未改变，请重试" }, { status: 504 });
  }
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return NextResponse.json({ error: "AI 服务鉴权失败，请联系管理员检查配置" }, { status: 502 });
    if (error.status === 429) return NextResponse.json({ error: "AI 服务繁忙，请稍后重试" }, { status: 429 });
    if (error.kind === "empty") return NextResponse.json({ error: "AI 未返回译文，原简历未改变，请重试" }, { status: 502 });
  }
  return NextResponse.json({ error: "AI 翻译暂时不可用，原简历未改变，请稍后重试" }, { status: 502 });
}

const RESULT_SHAPE = `只返回以下严格 JSON，不要 Markdown：
{"summary":"string","translated":{"title":"string","targetRole":"string","jobTarget":"string","basics":{"name":"string","englishName":"string","city":"string","targetRole":"string"},"education":[{"school":"string","degree":"string","major":"string","startDate":"string","endDate":"string","gpa":"string","courses":"string","honors":"string"}],"work":[{"company":"string","title":"string","location":"string","startDate":"string","endDate":"string","current":false,"bullets":["string"]}],"projects":[{"name":"string","role":"string","startDate":"string","endDate":"string","bullets":["string"],"keywords":"string"}],"skills":[{"category":"string","skills":["string"]}],"campus":[{"title":"string","bullets":["string"]}],"awards":[{"title":"string","bullets":["string"]}],"certifications":[{"title":"string","bullets":["string"]}],"languages":[{"title":"string","bullets":["string"]}],"customSections":[{"title":"string","bullets":["string"]}]},"warnings":["string"]}`;

const SYSTEM_PROMPT = `你是严谨的双语简历翻译器。把用户提供的整份结构化简历翻译成目标语言并返回严格 JSON。
规则：
1. 只翻译现有文字，不新增、删除、合并、拆分或重排任何经历、项目、技能、bullet 或模块。
2. 保留所有事实、数字、日期、GPA、组织、岗位层级、技术名词和责任边界；不得润色、夸大或补写成果。
3. 公司、学校、专业、证书等专有名词有明确通行译名时使用通行译名；无法确认时保留原文并写入 warnings。
4. 中文转英文时使用简洁职业表达；英文转中文时使用自然、克制的简历语言。不要逐字硬译，也不要改变事实。
5. name 与 englishName 均保留：有明确英文名时用于 englishName；无法确认姓名译法时保留原文，不自行创造英文名。
6. startDate、endDate、current 和 GPA 原样返回。空字符串保持为空。
7. 始终返回完整 JSON，不输出 Markdown、代码块或额外解释。`;
