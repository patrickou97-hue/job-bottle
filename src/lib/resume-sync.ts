import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createEmptyResume,
  type ResumeContent,
  type ResumeDocument,
  type ResumeTemplateId,
} from "@/lib/resume";
import type { Database, ResumeRow } from "@/lib/types";

type ResumeClient = SupabaseClient<Database>;
const TEMPLATE_META_KEY = "__job_bottle_template_id";

function normalizeContent(value: unknown): ResumeContent {
  const fallback = createEmptyResume().content;
  if (!value || typeof value !== "object") return fallback;
  const content = value as Partial<ResumeContent>;

  return {
    basics: { ...fallback.basics, ...(content.basics ?? {}) },
    education: Array.isArray(content.education) ? content.education : [],
    work: Array.isArray(content.work) ? content.work : [],
    projects: Array.isArray(content.projects) ? content.projects : [],
    skills: Array.isArray(content.skills) ? content.skills : [],
    campus: Array.isArray(content.campus) ? content.campus : [],
    awards: Array.isArray(content.awards) ? content.awards : [],
    certifications: Array.isArray(content.certifications) ? content.certifications : [],
    languages: Array.isArray(content.languages) ? content.languages : [],
    customSections: Array.isArray(content.customSections) ? content.customSections : [],
  };
}

function normalizeTemplateId(value: unknown): ResumeTemplateId {
  if (value === "minimal") return "modern";
  if (value === "executive") return "classic";
  return value === "compact" || value === "classic" || value === "modern" || value === "english_classic" || value === "english_modern"
    ? value
    : "compact";
}

function getStoredTemplateId(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const templateId = (value as Record<string, unknown>)[TEMPLATE_META_KEY];
  return typeof templateId === "string" ? templateId : null;
}

function contentForStorage(content: ResumeContent, templateId: ResumeTemplateId) {
  return {
    ...content,
    [TEMPLATE_META_KEY]: templateId,
  };
}

export function isMissingResumeTableError(error: unknown) {
  const code = typeof error === "object" && error ? String("code" in error ? error.code : "") : "";
  const message =
    typeof error === "object" && error ? String("message" in error ? error.message : "") : "";

  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("Could not find the table") ||
    message.includes("schema cache") ||
    message.includes("relation") && message.includes("resumes")
  );
}

export function isResumeTemplateConstraintError(error: unknown) {
  const code = typeof error === "object" && error ? String("code" in error ? error.code : "") : "";
  const message =
    typeof error === "object" && error ? String("message" in error ? error.message : "") : "";

  return code === "23514" && (message.includes("resumes_template_id_check") || message.includes("template_id"));
}

export function resumeRowToDocument(row: ResumeRow): ResumeDocument {
  return {
    id: row.id,
    title: row.title,
    targetRole: row.target_role ?? "",
    jobTarget: row.job_target ?? "",
    linkedJobId: row.linked_job_id,
    templateId: normalizeTemplateId(getStoredTemplateId(row.content_json) ?? row.template_id),
    content: normalizeContent(row.content_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function fetchMyResumes(supabase: ResumeClient) {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(resumeRowToDocument);
}

export async function upsertMyResume(
  supabase: ResumeClient,
  userId: string,
  resume: ResumeDocument,
) {
  const now = new Date().toISOString();
  const payload: Database["public"]["Tables"]["resumes"]["Insert"] = {
    id: resume.id,
    user_id: userId,
    title: resume.title || "未命名简历",
    target_role: resume.targetRole || null,
    job_target: resume.jobTarget || null,
    linked_job_id: resume.linkedJobId,
    template_id: resume.templateId,
    content_json: contentForStorage(resume.content, resume.templateId),
    created_at: resume.createdAt,
    updated_at: resume.updatedAt || now,
  };

  let { data, error } = await supabase
    .from("resumes")
    .upsert(payload, { onConflict: "id" })
    .select("*")
    .single();

  // Older hosted projects may still have the three-template check constraint.
  // Keep the selected template inside content_json and retry with the stable
  // compact value so switching layouts never prevents a cloud save.
  if (error && isResumeTemplateConstraintError(error) && (resume.templateId === "english_classic" || resume.templateId === "english_modern")) {
    ({ data, error } = await supabase
      .from("resumes")
      .upsert({ ...payload, template_id: "compact" }, { onConflict: "id" })
      .select("*")
      .single());
  }

  if (error) throw error;
  if (!data) throw new Error("简历云端保存未返回结果，请稍后重试。");
  return resumeRowToDocument(data);
}

export async function deleteMyResume(supabase: ResumeClient, id: string) {
  const { error } = await supabase.from("resumes").delete().eq("id", id);
  if (error) throw error;
}
