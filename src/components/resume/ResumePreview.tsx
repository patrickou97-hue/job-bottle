"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ResumeDocument } from "@/lib/resume";
import {
  createResumePreviewLayout,
  type ResumePreviewLayout,
  type ResumePreviewOperation,
} from "./resumePdf";

type PreviewState =
  | { status: "rendering"; layout: ResumePreviewLayout | null }
  | { status: "ready"; layout: ResumePreviewLayout }
  | { status: "error"; layout: ResumePreviewLayout | null; message: string };

export function ResumePreview({ resume }: { resume: ResumeDocument }) {
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<PreviewState>({ status: "rendering", layout: null });

  useEffect(() => {
    let cancelled = false;
    setPreview((current) => ({ status: "rendering", layout: current.layout }));

    const timer = window.setTimeout(async () => {
      try {
        const layout = await createResumePreviewLayout(resume);
        if (!cancelled) setPreview({ status: "ready", layout });
      } catch (error) {
        if (cancelled) return;
        setPreview((current) => ({
          status: "error",
          layout: current.layout,
          message: error instanceof Error ? error.message : "A4 预览生成失败，请稍后重试。",
        }));
      }
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [resume, revision]);

  const layout = preview.layout;

  return (
    <div
      className="mx-auto w-full max-w-[210mm]"
      data-resume-preview
      data-page-count={layout?.pageCount ?? 0}
      data-page-width={layout?.pageWidth ?? ""}
      data-page-height={layout?.pageHeight ?? ""}
    >
      <div className="mb-2 flex min-h-6 items-center justify-between gap-3 text-xs text-ink-muted">
        <span>{layout ? `A4 · ${layout.pageCount} 页` : "正在生成 A4 预览"}</span>
        {preview.status === "rendering" && layout ? <span>正在同步内容</span> : null}
      </div>

      <div className="space-y-5">
        {layout
          ? Array.from({ length: layout.pageCount }, (_, index) => (
              <ResumePage key={index + 1} layout={layout} page={index + 1} />
            ))
          : (
              <div className="grid aspect-[210/297] w-full place-items-center bg-white text-sm text-[#5b6270] shadow-[0_24px_90px_rgba(0,0,0,0.28)]">
                正在生成 A4 预览
              </div>
            )}
      </div>

      {preview.status === "error" ? (
        <div className="mt-3 border-l-2 border-[#7F5568] bg-[rgba(127,85,104,0.14)] p-3 text-sm text-ink-secondary">
          <p>预览暂时无法生成。{preview.message} 你填写的内容仍保留在当前页面。</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-ink-primary"
            onClick={() => setRevision((value) => value + 1)}
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            重新生成
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ResumePage({ layout, page }: { layout: ResumePreviewLayout; page: number }) {
  const operations = useMemo(
    () => layout.operations.filter((operation) => operation.page === page),
    [layout.operations, page],
  );

  return (
    <svg
      viewBox={`0 0 ${layout.pageWidth} ${layout.pageHeight}`}
      className="block aspect-[210/297] w-full bg-white shadow-[0_24px_90px_rgba(0,0,0,0.28)]"
      style={{ aspectRatio: `${layout.pageWidth} / ${layout.pageHeight}` }}
      role="img"
      aria-label={`A4 简历预览第 ${page} 页，共 ${layout.pageCount} 页`}
    >
      <rect width={layout.pageWidth} height={layout.pageHeight} fill="#ffffff" />
      {operations.map((operation, index) => (
        <ResumeOperation key={`${page}-${index}`} operation={operation} />
      ))}
    </svg>
  );
}

function ResumeOperation({ operation }: { operation: ResumePreviewOperation }) {
  if (operation.type === "line") {
    return (
      <line
        x1={operation.x1}
        y1={operation.y1}
        x2={operation.x2}
        y2={operation.y2}
        stroke={operation.color}
        strokeWidth={operation.width}
      />
    );
  }

  if (operation.type === "image") {
    return (
      <image
        href={operation.src}
        x={operation.x}
        y={operation.y}
        width={operation.width}
        height={operation.height}
        preserveAspectRatio="none"
      />
    );
  }

  return (
    <text
      x={operation.x}
      y={operation.y}
      fill={operation.color}
      fontFamily="Noto Serif SC Local, Songti SC, STSong, SimSun, serif"
      fontSize={operation.size}
      fontWeight={operation.weight === "bold" ? 700 : 400}
      lengthAdjust="spacingAndGlyphs"
      textLength={operation.width}
      xmlSpace="preserve"
    >
      {operation.text}
    </text>
  );
}
