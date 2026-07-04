import type { ApplicationWithJob } from "@/lib/types";
import {
  BOTTLE_COORDINATE_HEIGHT,
  BOTTLE_COORDINATE_WIDTH,
  getBottleMainHorizontalRange,
  getBottleSafeRadius,
  isBottleCircleInsideMainCavity,
} from "@/lib/bottleShape";

export const BOTTLE_AREA = {
  centerX: 0.5,
  neckY: 0.14,
  bottomY: 0.88,
  minX: 0.24,
  maxX: 0.76,
  maxWidthAtBottom: 0.48,
  maxWidthAtTop: 0.22,
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
  offer: -1,
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
  return Math.max(5, 10 - Math.floor(row * 0.35));
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
  const rowOccupancy = new Map<number, number>();

  sortedApplications(applications).forEach((application) => {
    const hash = hashString(application.id);
    const size = getApplicationBottleSize(application);
    const safeRadius = getBottleSafeRadius(size, application.status);
    const candidate = findStableBottlePosition(hash, safeRadius, rowOccupancy);
    const rotate = Math.round(jitter(hash, 19, 14));

    positions.set(application.id, {
      id: application.id,
      xPct: (candidate.x / BOTTLE_COORDINATE_WIDTH) * 100,
      yPct: (candidate.y / BOTTLE_COORDINATE_HEIGHT) * 100,
      size,
      rotate,
      row: candidate.row,
    });
  });

  return positions;
}

export function validateBottleStackPosition(position: BottleStackPosition, status: string) {
  const x = (position.xPct / 100) * BOTTLE_COORDINATE_WIDTH;
  const y = (position.yPct / 100) * BOTTLE_COORDINATE_HEIGHT;
  return isBottleCircleInsideMainCavity(x, y, getBottleSafeRadius(position.size, status));
}

function getApplicationBottleSize(application: ApplicationWithJob) {
  if (application.status === "offer") return 34;
  if (application.status === "rejected" || application.status === "withdrawn") return 15;
  return 22;
}

function findStableBottlePosition(
  hash: number,
  safeRadius: number,
  rowOccupancy: Map<number, number>,
) {
  const maxRows = 22;

  for (let row = 0; row < maxRows; row += 1) {
    const y = getRowY(row);
    const range = getBottleMainHorizontalRange(y, safeRadius);
    if (!range) continue;

    const width = range.max - range.min;
    const capacity = Math.max(1, Math.min(rowCapacity(row), Math.floor(width / Math.max(24, safeRadius * 1.05))));
    const occupied = rowOccupancy.get(row) ?? 0;
    if (occupied >= capacity) continue;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const col = occupied;
      const slotWidth = width / capacity;
      const baseX = range.min + slotWidth * (col + 0.5);
      const x = baseX + jitter(hash, attempt + 3, 24);
      const yJittered = y + jitter(hash, attempt + 13, 10);
      if (isBottleCircleInsideMainCavity(x, yJittered, safeRadius)) {
        rowOccupancy.set(row, occupied + 1);
        return { x, y: yJittered, row };
      }
    }

    const fallbackX = range.min + width * 0.5;
    if (isBottleCircleInsideMainCavity(fallbackX, y, safeRadius)) {
      rowOccupancy.set(row, occupied + 1);
      return { x: fallbackX, y, row };
    }
  }

  return { x: BOTTLE_COORDINATE_WIDTH / 2, y: 560, row: maxRows };
}

function getRowY(row: number) {
  return 552 - row * 18;
}
