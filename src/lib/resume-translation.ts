import {
  createEmptyResume,
  createId,
  getEquivalentTemplateForLanguage,
  type ResumeDocument,
  type ResumeLanguage,
} from "@/lib/resume";

export type ResumeTranslationDraft = {
  title: string;
  targetRole: string;
  jobTarget: string;
  basics: {
    name: string;
    englishName: string;
    city: string;
    targetRole: string;
  };
  education: Array<{
    school: string;
    degree: string;
    major: string;
    startDate: string;
    endDate: string;
    gpa: string;
    courses: string;
    honors: string;
  }>;
  work: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate: string;
    current: boolean;
    bullets: string[];
  }>;
  projects: Array<{
    name: string;
    role: string;
    startDate: string;
    endDate: string;
    bullets: string[];
    keywords: string;
  }>;
  skills: Array<{ category: string; skills: string[] }>;
  campus: Array<{ title: string; bullets: string[] }>;
  awards: Array<{ title: string; bullets: string[] }>;
  certifications: Array<{ title: string; bullets: string[] }>;
  languages: Array<{ title: string; bullets: string[] }>;
  customSections: Array<{ title: string; bullets: string[] }>;
};

export type ResumeTranslationResult = {
  summary: string;
  translated: ResumeTranslationDraft;
  warnings: string[];
};

export function createResumeTranslationSource(resume: ResumeDocument): ResumeTranslationDraft {
  return {
    title: resume.title,
    targetRole: resume.targetRole,
    jobTarget: resume.jobTarget,
    basics: {
      name: resume.content.basics.name,
      englishName: resume.content.basics.englishName,
      city: resume.content.basics.city,
      targetRole: resume.content.basics.targetRole,
    },
    education: resume.content.education.map(withoutId),
    work: resume.content.work.map(withoutId),
    projects: resume.content.projects.map(withoutId),
    skills: resume.content.skills.map(withoutId),
    campus: resume.content.campus.map(withoutId),
    awards: resume.content.awards.map(withoutId),
    certifications: resume.content.certifications.map(withoutId),
    languages: resume.content.languages.map(withoutId),
    customSections: resume.content.customSections.map(withoutId),
  };
}

export async function requestResumeTranslation(
  resume: ResumeDocument,
  targetLanguage: ResumeLanguage,
  externalSignal?: AbortSignal,
) {
  const controller = new AbortController();
  const cancelFromOutside = () => controller.abort("cancelled");
  externalSignal?.addEventListener("abort", cancelFromOutside, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), 38_000);
  try {
    const response = await fetch("/api/resume/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: targetLanguage === "en-US" ? "zh-CN" : "en-US",
        targetLanguage,
        resume: createResumeTranslationSource(resume),
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null) as ResumeTranslationResult | { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload && "error" in payload && payload.error ? payload.error : "AI 翻译失败，请稍后重试");
    }
    if (!isResumeTranslationResult(payload)) {
      throw new Error("AI 返回的译文结构异常，原简历未改变，请重试");
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted) {
      if (externalSignal?.aborted) throw new Error("已取消 AI 翻译，原简历未改变");
      throw new Error("AI 翻译请求超时，原简历未改变，请重试");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", cancelFromOutside);
  }
}

export function createResumeFromTranslation(
  source: ResumeDocument,
  translated: ResumeTranslationDraft,
  targetLanguage: ResumeLanguage,
): ResumeDocument {
  const base = createEmptyResume(targetLanguage);
  const now = new Date().toISOString();
  const fallbackTitle = targetLanguage === "en-US"
    ? `${source.title} · English`
    : `${source.title} · 中文`;
  return {
    ...base,
    title: translated.title.trim() || fallbackTitle,
    targetRole: translated.targetRole.trim(),
    jobTarget: translated.jobTarget.trim(),
    linkedJobId: null,
    templateId: getEquivalentTemplateForLanguage(source.templateId, targetLanguage),
    createdAt: now,
    updatedAt: now,
    content: {
      basics: {
        ...base.content.basics,
        ...translated.basics,
        phone: source.content.basics.phone,
        email: source.content.basics.email,
        linkedin: source.content.basics.linkedin,
        github: source.content.basics.github,
        website: source.content.basics.website,
        photoDataUrl: source.content.basics.photoDataUrl,
      },
      education: translated.education.map((item) => ({ ...item, id: createId("edu") })),
      work: translated.work.map((item) => ({ ...item, id: createId("work") })),
      projects: translated.projects.map((item) => ({ ...item, id: createId("project") })),
      skills: translated.skills.map((item) => ({ ...item, id: createId("skill") })),
      campus: translated.campus.map((item) => ({ ...item, id: createId("campus") })),
      awards: translated.awards.map((item) => ({ ...item, id: createId("award") })),
      certifications: translated.certifications.map((item) => ({ ...item, id: createId("certification") })),
      languages: translated.languages.map((item) => ({ ...item, id: createId("language") })),
      customSections: translated.customSections.map((item) => ({ ...item, id: createId("section") })),
    },
  };
}

function isResumeTranslationResult(value: unknown): value is ResumeTranslationResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<ResumeTranslationResult>;
  return typeof result.summary === "string"
    && Boolean(result.translated)
    && typeof result.translated?.title === "string"
    && Array.isArray(result.translated?.education)
    && Array.isArray(result.translated?.work)
    && Array.isArray(result.translated?.projects)
    && Array.isArray(result.translated?.skills)
    && Array.isArray(result.warnings)
    && result.warnings.every((warning) => typeof warning === "string");
}

function withoutId<T extends { id: string }>(value: T): Omit<T, "id"> {
  const { id, ...item } = value;
  void id;
  return item;
}
