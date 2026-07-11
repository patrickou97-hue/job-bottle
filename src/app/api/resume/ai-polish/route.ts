import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RESUME_POLISH_INSTRUCTIONS, RESUME_POLISH_SECTION_TYPES } from "@/lib/resume-ai";

const REQUEST_TIMEOUT_MS = 35_000;
const RATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = 6;
const rateWindows = new Map<string, number[]>();

const inputSchema = z.object({
  sectionType: z.enum(RESUME_POLISH_SECTION_TYPES),
  content: z.object({
    title: z.string().trim().max(180),
    subtitle: z.string().trim().max(300),
    bullets: z.array(z.string().trim().max(1_000)).min(1).max(12),
  }),
  targetRole: z.string().trim().max(200),
  jobDescription: z.string().trim().max(6_000),
  language: z.enum(["zh-CN", "en-US"]),
  instruction: z.enum(RESUME_POLISH_INSTRUCTIONS),
}).strict();

const resultSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  revised: z.object({
    title: z.string().trim().max(180),
    subtitle: z.string().trim().max(300),
    bullets: z.array(z.string().trim().min(1).max(1_000)).min(1).max(12),
  }),
  changes: z.array(z.object({
    type: z.enum(["clarity", "structure", "relevance", "wording", "grammar"]),
    description: z.string().trim().min(1).max(500),
  })).max(20),
  suggestions: z.array(z.string().trim().min(1).max(500)).max(12),
  warnings: z.array(z.string().trim().min(1).max(500)).max(12),
}).strict();

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 24_000) {
    return NextResponse.json({ error: "当前段落内容过长，请精简后重试" }, { status: 413 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "请先登录，再使用 AI 润色" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "当前段落格式无效或内容过长，请精简后重试" }, { status: 400 });
  }
  if (!parsed.data.content.bullets.some((bullet) => bullet.trim())) {
    return NextResponse.json({ error: "当前段落为空，请先填写内容" }, { status: 400 });
  }

  const apiKey = process.env.MIMO_API_KEY;
  const baseUrl = process.env.MIMO_BASE_URL;
  const model = process.env.MIMO_MODEL;
  if (!apiKey || !baseUrl || !model) {
    return NextResponse.json(
      { error: "AI 润色尚未配置，请联系管理员设置 MiMo 服务" },
      { status: 503 },
    );
  }

  if (!takeRateSlot(user.id)) {
    return NextResponse.json(
      { error: "请求较频繁，请十分钟后再试" },
      { status: 429, headers: { "Retry-After": "600" } },
    );
  }

  try {
    const first = await callMimo({
      apiKey,
      baseUrl,
      model,
      messages: buildMessages(parsed.data),
    });
    const firstResult = parseResult(first);
    if (firstResult) return NextResponse.json(firstResult);

    const repaired = await callMimo({
      apiKey,
      baseUrl,
      model,
      messages: [
        { role: "system", content: "把输入修复为符合指定结构的严格 JSON。不得新增事实，不得返回 Markdown。" },
        { role: "user", content: `${RESULT_SHAPE}\n待修复内容：\n${first.slice(0, 12_000)}` },
      ],
    });
    const repairedResult = parseResult(repaired);
    if (!repairedResult) {
      return NextResponse.json({ error: "AI 返回格式无法识别，原文未改变，请重新生成" }, { status: 502 });
    }
    return NextResponse.json(repairedResult);
  } catch (error) {
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, temperature: 0.2, stream: false }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new UpstreamError(response.status);
    const payload = await response.json().catch(() => null) as {
      choices?: { message?: { content?: string } }[];
    } | null;
    const content = payload?.choices?.[0]?.message?.content;
    if (!content?.trim()) throw new UpstreamError(502, "empty");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

function getChatCompletionsUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return normalized.endsWith("/chat/completions") ? normalized : `${normalized}/chat/completions`;
}

function buildMessages(input: z.infer<typeof inputSchema>): ChatMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `段落类型：${input.sectionType}`,
        `语言：${input.language}`,
        `润色目标：${input.instruction}`,
        `目标岗位：${input.targetRole || "未提供"}`,
        `岗位信息：${input.jobDescription || "未提供"}`,
        `当前段落：${JSON.stringify(input.content)}`,
        RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function parseResult(content: string) {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = resultSchema.safeParse(JSON.parse(candidate));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function takeRateSlot(userId: string) {
  const now = Date.now();
  const active = (rateWindows.get(userId) ?? []).filter((time) => now - time < RATE_WINDOW_MS);
  if (active.length >= RATE_LIMIT) return false;
  active.push(now);
  rateWindows.set(userId, active);
  return true;
}

class UpstreamError extends Error {
  constructor(public status: number, public kind = "http") {
    super(`MiMo upstream ${status}`);
  }
}

function mapUpstreamError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return NextResponse.json({ error: "AI 润色请求超时，原文未改变，请重试" }, { status: 504 });
  }
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return NextResponse.json({ error: "MiMo 服务鉴权失败，请联系管理员检查配置" }, { status: 502 });
    if (error.status === 429) return NextResponse.json({ error: "MiMo 服务繁忙，请稍后重试" }, { status: 429 });
    if (error.kind === "empty") return NextResponse.json({ error: "AI 未返回内容，原文未改变，请重新生成" }, { status: 502 });
  }
  return NextResponse.json({ error: "MiMo 服务暂时不可用，原文未改变，请稍后重试" }, { status: 502 });
}

const RESULT_SHAPE = `只返回以下严格 JSON：
{"summary":"string","revised":{"title":"string","subtitle":"string","bullets":["string"]},"changes":[{"type":"clarity|structure|relevance|wording|grammar","description":"string"}],"suggestions":["string"],"warnings":["string"]}`;

const SYSTEM_PROMPT = `你是一名严谨的简历修改顾问。改善表达、行动逻辑、专业性、简洁度和岗位相关性。
必须遵守：
1. 只能依据用户原文提供的事实改写，不得虚构公司、学校、职位、项目、客户、数字、奖项、技能、职责或成果。
2. 不得自行添加百分比、金额、人数、排名或其他量化结果。缺少量化信息时只在 suggestions 提示。
3. title 和 subtitle 是事实字段，必须原样返回。保留核心事实、时间、组织和角色。
4. 每条 bullet 优先使用行动动词，说明行动、方法和原文已有的结果。
5. 删除空泛、重复、口语化和 AI 味表达。原文没有依据时不得使用“显著提升”“大幅优化”等夸张词。
6. 中文使用自然、专业、简洁的中文；英文使用职业化英文，不逐字翻译中文句式。
7. 只返回严格 JSON，不返回 Markdown、前缀或代码块。`;
