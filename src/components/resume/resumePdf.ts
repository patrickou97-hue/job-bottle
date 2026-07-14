import type {
  ResumeCustomSection,
  ResumeDocument,
  ResumeEducation,
  ResumeExperience,
  ResumeProject,
  ResumeSkillGroup,
  ResumeTemplateId,
} from "@/lib/resume";
import { getResumeTargetLine, getResumeTemplateStyle, isEnglishResumeTemplate } from "@/lib/resume";
import {
  selectResumeDocumentFontProfile,
  type ResumeFontProfile,
} from "@/lib/resume-font-profile";

type JsPdf = import("jspdf").jsPDF;
type ResumeJsPdf = JsPdf & { __resumeFontFamily?: string };

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
  color: string;
  draw: boolean;
  fontSize: number;
  fontWeight: "bold" | "normal";
  left: number;
  operations?: ResumePreviewOperation[];
  page: number;
  pdf: JsPdf;
  right: number;
  templateId: ResumeTemplateId;
  top: number;
  y: number;
};

export type ResumePreviewOperation =
  | {
      type: "image";
      page: number;
      src: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | {
      type: "line";
      page: number;
      color: string;
      width: number;
      x1: number;
      x2: number;
      y1: number;
      y2: number;
    }
  | {
      type: "text";
      page: number;
      color: string;
      size: number;
      text: string;
      width: number;
      weight: "bold" | "normal";
      x: number;
      y: number;
    };

export type ResumePreviewLayout = {
  fontFamily: string;
  pageCount: number;
  pageHeight: number;
  pageWidth: number;
  operations: ResumePreviewOperation[];
};

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 39;
const TOP = 34;
const BOTTOM = 34;
const FONT_FAMILY = "NotoSerifSC";
const COMMON_FONT_REGULAR = "/fonts/resume/NotoSerifSC-Regular-common-v1.ttf";
const COMMON_FONT_BOLD = "/fonts/resume/NotoSerifSC-Bold-common-v1.ttf";
const FULL_FONT_REGULAR = "/fonts/resume/NotoSerifSC-Regular-full-v1.ttf";
const FULL_FONT_BOLD = "/fonts/resume/NotoSerifSC-Bold-full-v1.ttf";
const FONT_TIMEOUT_MS = 10_000;
const BLACK = "#111111";

type ResumeFontSourceName = "same-origin-common" | "cos-full" | "same-origin-full";

type ResumeFontSource = {
  boldUrl: string;
  profile: ResumeFontProfile;
  regularUrl: string;
  source: ResumeFontSourceName;
};

type ResumeFontBundle = {
  bold: string;
  cacheKey: string;
  fontFamily: string;
  profile: ResumeFontProfile;
  regular: string;
  source: ResumeFontSourceName;
};

const COMPACT_OPTIONS: PdfOptions[] = [
  { templateId: "compact", bodySize: 10.1, bulletSize: 9.65, headingSize: 12.2, itemGap: 2.4, lineHeight: 1.15, sectionGap: 3.2 },
  { templateId: "compact", bodySize: 9.7, bulletSize: 9.25, headingSize: 11.8, itemGap: 2.1, lineHeight: 1.12, sectionGap: 2.8 },
  { templateId: "compact", bodySize: 9.25, bulletSize: 8.85, headingSize: 11.4, itemGap: 1.8, lineHeight: 1.08, sectionGap: 2.4 },
  { templateId: "compact", bodySize: 8.85, bulletSize: 8.45, headingSize: 11, itemGap: 1.5, lineHeight: 1.05, sectionGap: 2 },
];

const fontSourceCache = new Map<string, Promise<ResumeFontBundle>>();
const selectedFontCache = new Map<ResumeFontProfile, Promise<ResumeFontBundle>>();
const previewMeasurementPdfCache = new Map<string, Promise<JsPdf>>();
const installedFontFaces = new Set<FontFace>();

export function resetResumePdfCaches() {
  fontSourceCache.clear();
  selectedFontCache.clear();
  previewMeasurementPdfCache.clear();
  if (typeof document !== "undefined") {
    for (const face of installedFontFaces) document.fonts.delete(face);
  }
  installedFontFaces.clear();
}

export async function exportResumeToPdf(resume: ResumeDocument) {
  const pdf = await buildResumePdf(resume);
  const fileName = sanitizeFileName(resume.content.basics.name || resume.title || "Resume");
  pdf.save(`${fileName}-Resume.pdf`);
}

export async function createResumePreviewLayout(resume: ResumeDocument): Promise<ResumePreviewLayout> {
  const fonts = await loadResumeFonts(resume);
  const pdf = await getPreviewMeasurementPdf(fonts);
  const selectedOptions = chooseOptions(resume, pdf);
  const operations: ResumePreviewOperation[] = [];
  const result = renderResume(pdf, resume, selectedOptions, {
    allowPageBreaks: true,
    draw: false,
    operations,
  });

  return {
    fontFamily: fonts.fontFamily,
    pageCount: result.page,
    pageHeight: PAGE_HEIGHT,
    pageWidth: PAGE_WIDTH,
    operations,
  };
}

async function buildResumePdf(resume: ResumeDocument) {
  const { jsPDF } = await import("jspdf");
  const fonts = await loadResumeFonts(resume);
  const pdf = createPdf(jsPDF, fonts);
  const selectedOptions = chooseOptions(resume, pdf);
  renderResume(pdf, resume, selectedOptions, { allowPageBreaks: true, draw: true });
  return pdf;
}

function chooseOptions(resume: ResumeDocument, pdf: JsPdf) {
  const optionSet = getTemplateOptions(resume.templateId);
  for (const options of optionSet) {
    const result = renderResume(pdf, resume, options, { allowPageBreaks: false, draw: false });
    if (result.page === 1 && result.y <= PAGE_HEIGHT - BOTTOM) return options;
  }

  return optionSet[optionSet.length - 1];
}

function getPreviewMeasurementPdf(fonts: ResumeFontBundle) {
  let cached = previewMeasurementPdfCache.get(fonts.cacheKey);
  if (!cached) {
    cached = import("jspdf")
      .then((module) => createPdf(module.jsPDF, fonts))
      .catch((error) => {
        previewMeasurementPdfCache.delete(fonts.cacheKey);
        throw error;
      });
    previewMeasurementPdfCache.set(fonts.cacheKey, cached);
  }

  return cached;
}

function createPdf(
  jsPDF: typeof import("jspdf").jsPDF,
  fonts: ResumeFontBundle,
) {
  const pdf = new jsPDF({
    compress: true,
    format: "a4",
    orientation: "portrait",
    unit: "pt",
  });
  const bundleId = fonts.cacheKey.replace(/[^a-z0-9-]/gi, "-");
  const fontFamily = `${FONT_FAMILY}-${bundleId}`;
  const regularFileName = `NotoSerifSC-${bundleId}-Regular.ttf`;
  const boldFileName = `NotoSerifSC-${bundleId}-Bold.ttf`;
  pdf.addFileToVFS(regularFileName, fonts.regular);
  pdf.addFileToVFS(boldFileName, fonts.bold);
  pdf.addFont(regularFileName, fontFamily, "normal");
  pdf.addFont(boldFileName, fontFamily, "bold");
  (pdf as ResumeJsPdf).__resumeFontFamily = fontFamily;
  pdf.setFont(fontFamily, "normal");
  pdf.setTextColor(BLACK);
  return pdf;
}

function renderResume(
  pdf: JsPdf,
  resume: ResumeDocument,
  options: PdfOptions,
  mode: { allowPageBreaks: boolean; draw: boolean; operations?: ResumePreviewOperation[] },
) {
  const state: LayoutState = {
    allowPageBreaks: mode.allowPageBreaks,
    bottom: PAGE_HEIGHT - BOTTOM,
    color: BLACK,
    draw: mode.draw,
    fontSize: 10,
    fontWeight: "normal",
    left: MARGIN_X,
    operations: mode.operations,
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
  const templateStyle = getResumeTemplateStyle(options.templateId);
  const hasPhoto = Boolean(basics.photoDataUrl) && !isEnglish && templateStyle.photo;
  const photoWidth = 58;
  const photoHeight = 72;
  const headerTop = state.y;
  const isLeftAligned = templateStyle.header === "left";
  const headerColor = isLeftAligned ? templateStyle.accent : BLACK;
  const displayName = isEnglish ? basics.englishName || basics.name || "Your Name" : addNameSpacing(basics.name || "姓名");
  const headerTextWidth = state.right - state.left - (hasPhoto ? photoWidth + 18 : 0);

  if (hasPhoto) {
    const photoX = state.right - photoWidth;
    const photoY = headerTop - 7;
    if (state.draw) {
      try {
        state.pdf.addImage(basics.photoDataUrl, "JPEG", photoX, photoY, photoWidth, photoHeight);
      } catch {
        // Photo export should not block the resume PDF.
      }
    }
    state.operations?.push({
      type: "image",
      page: state.page,
      src: basics.photoDataUrl,
      x: photoX,
      y: photoY,
      width: photoWidth,
      height: photoHeight,
    });
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
      y = drawWrappedAt(state, target, state.left, y, headerTextWidth, 10.1, "bold", headerColor) + 1;
    }

    const contact = [formatPhone(basics.phone), basics.email, basics.city].filter(Boolean).join(" | ");
    if (contact) {
      y = drawWrappedAt(state, contact, state.left, y, headerTextWidth, 9.5, "normal") + 1;
    }

    const links = formatHeaderLinks(basics, isEnglish);
    if (links) {
      y = drawWrappedAt(state, links, state.left, y, hasPhoto ? 390 : 505, 8.7, "normal") + 1;
    }

    drawLine(state, state.left, y + 4, state.right, y + 4, templateStyle.accent, 0.8);
    state.y = Math.max(y + 15, headerTop + (hasPhoto ? 78 : 58));
    return;
  }

  setFont(state, templateStyle.section === "strong" ? 18.6 : 18, "bold");
  drawCentered(state, displayName, headerTop + 22);
  let y = headerTop + 44;

  const contact = [formatPhone(basics.phone), basics.email, basics.city].filter(Boolean).join(" | ");
  if (contact) {
    y = drawCenteredWrapped(state, contact, y, headerTextWidth, 11, "normal") + 1;
  }

  const target = getResumeTargetLine(resume);
  if (target) {
    y = drawCenteredWrapped(state, target, y, headerTextWidth, 10.5, "bold") + 1;
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

  const templateStyle = getResumeTemplateStyle(options.templateId);
  if (templateStyle.section === "accent") {
    setFont(state, options.headingSize, "bold", templateStyle.accent);
    drawText(state, title, state.left, state.y);
    drawLine(state, state.left, state.y + 4.2, state.right, state.y + 4.2, "#cfd6df", 0.7);
    state.y += options.headingSize * 1.08;
    return;
  }

  drawText(state, title, state.left, state.y);
  const titleWidth = state.pdf.getTextWidth(title);
  drawLine(
    state,
    state.left + titleWidth + 5,
    state.y - 3.5,
    state.right,
    state.y - 3.5,
    templateStyle.accent,
    templateStyle.section === "strong" ? 1 : 0.7,
  );
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
  if (state.draw) state.pdf.addPage("a4", "portrait");
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
  state.pdf.setFont((state.pdf as ResumeJsPdf).__resumeFontFamily ?? FONT_FAMILY, weight);
  state.pdf.setFontSize(size);
  state.pdf.setTextColor(color);
  state.fontSize = size;
  state.fontWeight = weight;
  state.color = color;
}

function drawText(state: LayoutState, text: string, x: number, y: number) {
  if (state.draw) state.pdf.text(text, x, y);
  state.operations?.push({
    type: "text",
    page: state.page,
    color: state.color,
    size: state.fontSize,
    text,
    width: state.pdf.getTextWidth(text),
    weight: state.fontWeight,
    x,
    y,
  });
}

function drawLine(
  state: LayoutState,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  width: number,
) {
  if (state.draw) {
    state.pdf.setDrawColor(color);
    state.pdf.setLineWidth(width);
    state.pdf.line(x1, y1, x2, y2);
  }
  state.operations?.push({ type: "line", page: state.page, color, width, x1, x2, y1, y2 });
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
  color = BLACK,
) {
  setFont(state, size, weight, color);
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

async function loadResumeFonts(resume: ResumeDocument) {
  const profile = selectResumeDocumentFontProfile(resume);
  const existing = selectedFontCache.get(profile);
  if (existing) return existing;

  const promise = resolveResumeFontBundle(profile).catch((error) => {
    selectedFontCache.delete(profile);
    throw error;
  });
  selectedFontCache.set(profile, promise);
  return promise;
}

async function resolveResumeFontBundle(profile: ResumeFontProfile) {
  if (profile === "common") {
    return loadFontSource({
      profile,
      source: "same-origin-common",
      regularUrl: COMMON_FONT_REGULAR,
      boldUrl: COMMON_FONT_BOLD,
    });
  }

  const cosRegularUrl = process.env.NEXT_PUBLIC_RESUME_FONT_FULL_REGULAR_URL?.trim();
  const cosBoldUrl = process.env.NEXT_PUBLIC_RESUME_FONT_FULL_BOLD_URL?.trim();
  if (cosRegularUrl && cosBoldUrl) {
    try {
      return await loadFontSource({
        profile,
        source: "cos-full",
        regularUrl: cosRegularUrl,
        boldUrl: cosBoldUrl,
      });
    } catch {
      // A font pair is atomic: if either COS file fails, use both same-origin files.
    }
  }

  return loadFontSource({
    profile,
    source: "same-origin-full",
    regularUrl: FULL_FONT_REGULAR,
    boldUrl: FULL_FONT_BOLD,
  });
}

function loadFontSource(source: ResumeFontSource) {
  const cacheKey = `${source.profile}:${source.source}`;
  const existing = fontSourceCache.get(cacheKey);
  if (existing) return existing;

  const promise = Promise.all([
    fetchFontBuffer(source.regularUrl),
    fetchFontBuffer(source.boldUrl),
  ])
    .then(async ([regularBuffer, boldBuffer]) => {
      const fontFamily = `StarJobResume-${cacheKey.replace(/[^a-z-]/g, "-")}-v1`;
      await installAndValidateFontPair(fontFamily, regularBuffer, boldBuffer);
      return {
        bold: arrayBufferToBase64(boldBuffer),
        cacheKey,
        fontFamily,
        profile: source.profile,
        regular: arrayBufferToBase64(regularBuffer),
        source: source.source,
      } satisfies ResumeFontBundle;
    })
    .catch((error) => {
      fontSourceCache.delete(cacheKey);
      throw normalizeFontError(error);
    });
  fontSourceCache.set(cacheKey, promise);
  return promise;
}

async function fetchFontBuffer(path: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), FONT_TIMEOUT_MS);

  try {
    const response = await fetch(path, { cache: "force-cache", signal: controller.signal });
    if (response.status === 404) throw new Error("简历字体文件不存在（404），请联系网站管理员。");
    if (response.status === 403) throw new Error("简历字体访问权限错误（403），请联系网站管理员。");
    if (!response.ok) throw new Error(`简历字体加载失败（HTTP ${response.status}），请稍后重新生成。`);
    return await response.arrayBuffer();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("简历字体加载超时，请检查网络后重新生成。");
    }

    throw normalizeFontError(error);
  } finally {
    window.clearTimeout(timeout);
  }
}

