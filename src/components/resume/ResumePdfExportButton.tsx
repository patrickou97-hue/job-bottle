"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";
import { track } from "@/lib/track";
import { exportResumeToPdf } from "./resumePdf";

export function ResumePdfExportButton({ resume }: { resume: ResumeDocument }) {
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    setMessage("");

    try {
      await exportResumeToPdf(resume);
      void track("resume_exported", { resume_id: resume.id, template_id: resume.templateId });
      setMessage("PDF 已开始下载");
    } catch (error) {
      console.error("Resume PDF export failed", error);
      setMessage(error instanceof Error ? error.message : "PDF 生成失败，请稍后重试。");
    } finally {
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
