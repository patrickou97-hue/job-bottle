import {
  createEmptyResume,
  createId,
  getDefaultResumeTemplate,
  getResumeLanguage,
  type ResumeDocument,
  type ResumeLanguage,
  type ResumeTemplateId,
} from "@/lib/resume";
import { cleanResumeBullet, normalizeResumeImportText } from "@/lib/resume-import-text";

export type ImportedResumeBasics = {
  name: string;
  englishName: string;
  birthDate: string;
  gender: string;
  nationality: string;
  preferredLocations: string;
  phone: string;
  email: string;
  city: string;
  linkedin: string;
  github: string;
  website: string;
  targetRole: string;
};

export type ImportedResumeDraft = {
  language: ResumeLanguage;
  title: string;
  targetRole: string;
  basics: ImportedResumeBasics;
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
  campus: Array<{ title: string; bullets: string[] }>;
  awards: Array<{ title: string; bullets: string[] }>;
  certifications: Array<{ title: string; bullets: string[] }>;
  languages: Array<{ title: string; bullets: string[] }>;
  customSections: Array<{ title: string; role?: string; date?: string; bullets: string[] }>;
};

export type ResumeImportLocalResult = {
  draft: ImportedResumeDraft;
  normalizedText: string;
  signals: string[];
  warnings: string[];
};

const SECTION_ALIASES = [
  ["education", /^(教育背景|教育经历|教育|education|academic background)$/i],
  ["work", /^(工作经历|实习经历|工作经验|实习经验|professional experience|work experience|experience|internship experience)$/i],
  ["projects", /^(项目经历|项目经验|代表项目|projects?|project experience)$/i],
  ["skills", /^(专业技能|技能特长|技能|skills?|technical skills)$/i],
  ["campus", /^(校园经历|学生工作|社会实践|课外活动|campus experience|activities|leadership)$/i],
  ["awards", /^(荣誉奖项|奖项荣誉|获奖经历|荣誉|awards?|honors?)$/i],
  ["certifications", /^(证书|资格证书|职业资格|certifications?|certificates?)$/i],
  ["languages", /^(语言能力|语言技能|外语水平|languages?)$/i],
] as const;

type KnownSection = typeof SECTION_ALIASES[number][0];

export function parseResumeTextLocally(sourceText: string, fileName = "导入简历"): ResumeImportLocalResult {
  const normalizedText = normalizeExtractedText(sourceText);
  const language = detectResumeLanguage(normalizedText);
  const lines = normalizedText.split("\n").map((line) => line.trim()).filter(Boolean);
  const sections = splitSections(lines);
  const email = normalizedText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = normalizedText.match(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d){8}(?!\d)/)?.[0]?.replace(/\s+/g, " ") ?? "";
  const urls = Array.from(normalizedText.matchAll(/(?:https?:\/\/|www\.)[^\s，。；;]+/gi), (match) => trimUrl(match[0]));
  const linkedin = urls.find((url) => /linkedin\.com/i.test(url)) ?? "";
  const github = urls.find((url) => /github\.com/i.test(url)) ?? "";
  const website = urls.find((url) => url !== linkedin && url !== github) ?? "";
  const headerLines = sections.header.slice(0, 10);
  const name = findLikelyName(headerLines);
  const targetRole = findTargetRole(headerLines);
  const birthDate = findExplicitBirthDate(normalizedText);

  const draft = createEmptyImportedDraft(stripFileExtension(fileName));
  draft.language = language;
  draft.targetRole = targetRole;
  draft.basics = {
    ...draft.basics,
    name,
    birthDate,
    phone,
    email,
    linkedin,
    github,
    website,
    targetRole,
  };
  draft.education = parseEducationSection(sections.education);
  draft.work = parseExperienceSection(sections.work);
  draft.projects = parseProjectSection(sections.projects);
  draft.skills = parseSkillsSection(sections.skills);
  draft.campus = parseLooseSection("校园经历", sections.campus);
  draft.awards = parseLooseSection("获奖经历", sections.awards);
  draft.certifications = parseLooseSection("证书", sections.certifications);
  draft.languages = parseLooseSection("语言能力", sections.languages);

  const signals = [
    language === "en-US" ? "英文简历" : "中文简历",
    name && "姓名",
    birthDate && "出生日期",
    email && "邮箱",
    phone && "手机号",
    draft.education.length && "教育经历",
    draft.work.length && "工作经历",
    draft.projects.length && "项目经历",
    draft.skills.length && "技能",
  ].filter(Boolean).map(String);
  const warnings: string[] = [];
  if (normalizedText.length < 120) warnings.push("读取到的文字过少，文件可能是扫描件。请改用文字可复制的 PDF、DOCX 或 TXT。");
  if (!name) warnings.push("本地识别未能确认姓名，AI 将结合原文复核。生成后请重点检查基本信息。");
  if (!email && !phone) warnings.push("本地识别未发现邮箱或手机号，请确认原文件中的联系方式可以复制。");

  return { draft, normalizedText, signals, warnings };
}

