"use client";

import { normalizeResumeImportText } from "@/lib/resume-import-text";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const MAX_PDF_TEXT_LENGTH = 60_000;
const SUPPORTED_EXTENSIONS = ["pdf", "docx", "txt"] as const;

export async function extractResumeFileText(file: File) {
  if (file.size > MAX_FILE_SIZE) throw new Error("文件不能超过 8 MB");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension as typeof SUPPORTED_EXTENSIONS[number])) {
    throw new Error("请选择 PDF、DOCX 或 TXT 文件");
  }

  if (extension === "txt") return normalizeText(await file.text());
  const arrayBuffer = await file.arrayBuffer();
  if (extension === "docx") return extractDocxText(arrayBuffer);
  return extractPdfText(arrayBuffer);
}

async function extractDocxText(arrayBuffer: ArrayBuffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ arrayBuffer });
  return normalizeText(result.value);
}

async function extractPdfText(arrayBuffer: ArrayBuffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(arrayBuffer),
    // Resume PDFs are untrusted uploads. This code only calls getTextContent
    // and never creates PDF.js annotation/scripting layers; strict parsing also
    // avoids recovering malformed content after a parser error.
    stopAtErrors: true,
  });
  try {
    const document = await loadingTask.promise;
    const pages: string[] = [];
    let extractedLength = 0;
    for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 12); pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageParts: string[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const separator = "hasEOL" in item && item.hasEOL ? "\n" : " ";
        const remaining = MAX_PDF_TEXT_LENGTH - extractedLength;
        if (remaining <= 0) break;
        const part = `${item.str}${separator}`.slice(0, remaining);
        pageParts.push(part);
        extractedLength += part.length;
      }
      pages.push(pageParts.join(""));
      page.cleanup();
      if (extractedLength >= MAX_PDF_TEXT_LENGTH) break;
    }
    return normalizeText(pages.join("\n"));
  } catch {
    throw new Error("PDF 文字读取失败，请另存为标准 PDF，或改用 DOCX / TXT 后重试");
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

function normalizeText(value: string) {
  return normalizeResumeImportText(value, MAX_PDF_TEXT_LENGTH);
}
