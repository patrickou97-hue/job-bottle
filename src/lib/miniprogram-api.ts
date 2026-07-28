import "server-only";

import {
  createEmptyResume,
  normalizeResumeSectionOrder,
  type ResumeContent,
} from "@/lib/resume";
import type { Job, Profile, ResumeRow, UserApplication } from "@/lib/types";

export function toMiniProgramJob(job: Job) {
  return {
    id: job.id,
    companyName: job.company_name,
    jobTitles: job.job_titles ?? "",
    jobCategories: job.job_categories ?? [],
    industry: job.industry ?? "",
    batchType: job.batch_type ?? "",
    locations: job.locations ?? "",
    applyUrl: job.apply_url,
    notes: job.notes ?? "",
    responsibilities: job.responsibilities ?? "",
    mustHave: job.must_have ?? "",
    preferredQualifications: job.preferred_qualifications ?? "",
    tags: job.tags ?? [],
    opensAt: job.opens_at ?? job.start_date,
    closesAt: job.closes_at ?? null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    isRecent:
      Date.now() - new Date(job.created_at).getTime() <= 7 * 24 * 60 * 60 * 1000,
  };
}

export function toMiniProgramApplication(
  application: UserApplication,
  job: Job,
) {
  return {
    id: application.id,
    jobId: application.job_id,
    status: application.status,
    candidateStage: application.candidate_stage ?? "saved",
    priority: application.priority ?? 0,
    note: application.note ?? application.progress_note ?? "",
    nextAction: application.next_action ?? "",
    nextActionAt: application.next_action_at ?? null,
    resumeId: application.resume_id ?? null,
    applicationChannel: application.application_channel ?? "",
    applicationAccount: application.application_account ?? "",
    contactName: application.contact_name ?? "",
    customStageLabel: application.custom_stage_label ?? "",
    reviewNote: application.review_note ?? "",
    updatedAt: application.updated_at,
    job: toMiniProgramJob(job),
  };
}

export function toMiniProgramResume(resume: ResumeRow) {
  return {
    id: resume.id,
    title: resume.title,
    targetRole: resume.target_role ?? resume.job_target ?? "",
    templateId: resume.template_id,
    updatedAt: resume.updated_at,
  };
}

export function toMiniProgramResumeDetail(resume: ResumeRow) {
  return {
    ...toMiniProgramResume(resume),
    jobTarget: resume.job_target ?? "",
    linkedJobId: resume.linked_job_id,
    content: normalizeResumeContent(resume.content_json),
    createdAt: resume.created_at,
  };
}

function normalizeResumeContent(value: unknown): ResumeContent {
  const fallback = createEmptyResume().content;
  if (!value || typeof value !== "object") return fallback;
  const content = value as Partial<ResumeContent>;
  return {
    basics: { ...fallback.basics, ...(content.basics ?? {}) },
    sectionOrder: normalizeResumeSectionOrder(content.sectionOrder),
    education: Array.isArray(content.education) ? content.education : [],
    work: Array.isArray(content.work) ? content.work : [],
    projects: Array.isArray(content.projects) ? content.projects : [],
    skills: Array.isArray(content.skills) ? content.skills : [],
    campus: Array.isArray(content.campus) ? content.campus : [],
    awards: Array.isArray(content.awards) ? content.awards : [],
    certifications: Array.isArray(content.certifications)
      ? content.certifications
      : [],
    languages: Array.isArray(content.languages) ? content.languages : [],
    customSections: Array.isArray(content.customSections)
      ? content.customSections
      : [],
  };
}

export function toMiniProgramProfile(profile: Profile) {
  return {
    id: profile.id,
    displayName: profile.display_name ?? "微信用户",
    phone: profile.phone ?? "",
    city: profile.city ?? "",
    school: profile.school ?? "",
    major: profile.major ?? "",
    graduationYear: profile.graduation_year ?? "",
    preferredRegions: profile.preferred_regions ?? [],
    targetRoles: profile.target_roles ?? [],
  };
}
