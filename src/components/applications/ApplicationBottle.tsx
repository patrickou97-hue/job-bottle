"use client";

import { useEffect, useMemo, useState } from "react";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { BottleStage } from "@/components/applications/BottleStage";
import { useBottleStack } from "@/components/applications/useBottleStack";
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
}: {
  applications: ApplicationWithJob[];
  onChanged: () => Promise<void> | void;
}) {
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [fallingId, setFallingId] = useState<string | null>(null);
  const positions = useBottleStack(applications);

  const activeCount = applications.filter(
    (item) => !["offer", "rejected", "withdrawn"].includes(item.status),
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
      <div className="mx-auto mb-3 flex w-fit flex-wrap items-center justify-center gap-x-5 gap-y-1 rounded-full border border-white/[0.06] bg-black/15 px-4 py-2 text-xs text-ink-muted backdrop-blur-sm">
        <BottleStat label="已收录" value={applications.length} />
        <BottleStat label="进行中" value={activeCount} />
        <BottleStat label="Offer" value={offerCount} />
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

      {applications.length > 0 && displayApp ? (
        <div className="mx-auto mt-4 max-w-[500px] rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="max-w-[160px] truncate text-sm font-medium text-ink-primary">
                {displayApp.job.company_name}
              </p>
              {displayApp.job.job_titles ? (
                <p className="mt-0.5 max-w-[260px] truncate text-xs text-ink-muted">
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

      <ProgressDrawer
        application={selected}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        onChanged={onChanged}
      />
    </section>
  );
}

function BottleStat({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 text-xs">
      <span className="text-ink-secondary">{value}</span>
      <span>{label}</span>
    </span>
  );
}
