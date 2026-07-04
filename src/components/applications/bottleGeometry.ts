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
  safeRadius: number;
  rotate: number;
  row: number;
};

type PlacedBottleStar = {
  id: string;
  x: number;
  y: number;
  safeRadius: number;
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
  return Math.max(7, 14 - Math.floor(row * 0.35));
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
  const placedStars: PlacedBottleStar[] = [];

  sortedApplications(applications).forEach((application) => {
    const hash = hashString(application.id);
    const size = getApplicationBottleSize(application, applications.length);
    const safeRadius = getBottleSafeRadius(size, application.status);
    const candidate = findStableBottlePosition(
      hash,
      safeRadius,
      applications.length,
      rowOccupancy,
      placedStars,
    );
    const rotate = Math.round(jitter(hash, 19, 14));

    positions.set(application.id, {
      id: application.id,
      xPct: (candidate.x / BOTTLE_COORDINATE_WIDTH) * 100,
      yPct: (candidate.y / BOTTLE_COORDINATE_HEIGHT) * 100,
      size,
      safeRadius,
      rotate,
      row: candidate.row,
    });
    placedStars.push({
      id: application.id,
      x: candidate.x,
      y: candidate.y,
      safeRadius,
    });
  });

  return positions;
}

export function validateBottleStackPosition(position: BottleStackPosition, status: string) {
  const x = (position.xPct / 100) * BOTTLE_COORDINATE_WIDTH;
  const y = (position.yPct / 100) * BOTTLE_COORDINATE_HEIGHT;
  return isBottleCircleInsideMainCavity(x, y, getBottleSafeRadius(position.size, status));
}

function getApplicationBottleSize(application: ApplicationWithJob, total: number) {
  const ended = application.status === "rejected" || application.status === "withdrawn";
  if (total > 60) {
    if (application.status === "offer") return 10;
    return ended ? 7 : 9;
  }
  if (total <= 10) {
    if (application.status === "offer") return 26;
    return ended ? 13 : 20;
  }
  if (total <= 30) {
    if (application.status === "offer") return 20;
    return ended ? 10 : 15;
  }
  return ended ? 8 : 12;
}

function findStableBottlePosition(
  hash: number,
  safeRadius: number,
  total: number,
  rowOccupancy: Map<number, number>,
  placedStars: PlacedBottleStar[],
) {
  const maxRows = 22;

  for (let row = 0; row < maxRows; row += 1) {
    const y = getRowY(row, total);
    const range = getBottleMainHorizontalRange(y, safeRadius);
    if (!range) continue;

    const width = range.max - range.min;
    const capacity = Math.max(1, Math.min(rowCapacity(row), Math.floor(width / Math.max(26, safeRadius * 2 + 4))));
    const occupied = rowOccupancy.get(row) ?? 0;
    if (occupied >= capacity) continue;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const col = (occupied + attempt * 3 + (hash % capacity)) % capacity;
      const slotWidth = width / capacity;
      const baseX = range.min + slotWidth * (col + 0.5);
      const x = baseX + jitter(hash, attempt + 3, 4);
      const yJittered = y + jitter(hash, attempt + 13, 2);
      if (
        isBottleCircleInsideMainCavity(x, yJittered, safeRadius) &&
        isClearOfPlacedStars(x, yJittered, safeRadius, placedStars)
      ) {
        rowOccupancy.set(row, occupied + 1);
        return { x, y: yJittered, row };
      }
    }

    const fallbackX = range.min + width * 0.5;
    if (
      isBottleCircleInsideMainCavity(fallbackX, y, safeRadius) &&
      isClearOfPlacedStars(fallbackX, y, safeRadius, placedStars)
    ) {
      rowOccupancy.set(row, occupied + 1);
      return { x: fallbackX, y, row };
    }
  }

  return { x: BOTTLE_COORDINATE_WIDTH / 2, y: 560, row: maxRows };
}

function getRowY(row: number, total: number) {
  const step = total > 60 ? 23 : 27;
  return 552 - row * step;
}

function isClearOfPlacedStars(
  x: number,
  y: number,
  safeRadius: number,
  placedStars: PlacedBottleStar[],
) {
  return placedStars.every((star) => {
    const minDistance = safeRadius + star.safeRadius + 4;
    const dx = x - star.x;
    const dy = y - star.y;
    return dx * dx + dy * dy >= minDistance * minDistance;
  });
}
