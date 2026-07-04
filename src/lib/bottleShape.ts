export const BOTTLE_COORDINATE_WIDTH = 512;
export const BOTTLE_COORDINATE_HEIGHT = 768;

export const BOTTLE_INNER_PATH =
  "M215 196 C215 186 297 186 297 196 L297 278 C297 304 342 314 376 344 C418 382 424 520 378 570 C330 610 182 610 134 570 C88 520 94 382 136 344 C170 314 215 304 215 278 Z";

export const BOTTLE_MAIN_CAVITY_PATH =
  "M150 318 C184 288 328 288 362 318 C416 366 424 520 378 570 C330 608 182 608 134 570 C88 520 96 366 150 318 Z";

const CENTER_X = BOTTLE_COORDINATE_WIDTH / 2;
const MAIN_TOP_Y = 300;
const MAIN_BOTTOM_Y = 582;

export function getBottleSafeRadius(size: number, status?: string) {
  const bodyRadius = size / 2;
  const glowRadius = status === "offer" ? size * 0.34 : status === "rejected" || status === "withdrawn" ? 3 : size * 0.22;
  return bodyRadius + glowRadius + 3;
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
  if (y < 334) return lerp(54, 128, smooth((y - MAIN_TOP_Y) / 34));
  if (y < 390) return lerp(128, 166, smooth((y - 334) / 56));
  if (y < 528) return 166;
  return lerp(166, 128, smooth((y - 528) / 54));
}

function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
}

function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}
