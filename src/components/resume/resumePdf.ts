import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
} from "@/lib/resume";

type JsPdf = import("jspdf").jsPDF;

type PdfOptions = {
  bodySize: number;
  bulletSize: number;
  headingSize: number;
  itemGap: number;
  lineHeight: number;
  sectionGap: number;
};

type LayoutState = {
  allowPageBreaks: boolean;
  bottom: number;
  draw: boolean;
  left: number;
  page: number;
  pdf: JsPdf;
  right: number;
  top: number;
  y: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 36;
const TOP = 28;
const BOTTOM = 30;
const FONT_FAMILY = "NotoSerifSC";
const FONT_REGULAR = "/fonts/NotoSerifSC-Regular.ttf";
const FONT_BOLD = "/fonts/NotoSerifSC-Bold.ttf";
const BLACK = "#111111";

const COMPACT_OPTIONS: PdfOptions[] = [
  { bodySize: 10.1, bulletSize: 9.65, headingSize: 12.2, itemGap: 2.4, lineHeight: 1.15, sectionGap: 3.2 },
  { bodySize: 9.7, bulletSize: 9.25, headingSize: 11.8, itemGap: 2.1, lineHeight: 1.12, sectionGap: 2.8 },
  { bodySize: 9.25, bulletSize: 8.85, headingSize: 11.4, itemGap: 1.8, lineHeight: 1.08, sectionGap: 2.4 },
  { bodySize: 8.85, bulletSize: 8.45, headingSize: 11, itemGap: 1.5, lineHeight: 1.05, sectionGap: 2 },
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
  for (const options of COMPACT_OPTIONS) {
    const pdf = createPdf(jsPDF, fonts);
    const result = renderResume(pdf, resume, options, { allowPageBreaks: false, draw: false });
    if (result.page === 1 && result.y <= PAGE_HEIGHT - BOTTOM) return options;
  }

  return COMPACT_OPTIONS[COMPACT_OPTIONS.length - 1];
}

function createPdf(
  jsPDF: typeof import("jspdf").jsPDF,
  fonts: { bold: string; regular: string },
) {
  const pdf = new jsPDF({
    compress: true,
    format: "letter",
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
    top: TOP,
    y: TOP,
  };

  renderHeader(state, resume);
  renderEducation(state, resume.content.education, options);
  renderExperienceSection(state, "实习经历", resume.content.work, options);
  renderProjectSection(state, "项目经历", resume.content.projects, options);
  renderCustomSection(state, "校园经历", resume.content.campus, options);
  renderCustomSection(state, "获奖经历", resume.content.awards, options);
  renderCustomSection(state, "证书", resume.content.certifications, options);
  renderSkills(state, resume.content.skills, resume.content.languages, options);
  resume.content.customSections.forEach((section) => renderCustomSection(state, section.title, [section], options));

  return { page: state.page, y: state.y };
}

function renderHeader(state: LayoutState, resume: ResumeDocument) {
  const basics = resume.content.basics;
  const hasPhoto = Boolean(basics.photoDataUrl);
  const photoWidth = 58;
  const photoHeight = 72;
  const headerTop = state.y;

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

  setFont(state, 18, "bold");
  drawCentered(state, addNameSpacing(basics.name || "姓名"), headerTop + 22);
  let y = headerTop + 44;

  const contact = [formatPhone(basics.phone), basics.email, basics.city].filter(Boolean).join(" | ");
  if (contact) {
    setFont(state, 11, "normal");
    drawCentered(state, contact, y);
    y += 14;
  }

  const target = cleanText(basics.targetRole || resume.targetRole);
  if (target) {
    setFont(state, 10.5, "bold");
    drawCentered(state, target, y);
    y += 13;
  }

  const links = formatHeaderLinks(basics);
  if (links) {
    y = drawCenteredWrapped(state, links, y, hasPhoto ? 410 : 500, 9.2, "normal") + 2;
  }

  state.y = Math.max(y + 6, headerTop + (hasPhoto ? 82 : 52));
}

function renderEducation(state: LayoutState, items: ResumeEducation[], options: PdfOptions) {
  if (items.length === 0) return;
  sectionTitle(state, "教育背景", options);

  items.forEach((item) => {
    row(state, item.school || "学校", formatRange(item.startDate, item.endDate), options, true);
    const meta = [item.major, item.degree, item.gpa].filter(Boolean).join(" · ");
    if (meta) {
      textLine(state, meta, options.bodySize, "normal");
    }
    if (item.courses) {
      bullet(state, `核心课程：${item.courses}`, options);
    }
    if (item.honors) {
      bullet(state, `荣誉奖项：${item.honors}`, options);
    }
    state.y += options.itemGap;
  });
}

function renderExperienceSection(
  state: LayoutState,
  title: string,
  items: ResumeExperience[],
  options: PdfOptions,
) {
  if (items.length === 0) return;
  sectionTitle(state, title, options);

  items.forEach((item) => {
    row(state, item.company || "公司名称", formatRange(item.startDate, item.endDate, item.current), options, true);
    row(state, item.title || "岗位名称", item.location, options, false);
    item.bullets.map(cleanText).filter(Boolean).forEach((line) => bullet(state, line, options));
    state.y += options.itemGap;
  });
}

function renderProjectSection(
  state: LayoutState,
  title: string,
  items: ResumeProject[],
  options: PdfOptions,
) {
  if (items.length === 0) return;
  sectionTitle(state, title, options);

  items.forEach((item) => {
    const titleText = [item.name || "项目名称", item.role].filter(Boolean).join(" - ");
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
) {
  const cleanSections = sections.filter((section) => cleanText(section.title) || section.bullets.some(cleanText));
  if (cleanSections.length === 0) return;
  sectionTitle(state, title || "自定义模块", options);

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
) {
  const skillLines = skills
    .map((group) => formatSkillLine(group))
    .filter(Boolean);
  const languageLines = languages
    .flatMap((section) => section.bullets.map(cleanText).filter(Boolean))
    .map((line) => `语言：${line}`);
  const lines = [...languageLines, ...skillLines];
  if (lines.length === 0) return;

  sectionTitle(state, "技能/兴趣", options);
  lines.forEach((line) => textLine(state, line, options.bodySize, "normal"));
}

function sectionTitle(state: LayoutState, title: string, options: PdfOptions) {
  state.y += options.sectionGap;
  ensureSpace(state, options.headingSize + 5);
  setFont(state, options.headingSize, "bold");
  drawText(state, title, state.left, state.y);
  const titleWidth = state.pdf.getTextWidth(title);
  if (state.draw) {
    state.pdf.setDrawColor(0, 0, 0);
    state.pdf.setLineWidth(0.7);
    state.pdf.line(state.left + titleWidth + 5, state.y - 3.5, state.right, state.y - 3.5);
  }
  state.y += options.headingSize * 1.02;
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

function formatHeaderLinks(basics: ResumeDocument["content"]["basics"]) {
  return [
    basics.linkedin ? `LinkedIn：${cleanText(basics.linkedin)}` : "",
    basics.github ? `GitHub：${cleanText(basics.github)}` : "",
    basics.website ? `个人网站：${cleanText(basics.website)}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
}

function formatRange(start: string, end: string, current = false) {
  const startText = cleanText(start);
  const endText = current ? "至今" : cleanText(end);
  if (!startText && !endText) return "";
  if (!startText) return endText;
  if (!endText) return startText;
  return `${startText} - ${endText}`;
}

function formatSkillLine(group: ResumeSkillGroup) {
  const category = cleanText(group.category);
  const skills = group.skills.map(cleanText).filter(Boolean);
  if (!category && skills.length === 0) return "";
  return `${category || "技能"}：${skills.join("、")}`;
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function sanitizeFileName(value: string) {
  return cleanText(value).replace(/[\\/:*?"<>|]/g, "-") || "Resume";
}
