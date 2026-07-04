"use client";

import {
  ORBIT_BAND_CONFIG,
  ORBIT_BANDS,
  type OrbitBand,
} from "@/components/applications/ApplicationOrbitConfig";

export function ApplicationOrbitLegend({
  counts,
  activeBand,
  onHover,
  onSelect,
}: {
  counts: Map<OrbitBand, number>;
  activeBand?: OrbitBand | null;
  onHover: (band: OrbitBand | null) => void;
  onSelect: (band: OrbitBand) => void;
}) {
  return (
    <div className="grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-1">
      {ORBIT_BANDS.map((band) => (
        <button
          key={band}
          type="button"
          className={`flex items-center justify-between gap-3 rounded-full px-3 py-2 text-left transition ${
            activeBand === band
              ? "bg-nebula-blue/10 text-nebula-silver"
              : "text-ink-muted hover:bg-white/[0.035] hover:text-ink-secondary"
          }`}
          onMouseEnter={() => onHover(band)}
          onMouseLeave={() => onHover(null)}
          onClick={() => onSelect(band)}
        >
          <span className="min-w-0">
            <span className="block text-sm">{ORBIT_BAND_CONFIG[band].label}</span>
            <span className="block truncate text-[11px] text-ink-muted/80">
              {ORBIT_BAND_CONFIG[band].description}
            </span>
          </span>
          <span className="shrink-0">{counts.get(band) ?? 0}</span>
        </button>
      ))}
    </div>
  );
}