export function createResumeFromImport(
  draft: ImportedResumeDraft,
  templateId: ResumeTemplateId = getDefaultResumeTemplate(draft.language),
): ResumeDocument {
  const safeTemplateId = getResumeLanguage(templateId) === draft.language
    ? templateId
    : getDefaultResumeTemplate(draft.language);
  const base = createEmptyResume(draft.language);
  const now = new Date().toISOString();
  const cleanTitle = draft.title.trim() || `${draft.basics.name || "导入"}的简历`;
  return {
    ...base,
    title: cleanTitle,
    targetRole: draft.targetRole.trim(),
    templateId: safeTemplateId,
    createdAt: now,
    updatedAt: now,
    content: {
      basics: {
        ...base.content.basics,
        ...cleanBasics(draft.basics),
        targetRole: draft.basics.targetRole.trim() || draft.targetRole.trim(),
      },
      sectionOrder: [...base.content.sectionOrder],
      education: draft.education.map((item) => ({ ...item, id: createId("edu") })),
      work: draft.work.map((item) => ({ ...item, id: createId("work"), bullets: cleanList(item.bullets) })),
      projects: draft.projects.map((item) => ({ ...item, id: createId("project"), bullets: cleanList(item.bullets) })),
      skills: draft.skills.map((item) => ({ ...item, id: createId("skill"), skills: cleanList(item.skills) })),
      campus: draft.campus.map((item) => ({ ...item, id: createId("campus"), bullets: cleanList(item.bullets) })),
      awards: draft.awards.map((item) => ({ ...item, id: createId("award"), bullets: cleanList(item.bullets) })),
      certifications: draft.certifications.map((item) => ({ ...item, id: createId("certification"), bullets: cleanList(item.bullets) })),
      languages: draft.languages.map((item) => ({ ...item, id: createId("language"), bullets: cleanList(item.bullets) })),
      customSections: draft.customSections.map((item) => ({ ...item, id: createId("section"), bullets: cleanList(item.bullets) })),
    },
  };
}

export function createEmptyImportedDraft(title = "导入简历"): ImportedResumeDraft {
  return {
    language: "zh-CN",
    title,
    targetRole: "",
    basics: {
      name: "",
      englishName: "",
      birthDate: "",
      gender: "",
      nationality: "",
      preferredLocations: "",
      phone: "",
      email: "",
      city: "",
      linkedin: "",
      github: "",
      website: "",
      targetRole: "",
    },
    education: [],
    work: [],
    projects: [],
    skills: [],
    campus: [],
    awards: [],
    certifications: [],
    languages: [],
    customSections: [],
  };
}

export function detectResumeLanguage(sourceText: string): ResumeLanguage {
  const chineseCharacters = sourceText.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const latinLetters = sourceText.match(/[A-Za-z]/g)?.length ?? 0;
  if (chineseCharacters >= 12 && chineseCharacters * 2 >= latinLetters) return "zh-CN";
  return latinLetters > chineseCharacters ? "en-US" : "zh-CN";
}

function normalizeExtractedText(value: string) {
  return normalizeResumeImportText(value);
}

