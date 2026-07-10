import { MAX_HOME_ORBIT_LINES } from '@/components/visual/OrbMaterial'
import type { PlanetRoute } from '@/lib/galaxy-routes'

export function OrbitLines({
  planets,
  activeId,
  orbitScale,
}: {
  planets: PlanetRoute[]
  activeId?: string
  orbitScale: number
}) {
  const activePlanet = planets.find((planet) => planet.id === activeId)
  const activeRadius = activePlanet ? Math.round(activePlanet.orbitRadius * orbitScale) : null

  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
      {buildOrbitRadii(planets, orbitScale, activeId).map((radius, index) => {
        const active = activeRadius !== null && Math.abs(activeRadius - radius) < 1
        const opacity = Math.max(0.06, 0.12 - index * 0.02)
        return (
          <span
            key={radius}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              width: radius * 2,
              height: radius * 2,
              border: `1px solid ${active ? 'rgba(201,197,228,0.22)' : `rgba(126,124,181,${opacity})`}`,
              boxShadow: active ? '0 0 28px rgba(126,124,181,0.12)' : 'none',
              opacity: active ? 1 : 0.82,
              transition: 'opacity 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
            }}
          />
        )
      })}
    </div>
  )
}

function buildOrbitRadii(planets: PlanetRoute[], orbitScale: number, activeId?: string) {
  const sorted = [...new Set(planets.map((planet) => Math.round(planet.orbitRadius * orbitScale)))]
    .sort((a, b) => a - b)
  if (sorted.length <= MAX_HOME_ORBIT_LINES) return sorted
  const activePlanet = planets.find((planet) => planet.id === activeId)
  if (activePlanet) {
    const activeRadius = Math.round(activePlanet.orbitRadius * orbitScale)
    const remaining = sorted.filter((radius) => radius !== activeRadius)
    const step = (remaining.length - 1) / Math.max(1, MAX_HOME_ORBIT_LINES - 2)
    const sampled = Array.from({ length: MAX_HOME_ORBIT_LINES - 1 }, (_, index) => remaining[Math.round(index * step)])
    return [...new Set([...sampled, activeRadius])].sort((a, b) => a - b)
  }
  const step = (sorted.length - 1) / (MAX_HOME_ORBIT_LINES - 1)
  return Array.from({ length: MAX_HOME_ORBIT_LINES }, (_, index) => sorted[Math.round(index * step)])
}