async function installAndValidateFontPair(
  fontFamily: string,
  regularBuffer: ArrayBuffer,
  boldBuffer: ArrayBuffer,
) {
  if (typeof FontFace === "undefined" || typeof document === "undefined") return;
  const regularFace = new FontFace(fontFamily, regularBuffer.slice(0), { style: "normal", weight: "400" });
  const boldFace = new FontFace(fontFamily, boldBuffer.slice(0), { style: "normal", weight: "700" });
  const loadedFaces = await Promise.all([regularFace.load(), boldFace.load()]);
  for (const face of loadedFaces) {
    document.fonts.add(face);
    installedFontFaces.add(face);
  }
}

function normalizeFontError(error: unknown) {
  if (error instanceof TypeError) {
    return new Error("简历字体网络请求失败，请检查网络后重新生成。");
  }
  if (error instanceof Error) return error;
  return new Error("简历字体网络请求失败，请检查网络后重新生成。");
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

  if (templateId === "consulting") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize + 0.05,
      headingSize: options.headingSize + 0.45,
      sectionGap: options.sectionGap + 0.2,
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

  if (templateId === "technical") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize - 0.05,
      bulletSize: options.bulletSize - 0.05,
      headingSize: options.headingSize + 0.15,
      sectionGap: options.sectionGap + 0.4,
    }));
  }

  if (templateId === "academic") {
    return COMPACT_OPTIONS.map((options) => ({
      ...options,
      templateId,
      bodySize: options.bodySize - 0.1,
      bulletSize: options.bulletSize - 0.1,
      headingSize: options.headingSize + 0.1,
      itemGap: options.itemGap + 0.35,
      sectionGap: options.sectionGap + 0.6,
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