function findExplicitBirthDate(value: string) {
  const match = value.match(/(?:出生日期|出生年月|生日|date\s*of\s*birth|birth\s*date|dob)\s*[:：]?\s*((?:19|20)\d{2})[./年-]\s*([01]?\d)(?:[./月-]\s*([0-3]?\d)日?)?/i);
  if (!match) return "";
  const month = String(Math.max(1, Math.min(12, Number(match[2])))).padStart(2, "0");
  const day = String(Math.max(1, Math.min(31, Number(match[3] || 1)))).padStart(2, "0");
  return `${match[1]}-${month}-${day}`;
}

function splitSections(lines: string[]) {
  const sections: Record<"header" | KnownSection, string[]> = {
    header: [],
    education: [],
    work: [],
    projects: [],
    skills: [],
    campus: [],
    awards: [],
    certifications: [],
    languages: [],
  };
  let active: keyof typeof sections = "header";
  for (const line of lines) {
    const heading = line.replace(/[：:|｜]/g, " ").replace(/\s+/g, " ").trim();
    const match = SECTION_ALIASES.find(([, pattern]) => pattern.test(heading));
    if (match) {
      active = match[0];
      continue;
    }
    sections[active].push(line);
  }
  return sections;
}

function parseEducationSection(lines: string[]): ImportedResumeDraft["education"] {
  if (lines.length === 0) return [];
  const groups = groupEntries(lines);
  return groups.map((group) => {
    const text = group.join(" ");
    const [startDate, endDate] = extractDateRange(text);
    return {
      school: group.find((line) => /(大学|学院|学校|university|college|school)/i.test(line))?.replace(dateRangePattern(), "").trim() ?? group[0] ?? "",
      degree: firstMatch(text, /(博士|硕士|本科|学士|大专|高中|ph\.?d\.?|master|bachelor|b\.?s\.?|b\.?a\.?|m\.?s\.?|m\.?a\.?)/i),
      major: valueAfterLabel(text, /(?:专业|major)\s*[:：]?\s*/i),
      startDate,
      endDate,
      gpa: firstMatch(text, /(?:GPA\s*[:：]?\s*)?\d(?:\.\d{1,2})?\s*\/\s*(?:4(?:\.0)?|5(?:\.0)?|100)/i).replace(/^GPA\s*[:：]?\s*/i, ""),
      courses: valueAfterLabel(text, /(?:主修课程|核心课程|courses?)\s*[:：]?\s*/i),
      honors: valueAfterLabel(text, /(?:荣誉|奖学金|honors?)\s*[:：]?\s*/i),
    };
  }).filter((item) => item.school || item.major || item.degree);
}

function parseExperienceSection(lines: string[]): ImportedResumeDraft["work"] {
  return groupEntries(lines).map((group) => {
    const header = group[0] ?? "";
    const text = group.join(" ");
    const [startDate, endDate] = extractDateRange(text);
    const parts = header.replace(dateRangePattern(), "").split(/[|｜·•]/).map((part) => part.trim()).filter(Boolean);
    return {
      experienceType: inferExperienceType(text),
      company: parts[0] ?? "",
      title: parts[1] ?? "",
      location: parts[2] ?? "",
      startDate,
      endDate,
      current: /至今|现在|present|current/i.test(text),
      bullets: cleanList(group.slice(1).length > 0 ? group.slice(1) : [header]),
    };
  }).filter((item) => item.company || item.title || item.bullets.length > 0);
}

function parseProjectSection(lines: string[]): ImportedResumeDraft["projects"] {
  return groupEntries(lines).map((group) => {
    const header = group[0] ?? "";
    const text = group.join(" ");
    const [startDate, endDate] = extractDateRange(text);
    const parts = header.replace(dateRangePattern(), "").split(/[|｜·•]/).map((part) => part.trim()).filter(Boolean);
    return {
      name: parts[0] ?? "",
      role: parts[1] ?? "",
      url: Array.from(text.matchAll(/(?:https?:\/\/|www\.)[^\s，。；;]+/gi), (match) => trimUrl(match[0]))[0] ?? "",
      startDate,
      endDate,
      bullets: cleanList(group.slice(1).length > 0 ? group.slice(1) : [header]),
      keywords: valueAfterLabel(text, /(?:关键词|技术栈|keywords?|tech stack)\s*[:：]?\s*/i),
    };
  }).filter((item) => item.name || item.bullets.length > 0);
}

