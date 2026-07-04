export const BOTTLE_COORDINATE_WIDTH = 512;
export const BOTTLE_COORDINATE_HEIGHT = 768;

export const BOTTLE_INNER_PATH =
  "M218 112 C218 92 294 92 294 112 L294 238 C294 274 348 286 386 336 C440 408 442 650 382 704 C336 746 176 746 130 704 C70 650 72 408 126 336 C164 286 218 274 218 238 Z";

export const BOTTLE_MAIN_CAVITY_PATH =
  "M160 306 C190 278 322 278 352 306 C424 374 432 642 378 700 C330 736 182 736 134 700 C80 642 88 374 160 306 Z";

const CENTER_X = BOTTLE_COORDINATE_WIDTH / 2;
const MAIN_TOP_Y = 304;
const MAIN_BOTTOM_Y = 704;

export function getBottleSafeRadius(size: number, status?: string) {
  const bodyRadius = size / 2;
  const glowRadius = status === "offer" ? size * 0.34 : status === "rejected" || status === "withdrawn" ? 3 : size * 0.22;
  return bodyRadius + glowRadius + 6;
}

export function getBottleMainHorizontalRange(y: number, radius: number) {
  const halfWidth = getBottleMainHalfWidth(y);
  if (halfWidth <= 0) return null;
  const min = CENTER_X - halfWidth + radius;
  const max = CENTER_X + halfWidth - radius;
  if (min >= max) return null;
  return { min, max };
}

export function isBottleCircleInsideMainCavity(x: number, y: number, radius: number) {
  if (y - radius < MAIN_TOP_Y || y + radius > MAIN_BOTTOM_Y) return false;

  const samples = [
    [0, 0],
    [radius, 0],
    [-radius, 0],
    [0, radius],
    [0, -radius],
    [radius * 0.72, radius * 0.72],
    [radius * 0.72, -radius * 0.72],
    [-radius * 0.72, radius * 0.72],
    [-radius * 0.72, -radius * 0.72],
  ];

  return samples.every(([dx, dy]) => isPointInsideBottleMainCavity(x + dx, y + dy));
}

export function isPointInsideBottleMainCavity(x: number, y: number) {
  const halfWidth = getBottleMainHalfWidth(y);
  if (halfWidth <= 0) return false;
  return Math.abs(x - CENTER_X) <= halfWidth;
}

function getBottleMainHalfWidth(y: number) {
  if (y < MAIN_TOP_Y || y > MAIN_BOTTOM_Y) return 0;
  if (y < 344) return lerp(58, 132, smooth((y - MAIN_TOP_Y) / 40));
  if (y < 420) return lerp(132, 212, smooth((y - 344) / 76));
  if (y < 640) return 212;
  return lerp(212, 156, smooth((y - 640) / 64));
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}
