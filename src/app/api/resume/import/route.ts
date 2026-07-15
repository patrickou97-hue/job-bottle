import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const REQUEST_TIMEOUT_MS = 22_000;
const MAX_OUTPUT_TOKENS = 4_500;

const text = (max: number) => z.string().trim().max(max);
const bullets = z.array(text(1_000)).max(12);
const basicsSchema = z.object({
  name: text(100),
  englishName: text(120),
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
const customSectionSchema = z.object({ title: text(180), bullets }).strict();
const draftSchema = z.object({
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
}).strict();
const resultSchema = z.object({
  summary: text(500),
  draft: draftSchema,
  warnings: z.array(text(500)).max(20),
}).strict();

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 80_000) {
    return NextResponse.json({ error: "简历文字内容过长，请使用 8 MB 以内的精简版本" }, { status: 413 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "请先登录，再使用智能导入" }, { status: 401 });
  }

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

  const { data: rateSlot, error: rateSlotError } = await supabase.rpc("take_resume_ai_rate_slot");
  if (rateSlotError) {
    logServerError("resume_import_rate_slot", rateSlotError);
    return NextResponse.json({ error: "AI 请求保护服务暂时不可用，请稍后重试" }, { status: 503 });
  }
  if (!rateSlot) {
    return NextResponse.json({ error: "智能导入请求较频繁，请十分钟后再试" }, { status: 429, headers: { "Retry-After": "600" } });
  }

  try {
    const content = await callMimo({
      apiKey,
      baseUrl,
      model,
      messages: buildMessages(parsed.data),
    });
    const result = parseResult(content, parsed.data.localDraft);
    if (!result) {
      return NextResponse.json({ error: "AI 返回的简历结构无法识别，未创建简历，请重试" }, { status: 502 });
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    logServerError("resume_import_upstream", error);
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
        `文件名：${input.fileName}`,
        `程序本地识别草稿：${JSON.stringify(input.localDraft)}`,
        "以下是从用户文件直接提取的原文：",
        "<resume_text>",
        input.sourceText,
        "</resume_text>",
        RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function parseResult(content: string, localDraft: z.infer<typeof draftSchema>) {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = resultSchema.safeParse(JSON.parse(candidate));
    if (!parsed.success) return null;
    return {
      ...parsed.data,
      draft: {
        ...parsed.data.draft,
        title: parsed.data.draft.title || localDraft.title,
        targetRole: parsed.data.draft.targetRole || localDraft.targetRole,
        basics: preserveDeterministicBasics(parsed.data.draft.basics, localDraft.basics),
      },
    };
  } catch {
    return null;
  }
}

function preserveDeterministicBasics(
  ai: z.infer<typeof basicsSchema>,
  local: z.infer<typeof basicsSchema>,
) {
  return {
    ...ai,
    name: local.name || ai.name,
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
    return NextResponse.json({ error: "智能导入请求超时，未创建简历，请重试" }, { status: 504 });
  }
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return NextResponse.json({ error: "AI 服务鉴权失败，请联系管理员检查配置" }, { status: 502 });
    if (error.status === 429) return NextResponse.json({ error: "AI 服务繁忙，请稍后重试" }, { status: 429 });
    if (error.kind === "empty") return NextResponse.json({ error: "AI 未返回内容，未创建简历，请重新导入" }, { status: 502 });
  }
  return NextResponse.json({ error: "智能导入暂时不可用，未创建简历，请稍后重试" }, { status: 502 });
}

const RESULT_SHAPE = `只返回以下严格 JSON，不要 Markdown：
{"summary":"string","draft":{"title":"string","targetRole":"string","basics":{"name":"string","englishName":"string","phone":"string","email":"string","city":"string","linkedin":"string","github":"string","website":"string","targetRole":"string"},"education":[{"school":"string","degree":"string","major":"string","startDate":"string","endDate":"string","gpa":"string","courses":"string","honors":"string"}],"work":[{"company":"string","title":"string","location":"string","startDate":"string","endDate":"string","current":false,"bullets":["string"]}],"projects":[{"name":"string","role":"string","startDate":"string","endDate":"string","bullets":["string"],"keywords":"string"}],"skills":[{"category":"string","skills":["string"]}],"campus":[{"title":"string","bullets":["string"]}],"awards":[{"title":"string","bullets":["string"]}],"certifications":[{"title":"string","bullets":["string"]}],"languages":[{"title":"string","bullets":["string"]}],"customSections":[{"title":"string","bullets":["string"]}]},"warnings":["string"]}`;

const SYSTEM_PROMPT = `你是拾星简历导入校对器。程序已经先从用户自己的文件提取文本并生成本地草稿；你的任务是依据原文复核、拆分并映射为拾星简历结构。
规则：
1. 只能使用 <resume_text> 中明确存在的信息。不得虚构姓名、学校、组织、岗位、时间、数字、成果、技能、证书或语言水平。
2. localDraft 只是候选，不是事实来源；若它与原文冲突，以原文为准。但邮箱、手机号、LinkedIn、GitHub 和个人网站应保留原文精确字符。
3. 保持每段经历的公司/项目、岗位、日期和 bullet 绑定，不跨教育、工作、项目、校园、奖项、证书、语言区块猜测。
4. 可以规范日期格式和去除项目符号，可以把同一段连续文字拆成 bullet；不得润色事实、增加结果或升级责任等级。
5. 无法确认的字段返回空字符串；不确定的映射写入 warnings。不要把简历页眉页脚、页码或联系方式误当经历。
6. title 使用文件名或“姓名 · 目标岗位”；targetRole 只有原文明确写出求职意向时才填写。
7. 始终返回完整 JSON；没有内容的数组返回 []。`;
