"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  getResumeFontOptions,
  getResumeLatinFontOptions,
  isResumeLocalFont,
  type ResumeFontId,
  type ResumeLanguage,
  type ResumeLatinFontId,
} from "@/lib/resume";
import styles from "./ResumeFontPicker.module.css";
import { enableLocalResumeFont, hasLocalResumeFont } from "./resumePdf";

const SAMPLE_STYLES: Record<ResumeFontId, string> = {
  default: styles.serifSC,
  "noto-sans-sc": styles.sansSC,
  fangsong: styles.fang,
  "times-new-roman": styles.localTimes,
  "helvetica-neue": styles.localHelvetica,
  carlito: styles.calibri,
};

export function ResumeFontPicker({
  language,
  fontId,
  latinFontId,
  onChange,
  onLatinChange,
  onLocalFontEnabled,
}: {
  language: ResumeLanguage;
  fontId: ResumeFontId;
  latinFontId: ResumeLatinFontId;
  onChange: (fontId: ResumeFontId) => void;
  onLatinChange: (fontId: ResumeLatinFontId) => void;
  onLocalFontEnabled: () => void;
}) {
  const [status, setStatus] = useState("");
  const latestSelection = useRef(0);
  useEffect(() => {
    const selection = latestSelection;
    return () => { selection.current += 1; };
  }, []);
  const activeWestern = language === "zh-CN" ? latinFontId : fontId;
  const localFontPending = isResumeLocalFont(activeWestern) && !hasLocalResumeFont(activeWestern);

  async function choose<Id extends ResumeFontId>(id: Id, change: (value: Id) => void) {
    const selection = ++latestSelection.current;
    setStatus("");
    if (isResumeLocalFont(id) && !hasLocalResumeFont(id)) {
      setStatus("正在读取本机字体…");
      try {
        await enableLocalResumeFont(id);
        if (selection !== latestSelection.current) return;
        onLocalFontEnabled();
        setStatus("");
      } catch (error) {
        if (selection !== latestSelection.current) return;
        setStatus(error instanceof Error ? error.message : "未能读取本机字体，预览和导出将使用相近字体。");
      }
    }
    change(id);
  }

  return (
    <section aria-labelledby="resume-font-heading">
      <h2 id="resume-font-heading" className="mb-3 text-lg font-semibold text-ink-primary">简历字体</h2>
      {language === "zh-CN" ? (
        <div className="space-y-3">
          <FontChoices label="中文字体" options={getResumeFontOptions(language)} selectedId={fontId} sample="求职简历" onChange={onChange} />
          <FontChoices label="英文与数字" options={getResumeLatinFontOptions(language)} selectedId={latinFontId} sample="Abc 123" defaultSampleFont={fontId} onChange={(id) => void choose(id, onLatinChange)} />
        </div>
      ) : (
        <FontChoices options={getResumeFontOptions(language)} selectedId={fontId} sample="Abc 123" onChange={(id) => void choose(id, onChange)} />
      )}
      {(status || localFontPending) && (
        <p role="status" className="mt-2 text-xs leading-5 text-ink-secondary">
          {status || "本机字体尚未启用，预览和导出暂用相近字体。可重新点选以启用本机字体。"}
        </p>
      )}
    </section>
  );
}

function FontChoices<Id extends ResumeFontId>({
  label, options, selectedId, sample, defaultSampleFont = "default", onChange,
}: {
  label?: string;
  options: readonly { id: Id; label: string }[];
  selectedId: ResumeFontId;
  sample: string;
  defaultSampleFont?: ResumeFontId;
  onChange: (id: Id) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={label ? "mb-1.5 text-xs font-medium text-ink-secondary" : "sr-only"}>{label ?? "英文简历字体"}</legend>
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(94px,1fr))]">
        {options.map((option) => {
          const selected = option.id === selectedId;
          const sampleFont = option.id === "default" ? defaultSampleFont : option.id;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              className={`min-w-0 rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)] ${selected
                ? "border-[#94a6bd] bg-[#E8EDF4]"
                : "border-[#d2d2d7] bg-white hover:bg-[#f7f7f4]"}`}
            >
              <span className={`block text-base leading-6 text-ink-primary sm:text-lg ${SAMPLE_STYLES[sampleFont]}`} aria-hidden="true">{sample}</span>
              <span className="flex items-start justify-between gap-1 text-xs font-medium text-ink-secondary">
                <span>{option.label}{isResumeLocalFont(option.id) ? <span className="block text-[10px] text-ink-muted">本机字体</span> : null}</span>
                {selected ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
