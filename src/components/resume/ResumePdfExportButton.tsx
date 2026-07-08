"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";

export function ResumePdfExportButton({ resume }: { resume: ResumeDocument }) {
  function handlePrint() {
    const previousTitle = document.title;
    const name = resume.content.basics.name || resume.title || "Resume";
    document.title = `${name}-Resume`;
    window.print();
    window.setTimeout(() => {
      document.title = previousTitle;
    }, 800);
  }

  return (
    <Button onClick={handlePrint} className="gap-2">
      <Download aria-hidden="true" className="size-4" />
      下载 PDF
    </Button>
  );
}
