"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";

const PRINT_AREA_ID = "resume-print-area";
const EXPORT_AREA_ID = "resume-print-area-export";
const A4_PIXEL_WIDTH = 794;
const A4_PIXEL_MIN_HEIGHT = 1123;
const UNSUPPORTED_COLOR_FUNCTION = /\b(?:lab|lch|oklab|oklch|color|color-mix)\(/i;

const SAFE_TEXT_COLOR = "#151822";
const SAFE_MUTED_COLOR = "#4c5567";
const SAFE_BORDER_COLOR = "#d7dbe3";
const SAFE_BACKGROUND_COLOR = "#ffffff";
const EXPORT_COLOR_PROPERTIES = [
  "backgroundColor",
  "borderBlockColor",
  "borderBlockEndColor",
  "borderBlockStartColor",
  "borderBottomColor",
  "borderColor",
  "borderInlineColor",
  "borderInlineEndColor",
  "borderInlineStartColor",
  "borderLeftColor",
  "borderRightColor",
  "borderTopColor",
  "caretColor",
  "color",
  "columnRuleColor",
  "outlineColor",
  "textDecorationColor",
] as const;

export function ResumePdfExportButton({ resume }: { resume: ResumeDocument }) {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    setMessage("");
    const name = sanitizeFileName(resume.content.basics.name || resume.title || "Resume");
    let exportTarget: HTMLElement | null = null;

    try {
      const target = document.getElementById(PRINT_AREA_ID);
      if (!target) throw new Error("没有找到简历预览区域。");
      exportTarget = await createExportTarget(target);
      const pageBreaks = collectPageBreaks(exportTarget);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(exportTarget, {
        backgroundColor: "#ffffff",
        scale: Math.min(2.2, window.devicePixelRatio || 2),
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: exportTarget.scrollWidth,
        height: exportTarget.scrollHeight,
        windowWidth: A4_PIXEL_WIDTH,
        windowHeight: Math.max(A4_PIXEL_MIN_HEIGHT, exportTarget.scrollHeight),
      });
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error("简历预览区域为空，无法生成 PDF。");
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imageWidth = pageWidth;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      const canvasScale = canvas.width / exportTarget.scrollWidth;
      const canvasPageBreaks = pageBreaks.map((breakPoint) => Math.round(breakPoint * canvasScale));

      if (imageHeight <= pageHeight + 1) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imageWidth, imageHeight);
      } else {
        addCanvasAcrossPages(pdf, canvas, pageWidth, pageHeight, canvasPageBreaks);
      }

      pdf.save(`${name}-Resume.pdf`);
      setMessage("PDF 已开始下载");
    } catch (error) {
      console.error("Resume PDF export failed", error);
      setMessage(error instanceof Error ? error.message : "PDF 生成失败，请稍后重试。");
    } finally {
      exportTarget?.remove();
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button onClick={() => void handleExport()} className="gap-2" disabled={isExporting}>
        <Download aria-hidden="true" className="size-4" />
        {isExporting ? "正在生成" : "下载 PDF"}
      </Button>
      {message ? (
        <p className="max-w-[220px] text-right text-xs leading-5 text-ink-muted" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}

async function createExportTarget(target: HTMLElement) {
  const clone = target.cloneNode(true) as HTMLElement;
  clone.id = EXPORT_AREA_ID;
  clone.setAttribute("aria-hidden", "true");
  patchHtml2CanvasUnsupportedColors(target, clone);
  clone.style.position = "fixed";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  clone.style.width = `${A4_PIXEL_WIDTH}px`;
  clone.style.maxWidth = "none";
  clone.style.minHeight = `${A4_PIXEL_MIN_HEIGHT}px`;
  clone.style.height = "auto";
  clone.style.overflow = "visible";
  clone.style.background = "#ffffff";
  clone.style.color = "#151822";
  clone.style.boxShadow = "none";
  clone.style.transform = "none";
  clone.style.zIndex = "-1";
  clone.style.pointerEvents = "none";
  document.body.appendChild(clone);

  await Promise.all([waitForFonts(), waitForImages(clone)]);
  return clone;
}

function patchHtml2CanvasUnsupportedColors(sourceRoot: HTMLElement, cloneRoot: HTMLElement) {
  const sources = [sourceRoot, ...Array.from(sourceRoot.querySelectorAll<HTMLElement>("*"))];
  const clones = [cloneRoot, ...Array.from(cloneRoot.querySelectorAll<HTMLElement>("*"))];

  sources.forEach((source, index) => {
    const clone = clones[index];
    if (!clone) return;
    const computedStyle = window.getComputedStyle(source);

    EXPORT_COLOR_PROPERTIES.forEach((property) => {
      const value = computedStyle[property];
      if (value && UNSUPPORTED_COLOR_FUNCTION.test(value)) {
        clone.style[property] = fallbackExportColor(property, value);
      }
    });
  });
}

function fallbackExportColor(property: (typeof EXPORT_COLOR_PROPERTIES)[number], value: string) {
  const lowerProperty = property.toLowerCase();
  if (lowerProperty.includes("background")) return SAFE_BACKGROUND_COLOR;
  if (lowerProperty.includes("border") || lowerProperty.includes("outline") || lowerProperty.includes("rule")) {
    return SAFE_BORDER_COLOR;
  }

  return value.includes("0.") ? SAFE_MUTED_COLOR : SAFE_TEXT_COLOR;
}

function collectPageBreaks(root: HTMLElement) {
  const rootRect = root.getBoundingClientRect();
  const candidates = Array.from(root.querySelectorAll<HTMLElement>("article > header, article section"))
    .map((element) => Math.round(element.getBoundingClientRect().top - rootRect.top))
    .filter((top) => top > 0);

  return Array.from(new Set(candidates)).sort((first, second) => first - second);
}

async function waitForFonts() {
  if (!document.fonts) return;
  try {
    await document.fonts.ready;
  } catch {
    // Font loading failures should not block exporting the user's resume.
  }
}

function waitForImages(root: HTMLElement) {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map(
      (image) =>
        new Promise<void>((resolve) => {
          if (image.complete) {
            resolve();
            return;
          }
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
}

function sanitizeFileName(value: string) {
  return value.trim().replace(/[\\/:*?"<>|]/g, "-") || "Resume";
}

function addCanvasAcrossPages(
  pdf: import("jspdf").jsPDF,
  sourceCanvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
  pageBreaks: number[],
) {
  const sliceHeight = Math.floor((sourceCanvas.width * pageHeight) / pageWidth);
  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < sourceCanvas.height) {
    const currentSliceHeight = chooseSliceHeight(
      offsetY,
      sliceHeight,
      sourceCanvas.height,
      pageBreaks,
    );
    if (currentSliceHeight < 8) break;

    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = sourceCanvas.width;
    pageCanvas.height = currentSliceHeight;
    const context = pageCanvas.getContext("2d");
    if (!context) break;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    context.drawImage(
      sourceCanvas,
      0,
      offsetY,
      sourceCanvas.width,
      currentSliceHeight,
      0,
      0,
      sourceCanvas.width,
      currentSliceHeight,
    );

    if (pageIndex > 0) pdf.addPage();
    const renderedHeight = (currentSliceHeight * pageWidth) / sourceCanvas.width;
    pdf.addImage(pageCanvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageWidth, renderedHeight);
    offsetY += currentSliceHeight;
    pageIndex += 1;
  }
}

function chooseSliceHeight(
  offsetY: number,
  sliceHeight: number,
  canvasHeight: number,
  pageBreaks: number[],
) {
  const remainingHeight = canvasHeight - offsetY;
  if (remainingHeight <= sliceHeight) return remainingHeight;

  const desiredEnd = offsetY + sliceHeight;
  const minEnd = offsetY + Math.floor(sliceHeight * 0.56);
  const candidate = [...pageBreaks]
    .reverse()
    .find((breakPoint) => breakPoint > minEnd && breakPoint < desiredEnd - 24);

  return candidate ? candidate - offsetY : sliceHeight;
}
