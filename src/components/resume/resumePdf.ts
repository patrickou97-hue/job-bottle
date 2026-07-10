import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  ResumeTemplateId,
} from "@/lib/resume";
import { getResumeTargetLine, isEnglishResumeTemplate } from "@/lib/resume";

type JsPdf = import("jspdf").jsPDF;

type PdfOptions = {
  bodySize: number;
  bulletSize: number;
  headingSize: number;
  itemGap: number;
  lineHeight: number;
  sectionGap: number;
  templateId: ResumeTemplateId;
};

type ResumeCopy = {
  additional: string;
  awards: string;
  campus: string;
  certifications: string;
  company: string;
  coursework: string;
  education: string;
  experience: string;
  honors: string;
  language: string;
  position: string;
  present: string;
  project: string;
  projects: string;
  school: string;
  skillName: string;
  skills: string;
};

type LayoutState = {
  allowPageBreaks: boolean;
  bottom: number;
  draw: boolean;
  left: number;
  page: number;
  pdf: JsPdf;
  right: number;
  templateId: ResumeTemplateId;
  top: number;
  y: number;
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 39;
const TOP = 34;
const BOTTOM = 34;
const FONT_FAMILY = "NotoSerifSC";
const FONT_REGULAR = "/fonts/NotoSerifSC-Regular.ttf";
const FONT_BOLD = "/fonts/NotoSerifSC-Bold.ttf";
const BLACK = "#111111";

const COMPACT_OPTIONS: PdfOptions[] = [
  { templateId: "compact", bodySize: 10.1, bulletSize: 9.65, headingSize: 12.2, itemGap: 2.4, lineHeight: 1.15, sectionGap: 3.2 },
  { templateId: "compact", bodySize: 9.7, bulletSize: 9.25, headingSize: 11.8, itemGap: 2.1, lineHeight: 1.12, sectionGap: 2.8 },
  { templateId: "compact", bodySize: 9.25, bulletSize: 8.85, headingSize: 11.4, itemGap: 1.8, lineHeight: 1.08, sectionGap: 2.4 },
  { templateId: "compact", bodySize: 8.85, bulletSize: 8.45, headingSize: 11, itemGap: 1.5, lineHeight: 1.05, sectionGap: 2 },
];

let fontCache: Promise<{ bold: string; regular: string }> | null = null;

export async function exportResumeToPdf(resume: ResumeDocument) {
  const { jsPDF } = await import("jspdf");
  const fonts = await loadPdfFonts();
  const selectedOptions = await chooseOptions(resume, jsPDF, fonts);
  const pdf = createPdf(jsPDF, fonts);
  renderResume(pdf, resume, selectedOptions, { allowPageBreaks: true, draw: true });
  const fileName = sanitizeFileName(resume.content.basics.name || resume.title || "Resume");
  pdf.save(`${fileName}-Resume.pdf`);
}

async function chooseOptions(
  resume: ResumeDocument,
  jsPDF: typeof import("jspdf").jsPDF,
  fonts: { bold: string; regular: string },
) {
  const optionSet = getTemplateOptions(resume.templateId);
  for (const options of optionSet) {
    const pdf = createPdf(jsPDF, fonts);
    const result = renderResume(pdf, resume, options, { allowPageBreaks: false, draw: false });
    if (result.page === 1 && result.y <= PAGE_HEIGHT - BOTTOM) return options;
  }

  return optionSet[optionSet.length - 1];
}

function createPdf(
  jsPDF: typeof import("jspdf").jsPDF,
  fonts: { bold: string; regular: string },
) {
  const pdf = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });
  pdf.addFileToVFS("NotoSerifSC-Regular.ttf", fonts.regular);
  pdf.addFileToVFS("NotoSerifSC-Bold.ttf", fonts.bold);
  pdf.addFont("NotoSerifSC-Regular.ttf", FONT_FAMILY, "normal");
  pdf.addFont("NotoSerifSC-Bold.ttf", FONT_FAMILY, "bold");
  pdf.setFont(FONT_FAMILY, "normal");
  pdf.setTextColor(BLACK);
  return pdf;
}

