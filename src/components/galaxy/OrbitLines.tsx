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
      {planets.map((planet, index) => {
        const active = activeId === planet.id
        const radius = planet.orbitRadius * orbitScale
        return (
          <span
            key={planet.id}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              width: radius * 2,
              height: radius * 2,
              transform: `rotate(${index % 2 === 0 ? -7 : 5}deg) scaleY(${0.92 + (index % 3) * 0.025})`,
              border: `1px solid ${active ? 'rgba(172,194,226,0.22)' : 'rgba(123,145,180,0.092)'}`,
              boxShadow: active ? '0 0 28px rgba(111,145,190,0.07)' : 'none',
              opacity: active ? 1 : 0.72,
              transition: 'opacity 220ms ease, border-color 220ms ease, box-shadow 220ms ease',
            }}
          />
        )
      })}
    </div>
  )
}
