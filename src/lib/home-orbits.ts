/** Circular two-body orbits (e = 0), orthographically projected into a tilted
 * plane. T²/a³ is constant. Time and world radii never depend on viewport size.
 * Visual bodies are test particles: distinct circular paths cannot intersect.
 */
export const HOME_ORBITS = [
  { radius: 230, phase: 205 },
  { radius: 310, phase: 20 },
  { radius: 395, phase: 132 },
  { radius: 485, phase: 318 },
  { radius: 580, phase: 65 },
  { radius: 680, phase: 245 },
  { radius: 785, phase: 168 },
] as const;
export const HOME_ORBIT_INCLINATION = 78 * Math.PI / 180;
export const HOME_ORBIT_ROLL = -22 * Math.PI / 180;
export const HOME_STAR_RADIUS = 112;
export const HOME_INNER_PERIOD = 86;

export function orbitalPeriod(radius: number) {
  return HOME_INNER_PERIOD * Math.pow(radius / HOME_ORBITS[0].radius, 1.5);
}

export function projectOrbit(radius: number, angle: number) {
  const planeX = radius * Math.cos(angle);
  const planeY = radius * Math.sin(angle) * Math.cos(HOME_ORBIT_INCLINATION);
  return {
    x: planeX * Math.cos(HOME_ORBIT_ROLL) - planeY * Math.sin(HOME_ORBIT_ROLL),
    y: planeX * Math.sin(HOME_ORBIT_ROLL) + planeY * Math.cos(HOME_ORBIT_ROLL),
    depth: radius * Math.sin(angle) * Math.sin(HOME_ORBIT_INCLINATION),
  };
}

export function orbitPosition(orbit: { radius: number; phase: number }, seconds: number) {
  return projectOrbit(orbit.radius, orbit.phase * Math.PI / 180 + seconds * Math.PI * 2 / orbitalPeriod(orbit.radius));
}

export function orbitPath(radius: number, frontOnly = false) {
  return Array.from({ length: 145 }, (_, step) => {
    const { x, y } = projectOrbit(radius, step / 144 * Math.PI * (frontOnly ? 1 : 2));
    return `${step ? "L" : "M"}${x.toFixed(3)},${y.toFixed(3)}`;
  }).join(" ") + (frontOnly ? "" : " Z");
}

export function isBehindStar(position: { x: number; y: number; depth: number }, bodyRadius = 22) {
  return position.depth < 0 && Math.hypot(position.x, position.y) + bodyRadius < HOME_STAR_RADIUS;
}
