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
  return (
    <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
      {buildOrbitRadii(planets, orbitScale).map((radius, index) => {
        const activePlanet = planets.find((planet) => planet.id === activeId)
        const activeRadius = activePlanet ? activePlanet.orbitRadius * orbitScale : null
        const active = activeRadius !== null && Math.abs(activeRadius - radius) < 42
        const opacity = Math.max(0.06, 0.12 - index * 0.02)
        return (
          <span
            key={radius}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: 'rotate(-7deg) scaleY(0.62)',
              border: `1px solid ${active ? 'rgba(172,194,226,0.2)' : `rgba(123,145,180,${opacity})`}`,
              boxShadow: active ? '0 0 28px rgba(111,145,190,0.07)' : 'none',
              opacity: active ? 1 : 0.82,
              transition: 'opacity 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
            }}
          />
        )
      })}
    </div>
  )
}

function buildOrbitRadii(planets: PlanetRoute[], orbitScale: number) {
  const sorted = [...new Set(planets.map((planet) => Math.round((planet.orbitRadius * orbitScale) / 12) * 12))]
    .sort((a, b) => a - b)
  if (sorted.length <= MAX_HOME_ORBIT_LINES) return sorted
  const step = (sorted.length - 1) / (MAX_HOME_ORBIT_LINES - 1)
  return Array.from({ length: MAX_HOME_ORBIT_LINES }, (_, index) => sorted[Math.round(index * step)])
}
