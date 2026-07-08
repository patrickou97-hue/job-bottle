"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";

export function ResumePdfExportButton({ resume }: { resume: ResumeDocument }) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    const name = resume.content.basics.name || resume.title || "Resume";

    try {
      const target = document.getElementById("resume-print-area");
      if (!target) throw new Error("没有找到简历预览区域。");
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(target, {
        backgroundColor: "#ffffff",
        scale: Math.min(2.4, window.devicePixelRatio || 2),
        useCORS: true,
        logging: false,
        windowWidth: target.scrollWidth,
        windowHeight: target.scrollHeight,
      });

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

      if (imageHeight <= pageHeight + 1) {
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, imageWidth, imageHeight);
      } else {
        addCanvasAcrossPages(pdf, canvas, pageWidth, pageHeight);
      }

      pdf.save(`${name}-Resume.pdf`);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <Button onClick={() => void handleExport()} className="gap-2" disabled={isExporting}>
      <Download aria-hidden="true" className="size-4" />
      {isExporting ? "正在生成" : "下载 PDF"}
    </Button>
  );
}

function addCanvasAcrossPages(
  pdf: import("jspdf").jsPDF,
  sourceCanvas: HTMLCanvasElement,
  pageWidth: number,
  pageHeight: number,
) {
  const sliceHeight = Math.floor((sourceCanvas.width * pageHeight) / pageWidth);
  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < sourceCanvas.height) {
    const currentSliceHeight = Math.min(sliceHeight, sourceCanvas.height - offsetY);
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
