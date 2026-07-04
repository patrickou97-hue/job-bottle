"use client";

import { useEffect, useMemo, useState } from "react";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { BottleStage } from "@/components/applications/BottleStage";
import { useBottleStack } from "@/components/applications/useBottleStack";
import { FiligreeDivider } from "@/components/ui/FiligreeDivider";
import { Button } from "@/components/ui/Button";
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
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fallingId, setFallingId] = useState<string | null>(null);
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

  return (
    <section className="relative overflow-visible px-2 pb-4 pt-1">
      <div className="grid gap-6 lg:grid-cols-[minmax(320px,0.9fr)_minmax(300px,0.8fr)] lg:items-center">
        <div>
          <div className="mb-4 text-center">
            <p className="text-xs tracking-[0.2em] text-ink-muted">2026 秋招季 · 第 {getSeasonWeek()} 周</p>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink-primary">
              我的星瓶
            </h1>
          </div>

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
            className="mx-auto mt-3 block rounded-full px-4 py-2 text-sm text-ink-secondary transition hover:bg-white/[0.04] hover:text-nebula-silver"
            onClick={() => {
              window.location.href = "/my";
            }}
          >
            已收进 {applications.length} 颗星
          </button>
        </div>

        <div className="surface-subtle relative overflow-hidden rounded-[28px] p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[rgba(74,59,124,0.2)] to-transparent" />
          <h2 className="relative font-display text-2xl font-semibold text-ink-primary">
            本季统计
          </h2>
          <FiligreeDivider className="relative my-4" />

          <div className="grid grid-cols-2 gap-3">
            <BottleStat label="捕获" value={applications.length} />
            <BottleStat label="投递" value={appliedCount} />
            <BottleStat label="面试" value={interviewCount} />
            <BottleStat label="Offer" value={offerCount} />
          </div>

          <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4">
            <p className="text-sm font-medium text-ink-primary">周观测日志</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              本批次先完成星瓶容器与分享卡。周日志会在 status_history 数据稳定后接入。
            </p>
          </div>

          <Button className="mt-5 w-full" disabled title="年报将在下一批次接入">
            生成星图年报
          </Button>

          {applications.length > 0 && displayApp ? (
            <div className="mt-5 rounded-[22px] border border-white/[0.07] bg-white/[0.035] px-4 py-3">
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
                  className="rounded-full border border-white/[0.08] bg-white/[0.035] px-3 py-1 text-xs text-ink-secondary transition hover:border-nebula-blue/22 hover:text-nebula-silver"
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
    <span className="rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
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
