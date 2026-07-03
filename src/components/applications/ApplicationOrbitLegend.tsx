"use client";

import { ORBIT_CONFIG, ORBIT_STATUS_ORDER, type OrbitStatus } from "@/components/applications/ApplicationOrbitConfig";

export function ApplicationOrbitLegend({
  counts,
  activeStatus,
  onHover,
  onSelect,
}: {
  counts: Map<OrbitStatus, number>;
  activeStatus?: OrbitStatus | null;
  onHover: (status: OrbitStatus | null) => void;
  onSelect: (status: OrbitStatus) => void;
}) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
      {ORBIT_STATUS_ORDER.map((status) => (
        <button
          key={status}
          type="button"
          className={`flex items-center justify-between rounded-full px-3 py-2 text-left transition ${
            activeStatus === status
              ? "bg-nebula-blue/10 text-nebula-silver"
              : "text-ink-muted hover:bg-white/[0.035] hover:text-ink-secondary"
          }`}
          onMouseEnter={() => onHover(status)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(status)}
        >
          <span>{ORBIT_CONFIG[status].label}</span>
          <span>{counts.get(status) ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
