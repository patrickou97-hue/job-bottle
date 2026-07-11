"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  requestResumePolish,
  type ResumePolishContent,
  type ResumePolishInstruction,
  type ResumePolishLanguage,
  type ResumePolishResult,
  type ResumePolishSectionType,
} from "@/lib/resume-ai";

export type ResumePolishTarget = {
  id: string;
  label: string;
  sectionType: ResumePolishSectionType;
  content: ResumePolishContent;
};

const instructionOptions: { label: string; value: ResumePolishInstruction }[] = [
  { label: "更专业", value: "professional" },
  { label: "更简洁", value: "concise" },
  { label: "更突出成果", value: "results" },
  { label: "更匹配目标岗位", value: "relevance" },
  { label: "优化英文表达", value: "english" },
];

export function ResumePolishDialog({
  target,
  targetRole,
  jobDescription,
  language,
  onApply,
  onClose,
}: {
  target: ResumePolishTarget;
  targetRole: string;
  jobDescription: string;
  language: ResumePolishLanguage;
  onApply: (result: ResumePolishResult, bulletIndex: number | null) => void;
  onClose: () => void;
}) {
  const [instruction, setInstruction] = useState<ResumePolishInstruction>(language === "en-US" ? "english" : "professional");
  const [scope, setScope] = useState("all");
  const [result, setResult] = useState<ResumePolishResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const bulletIndex = scope === "all" ? null : Number(scope);
  const sourceBullets = bulletIndex === null
    ? target.content.bullets
    : [target.content.bullets[bulletIndex] ?? ""];

  async function generate() {
    if (!sourceBullets.some((bullet) => bullet.trim())) {
      setError("当前段落为空，请先填写内容");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const next = await requestResumePolish({
        sectionType: target.sectionType,
        content: { ...target.content, bullets: sourceBullets },
        targetRole,
        jobDescription,
        language,
        instruction,
      });
      setResult(next);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "AI 润色失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="resume-polish-title"
        className="max-h-[92svh] w-full max-w-4xl overflow-y-auto border border-white/[0.14] bg-[#08152c]/96 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.65)] sm:p-7"
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/[0.1] pb-5">
          <div>
            <p className="text-xs text-ink-muted">{target.label}</p>
            <h2 id="resume-polish-title" className="mt-1 text-xl font-semibold text-ink-primary">AI 润色</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">仅处理当前段落，不会发送联系方式、照片或整份简历</p>
          </div>
          <button type="button" className="muted-button pressable inline-flex size-9 shrink-0 items-center justify-center rounded-full" aria-label="关闭" onClick={onClose}>
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid gap-4 border-b border-white/[0.1] py-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-ink-muted">润色范围</span>
            <Select value={scope} onChange={(event) => { setScope(event.target.value); setResult(null); }}>
              <option value="all">当前经历全部描述</option>
              {target.content.bullets.map((bullet, index) => <option key={index} value={index}>第 {index + 1} 条 · {bullet.slice(0, 24) || "空白"}</option>)}
            </Select>
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-ink-muted">润色目标</span>
            <Select value={instruction} onChange={(event) => { setInstruction(event.target.value as ResumePolishInstruction); setResult(null); }}>
              {instructionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </Select>
          </label>
        </div>

        <div className="grid gap-6 py-6 lg:grid-cols-2">
          <PolishColumn title="原始内容" bullets={sourceBullets} />
          <PolishColumn title="润色结果" bullets={result?.revised.bullets ?? []} placeholder={busy ? "正在润色" : "生成后在这里预览，不会自动覆盖原文"} />
        </div>

        {result ? (
          <div className="space-y-4 border-t border-white/[0.1] pt-5 text-sm leading-6">
            <ResultBlock title="修改说明" items={[result.summary, ...result.changes.map((change) => change.description)]} />
            <ResultBlock title="建议补充" items={result.suggestions} empty="暂无" />
            <ResultBlock title="风险提示" items={result.warnings} empty="暂无" warning />
          </div>
        ) : null}

        {error ? <p className="mt-5 border-l-2 border-red-300/70 pl-3 text-sm text-red-100">{error}</p> : null}

        <footer className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/[0.1] pt-5">
          <Button variant="secondary" onClick={onClose}>保留原文</Button>
          <Button variant="secondary" className="gap-2" disabled={busy} onClick={generate}>
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : result ? <RefreshCw aria-hidden="true" className="size-4" /> : <Sparkles aria-hidden="true" className="size-4" />}
            {busy ? "正在润色" : result ? "重新生成" : "生成润色"}
          </Button>
          {result ? <Button onClick={() => onApply(result, bulletIndex)}>应用修改</Button> : null}
        </footer>
      </section>
    </div>
  );
}

function PolishColumn({ title, bullets, placeholder }: { title: string; bullets: string[]; placeholder?: string }) {
  return (
    <section className="min-w-0">
      <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
      {bullets.length ? <ul className="mt-3 space-y-3 text-sm leading-6 text-ink-secondary">{bullets.map((bullet, index) => <li key={index} className="border-l border-white/[0.14] pl-3">{bullet}</li>)}</ul> : <p className="mt-3 text-sm leading-6 text-ink-muted">{placeholder}</p>}
    </section>
  );
}

function ResultBlock({ title, items, empty, warning = false }: { title: string; items: string[]; empty?: string; warning?: boolean }) {
  return (
    <section>
      <h3 className="font-semibold text-ink-primary">{title}</h3>
      {items.length ? <ul className={`mt-1 space-y-1 ${warning ? "text-amber-100" : "text-ink-secondary"}`}>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p className="mt-1 text-ink-muted">{empty}</p>}
    </section>
  );
}
