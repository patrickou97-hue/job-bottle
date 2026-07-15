"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileSearch, FileUp, LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { extractResumeFileText } from "@/lib/resume-file-reader";
import {
  parseResumeTextLocally,
  type ImportedResumeDraft,
  type ResumeImportLocalResult,
} from "@/lib/resume-import";

type ImportReview = {
  summary: string;
  draft: ImportedResumeDraft;
  warnings: string[];
};

export type ResumeImportMode = "program" | "ai";

export function ResumeImportDialog({
  onClose,
  onImport,
}: {
  onClose: () => void;
  onImport: (draft: ImportedResumeDraft, mode: ResumeImportMode) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [localResult, setLocalResult] = useState<ResumeImportLocalResult | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "reviewing">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && stage === "idle") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, stage]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setStage("reading");
    setError("");
    setReview(null);
    setFileName(file.name);
    try {
      const sourceText = await extractResumeFileText(file);
      const parsed = parseResumeTextLocally(sourceText, file.name);
      if (parsed.normalizedText.length < 120) {
        setLocalResult(parsed);
        setError("提取到的文字太少，文件可能是扫描件。请改用可复制文字的 PDF、DOCX 或 TXT。 ");
        return;
      }
      setLocalResult(parsed);
    } catch (fileError) {
      setLocalResult(null);
      setError(fileError instanceof Error ? fileError.message : "读取文件失败，请换一个文件重试");
    } finally {
      setStage("idle");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function requestReview() {
    if (!localResult) return;
    setStage("reviewing");
    setError("");
    try {
      const response = await fetch("/api/resume/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          sourceText: localResult.normalizedText,
          localDraft: localResult.draft,
        }),
      });
      const payload = await response.json().catch(() => null) as (ImportReview & { error?: string }) | null;
      if (!response.ok || !payload?.draft) {
        throw new Error(payload?.error || "智能复核失败，请稍后重试");
      }
      setReview(payload);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "智能复核失败，请稍后重试");
    } finally {
      setStage("idle");
    }
  }

  const finalDraft = review?.draft ?? localResult?.draft ?? null;
  const summary = finalDraft ? summarizeDraft(finalDraft) : null;

  return (
    <div className="theme-work fixed inset-0 z-[90] flex items-end justify-center bg-black/48 p-0 sm:items-center sm:p-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-import-title"
        className="apple-sheet max-h-[92svh] w-full max-w-3xl overflow-y-auto p-5 sm:p-7"
      >
        <div className="mb-3 flex justify-center sm:hidden"><span className="apple-sheet-handle" /></div>
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--line-ghost)] pb-5">
          <div>
            <p className="text-xs text-ink-muted">本地读取 · AI 复核 · 确认生成</p>
            <h2 id="resume-import-title" className="mt-1 text-xl font-semibold text-ink-primary">导入已有简历</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
              支持 PDF、DOCX 和 TXT，文件不超过 8 MB。浏览器先读取文字，只将提取出的文字和本地候选发送给 AI；不会上传原文件，也不会自动创建或覆盖简历。
            </p>
          </div>
          <button type="button" className="muted-button pressable inline-flex size-9 shrink-0 items-center justify-center rounded-lg" aria-label="关闭" disabled={stage !== "idle"} onClick={onClose}>
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="py-6">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
            onChange={(event) => void handleFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className="pressable flex min-h-28 w-full items-center justify-between gap-5 border-y border-[color:var(--line-ghost)] px-1 py-5 text-left transition hover:bg-[color:var(--surface-hover-bg)] disabled:pointer-events-none disabled:opacity-50"
            disabled={stage !== "idle"}
            onClick={() => inputRef.current?.click()}
          >
            <span className="flex min-w-0 items-center gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#12294e] text-white">
                {stage === "reading" ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <FileUp aria-hidden="true" className="size-5" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink-primary">{fileName || "选择一份已有简历"}</span>
                <span className="mt-1 block text-xs leading-5 text-ink-muted">{stage === "reading" ? "正在本地提取文字" : "点击选择文件，原文件不会离开浏览器"}</span>
              </span>
            </span>
            <span className="shrink-0 text-xs text-ink-muted">PDF / DOCX / TXT</span>
          </button>
        </div>

        {localResult ? (
          <section className="border-t border-[color:var(--line-ghost)] py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">程序读取结果</h3>
                <p className="mt-1 text-xs text-ink-muted">已提取 {localResult.normalizedText.length.toLocaleString("zh-CN")} 个字符</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {localResult.signals.length > 0
                  ? localResult.signals.map((signal) => <span key={signal} className="status-pill rounded-md px-2.5 py-1 text-xs text-ink-secondary">{signal}</span>)
                  : <span className="text-xs text-ink-muted">尚未识别明确字段</span>}
              </div>
            </div>
            {localResult.warnings.length > 0 ? <WarningList items={localResult.warnings} /> : null}
            <p className="mt-4 text-xs leading-5 text-ink-muted">
              你可以直接导入程序解析结果，也可以等待 AI 复核后再导入。AI 超时或失败不会清除当前解析结果。
            </p>
          </section>
        ) : null}

        {review && summary ? (
          <section className="border-t border-[color:var(--line-ghost)] py-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <Check aria-hidden="true" className="size-4 text-[#4f7c65]" />
              AI 已完成结构复核 · {review.draft.language === "en-US" ? "英文简历" : "中文简历"}
            </div>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{review.summary}</p>
            <div className="mt-5 grid grid-cols-3 border-y border-[color:var(--line-ghost)] py-4 sm:grid-cols-6">
              {summary.map((item) => (
                <div key={item.label} className="px-3 first:pl-0">
                  <p className="text-xl font-semibold tabular-nums text-ink-primary">{item.value}</p>
                  <p className="mt-1 text-[11px] text-ink-muted">{item.label}</p>
                </div>
              ))}
            </div>
            {review.warnings.length > 0 ? <WarningList items={review.warnings} /> : <p className="mt-4 text-xs text-ink-muted">未发现需要特别提示的结构问题，生成后仍建议逐项检查原文。</p>}
          </section>
        ) : null}

        {error ? <p className="border-l-2 border-[#9f2d3f] pl-3 text-sm leading-6 text-[color:var(--text-danger)]">{error}</p> : null}

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[color:var(--line-ghost)] pt-5">
          <Button variant="secondary" onClick={onClose} disabled={stage !== "idle"}>取消</Button>
          {localResult ? (
            <Button variant="secondary" disabled={stage !== "idle"} onClick={() => onImport(localResult.draft, "program")}>
              直接导入解析结果
            </Button>
          ) : null}
          {localResult ? (
            <Button variant="secondary" className="gap-2" disabled={stage !== "idle"} onClick={() => void requestReview()}>
              {stage === "reviewing" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : review ? <FileSearch aria-hidden="true" className="size-4" /> : <Sparkles aria-hidden="true" className="size-4" />}
              {stage === "reviewing" ? "AI 正在复核" : review ? "重新复核" : "交给 AI 复核"}
            </Button>
          ) : null}
          {review ? <Button onClick={() => onImport(review.draft, "ai")}>导入 AI 复核结果</Button> : null}
        </footer>
      </section>
    </div>
  );
}

function WarningList({ items }: { items: string[] }) {
  return <ul className="mt-4 space-y-1 border-l border-[#b78845]/60 pl-3 text-xs leading-5 text-[#8a4b16]">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>;
}

function summarizeDraft(draft: ImportedResumeDraft) {
  return [
    { label: "教育", value: draft.education.length },
    { label: "工作", value: draft.work.length },
    { label: "项目", value: draft.projects.length },
    { label: "技能", value: draft.skills.length },
    { label: "校园", value: draft.campus.length },
    { label: "其他", value: draft.awards.length + draft.certifications.length + draft.languages.length + draft.customSections.length },
  ];
}
