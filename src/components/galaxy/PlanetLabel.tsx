import type { PlanetRoute } from '@/lib/galaxy-routes'

export function PlanetLabel({ planet }: { planet: PlanetRoute | null }) {
  return (
    <div
      className="pointer-events-none absolute bottom-10 left-10 z-30 hidden flex-col gap-2 md:flex"
      style={{ opacity: planet ? 1 : 0.42, transition: 'opacity 220ms ease' }}
    >
      <span className="font-display text-xl font-semibold" style={{ color: 'rgba(229,236,247,0.92)' }}>
        {planet?.label ?? '拾星'}
      </span>
      <span className="max-w-sm text-sm leading-6" style={{ color: 'rgba(151,167,194,0.68)' }}>
        {planet?.description ?? ''}
      </span>
    </div>
  )
}