function renderResume(
  pdf: JsPdf,
  resume: ResumeDocument,
  options: PdfOptions,
  mode: { allowPageBreaks: boolean; draw: boolean },
) {
  const state: LayoutState = {
    allowPageBreaks: mode.allowPageBreaks,
    bottom: PAGE_HEIGHT - BOTTOM,
    draw: mode.draw,
    left: MARGIN_X,
    page: 1,
    pdf,
    right: PAGE_WIDTH - MARGIN_X,
    templateId: options.templateId,
    top: TOP,
    y: TOP,
  };

  const copy = getResumeCopy(resume.templateId);
  renderHeader(state, resume, options);
  renderEducation(state, resume.content.education, options, copy);
  renderExperienceSection(state, copy.experience, resume.content.work, options, copy);
  renderProjectSection(state, copy.projects, resume.content.projects, options, copy);
  renderCustomSection(state, copy.campus, resume.content.campus, options, copy);
  renderCustomSection(state, copy.awards, resume.content.awards, options, copy);
  renderCustomSection(state, copy.certifications, resume.content.certifications, options, copy);
  renderSkills(state, resume.content.skills, resume.content.languages, options, copy);
  resume.content.customSections.forEach((section) => renderCustomSection(state, section.title, [section], options, copy));

  return { page: state.page, y: state.y };
}

function renderHeader(state: LayoutState, resume: ResumeDocument, options: PdfOptions) {
  const basics = resume.content.basics;
  const isEnglish = isEnglishResumeTemplate(options.templateId);
  const hasPhoto = Boolean(basics.photoDataUrl) && !isEnglish;
  const photoWidth = 58;
  const photoHeight = 72;
  const headerTop = state.y;
  const isLeftAligned = options.templateId === "modern" || options.templateId === "english_modern";
  const headerColor = isLeftAligned ? "#203a5f" : BLACK;
  const displayName = isEnglish ? basics.englishName || basics.name || "Your Name" : addNameSpacing(basics.name || "姓名");

  if (hasPhoto && state.draw) {
    try {
      state.pdf.addImage(
        basics.photoDataUrl,
        "JPEG",
        state.right - photoWidth,
        headerTop - 7,
        photoWidth,
        photoHeight,
      );
    } catch {
      // Photo export should not block the resume PDF.
    }
  }

  if (isLeftAligned) {
    let y = headerTop + 23;
    setFont(state, 19, "bold", headerColor);
    drawText(state, displayName, state.left, y);
    y += 14;

    if (basics.englishName && !isEnglish) {
      setFont(state, 9.5, "normal", "#374151");
      drawText(state, basics.englishName, state.left, y);
      y += 11;
    }

    const target = getResumeTargetLine(resume);
    if (target) {
      setFont(state, 10.1, "bold", headerColor);
      drawText(state, target, state.left, y);
      y += 12;
    }

    const contact = [formatPhone(basics.phone), basics.email, basics.city].filter(Boolean).join(" | ");
    if (contact) {
      setFont(state, 9.5, "normal");
      drawText(state, contact, state.left, y);
      y += 11;
    }

    const links = formatHeaderLinks(basics, isEnglish);
    if (links) {
      y = drawWrappedAt(state, links, state.left, y, hasPhoto ? 390 : 505, 8.7, "normal") + 1;
    }

    if (state.draw) {
      const [red, green, blue] = [32, 58, 95];
      state.pdf.setDrawColor(red, green, blue);
      state.pdf.setLineWidth(0.8);
      state.pdf.line(state.left, y + 4, state.right, y + 4);
    }
    state.y = Math.max(y + 15, headerTop + (hasPhoto ? 78 : 58));
    return;
  }

  setFont(state, options.templateId === "classic" || options.templateId === "english_classic" ? 18.6 : 18, "bold");
  drawCentered(state, displayName, headerTop + 22);
  let y = headerTop + 44;

  const contact = [formatPhone(basics.phone), basics.email, basics.city].filter(Boolean).join(" | ");
  if (contact) {
    setFont(state, 11, "normal");
    drawCentered(state, contact, y);
    y += 14;
  }

  const target = getResumeTargetLine(resume);
  if (target) {
    setFont(state, 10.5, "bold");
    drawCentered(state, target, y);
    y += 13;
  }

  const links = formatHeaderLinks(basics, isEnglish);
  if (links) {
    y = drawCenteredWrapped(state, links, y, hasPhoto ? 410 : 500, 9.2, "normal") + 2;
  }

  state.y = Math.max(y + 6, headerTop + (hasPhoto ? 82 : 52));
}

