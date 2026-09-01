"use client";

import { FileText, Languages, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { ResumeTemplatePicker } from "@/components/resume/ResumeTemplatePicker";
import { Button } from "@/components/ui/Button";
import { MotionDialog } from "@/components/ui/MotionDialog";
import {
  getDefaultResumeTemplate,
  type ResumeLanguage,
  type ResumeTemplateId,
} from "@/lib/resume";
import { cn } from "@/lib/utils";

export function ResumeCreateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (language: ResumeLanguage, templateId: ResumeTemplateId) => void;
}) {
  const [language, setLanguage] = useState<ResumeLanguage>("zh-CN");
  const [templateId, setTemplateId] = useState<ResumeTemplateId>(getDefaultResumeTemplate("zh-CN"));

  function chooseLanguage(nextLanguage: ResumeLanguage) {
    setLanguage(nextLanguage);
    setTemplateId(getDefaultResumeTemplate(nextLanguage));
  }

  return (
    <MotionDialog
      labelledBy="resume-create-title"
      className="max-w-4xl p-5 sm:p-7"
      onBackdropClick={onClose}
      onEscapeKeyDown={onClose}
    >
        <div className="mb-3 flex justify-center sm:hidden"><span className="apple-sheet-handle" /></div>
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--line-ghost)] pb-5">
          <div>
            <p className="text-xs text-ink-muted">简历语言将决定可用模板与页面标题。</p>
            <h2 id="resume-create-title" className="mt-1 text-xl font-semibold text-ink-primary">新建简历</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">先选择中文或英文，再从对应模板开始。</p>
          </div>
          <button type="button" className="muted-button pressable inline-flex size-9 shrink-0 items-center justify-center rounded-lg" aria-label="关闭" onClick={onClose}>
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid gap-3 border-b border-[color:var(--line-ghost)] py-5 sm:grid-cols-2">
          <LanguageOption
            active={language === "zh-CN"}
            icon={<FileText aria-hidden="true" className="size-5" />}
            title="中文简历"
            description="适用于中文网申、校招与国内岗位"
            onClick={() => chooseLanguage("zh-CN")}
          />
          <LanguageOption
            active={language === "en-US"}
            icon={<Languages aria-hidden="true" className="size-5" />}
            title="English Resume"
            description="For global applications and English roles"
            onClick={() => chooseLanguage("en-US")}
          />
        </div>

        <ResumeTemplatePicker language={language} selectedTemplateId={templateId} onChange={setTemplateId} />

        <footer className="mt-2 flex items-center justify-end gap-3 border-t border-[color:var(--line-ghost)] pt-5">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={() => onCreate(language, templateId)}>使用此模板</Button>
        </footer>
    </MotionDialog>
  );
}

function LanguageOption({
  active,
  description,
  icon,
  onClick,
  title,
}: {
  active: boolean;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "pressable flex min-h-20 items-center gap-4 rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)]",
        active
          ? "border-[color:var(--aurora)] bg-[color:var(--surface-read-bg)] text-ink-primary"
          : "border-[color:var(--line-ghost)] text-ink-secondary hover:border-[color:var(--line-strong)]",
      )}
      onClick={onClick}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#152A55] text-[#F3C64D]">{icon}</span>
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-ink-muted">{description}</span>
      </span>
    </button>
  );
}
