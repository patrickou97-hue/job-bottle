"use client";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
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
  const document = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 12); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => {
      if (!("str" in item)) return "";
      return `${item.str}${"hasEOL" in item && item.hasEOL ? "\n" : " "}`;
    }).join(""));
  }
  return normalizeText(pages.join("\n"));
}

function normalizeText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
