"use client";

import { Eye, LayoutTemplate, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { MotionDialog } from "@/components/ui/MotionDialog";
import {
  buildSharePosterModel,
  DEFAULT_SHARE_POSTER_OVERRIDES,
  getShareDensityLabel,
  type SharePosterOverrides,
} from "@/components/applications/shareBottleData";
import { renderBottleShareCard } from "@/components/applications/shareBottleCard";
import type { BottleStackPosition } from "@/components/applications/bottleGeometry";
import type { ApplicationWithJob } from "@/lib/types";

export function SharePosterEditor({
  open,
  onClose,
  applications,
  positions,
  bottleSnapshotDataUrl,
  onExport,
}: {
  open: boolean;
  onClose: () => void;
  applications: ApplicationWithJob[];
  positions: Map<string, BottleStackPosition>;
  bottleSnapshotDataUrl: string | null;
  onExport: (overrides: SharePosterOverrides) => Promise<void>;
}) {
  const [overrides, setOverrides] = useState<SharePosterOverrides>(() => ({
    ...DEFAULT_SHARE_POSTER_OVERRIDES,
  }));
  const [previewDataUrl, setPreviewDataUrl] = useState("");
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");
  const [exporting, setExporting] = useState(false);
  const model = useMemo(() => buildSharePosterModel(applications, overrides), [applications, overrides]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const timer = window.setTimeout(() => {
      if (active) setPreviewState("loading");
      void renderBottleShareCard({ applications, positions, bottleSnapshotDataUrl, overrides })
        .then((render) => {
          if (!active) return;
          setPreviewDataUrl(render.dataUrl);
          setPreviewState("idle");
        })
        .catch(() => {
          if (!active) return;
          setPreviewState("error");
        });
    }, 120);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [applications, bottleSnapshotDataUrl, open, overrides, positions]);

  if (!open) return null;

  async function handleExport() {
    setExporting(true);
    try {
      await onExport(overrides);
    } finally {
      setExporting(false);
    }
  }

  return (
    <MotionDialog
      labelledBy="share-poster-editor-title"
      describedBy="share-poster-editor-description"
      className="max-w-6xl overflow-hidden p-0"
      onBackdropClick={exporting ? undefined : onClose}
      onEscapeKeyDown={exporting ? undefined : onClose}
    >
      <div className="flex max-h-[92svh] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-[color:var(--line-ghost)] px-5 py-4 sm:px-7">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium tracking-[0.12em] text-ink-muted">
              <LayoutTemplate aria-hidden="true" className="size-4" />
              SHARE POSTER
            </div>
            <h2 id="share-poster-editor-title" className="mt-1 text-xl font-semibold text-ink-primary">
              编辑我的星瓶海报
            </h2>
            <p id="share-poster-editor-description" className="mt-1 text-sm text-ink-muted">
              按照“我的星光瓶”版式编辑本次分享图，内容不会修改投递记录。
            </p>
          </div>
          <button
            type="button"
            className="muted-button pressable inline-flex size-9 shrink-0 items-center justify-center rounded-lg"
            aria-label="关闭海报编辑器"
            onClick={onClose}
            disabled={exporting}
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(20rem,.9fr)]">
          <section className="flex min-h-0 items-center justify-center bg-[#e9edf3] p-5 sm:p-8" aria-label="海报预览">
            <div className="relative w-full max-w-[34rem] overflow-hidden rounded-[1.2rem] shadow-[0_22px_64px_rgba(18,41,78,.16)]">
              {previewDataUrl ? (
                <Image
                  src={previewDataUrl}
                  alt="当前星瓶分享海报预览"
                  width={1200}
                  height={1600}
                  unoptimized
                  className="block h-auto w-full"
                />
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center bg-[#f7f7f4] text-sm text-[#5f6f86]" aria-busy="true">
                  {previewState === "error" ? "预览暂时失败，请稍后重试" : "正在生成可编辑预览…"}
                </div>
              )}
            </div>
          </section>

          <section className="min-h-0 overflow-y-auto bg-[color:var(--surface-read-bg-strong)] px-5 py-5 sm:px-7" aria-label="海报编辑设置">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink-primary">
              <SlidersHorizontal aria-hidden="true" className="size-4 text-[color:var(--brand-blue)]" />
              内容与版式
            </div>
            <p className="mt-1 text-xs leading-5 text-ink-muted">
              标题、说明文字和投递足迹均可替换；数字与企业名单会跟随当前账号实时更新。
            </p>

            <div className="mt-5 grid gap-4">
              <label className="grid gap-1.5 text-sm text-ink-secondary">
                <span>主标题</span>
                <input
                  data-dialog-initial-focus
                  className="field-shell h-11 w-full px-3 text-sm"
                  value={overrides.title ?? ""}
                  maxLength={32}
                  onChange={(event) => setOverrides((current) => ({ ...current, title: event.target.value }))}
                />
              </label>

              <label className="grid gap-1.5 text-sm text-ink-secondary">
                <span>顶部短句</span>
                <textarea
                  className="field-shell min-h-20 w-full resize-y px-3 py-2 text-sm leading-6"
                  value={overrides.subtitle ?? ""}
                  maxLength={58}
                  onChange={(event) => setOverrides((current) => ({ ...current, subtitle: event.target.value }))}
                />
              </label>

              <label className="grid gap-1.5 text-sm text-ink-secondary">
                <span>底部寄语</span>
                <input
                  className="field-shell h-11 w-full px-3 text-sm"
                  value={overrides.footerNote ?? ""}
                  maxLength={44}
                  onChange={(event) => setOverrides((current) => ({ ...current, footerNote: event.target.value }))}
                />
              </label>

              <label className="grid gap-1.5 text-sm text-ink-secondary">
                <span>企业展示数量</span>
                <select
                  className="field-shell field-select h-11 w-full px-3 text-sm"
                  value={String(model.companyLimit)}
                  onChange={(event) => setOverrides((current) => ({ ...current, companyLimit: Number(event.target.value) }))}
                >
                  <option value="5">展示 5 家</option>
                  <option value="8">展示 8 家</option>
                  <option value="10">展示 10 家</option>
                  <option value="12">展示 12 家</option>
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-2 border-y border-[color:var(--line-ghost)] py-4">
              <ToggleRow checked={overrides.showBottle ?? true} label="保留星瓶插画" onChange={(checked) => setOverrides((current) => ({ ...current, showBottle: checked }))} />
              <ToggleRow checked={overrides.showStats ?? true} label="显示投递统计" onChange={(checked) => setOverrides((current) => ({ ...current, showStats: checked }))} />
              <ToggleRow checked={overrides.showCompanies ?? true} label="显示企业足迹" onChange={(checked) => setOverrides((current) => ({ ...current, showCompanies: checked }))} />
            </div>

            <div className="mt-4 rounded-xl border border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)] p-4">
              <div className="flex items-start gap-3">
                <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[color:var(--brand-blue)]" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-primary">数据摘要</p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {model.totalApplications} 条投递 · {model.totalCompanies} 家企业 · {getShareDensityLabel(model.totalApplications, model.totalCompanies)}
                  </p>
                  {model.overflowCompanyCount > 0 ? (
                    <p className="mt-1 text-xs leading-5 text-[color:var(--brand-blue)]">
                      海报会合并同名企业，并将其余 {model.overflowCompanyCount} 家折叠为“…… 和 N 家公司”。
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-ink-muted">
              预览与导出的 PNG / PDF 使用同一套数据模型；换一个账号，海报内容会随该账号的投递记录自动变化。
            </p>

            <footer className="mt-6 flex flex-col-reverse gap-2 border-t border-[color:var(--line-ghost)] pt-5 sm:flex-row sm:justify-end">
              <button type="button" className="muted-button pressable min-h-11 rounded-lg px-4 text-sm" onClick={onClose} disabled={exporting}>
                取消
              </button>
              <button type="button" className="gold-button pressable min-h-11 rounded-lg px-5 text-sm font-medium" onClick={() => void handleExport()} disabled={exporting || previewState === "loading"}>
                {exporting ? "正在导出 PNG / PDF" : "下载 PNG / PDF"}
              </button>
            </footer>
          </section>
        </div>
      </div>
    </MotionDialog>
  );
}

function ToggleRow({ checked, label, onChange }: { checked: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center justify-between gap-4 rounded-lg px-2 py-1 text-sm text-ink-secondary hover:bg-[color:var(--surface-hover-bg)]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} className="size-4 accent-[color:var(--brand-blue)]" onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}
