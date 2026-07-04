'use client'

import type { PlanetRoute } from '@/lib/galaxy-routes'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'

type MobilePlanetListProps = {
  planets: PlanetRoute[]
  disabled: boolean
  onSelect: (planet: PlanetRoute) => void
}

export function MobilePlanetList({ planets, disabled, onSelect }: MobilePlanetListProps) {
  return (
    <div className="relative z-20 flex w-full max-w-sm flex-col gap-5 px-7">
      {planets.map((planet, index) => {
        const size = Math.max(42, planet.size * 0.62)
        return (
          <button
            key={planet.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(planet)}
            className="group flex w-full items-center gap-4 text-left outline-none"
            style={{
              transform: `translateX(${index % 2 === 0 ? -8 : 12}px)`,
              opacity: disabled ? 0.32 : 1,
              transition: 'opacity 220ms ease, transform 220ms ease',
            }}
          >
            <OrbMaterial size={size} variant={getOrbVariant(planet)} />
            <span className="flex min-w-0 flex-col">
              <span className="font-display text-base font-semibold" style={{ color: 'rgba(228,236,247,0.9)' }}>
                {planet.label}
              </span>
              <span className="mt-1 text-xs leading-5" style={{ color: 'rgba(150,167,195,0.66)' }}>
                {planet.description}
              </span>
            </span>
          </button>
        )
      })}
    </div>
	  )
}

function getOrbVariant(planet: PlanetRoute): OrbMaterialVariant {
  if (planet.id === 'forum') return 'violet'
  if (planet.id === 'admin') return 'muted'
  return 'blue'
}
