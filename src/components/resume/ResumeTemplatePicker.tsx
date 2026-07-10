"use client";

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { RESUME_TEMPLATES, type ResumeTemplateId } from "@/lib/resume";

const TEMPLATE_SWATCHES: Record<ResumeTemplateId, { accent: string; header: string; rule: string }> = {
  compact: { accent: "#111111", header: "centered", rule: "split" },
  classic: { accent: "#111111", header: "centered", rule: "strong" },
  modern: { accent: "#172033", header: "left", rule: "soft" },
  consulting: { accent: "#252a33", header: "centered", rule: "strong" },
  technical: { accent: "#155e75", header: "left", rule: "accent" },
  academic: { accent: "#4b5563", header: "centered", rule: "split" },
  english_classic: { accent: "#111111", header: "centered", rule: "strong" },
  english_modern: { accent: "#203a5f", header: "left", rule: "accent" },
};

export function ResumeTemplatePicker({
  selectedTemplateId,
  onChange,
}: {
  selectedTemplateId: ResumeTemplateId;
  onChange: (templateId: ResumeTemplateId) => void;
}) {
  return (
    <section className="border-y border-white/[0.1] py-5" aria-labelledby="resume-template-heading">
      <h2 id="resume-template-heading" className="mb-4 text-lg font-semibold text-ink-primary">简历版式</h2>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
        {RESUME_TEMPLATES.map((template) => {
          const selected = template.id === selectedTemplateId;
          return (
            <button
              key={template.id}
              type="button"
              aria-pressed={selected}
              className={`group min-w-[166px] snap-start rounded-lg p-2 text-left transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--star-apricot)] ${
                selected
                  ? "bg-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                  : "hover:bg-white/[0.055] active:scale-[0.98]"
              }`}
              onClick={() => onChange(template.id)}
            >
              <TemplateSwatch templateId={template.id} />
              <span className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold text-ink-primary">
                {template.label}
                {selected ? <Check aria-label="当前版式" className="size-4 text-[color:var(--star-apricot)]" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TemplateSwatch({ templateId }: { templateId: ResumeTemplateId }) {
  const swatch = TEMPLATE_SWATCHES[templateId];
  const centered = swatch.header === "centered";
  const ruleClass =
    swatch.rule === "strong"
      ? "h-[2px]"
      : swatch.rule === "accent"
        ? "h-[2px]"
        : "h-px";

  return (
    <span className="block h-[122px] overflow-hidden rounded-md bg-[#f7f7f4] p-3 shadow-[0_7px_20px_rgba(0,0,0,0.18)]">
      <span className={`block h-[5px] w-14 rounded-full bg-[color:var(--template-accent)] ${centered ? "mx-auto" : ""}`} style={{ "--template-accent": swatch.accent } as CSSProperties} />
      <span className={`mt-2 block h-[3px] w-24 rounded-full bg-black/[0.42] ${centered ? "mx-auto" : ""}`} />
      <span className={`mt-2 block w-full bg-[color:var(--template-accent)] ${ruleClass}`} style={{ "--template-accent": swatch.accent } as CSSProperties} />
      <span className="mt-3 block space-y-2">
        <span className="block h-[3px] w-full rounded-full bg-black/[0.18]" />
        <span className="block h-[3px] w-[82%] rounded-full bg-black/[0.16]" />
        <span className="mt-3 block h-[5px] w-12 rounded-full bg-[color:var(--template-accent)]" style={{ "--template-accent": swatch.accent } as CSSProperties} />
        <span className="mt-2 block h-[3px] w-full rounded-full bg-black/[0.18]" />
        <span className="block h-[3px] w-[70%] rounded-full bg-black/[0.16]" />
      </span>
    </span>
  );
}
