import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { RESUME_POLISH_INSTRUCTIONS, RESUME_POLISH_SECTION_TYPES } from "@/lib/resume-ai";

const REQUEST_TIMEOUT_MS = 18_000;
const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1_000;
const MAX_OUTPUT_TOKENS = 2_200;

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

type PolishResult = z.infer<typeof resultSchema>;
type CachedPolish = { expiresAt: number; result: PolishResult };
const globalPolishCache = globalThis as typeof globalThis & { __starjobResumePolishCache?: Map<string, CachedPolish> };
const polishCache = globalPolishCache.__starjobResumePolishCache ??= new Map<string, CachedPolish>();

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
      { error: "AI 润色尚未配置，请联系管理员检查服务设置" },
      { status: 503 },
    );
  }

  const cacheKey = createPolishCacheKey(user.id, parsed.data);
  const cached = polishCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.result, { headers: { "Cache-Control": "no-store", "X-StarJob-AI-Cache": "HIT" } });
  }
  if (cached) polishCache.delete(cacheKey);

  const { data: rateSlot, error: rateSlotError } = await supabase.rpc("take_resume_ai_rate_slot");
  if (rateSlotError) {
    logServerError("resume_ai_rate_slot", rateSlotError);
    return NextResponse.json(
      { error: "AI 请求保护服务暂时不可用，请稍后重试" },
      { status: 503 },
    );
  }
  if (!rateSlot) {
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
    const firstResult = parseResult(first, parsed.data.content);
    if (!firstResult) {
      return NextResponse.json({ error: "AI 返回格式无法识别，原文未改变，请重新生成" }, { status: 502 });
    }
    rememberPolishResult(cacheKey, firstResult);
    return NextResponse.json(firstResult, { headers: { "Cache-Control": "no-store", "X-StarJob-AI-Cache": "MISS" } });
  } catch (error) {
    logServerError("resume_ai_upstream", error);
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
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        stream: false,
        max_tokens: MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
      }),
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
        `岗位信息：${input.jobDescription.slice(0, 2_400) || "未提供"}`,
        `当前段落：${JSON.stringify(input.content)}`,
        RESULT_SHAPE,
      ].join("\n"),
    },
  ];
}

function createPolishCacheKey(userId: string, input: z.infer<typeof inputSchema>) {
  return createHash("sha256").update(`${userId}\0${JSON.stringify(input)}`).digest("hex");
}

function rememberPolishResult(cacheKey: string, result: PolishResult) {
  const now = Date.now();
  for (const [key, cached] of polishCache) {
    if (cached.expiresAt <= now) polishCache.delete(key);
  }
  if (polishCache.size >= 200) {
    const oldestKey = polishCache.keys().next().value;
    if (oldestKey) polishCache.delete(oldestKey);
  }
  polishCache.set(cacheKey, { expiresAt: now + RESPONSE_CACHE_TTL_MS, result });
}

function parseResult(content: string, source: z.infer<typeof inputSchema>["content"]) {
  const candidate = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    const parsed = resultSchema.safeParse(normalizeResultCandidate(JSON.parse(candidate), source));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function normalizeResultCandidate(value: unknown, source: z.infer<typeof inputSchema>["content"]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const candidate = value as Record<string, unknown>;
  const revised = candidate.revised && typeof candidate.revised === "object" && !Array.isArray(candidate.revised)
    ? candidate.revised as Record<string, unknown>
    : {};
  const changes = Array.isArray(candidate.changes)
    ? candidate.changes.map((change) => {
        if (typeof change === "string") return { type: "wording", description: change };
        if (!change || typeof change !== "object" || Array.isArray(change)) return change;
        const item = change as Record<string, unknown>;
        return {
          type: isChangeType(item.type) ? item.type : "wording",
          description: item.description,
        };
      })
    : [];

  return {
    ...candidate,
    revised: {
      ...revised,
      title: source.title,
      subtitle: source.subtitle,
    },
    changes,
    suggestions: Array.isArray(candidate.suggestions) ? candidate.suggestions : [],
    warnings: Array.isArray(candidate.warnings) ? candidate.warnings : [],
  };
}

function isChangeType(value: unknown): value is "clarity" | "structure" | "relevance" | "wording" | "grammar" {
  return value === "clarity" || value === "structure" || value === "relevance" || value === "wording" || value === "grammar";
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
    return NextResponse.json({ error: "AI 润色请求超时，原文未改变，请重试" }, { status: 504 });
  }
  if (error instanceof UpstreamError) {
    if (error.status === 401 || error.status === 403) return NextResponse.json({ error: "AI 服务鉴权失败，请联系管理员检查配置" }, { status: 502 });
    if (error.status === 429) return NextResponse.json({ error: "AI 服务繁忙，请稍后重试" }, { status: 429 });
    if (error.kind === "empty") return NextResponse.json({ error: "AI 未返回内容，原文未改变，请重新生成" }, { status: 502 });
  }
  return NextResponse.json({ error: "AI 服务暂时不可用，原文未改变，请稍后重试" }, { status: 502 });
}

const RESULT_SHAPE = `只返回以下严格 JSON：
{"summary":"string","revised":{"title":"string","subtitle":"string","bullets":["string"]},"changes":[{"type":"clarity|structure|relevance|wording|grammar","description":"string"}],"suggestions":["string"],"warnings":["string"]}`;

const SYSTEM_PROMPT = `你是严谨的简历编辑，只润色用户给出的单段经历并返回严格 JSON。
规则：
1. 保留全部事实、时间、组织、岗位、项目和责任等级；title、subtitle 原样返回。
2. 不得虚构数字、成果、客户、技能或职责，不把“协助/参与/支持”升级为主导或负责。
3. 优化清晰度、专业性、行动方法和岗位相关性；没有结果时不强补结果，只在 suggestions 提醒。
4. 删除重复套话和夸张 AI 表达，中文自然克制，英文简洁职业。
5. 信息不足或冲突时保守处理并写入 warnings。
6. 不输出 Markdown、代码块或额外解释。`;