function parseSkillsSection(lines: string[]): ImportedResumeDraft["skills"] {
  return lines.map((line) => {
    const [category, rest] = line.split(/[:：]/, 2);
    const skills = cleanList((rest ?? category).split(/[、,，;；/|｜]/));
    return { category: rest ? category.trim() : "技能", skills };
  }).filter((item) => item.skills.length > 0);
}

function parseLooseSection(title: string, lines: string[]) {
  const bullets = cleanList(lines);
  return bullets.length > 0 ? [{ title, bullets }] : [];
}

function groupEntries(lines: string[]) {
  const groups: string[][] = [];
  for (const line of lines) {
    const startsEntry = dateRangePattern().test(line) && !/^[-•·▪◦]/.test(line);
    if (groups.length === 0 || startsEntry) groups.push([cleanBullet(line)]);
    else groups[groups.length - 1].push(cleanBullet(line));
  }
  return groups.filter((group) => group.some(Boolean));
}

function extractDateRange(text: string): [string, string] {
  const match = text.match(dateRangePattern());
  if (!match) return ["", ""];
  return [normalizeDate(match[1] ?? ""), normalizeDate(match[2] ?? "")];
}

function dateRangePattern() {
  return /((?:19|20)\d{2}(?:[./年-]\d{1,2}月?)?)\s*(?:-|–|—|至|到|~)\s*((?:(?:19|20)\d{2}(?:[./年-]\d{1,2}月?)?)|至今|现在|present|current)/i;
}

function normalizeDate(value: string) {
  if (/至今|现在|present|current/i.test(value)) return "至今";
  return value.replace(/年|\//g, ".").replace(/月/g, "").replace(/-/, ".");
}

function findLikelyName(lines: string[]) {
  return lines.find((line) => {
    const value = line.replace(/\s+/g, " ").trim();
    return (/^[\u3400-\u9fff·]{2,8}$/.test(value) || /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(value)) && !isSectionHeading(value);
  }) ?? "";
}

function findTargetRole(lines: string[]) {
  const labeled = lines.map((line) => line.match(/(?:求职意向|目标岗位|应聘岗位|target role|objective)\s*[:：]\s*(.+)$/i)?.[1]?.trim()).find(Boolean);
  return labeled ?? "";
}

function isSectionHeading(value: string) {
  return SECTION_ALIASES.some(([, pattern]) => pattern.test(value));
}

function valueAfterLabel(text: string, pattern: RegExp) {
  const match = text.match(new RegExp(`${pattern.source}([^|｜；;]{1,120})`, pattern.flags));
  return match?.[1]?.trim() ?? "";
}

function firstMatch(text: string, pattern: RegExp) {
  return text.match(pattern)?.[0]?.trim() ?? "";
}

function cleanBasics(basics: ImportedResumeBasics) {
  return Object.fromEntries(Object.entries(basics).map(([key, value]) => [key, value.trim()])) as ImportedResumeBasics;
}

function inferExperienceType(value: string): ImportedResumeDraft["work"][number]["experienceType"] {
  if (/实习|intern(?:ship)?|trainee|暑期|summer analyst|off[- ]?cycle/i.test(value)) return "internship";
  if (/全职|正式员工|full[- ]?time|permanent|工作经历|work experience/i.test(value)) return "employment";
  return "other";
}

function cleanList(values: string[]) {
  return values.map(cleanBullet).filter(Boolean).slice(0, 12);
}

function cleanBullet(value: string) {
  return cleanResumeBullet(value);
}

function trimUrl(value: string) {
  return value.replace(/[),，。；;]+$/, "");
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.(pdf|docx|txt)$/i, "").trim() || "导入简历";
}