function renderEducation(state: LayoutState, items: ResumeEducation[], options: PdfOptions, copy: ResumeCopy) {
  if (items.length === 0) return;
  sectionTitle(state, copy.education, options);

  items.forEach((item) => {
    row(state, item.school || copy.school, formatRange(item.startDate, item.endDate), options, true);
    const meta = [item.major, item.degree, item.gpa].filter(Boolean).join(" · ");
    if (meta) {
      textLine(state, meta, options.bodySize, "normal");
    }
    if (item.courses) {
      bullet(state, `${copy.coursework}${item.courses}`, options);
    }
    if (item.honors) {
      bullet(state, `${copy.honors}${item.honors}`, options);
    }
    state.y += options.itemGap;
  });
}

function renderExperienceSection(
  state: LayoutState,
  title: string,
  items: ResumeExperience[],
  options: PdfOptions,
  copy: ResumeCopy,
) {
  if (items.length === 0) return;
  sectionTitle(state, title, options);

  items.forEach((item) => {
    row(state, item.company || copy.company, formatRange(item.startDate, item.endDate, item.current, copy.present), options, true);
    row(state, item.title || copy.position, item.location, options, false);
    item.bullets.map(cleanText).filter(Boolean).forEach((line) => bullet(state, line, options));
    state.y += options.itemGap;
  });
}

function renderProjectSection(
  state: LayoutState,
  title: string,
  items: ResumeProject[],
  options: PdfOptions,
  copy: ResumeCopy,
) {
  if (items.length === 0) return;
  sectionTitle(state, title, options);

  items.forEach((item) => {
    const titleText = [item.name || copy.project, item.role].filter(Boolean).join(" - ");
    row(state, titleText, formatRange(item.startDate, item.endDate), options, true);
    if (item.keywords) textLine(state, item.keywords, options.bodySize, "normal");
    item.bullets.map(cleanText).filter(Boolean).forEach((line) => bullet(state, line, options));
    state.y += options.itemGap;
  });
}

function renderCustomSection(
  state: LayoutState,
  title: string,
  sections: ResumeCustomSection[],
  options: PdfOptions,
  copy: ResumeCopy,
) {
  const cleanSections = sections.filter((section) => cleanText(section.title) || section.bullets.some(cleanText));
  if (cleanSections.length === 0) return;
  sectionTitle(state, title || copy.additional, options);

  cleanSections.forEach((section) => {
    if (section.title && section.title !== title) {
      textLine(state, section.title, options.bodySize, "bold");
    }
    section.bullets.map(cleanText).filter(Boolean).forEach((line) => bullet(state, line, options));
    state.y += options.itemGap;
  });
}

function renderSkills(
  state: LayoutState,
  skills: ResumeSkillGroup[],
  languages: ResumeCustomSection[],
  options: PdfOptions,
  copy: ResumeCopy,
) {
  const skillLines = skills
    .map((group) => formatSkillLine(group, copy.skillName))
    .filter(Boolean);
  const languageLines = languages
    .flatMap((section) => section.bullets.map(cleanText).filter(Boolean))
    .map((line) => `${copy.language}${line}`);
  const lines = [...languageLines, ...skillLines];
  if (lines.length === 0) return;

  sectionTitle(state, copy.skills, options);
  lines.forEach((line) => textLine(state, line, options.bodySize, "normal"));
}

function sectionTitle(state: LayoutState, title: string, options: PdfOptions) {
  state.y += options.sectionGap;
  ensureSpace(state, options.headingSize + 5);
  setFont(state, options.headingSize, "bold");

  if (options.templateId === "modern" || options.templateId === "english_modern") {
    const color = "#203a5f";
    setFont(state, options.headingSize, "bold", color);
    drawText(state, title, state.left, state.y);
    if (state.draw) {
      const [red, green, blue] = [207, 214, 223];
      state.pdf.setDrawColor(red, green, blue);
      state.pdf.setLineWidth(0.7);
      state.pdf.line(state.left, state.y + 4.2, state.right, state.y + 4.2);
    }
    state.y += options.headingSize * 1.08;
    return;
  }

  drawText(state, title, state.left, state.y);
  const titleWidth = state.pdf.getTextWidth(title);
  if (state.draw) {
    state.pdf.setDrawColor(0, 0, 0);
    state.pdf.setLineWidth(options.templateId === "classic" || options.templateId === "english_classic" ? 1 : 0.7);
    state.pdf.line(state.left + titleWidth + 5, state.y - 3.5, state.right, state.y - 3.5);
  }
  // Reserve a full text-line after the rule. Without this clearance, the first
  // education or experience row visually collides with the section heading.
  state.y += options.headingSize * 1.38 + 1;
}

