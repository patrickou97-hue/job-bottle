import {
  createEmptyResume,
  createId,
  getEquivalentTemplateForLanguage,
  type ResumeDocument,
  type ResumeLanguage,
} from "@/lib/resume";

const TRANSLATION_TIMEOUT_MS = 165_000;

export type ResumeTranslationDraft = {
  title: string;
  targetRole: string;
  jobTarget: string;
  basics: {
    name: string;
    englishName: string;
    gender: string;
    nationality: string;
    preferredLocations: string;
    city: string;
    targetRole: string;
  };
  education: Array<{
    school: string;
    college?: string;
    degreeLevel?: "" | "本科" | "硕士" | string;
    degree: string;
    major: string;
    startDate: string;
    endDate: string;
    gpa: string;
    courses: string;
    honors: string;
  }>;
  work: Array<{
    experienceType: "internship" | "employment" | "other";
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
    url: string;
    startDate: string;
    endDate: string;
    bullets: string[];
    keywords: string;
  }>;
  skills: Array<{ category: string; skills: string[] }>;
  campus: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
  awards: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
  certifications: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
  languages: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
  customSections: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
};

export type ResumeTranslationResult = {
  summary: string;
  translated: ResumeTranslationDraft;
  warnings: string[];
};

export type ResumeTranslationProgress = {
  completed: number;
  total: number;
  label: string;
};

export function createResumeTranslationSource(resume: ResumeDocument): ResumeTranslationDraft {
  return {
    title: resume.title,
    targetRole: resume.targetRole,
    jobTarget: resume.jobTarget,
    basics: {
      name: resume.content.basics.name,
      englishName: resume.content.basics.englishName,
      gender: resume.content.basics.gender,
      nationality: resume.content.basics.nationality,
      preferredLocations: resume.content.basics.preferredLocations,
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
  onProgress?: (progress: ResumeTranslationProgress) => void,
) {
  const controller = new AbortController();
  const cancelFromOutside = () => controller.abort("cancelled");
  externalSignal?.addEventListener("abort", cancelFromOutside, { once: true });
  const timeout = window.setTimeout(() => controller.abort(), TRANSLATION_TIMEOUT_MS);
  try {
    const response = await fetch("/api/resume/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: targetLanguage === "en-US" ? "zh-CN" : "en-US",
        targetLanguage,
        resume: createResumeTranslationSource(resume),
        progressMode: onProgress ? "ndjson" : undefined,
      }),
      signal: controller.signal,
    });
    if (response.ok && response.headers.get("content-type")?.includes("application/x-ndjson")) {
      return await readTranslationProgressStream(response, onProgress);
    }
    const payload = await response.json().catch(() => null) as ResumeTranslationResult | { error?: string } | null;
    if (!response.ok) {
      throw new Error(payload && "error" in payload && payload.error ? payload.error : "翻译暂时不可用，原简历未改动。");
    }
    if (!isResumeTranslationResult(payload)) {
      throw new Error("译文结构异常，原简历未改动，请重试。");
    }
    return payload;
  } catch (error) {
    if (controller.signal.aborted) {
      if (externalSignal?.aborted) throw new Error("已取消翻译，原简历未改动。");
      throw new Error("翻译请求超时，原简历未改动，请重试。");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    externalSignal?.removeEventListener("abort", cancelFromOutside);
  }
}

async function readTranslationProgressStream(
  response: Response,
  onProgress?: (progress: ResumeTranslationProgress) => void,
) {
  if (!response.body) throw new Error("翻译进度连接未建立，原简历未改动，请重试。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ResumeTranslationResult | null = null;

  const consumeLine = (line: string) => {
    if (!line.trim()) return;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error("翻译进度格式异常，原简历未改动，请重试。");
    }
    if (!event || typeof event !== "object" || !("type" in event)) return;
    const payload = event as Record<string, unknown>;
    if (payload.type === "start" || payload.type === "progress") {
      if (
        typeof payload.completed === "number"
        && typeof payload.total === "number"
        && typeof payload.label === "string"
      ) {
        onProgress?.({
          completed: payload.completed,
          total: payload.total,
          label: payload.label,
        });
      }
      return;
    }
    if (payload.type === "error" && typeof payload.error === "string") {
      throw new Error(payload.error);
    }
    if (payload.type === "result" && isResumeTranslationResult(payload.result)) {
      result = payload.result;
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(consumeLine);
    if (done) break;
  }
  consumeLine(buffer);
  if (!result) throw new Error("译文生成未完成，原简历未改动，请重试。");
  return result;
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
  const translatedBasics = targetLanguage === "en-US" && translated.basics.englishName.trim()
    ? {
        ...translated.basics,
        name: translated.basics.englishName.trim(),
        englishName: translated.basics.englishName.trim(),
      }
    : translated.basics;
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
        ...translatedBasics,
        phone: source.content.basics.phone,
        email: source.content.basics.email,
        birthDate: source.content.basics.birthDate,
        linkedin: source.content.basics.linkedin,
        github: source.content.basics.github,
        website: source.content.basics.website,
        photoDataUrl: source.content.basics.photoDataUrl,
      },
      sectionOrder: [...source.content.sectionOrder],
      education: translated.education.map((item) => ({
        ...item,
        college: item.college ?? "",
        degreeLevel: normalizeDegreeLevel(item.degreeLevel),
        id: createId("edu"),
      })),
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

function normalizeDegreeLevel(value: string | undefined): "" | "本科" | "硕士" {
  if (!value) return "";
  if (/硕士|master/i.test(value)) return "硕士";
  if (/本科|bachelor/i.test(value)) return "本科";
  return "";
}
