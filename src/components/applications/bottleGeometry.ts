import type { ApplicationWithJob } from "@/lib/types";

export const BOTTLE_AREA = {
  centerX: 0.5,
  neckY: 0.14,
  bottomY: 0.78,
  minX: 0.28,
  maxX: 0.72,
  maxWidthAtBottom: 0.42,
  maxWidthAtTop: 0.2,
};

export type BottleStackPosition = {
  id: string;
  xPct: number;
  yPct: number;
  size: number;
  rotate: number;
  row: number;
};

const STATUS_WEIGHT = {
  rejected: 0,
  withdrawn: 0,
  opened: 1,
  applied: 1,
  written_test: 2,
  first_round: 2,
  second_round: 2,
  final_round: 2,
  offer: 3,
} as const;

export function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function jitter(hash: number, shift: number, amount: number) {
  return (((hash >>> shift) % 1000) / 999 - 0.5) * amount;
}

function rowCapacity(row: number) {
  return Math.max(3, 5 - Math.floor(row * 0.5));
}

function sortedApplications(applications: ApplicationWithJob[]) {
  return [...applications].sort((a, b) => {
    const statusDelta =
      (STATUS_WEIGHT[a.status] ?? 1) - (STATUS_WEIGHT[b.status] ?? 1);
    if (statusDelta !== 0) return statusDelta;
    return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
  });
}

export function calculateBottleStack(applications: ApplicationWithJob[]) {
  const positions = new Map<string, BottleStackPosition>();
  let row = 0;
  let col = 0;

  sortedApplications(applications).forEach((application) => {
    const capacity = rowCapacity(row);
    const hash = hashString(application.id);
    const rowProgress = Math.min(1, row / 8);
    const availableWidth =
      BOTTLE_AREA.maxWidthAtBottom -
      (BOTTLE_AREA.maxWidthAtBottom - BOTTLE_AREA.maxWidthAtTop) * rowProgress;
    const gap = availableWidth / Math.max(1, capacity - 1);
    const left = BOTTLE_AREA.centerX - availableWidth / 2;
    const x = left + gap * col + jitter(hash, 3, 0.018);
    const y =
      BOTTLE_AREA.bottomY -
      row * 0.068 -
      (col % 2) * 0.015 +
      jitter(hash, 13, 0.012);
    const size = Math.round(44 + ((hash >>> 7) % 8));
    const rotate = Math.round(jitter(hash, 19, 14));

    positions.set(application.id, {
      id: application.id,
      xPct: Math.max(BOTTLE_AREA.minX, Math.min(BOTTLE_AREA.maxX, x)) * 100,
      yPct: Math.max(BOTTLE_AREA.neckY + 0.12, Math.min(BOTTLE_AREA.bottomY, y)) * 100,
      size,
      rotate,
      row,
    });

    col += 1;
    if (col >= capacity) {
      row += 1;
      col = 0;
    }
  });

  return positions;
}
