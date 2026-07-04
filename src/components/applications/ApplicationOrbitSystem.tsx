"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  ORBIT_BAND_CONFIG,
  ORBIT_BANDS,
  ORBIT_CONFIG,
  getOrbitBandForStatus,
  type OrbitBand,
  type OrbitStatus,
} from "@/components/applications/ApplicationOrbitConfig";
import { ApplicationOrbitRing } from "@/components/applications/ApplicationOrbitRing";
import { ApplicationOrbitLegend } from "@/components/applications/ApplicationOrbitLegend";
import { ApplicationOrbitStar } from "@/components/applications/ApplicationOrbitStar";
import { ApplicationOrbitDetail } from "@/components/applications/ApplicationOrbitDetail";
import { FiligreeDivider } from "@/components/ui/FiligreeDivider";
import type { ApplicationWithJob } from "@/lib/types";

export function ApplicationOrbitSystem({
  applications,
  selectedApplication,
  onSelect,
  onEdit,
  onStatusFilterChange,
}: {
  applications: ApplicationWithJob[];
  selectedApplication: ApplicationWithJob | null;
  onSelect: (application: ApplicationWithJob) => void;
  onEdit?: (application: ApplicationWithJob) => void;
  onStatusFilterChange?: (statuses: readonly OrbitStatus[] | "") => void;
}) {
  const [highlightedBand, setHighlightedBand] = useState<OrbitBand | null>(null);
  const [lockedBand, setLockedBand] = useState<OrbitBand | null>(null);
  const [expandedBand, setExpandedBand] = useState<OrbitBand | null>(null);
  const grouped = useMemo(() => {
    const map = new Map<OrbitBand, ApplicationWithJob[]>();
    ORBIT_BANDS.forEach((band) => map.set(band, []));
    applications.forEach((application) => {
      if (application.status in ORBIT_CONFIG) {
        map.get(getOrbitBandForStatus(application.status as OrbitStatus))?.push(application);
      }
    });
    return map;
  }, [applications]);
  const terminal = applications.filter((application) => application.status === "rejected" || application.status === "withdrawn");
  const activeBand = lockedBand ?? highlightedBand;
  const expandedApplications = expandedBand ? grouped.get(expandedBand) ?? [] : [];

  function selectBand(band: OrbitBand) {
    const nextBand = lockedBand === band ? null : band;
    setLockedBand(nextBand);
    onStatusFilterChange?.(nextBand ? ORBIT_BAND_CONFIG[nextBand].statuses : "");
  }

  return (
    <section className="surface-subtle relative overflow-hidden rounded-[28px] p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-primary">我的投递轨道</h2>
        </div>
        <span className="text-xs text-ink-muted">{applications.length} 颗投递星体</span>
      </div>
      <FiligreeDivider className="mb-4 opacity-70" />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_180px_330px]">
        <div className="relative h-[560px] overflow-hidden rounded-[24px] bg-black/10">
          <div className="absolute inset-0 opacity-18 [background-image:radial-gradient(circle,rgba(214,228,255,.28)_0_1px,transparent_1.5px)] [background-size:92px_92px]" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative aspect-square h-[min(92%,520px)] max-h-[520px] w-[min(92%,520px)]">
              <OrbitTrackLayer activeBand={activeBand} />
              <div className="absolute left-1/2 top-1/2 z-10 grid size-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-nebula-blue/10 bg-nebula-blue/7 text-center text-xs text-nebula-silver shadow-[0_0_54px_rgba(126,158,214,0.12)]">
                投递引力核心
              </div>

              {ORBIT_BANDS.map((band) => (
                <ApplicationOrbitRing
                  key={band}
                  band={band}
                  applications={grouped.get(band) ?? []}
                  scale={0.86}
                  selectedId={selectedApplication?.id}
                  highlightedBand={activeBand}
                  onSelect={onSelect}
                  onAggregateClick={setExpandedBand}
                  showTrack={false}
                />
              ))}
            </div>
          </div>

          {terminal.map((application, index) => (
            <div
              key={application.id}
              className="absolute"
              style={{
                left: `${10 + (index % 5) * 9}%`,
                bottom: `${9 + Math.floor(index / 5) * 11}%`,
              }}
            >
              <ApplicationOrbitStar
                application={application}
                selected={selectedApplication?.id === application.id}
                dimmed={Boolean(activeBand)}
                onClick={() => onSelect(application)}
              />
            </div>
          ))}

          {applications.length === 0 ? (
            <div className="absolute inset-0 grid place-items-center text-center">
              <div>
                <h3 className="text-lg font-semibold text-ink-primary">暂无投递记录</h3>
                <p className="mt-2 text-sm text-ink-muted">从岗位星图中打开官网投递后，岗位星体会进入这里。</p>
              </div>
            </div>
          ) : null}
        </div>

        <ApplicationOrbitLegend
          counts={new Map(ORBIT_BANDS.map((band) => [band, grouped.get(band)?.length ?? 0]))}
          activeBand={activeBand}
          onHover={setHighlightedBand}
          onSelect={selectBand}
        />

        <ApplicationOrbitDetail application={selectedApplication} onEdit={onEdit ?? onSelect} />
      </div>
      {expandedBand ? (
        <div className="absolute inset-x-5 bottom-5 z-40 rounded-[22px] border border-white/[0.07] bg-[#040814]/92 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl xl:left-auto xl:w-[420px]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-nebula-silver">
              {ORBIT_BAND_CONFIG[expandedBand].label} · {expandedApplications.length} 条记录
            </span>
            <button
              type="button"
              className="rounded-full p-1.5 text-ink-muted transition hover:bg-white/[0.05] hover:text-nebula-silver"
              onClick={() => setExpandedBand(null)}
              aria-label="关闭投递聚合列表"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto pr-1">
            {expandedApplications.map((application) => (
              <button
                key={application.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
                onClick={() => {
                  setExpandedBand(null);
                  onSelect(application);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate text-ink-primary">{application.job.company_name}</span>
                  <span className="block truncate text-xs text-ink-muted">{application.job.job_titles || "岗位待补充"}</span>
                </span>
                <span className="shrink-0 text-xs text-ink-muted">{application.job.locations || "暂无地点"}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function OrbitTrackLayer({ activeBand }: { activeBand: OrbitBand | null }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-0">
      {ORBIT_BANDS.map((band) => {
        const config = ORBIT_BAND_CONFIG[band];
        const radius = config.radius * 0.86;
        const active = activeBand === band;
        return (
          <span
            key={band}
            aria-hidden="true"
            className="absolute rounded-full border border-dashed"
            style={{
              width: radius * 2,
              height: radius * 2,
              marginLeft: -radius,
              marginTop: -radius,
              borderColor: active ? "rgba(174,198,230,0.18)" : `rgba(148,163,184,${config.opacity * 0.14})`,
              boxShadow: active ? "0 0 26px rgba(126,158,214,0.08)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}