function row(
  state: LayoutState,
  leftText: string,
  rightText: string,
  options: PdfOptions,
  bold: boolean,
) {
  ensureSpace(state, options.bodySize * options.lineHeight + 1);
  setFont(state, options.bodySize, bold ? "bold" : "normal");
  const rightWidth = rightText ? state.pdf.getTextWidth(rightText) + 8 : 0;
  const leftWidth = state.right - state.left - rightWidth;
  const lines = wrapText(state, leftText, leftWidth);
  drawText(state, lines[0] ?? "", state.left, state.y);
  if (rightText) drawRight(state, rightText, state.right, state.y);
  state.y += options.bodySize * options.lineHeight;
  lines.slice(1).forEach((line) => {
    ensureSpace(state, options.bodySize * options.lineHeight);
    drawText(state, line, state.left, state.y);
    state.y += options.bodySize * options.lineHeight;
  });
}

function textLine(
  state: LayoutState,
  text: string,
  size: number,
  weight: "bold" | "normal",
) {
  setFont(state, size, weight);
  wrapText(state, cleanText(text), state.right - state.left).forEach((line) => {
    ensureSpace(state, size * 1.12);
    drawText(state, line, state.left, state.y);
    state.y += size * 1.12;
  });
}

function bullet(state: LayoutState, text: string, options: PdfOptions) {
  const size = options.bulletSize;
  const lineHeight = size * options.lineHeight;
  const bulletX = state.left;
  const textX = state.left + 10;
  const lines = wrapText(state, cleanText(text), state.right - textX, size, "normal");
  setFont(state, size, "normal");

  lines.forEach((line, index) => {
    ensureSpace(state, lineHeight);
    if (index === 0) drawText(state, "•", bulletX, state.y);
    drawText(state, line, textX, state.y);
    state.y += lineHeight;
  });
}

function ensureSpace(state: LayoutState, height: number) {
  if (state.y + height <= state.bottom || !state.allowPageBreaks) return;
  if (state.draw) state.pdf.addPage("letter", "portrait");
  state.page += 1;
  state.y = state.top;
}

