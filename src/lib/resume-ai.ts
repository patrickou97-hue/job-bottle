export const RESUME_POLISH_SECTION_TYPES = [
  "work",
  "project",
  "campus",
  "education",
  "award",
  "custom",
] as const;

export const RESUME_POLISH_INSTRUCTIONS = [
  "professional",
  "concise",
  "results",
  "relevance",
  "english",
] as const;

export type ResumePolishSectionType = typeof RESUME_POLISH_SECTION_TYPES[number];
export type ResumePolishInstruction = typeof RESUME_POLISH_INSTRUCTIONS[number];
export type ResumePolishLanguage = "zh-CN" | "en-US";

export type ResumePolishContent = {
  title: string;
  subtitle: string;
  bullets: string[];
};

export type ResumePolishRequest = {
  sectionType: ResumePolishSectionType;
  content: ResumePolishContent;
  targetRole: string;
  jobDescription: string;
  language: ResumePolishLanguage;
  instruction: ResumePolishInstruction;
};

export type ResumePolishChange = {
  type: "clarity" | "structure" | "relevance" | "wording" | "grammar";
  description: string;
};

export type ResumePolishResult = {
  summary: string;
  revised: ResumePolishContent;
  changes: ResumePolishChange[];
  suggestions: string[];
  warnings: string[];
};

export async function requestResumePolish(input: ResumePolishRequest) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 22_000);
  try {
    const response = await fetch("/api/resume/ai-polish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as ResumePolishResult | { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload && "error" in payload && payload.error ? payload.error : "AI 润色失败，请稍后重试");
    }
    if (!isResumePolishResult(payload)) {
      throw new Error("AI 返回内容格式异常，原文未改变，请重新生成");
    }
    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("AI 润色请求超时，原文未改变，请重试");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

function isResumePolishResult(value: unknown): value is ResumePolishResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ResumePolishResult>;
  return typeof result.summary === "string"
    && Boolean(result.revised)
    && typeof result.revised?.title === "string"
    && typeof result.revised?.subtitle === "string"
    && Array.isArray(result.revised?.bullets)
    && result.revised.bullets.every((bullet) => typeof bullet === "string")
    && Array.isArray(result.changes)
    && result.changes.every((change) => change && typeof change.description === "string")
    && Array.isArray(result.suggestions)
    && result.suggestions.every((item) => typeof item === "string")
    && Array.isArray(result.warnings)
    && result.warnings.every((item) => typeof item === "string");
}
