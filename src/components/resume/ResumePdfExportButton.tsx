"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";
import { track } from "@/lib/track";
import { exportResumeToPdf } from "./resumePdf";

export function ResumePdfExportButton({
  preserveDraft,
  resume,
}: {
  preserveDraft: () => boolean;
  resume: ResumeDocument;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleExport() {
    if (isExporting) return;
    setIsExporting(true);
    setMessage("");

    try {
      if (!preserveDraft()) {
        setMessage("浏览器存储空间不足，当前简历尚未安全保存。请压缩或删除照片后重试");
        return;
      }
      const authenticated = await hasVerifiedDownloadSession();

      if (!authenticated) {
        const query = searchParams.toString();
        const next = `${pathname}${query ? `?${query}` : ""}`;
        setMessage("当前简历已保存在本浏览器，注册或登录后即可下载");
        router.push(`/login?next=${encodeURIComponent(next)}&mode=register&reason=resume-download`);
        return;
      }

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

async function hasVerifiedDownloadSession() {
  try {
    const response = await fetch("/api/resume/download-auth", {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return false;
    const result = (await response.json()) as { authenticated?: unknown };
    return result.authenticated === true;
  } catch {
    return false;
  }
}
