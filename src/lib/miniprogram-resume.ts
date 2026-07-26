import "server-only";

import { z } from "zod";
import type {
  ResumeContent,
  ResumeDocument,
  ResumeTemplateId,
} from "@/lib/resume";

const text = (max: number) => z.string().trim().max(max);
const itemId = z.string().trim().min(1).max(100);
const bullets = z.array(text(2_000)).max(30);

const basicsSchema = z.object({
  name: text(80),
  englishName: text(120),
  photoDataUrl: z.string().max(2_500_000),
  phone: text(40),
  email: text(160),
  city: text(80),
  linkedin: text(240),
  github: text(240),
  website: text(240),
  targetRole: text(120),
});

const educationSchema = z.object({
  id: itemId,
  school: text(160),
  degree: text(80),
  major: text(160),
  startDate: text(40),
  endDate: text(40),
  gpa: text(80),
  courses: text(1_000),
  honors: text(1_000),
});

const experienceSchema = z.object({
  id: itemId,
  company: text(160),
  title: text(160),
  location: text(100),
  startDate: text(40),
  endDate: text(40),
  current: z.boolean(),
  bullets,
});

const projectSchema = z.object({
  id: itemId,
  name: text(200),
  role: text(160),
  startDate: text(40),
  endDate: text(40),
  bullets,
  keywords: text(1_000),
});

const skillSchema = z.object({
  id: itemId,
  category: text(120),
  skills: z.array(text(200)).max(80),
});

const textSectionSchema = z.object({
  id: itemId,
  title: text(160),
  bullets,
});

const contentSchema = z.object({
  basics: basicsSchema,
  education: z.array(educationSchema).max(30),
  work: z.array(experienceSchema).max(30),
  projects: z.array(projectSchema).max(30),
  skills: z.array(skillSchema).max(30),
  campus: z.array(textSectionSchema).max(30),
  awards: z.array(textSectionSchema).max(30),
  certifications: z.array(textSectionSchema).max(30),
  languages: z.array(textSectionSchema).max(30),
  customSections: z.array(textSectionSchema).max(30),
});

const templateSchema = z.enum([
  "compact",
  "classic",
  "modern",
  "consulting",
  "technical",
  "academic",
  "english_classic",
  "english_modern",
]);

const updateSchema = z.object({
  title: text(80),
  targetRole: text(120),
  jobTarget: text(240),
  linkedJobId: z.uuid().nullable(),
  templateId: templateSchema,
  content: contentSchema,
  baseUpdatedAt: z.iso.datetime(),
  force: z.boolean().optional().default(false),
});

export type MiniProgramResumeUpdate = z.infer<typeof updateSchema>;

export function parseMiniProgramResumeUpdate(value: unknown) {
  return updateSchema.safeParse(value);
}

export function resumeContentForStorage(
  content: ResumeContent,
  templateId: ResumeTemplateId,
) {
  return {
    ...content,
    __job_bottle_template_id: templateId,
  };
}

export function duplicateResumeTitle(title: string) {
  const clean = title.trim() || "未命名简历";
  return `${clean} 副本`.slice(0, 80);
}

export function toResumeDocument(
  resume: {
    id: string;
    title: string;
    target_role: string | null;
    job_target: string | null;
    linked_job_id: string | null;
    template_id: string;
    content_json: unknown;
    created_at: string;
    updated_at: string;
  },
  content: ResumeContent,
  templateId: ResumeTemplateId,
): ResumeDocument {
  return {
    id: resume.id,
    title: resume.title,
    targetRole: resume.target_role ?? "",
    jobTarget: resume.job_target ?? "",
    linkedJobId: resume.linked_job_id,
    templateId,
    content,
    createdAt: resume.created_at,
    updatedAt: resume.updated_at,
  };
}