function wrapText(
  state: LayoutState,
  text: string,
  maxWidth: number,
  size?: number,
  weight?: "bold" | "normal",
) {
  const clean = cleanText(text);
  if (!clean) return [];
  if (size && weight) setFont(state, size, weight);

  const lines: string[] = [];
  let current = "";
  for (const char of Array.from(clean)) {
    const next = current + char;
    if (current && state.pdf.getTextWidth(next) > maxWidth) {
      lines.push(current.trim());
      current = char.trimStart();
    } else {
      current = next;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}

function setFont(
  state: LayoutState,
  size: number,
  weight: "bold" | "normal",
  color = BLACK,
) {
  state.pdf.setFont(FONT_FAMILY, weight);
  state.pdf.setFontSize(size);
  state.pdf.setTextColor(color);
}

function drawText(state: LayoutState, text: string, x: number, y: number) {
  if (state.draw) state.pdf.text(text, x, y);
}

function drawCentered(state: LayoutState, text: string, y: number) {
  if (!text) return;
  const x = (PAGE_WIDTH - state.pdf.getTextWidth(text)) / 2;
  drawText(state, text, x, y);
}

function drawCenteredWrapped(
  state: LayoutState,
  text: string,
  y: number,
  maxWidth: number,
  size: number,
  weight: "bold" | "normal",
) {
  setFont(state, size, weight);
  const lineHeight = size * 1.18;
  let nextY = y;
  wrapText(state, text, maxWidth, size, weight).forEach((line) => {
    drawCentered(state, line, nextY);
    nextY += lineHeight;
  });
  return nextY;
}

function drawWrappedAt(
  state: LayoutState,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: "bold" | "normal",
) {
  setFont(state, size, weight);
  const lineHeight = size * 1.18;
  let nextY = y;
  wrapText(state, text, maxWidth, size, weight).forEach((line) => {
    drawText(state, line, x, nextY);
    nextY += lineHeight;
  });
  return nextY;
}

function drawRight(state: LayoutState, text: string, right: number, y: number) {
  drawText(state, text, right - state.pdf.getTextWidth(text), y);
}

async function loadPdfFonts() {
  fontCache ??= Promise.all([fetchFont(FONT_REGULAR), fetchFont(FONT_BOLD)]).then(([regular, bold]) => ({
    bold,
    regular,
  }));
  return fontCache;
}

async function fetchFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("简历 PDF 字体加载失败，请刷新后重试。");
  return arrayBufferToBase64(await response.arrayBuffer());
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function addNameSpacing(name: string) {
  const clean = cleanText(name);
  if (/^[\u4e00-\u9fff]{2,4}$/.test(clean)) return Array.from(clean).join("  ");
  return clean;
}

function formatPhone(phone: string) {
  const clean = cleanText(phone);
  if (!clean) return "";
  return clean.startsWith("+") ? clean : clean;
}

function formatHeaderLinks(basics: ResumeDocument["content"]["basics"], isEnglish: boolean) {
  return [
    basics.linkedin ? `LinkedIn${isEnglish ? ":" : "："}${cleanText(basics.linkedin)}` : "",
    basics.github ? `GitHub${isEnglish ? ":" : "："}${cleanText(basics.github)}` : "",
    basics.website ? `${isEnglish ? "Website" : "个人网站"}${isEnglish ? ":" : "："}${cleanText(basics.website)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatRange(start: string, end: string, current = false, present = "至今") {
  const startText = cleanText(start);
  const endText = current ? present : cleanText(end);
  if (!startText && !endText) return "";
  if (!startText) return endText;
  if (!endText) return startText;
  return `${startText} - ${endText}`;
}

function getResumeCopy(templateId: ResumeTemplateId): ResumeCopy {
  if (isEnglishResumeTemplate(templateId)) {
    return {
      additional: "ADDITIONAL",
      awards: "HONORS & AWARDS",
      campus: "ACTIVITIES",
      certifications: "CERTIFICATIONS",
      company: "Company",
      coursework: "Relevant Coursework: ",
      education: "EDUCATION",
      experience: "EXPERIENCE",
      honors: "Honors: ",
      language: "Languages: ",
      position: "Position",
      present: "Present",
      project: "Project",
      projects: "PROJECTS",
      school: "School",
      skillName: "Skills",
      skills: "SKILLS",
    };
  }

  return {
    additional: "自定义模块",
    awards: "获奖经历",
    campus: "校园经历",
    certifications: "证书",
    company: "公司名称",
    coursework: "核心课程：",
    education: "教育背景",
    experience: "实习经历",
    honors: "荣誉奖项：",
    language: "语言：",
    position: "岗位名称",
    present: "至今",
    project: "项目名称",
    projects: "项目经历",
    school: "学校",
    skillName: "技能",
    skills: "技能/兴趣",
  };
}

function formatSkillLine(group: ResumeSkillGroup, fallbackLabel: string) {
  const category = cleanText(group.category);
  const skills = group.skills.map(cleanText).filter(Boolean);
  if (!category && skills.length === 0) return "";
  return `${category || fallbackLabel}：${skills.join("、")}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeFileName(value: string) {
  return cleanText(value).replace(/[\\/:*?"<>|]/g, "-") || "Resume";
}

function getTemplateOptions(templateId: ResumeTemplateId) {
  if (templateId === "classic") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize + 0.1,
      headingSize: options.headingSize + 0.35,
      sectionGap: options.sectionGap + 0.15,
    }));
  }

  if (templateId === "modern") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize - 0.05,
      bulletSize: options.bulletSize - 0.05,
      headingSize: options.headingSize - 0.6,
      itemGap: options.itemGap + 0.15,
      sectionGap: options.sectionGap + 0.45,
    }));
  }

  if (templateId === "english_classic") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize,
      headingSize: options.headingSize + 0.25,
      sectionGap: options.sectionGap + 0.2,
    }));
  }

  if (templateId === "english_modern") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize - 0.05,
      bulletSize: options.bulletSize - 0.05,
      headingSize: options.headingSize - 0.45,
      itemGap: options.itemGap + 0.2,
      sectionGap: options.sectionGap + 0.35,
    }));
  }

  return COMPACT_OPTIONS;
}
