import type { ResumeDocument } from "@/lib/resume";

export type ResumeMatchResult = {
  keywords: string[];
  present: string[];
  missing: string[];
  checks: { label: string; passed: boolean; detail: string }[];
};

export function analyzeResumeForJob(resume: ResumeDocument, job: { keywords?: string[] | null; must_have?: string | null } | null): ResumeMatchResult {
  const sourceTerms = [
    ...(job?.keywords ?? []),
    ...(job?.must_have ?? "").split(/[\n\r，,、；;：:\s]+/),
  ];
  const keywords = [...new Set(sourceTerms
    .map((term) => term.trim().replace(/^[\-*•·]+/, ""))
    .filter((term) => term.length >= 2 && term.length <= 24 && !/^(具有|具备|熟悉|了解|优先|能力|经验|负责|工作|岗位|相关)$/.test(term)))].slice(0, 24);
  const searchableText = collectResumeText(resume).normalize("NFKC").toLocaleLowerCase();
  const present = keywords.filter((term) => containsKeyword(searchableText, term.normalize("NFKC").toLocaleLowerCase()));
  const missing = keywords.filter((term) => !present.includes(term));
  const basics = resume.content.basics;
  const hasContact = Boolean(basics.name.trim() && basics.email.trim() && basics.phone.trim());
  const hasEducation = resume.content.education.some((item) => Boolean(item.school.trim() && (item.degree.trim() || item.major.trim())));
  const hasWorkExperience = resume.content.work.some((item) =>
    hasAnyText([item.company, item.title]) && item.bullets.some(hasText),
  );
  const hasProjectExperience = resume.content.projects.some((item) =>
    hasAnyText([item.name, item.role]) && item.bullets.some(hasText),
  );
  const hasExperience = hasWorkExperience || hasProjectExperience;
  const checks = [
    { label: "联系方式", passed: hasContact, detail: hasContact ? "姓名、邮箱和电话已填写" : "补齐姓名、邮箱和电话" },
    { label: "教育经历", passed: hasEducation, detail: hasEducation ? "至少一条教育经历有学校和专业/学历" : "补齐学校，并填写专业或学历" },
    { label: "经历内容", passed: hasExperience, detail: hasExperience ? "至少一段经历包含名称与实际描述" : "补充公司或项目名称，并填写至少一条经历描述" },
    { label: "岗位依据", passed: keywords.length > 0, detail: keywords.length > 0 ? `按岗位要求字段核对了 ${keywords.length} 个词` : "岗位库暂时没有结构化任职要求，无法做关键词对照" },
  ];
  return { keywords, present, missing, checks };
}

function containsKeyword(searchableText: string, keyword: string) {
  if (/\p{Script=Han}/u.test(keyword)) return searchableText.includes(keyword);
  const escapedKeyword = keyword
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^a-z0-9])${escapedKeyword}(?=$|[^a-z0-9])`, "i").test(searchableText);
}

function hasAnyText(values: Array<string | undefined>) {
  return values.some(hasText);
}

function hasText(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function collectResumeText(resume: ResumeDocument) {
  const content = resume.content;
  return [
    content.basics.targetRole,
    ...content.education.flatMap((item) => [item.school, item.college, item.degree, item.major, item.courses]),
    ...content.work.flatMap((item) => [item.company, item.title, ...item.bullets]),
    ...content.projects.flatMap((item) => [item.name, item.role, item.keywords, ...item.bullets]),
    ...content.skills.flatMap((item) => [item.category, ...item.skills]),
    ...content.campus.flatMap((item) => [item.title, item.role, ...item.bullets]),
    ...content.awards.flatMap((item) => [item.title, item.role, ...item.bullets]),
    ...content.certifications.flatMap((item) => [item.title, item.role, ...item.bullets]),
    ...content.customSections.flatMap((item) => [item.title, item.role, ...item.bullets]),
  ].filter((value): value is string => typeof value === "string").join("\n");
}
