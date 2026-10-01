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
  checkpoint?: ResumeTranslationCheckpoint;
};

export type ResumeTranslationCheckpoint = {
  chunkIndex: number;
  translations: Array<{ key: string; value: string }>;
  warnings: string[];
};

const TRANSLATION_CHECKPOINT_PREFIX = "starjob:resume-translation-checkpoint:v1:";

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

async function getTranslationCheckpointStorageKey(resume: ResumeDocument, targetLanguage: ResumeLanguage) {
  if (typeof window === "undefined" || !globalThis.crypto?.subtle) return null;
  try {
    const payload = JSON.stringify({ targetLanguage, resume: createResumeTranslationSource(resume) });
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return `${TRANSLATION_CHECKPOINT_PREFIX}${hash}`;
  } catch {
    return null;
  }
}

function readTranslationCheckpoints(storageKey: string | null) {
  if (!storageKey) return [] as ResumeTranslationCheckpoint[];
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return [] as ResumeTranslationCheckpoint[];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 100) return [] as ResumeTranslationCheckpoint[];
    return parsed.filter(isResumeTranslationCheckpoint);
  } catch {
    return [] as ResumeTranslationCheckpoint[];
  }
}

function writeTranslationCheckpoints(storageKey: string | null, checkpoints: ResumeTranslationCheckpoint[]) {
  if (!storageKey) return false;
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(checkpoints));
    return true;
  } catch {
    return false;
  }
}

function clearTranslationCheckpoints(storageKey: string | null) {
  if (!storageKey) return;
  try {
    window.sessionStorage.removeItem(storageKey);
  } catch {
    // Session storage may be unavailable in restricted browser contexts.
  }
}

function isResumeTranslationCheckpoint(value: unknown): value is ResumeTranslationCheckpoint {
  if (!value || typeof value !== "object") return false;
  const checkpoint = value as Partial<ResumeTranslationCheckpoint>;
  return Number.isInteger(checkpoint.chunkIndex)
    && typeof checkpoint.chunkIndex === "number"
    && checkpoint.chunkIndex >= 0
    && checkpoint.chunkIndex < 100
    && Array.isArray(checkpoint.translations)
    && checkpoint.translations.length > 0
    && checkpoint.translations.length <= 24
    && checkpoint.translations.every((item) => item
      && typeof item.key === "string"
      && /^t\d+$/u.test(item.key)
      && typeof item.value === "string"
      && item.value.length <= 4_000)
    && Array.isArray(checkpoint.warnings)
    && checkpoint.warnings.length <= 10
    && checkpoint.warnings.every((warning) => typeof warning === "string" && warning.length <= 500);
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
  let checkpointStorageKey: string | null = null;
  let persistedCheckpointCount = 0;
  try {
    checkpointStorageKey = await getTranslationCheckpointStorageKey(resume, targetLanguage);
    const checkpointByIndex = new Map<number, ResumeTranslationCheckpoint>();
    readTranslationCheckpoints(checkpointStorageKey).forEach((checkpoint) => {
      checkpointByIndex.set(checkpoint.chunkIndex, checkpoint);
    });
    persistedCheckpointCount = checkpointByIndex.size;
    const notifyProgress = (progress: ResumeTranslationProgress) => {
      if (progress.checkpoint) {
        checkpointByIndex.set(progress.checkpoint.chunkIndex, progress.checkpoint);
        if (writeTranslationCheckpoints(checkpointStorageKey, Array.from(checkpointByIndex.values()))) {
          persistedCheckpointCount = checkpointByIndex.size;
        }
      }
      onProgress?.(progress);
    };
    const response = await fetch("/api/resume/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceLanguage: targetLanguage === "en-US" ? "zh-CN" : "en-US",
        targetLanguage,
        resume: createResumeTranslationSource(resume),
        progressMode: onProgress ? "ndjson" : undefined,
        completedChunks: Array.from(checkpointByIndex.values()),
      }),
      signal: controller.signal,
    });
    if (response.ok && response.headers.get("content-type")?.includes("application/x-ndjson")) {
      const result = await readTranslationProgressStream(response, notifyProgress);
      clearTranslationCheckpoints(checkpointStorageKey);
      return result;
    }
    const payload = await response.json().catch(() => null) as ResumeTranslationResult | { error?: string } | null;
    if (!response.ok) {
      const message = payload && "error" in payload && payload.error
        ? payload.error
        : "翻译暂时不可用，原简历未改动。";
      if (response.status === 400 && message.includes("翻译进度")) {
        clearTranslationCheckpoints(checkpointStorageKey);
        persistedCheckpointCount = 0;
      }
      throw new Error(message);
    }
    if (!isResumeTranslationResult(payload)) {
      throw new Error("译文结构异常，原简历未改动，请重试。");
    }
    clearTranslationCheckpoints(checkpointStorageKey);
    return payload;
  } catch (error) {
    const message = error instanceof Error ? error.message : "翻译暂时不可用，原简历未改动。";
    let failureMessage = message;
    if (controller.signal.aborted) {
      failureMessage = externalSignal?.aborted
        ? "已取消翻译，原简历未改动。"
        : "翻译请求超时，原简历未改动，请重试。";
    }
    if (persistedCheckpointCount > 0) {
      failureMessage += ` 已在当前标签页保存 ${persistedCheckpointCount} 个完成区块，再次点击可继续。`;
    }
    throw new Error(failureMessage);
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
        const checkpoint = isResumeTranslationCheckpoint(payload.checkpoint) ? payload.checkpoint : undefined;
        onProgress?.({
          completed: payload.completed,
          total: payload.total,
          label: payload.label,
          ...(checkpoint ? { checkpoint } : {}),
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
