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
  const response = await fetch("/api/resume/ai-polish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = await response.json().catch(() => null) as ResumePolishResult | { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload && "error" in payload && payload.error ? payload.error : "AI 润色失败，请稍后重试");
  }
  return payload as ResumePolishResult;
}
