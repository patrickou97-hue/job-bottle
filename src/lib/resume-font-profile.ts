import {
  RESUME_FONT_COMMON_RANGES,
} from "@/generated/resumeFontCommonCoverage";
import { isEnglishResumeTemplate, type ResumeDocument } from "@/lib/resume";

export type ResumeFontProfile = "common" | "full";

const CHINESE_TEMPLATE_COPY = [
  "自定义模块", "获奖经历", "校园经历", "证书", "公司名称", "核心课程：",
  "教育背景", "实习经历", "荣誉奖项：", "语言：", "岗位名称", "至今",
  "项目名称", "项目经历", "学校", "技能", "技能/兴趣", "个人网站",
];

const ENGLISH_TEMPLATE_COPY = [
  "ADDITIONAL", "HONORS & AWARDS", "ACTIVITIES", "CERTIFICATIONS", "Company",
  "Relevant Coursework: ", "EDUCATION", "EXPERIENCE", "Honors: ", "Languages: ",
  "Position", "Present", "Project", "PROJECTS", "School", "Skills", "SKILLS", "Website",
];

export function collectResumeText(resume: ResumeDocument) {
  const basics = resume.content.basics;
  const text: string[] = [
    basics.name,
    basics.englishName,
    basics.phone,
    basics.email,
    basics.city,
    basics.linkedin,
    basics.github,
    basics.website,
    basics.targetRole,
    resume.targetRole,
    resume.jobTarget,
    "LinkedIn GitHub | - • ： 、",
    ...(isEnglishResumeTemplate(resume.templateId) ? ENGLISH_TEMPLATE_COPY : CHINESE_TEMPLATE_COPY),
  ];

  for (const item of resume.content.education) {
    text.push(item.school, item.degree, item.major, item.startDate, item.endDate, item.gpa, item.courses, item.honors);
  }
  for (const item of resume.content.work) {
    text.push(item.company, item.title, item.location, item.startDate, item.endDate, ...item.bullets);
  }
  for (const item of resume.content.projects) {
    text.push(item.name, item.role, item.startDate, item.endDate, item.keywords, ...item.bullets);
  }
  for (const group of resume.content.skills) {
    text.push(group.category, ...group.skills);
  }
  for (const section of [
    ...resume.content.campus,
    ...resume.content.awards,
    ...resume.content.certifications,
    ...resume.content.languages,
    ...resume.content.customSections,
  ]) {
    text.push(section.title, ...section.bullets);
  }

  return text.filter(Boolean).join("\n");
}

export function selectResumeFontProfile(text: string): ResumeFontProfile {
  for (const character of text) {
    if (/\s/u.test(character)) continue;
    if (!isCommonResumeCodePoint(character.codePointAt(0)!)) return "full";
  }
  return "common";
}

export function isCommonResumeCodePoint(codePoint: number) {
  let low = 0;
  let high = RESUME_FONT_COMMON_RANGES.length - 1;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const [start, end] = RESUME_FONT_COMMON_RANGES[middle];
    if (codePoint < start) high = middle - 1;
    else if (codePoint > end) low = middle + 1;
    else return true;
  }

  return false;
}

export function selectResumeDocumentFontProfile(resume: ResumeDocument) {
  return selectResumeFontProfile(collectResumeText(resume));
}
