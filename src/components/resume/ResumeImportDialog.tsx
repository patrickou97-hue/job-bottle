"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileSearch, FileUp, LoaderCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AiTaskProgress } from "@/components/ui/AiTaskProgress";
import { MotionDialog } from "@/components/ui/MotionDialog";
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

type ImportReviewProgress = {
  completed: number;
  total: number;
  label: string;
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
  const reviewAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const [fileName, setFileName] = useState("");
  const [localResult, setLocalResult] = useState<ResumeImportLocalResult | null>(null);
  const [review, setReview] = useState<ImportReview | null>(null);
  const [stage, setStage] = useState<"idle" | "reading" | "reviewing">("idle");
  const [error, setError] = useState("");
  const [reviewProgress, setReviewProgress] = useState<ImportReviewProgress | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      reviewAbortRef.current?.abort("closed");
    };
  }, []);

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
        setError("读取到的文字过少，文件可能是扫描件。请改用文字可复制的 PDF、DOCX 或 TXT。");
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
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setError("当前网络不可用。本地识别结果仍可直接导入；联网后可再进行 AI 智能整理。");
      return;
    }
    reviewAbortRef.current?.abort("replaced");
    const controller = new AbortController();
    reviewAbortRef.current = controller;
    setStage("reviewing");
    setError("");
    setReviewProgress({ completed: 0, total: 2, label: "AI 正在通读整份简历并判断区块归属" });
    const timeout = window.setTimeout(() => controller.abort("timeout"), 118_000);
    try {
      const response = await fetch("/api/resume/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          sourceText: localResult.normalizedText,
          localDraft: localResult.draft,
          progressMode: "ndjson",
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(payload?.error || "AI 智能整理暂时不可用，请稍后重试。");
      }
      const payload = response.headers.get("content-type")?.includes("application/x-ndjson")
        ? await readImportReviewStream(response, (progress) => mountedRef.current && setReviewProgress(progress))
        : await response.json().catch(() => null) as ImportReview | null;
      if (!payload?.draft) throw new Error("AI 智能整理暂时不可用，请稍后重试。");
      setReview(payload);
    } catch (reviewError) {
      if (!mountedRef.current || controller.signal.reason === "closed") return;
      if (controller.signal.aborted) {
        setError(controller.signal.reason === "timeout"
          ? "AI 智能整理已等待 118 秒。本地识别结果仍可直接导入，也可稍后重试。"
          : "本次智能整理已取消，本地识别结果仍然保留。");
      } else {
        setError(reviewError instanceof Error ? reviewError.message : "AI 智能整理暂时不可用，请稍后重试。");
      }
    } finally {
      window.clearTimeout(timeout);
      if (reviewAbortRef.current === controller) reviewAbortRef.current = null;
      if (mountedRef.current) {
        setStage("idle");
        setReviewProgress(null);
      }
    }
  }

  function cancelReview() {
    reviewAbortRef.current?.abort("cancelled");
  }

  function closeDialog() {
    reviewAbortRef.current?.abort("closed");
    onClose();
  }

  function importDraft(draft: ImportedResumeDraft, mode: ResumeImportMode) {
    reviewAbortRef.current?.abort("closed");
    onImport(draft, mode);
  }

  const finalDraft = review?.draft ?? localResult?.draft ?? null;
  const summary = finalDraft ? summarizeDraft(finalDraft) : null;

  return (
    <MotionDialog
      labelledBy="resume-import-title"
      className="max-w-3xl p-5 sm:p-7"
      onBackdropClick={stage === "idle" ? closeDialog : undefined}
      onEscapeKeyDown={stage === "idle" ? closeDialog : undefined}
    >
        <div className="mb-3 flex justify-center sm:hidden"><span className="apple-sheet-handle" /></div>
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--line-ghost)] pb-5">
          <div>
            <p className="text-xs text-ink-muted">01 本地读取 · 02 AI 理解全文 · 03 确认导入</p>
            <h2 id="resume-import-title" className="mt-1 text-xl font-semibold text-ink-primary">导入已有简历</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
              支持 PDF、DOCX 和 TXT，文件不超过 8 MB。浏览器先读取文字；AI 会通读整份简历，再决定教育、工作、项目、技能和其他内容应分别填入哪里。不会上传原文件，也不会自动创建或覆盖简历。
            </p>
          </div>
          <button type="button" className="muted-button pressable inline-flex size-9 shrink-0 items-center justify-center rounded-lg" aria-label="关闭" disabled={stage === "reading"} onClick={closeDialog}>
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
                <span className="block truncate text-sm font-semibold text-ink-primary">{fileName || "选择简历文件"}</span>
                <span className="mt-1 block text-xs leading-5 text-ink-muted">{stage === "reading" ? "正在本地读取文字" : "原文件仅在本地读取，不会离开浏览器"}</span>
              </span>
            </span>
            <span className="shrink-0 text-xs text-ink-muted">PDF / DOCX / TXT</span>
          </button>
        </div>

        {localResult ? (
          <section className="border-t border-[color:var(--line-ghost)] py-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-ink-primary">本地识别结果</h3>
                <p className="mt-1 text-xs text-ink-muted">已读取 {localResult.normalizedText.length.toLocaleString("zh-CN")} 个字符</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {localResult.signals.length > 0
                  ? localResult.signals.map((signal) => <span key={signal} className="status-pill rounded-md px-2.5 py-1 text-xs text-ink-secondary">{signal}</span>)
                  : <span className="text-xs text-ink-muted">暂未识别出明确字段</span>}
              </div>
            </div>
            {localResult.warnings.length > 0 ? <WarningList items={localResult.warnings} /> : null}
            <p className="mt-4 text-xs leading-5 text-ink-muted">
              可直接导入本地识别结果，也可等待 AI 智能整理后再导入。AI 结果只有在全部区块通过结构校验后才会出现；失败不会混入未复核的局部结果。
            </p>
            {stage === "reviewing" && reviewProgress ? (
              <AiTaskProgress
                title="正在智能整理整份简历"
                label={reviewProgress.label}
                completed={reviewProgress.completed}
                total={reviewProgress.total}
                protection="本地识别结果已保留；全部区块完成前不会创建或覆盖简历"
                onCancel={cancelReview}
                className="mt-4"
              />
            ) : null}
          </section>
        ) : null}

        {review && summary ? (
          <section className="border-t border-[color:var(--line-ghost)] py-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <Check aria-hidden="true" className="size-4 text-[#4f7c65]" />
              AI 智能整理已完成 · {review.draft.language === "en-US" ? "英文简历" : "中文简历"}
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
            {review.warnings.length > 0 ? <WarningList items={review.warnings} /> : <p className="mt-4 text-xs text-ink-muted">未发现明显的结构问题。生成后仍请逐项核对原文。</p>}
          </section>
        ) : null}

        {error ? <p className="border-l-2 border-[#9f2d3f] pl-3 text-sm leading-6 text-[color:var(--text-danger)]">{error}</p> : null}

        <footer className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-[color:var(--line-ghost)] pt-5">
          <Button variant="secondary" onClick={stage === "reviewing" ? cancelReview : closeDialog} disabled={stage === "reading"}>{stage === "reviewing" ? "停止复核" : "取消"}</Button>
          {localResult ? (
            <Button variant="secondary" disabled={stage === "reading"} onClick={() => importDraft(localResult.draft, "program")}>
              直接导入本地结果
            </Button>
          ) : null}
          {localResult ? (
            <Button variant={review ? "secondary" : "primary"} className="gap-2" disabled={stage !== "idle"} onClick={() => void requestReview()}>
              {stage === "reviewing" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : review ? <FileSearch aria-hidden="true" className="size-4" /> : <Sparkles aria-hidden="true" className="size-4" />}
              {stage === "reviewing" ? "AI 正在理解全文" : review ? "重新智能整理" : "AI 智能整理"}
            </Button>
          ) : null}
          {review ? <Button disabled={stage === "reading"} onClick={() => importDraft(review.draft, "ai")}>导入智能整理结果</Button> : null}
        </footer>
    </MotionDialog>
  );
}

async function readImportReviewStream(
  response: Response,
  onProgress: (progress: ImportReviewProgress) => void,
) {
  if (!response.body) throw new Error("浏览器无法读取复核进度，请重新导入。");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: ImportReview | null = null;

  function consume(line: string) {
    if (!line.trim()) return;
    const event = JSON.parse(line) as {
      type?: string;
      completed?: number;
      total?: number;
      label?: string;
      error?: string;
      data?: ImportReview;
    };
    if ((event.type === "start" || event.type === "progress") && typeof event.completed === "number" && typeof event.total === "number") {
      onProgress({ completed: event.completed, total: event.total, label: event.label || "AI 正在理解整份简历" });
    }
    if (event.type === "result" && event.data?.draft) result = event.data;
    if (event.type === "error") throw new Error(event.error || "AI 智能整理暂时不可用，请稍后重试。");
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    lines.forEach(consume);
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  return result;
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
