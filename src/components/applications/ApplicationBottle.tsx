"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { BottleStage } from "@/components/applications/BottleStage";
import { useBottleStack } from "@/components/applications/useBottleStack";
import { FiligreeDivider } from "@/components/ui/FiligreeDivider";
import { Button } from "@/components/ui/Button";
import { downloadBottleShareCard } from "@/components/applications/shareBottleCard";
import { dismissBottleDrop, peekBottleDrop } from "@/lib/bottle-drop";
import { formatDateTime } from "@/lib/utils";
import type { ApplicationWithJob } from "@/lib/types";

const COUNT_KEY = "bottle_app_count";

function getStoredCount(): number | null {
  try {
    const value = localStorage.getItem(COUNT_KEY);
    return value !== null ? Number.parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

function setStoredCount(count: number) {
  try {
    localStorage.setItem(COUNT_KEY, String(count));
  } catch {
    /* localStorage may be unavailable. */
  }
}

export function ApplicationBottle({
  applications,
  onChanged,
  onDeleted,
}: {
  applications: ApplicationWithJob[];
  onChanged: (application: ApplicationWithJob) => Promise<void> | void;
  onDeleted: (applicationId: string) => Promise<void> | void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fallingId, setFallingId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const positions = useBottleStack(applications);

  const appliedCount = applications.filter((item) => item.status !== "opened").length;
  const interviewCount = applications.filter((item) =>
    ["first_round", "second_round", "final_round"].includes(item.status),
  ).length;
  const offerCount = applications.filter((item) => item.status === "offer").length;

  useEffect(() => {
    let frame = 0;
    const queuedId = peekBottleDrop(applications.map((app) => app.id));
    const stored = getStoredCount();
    const newest =
      (queuedId ? applications.find((app) => app.id === queuedId) : null) ??
      (stored !== null && applications.length > stored
        ? [...applications].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          )[0]
        : null);

    if (!newest || !positions.has(newest.id)) {
      setStoredCount(applications.length);
      return () => undefined;
    }

    frame = window.requestAnimationFrame(() => {
      setFallingId(newest.id);
    });
    setStoredCount(applications.length);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [applications, positions]);

  const displayApp = useMemo(() => {
    if (hoveredId) return applications.find((app) => app.id === hoveredId) ?? null;
    if (selected) return selected;
    return applications[0] ?? null;
  }, [applications, hoveredId, selected]);

  function handleFallComplete() {
    if (fallingId) dismissBottleDrop(fallingId);
    setFallingId(null);
  }

  async function handleShareBottle() {
    setShareState("generating");
    try {
      const bottleSnapshotDataUrl =
        document
          .querySelector<HTMLCanvasElement>("#application-bottle-target canvas")
          ?.toDataURL("image/png") ?? null;
      await downloadBottleShareCard({ applications, positions, bottleSnapshotDataUrl });
      setShareState("done");
      window.setTimeout(() => setShareState("idle"), 2400);
    } catch {
      setShareState("error");
      window.setTimeout(() => setShareState("idle"), 3200);
    }
  }

  return (
    <section className="relative overflow-visible px-0 pb-4 pt-1">
      <div className="grid justify-items-center gap-10 lg:grid-cols-[minmax(320px,0.95fr)_minmax(300px,0.75fr)] lg:items-center lg:justify-items-stretch">
        <div className="w-full max-w-[560px]">
          <p className="mb-4 text-center text-xs tracking-[0.16em] text-ink-muted">
            2026 秋招季 · 第 {getSeasonWeek()} 周
          </p>

          <BottleStage
            applications={applications}
            positions={positions}
            fallingId={fallingId}
            selectedId={selected?.id ?? null}
            onFallComplete={handleFallComplete}
            onSelect={setSelected}
            onHover={setHoveredId}
          />

          <button
            type="button"
            className="text-action pressable mx-auto mt-3 justify-center rounded-full px-4 py-2 text-sm"
            onClick={() => {
              router.push("/my");
            }}
          >
            已收进 {applications.length} 颗星
          </button>
        </div>

        <div className="liquid-panel relative w-full max-w-[560px] p-6 text-center lg:max-w-none lg:text-left">
          <h2 className="relative section-title">
            本季统计
          </h2>
          <FiligreeDivider className="relative my-4" />

          <div className="mx-auto grid max-w-md grid-cols-4 gap-5 max-sm:grid-cols-2 lg:max-w-none">
            <BottleStat label="捕获" value={applications.length} />
            <BottleStat label="投递" value={appliedCount} />
            <BottleStat label="面试" value={interviewCount} />
            <BottleStat label="Offer" value={offerCount} />
          </div>

          <Button
            className="mt-5 w-full"
            disabled={shareState === "generating"}
            onClick={() => void handleShareBottle()}
          >
            {shareState === "generating" ? "正在生成" : "分享我的星瓶"}
          </Button>
          {shareState === "done" ? (
            <p className="mt-2 text-center text-xs text-ink-muted">已生成 PNG 和 PDF</p>
          ) : null}
          {shareState === "error" ? (
            <p className="mt-2 text-center text-xs text-red-200">生成失败，请稍后重试。</p>
          ) : null}

          {applications.length > 0 && displayApp ? (
            <div className="mt-5 border-t border-white/[0.08] px-1 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {displayApp.job.company_name}
                  </p>
                  {displayApp.job.job_titles ? (
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {displayApp.job.job_titles}
                    </p>
                  ) : null}
                </div>
                <StatusPill status={displayApp.status} />
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-ink-muted/60">
                  {formatDateTime(displayApp.updated_at)}
                </span>
                <button
                  type="button"
                  className="text-action pressable rounded-full px-3 py-1 text-xs"
                  onClick={() => setSelected(displayApp)}
                >
                  查看进度
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ProgressDrawer
        application={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onChanged={onChanged}
        onDeleted={onDeleted}
      />
    </section>
  );
}

function BottleStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="px-1 py-2 text-center">
      <span className="block font-display text-3xl font-semibold tabular-nums text-ink-primary">
        {value}
      </span>
      <span className="mt-1 block text-xs text-ink-muted">{label}</span>
    </span>
  );
}

function getSeasonWeek() {
  const seasonStart = new Date("2026-07-01T00:00:00+08:00").getTime();
  const now = Date.now();
  return Math.max(1, Math.ceil((now - seasonStart) / (7 * 24 * 60 * 60 * 1000)));
}
