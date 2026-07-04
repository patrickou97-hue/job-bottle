import { SITE_NAME } from '@/lib/constants'
import { OrbMaterial } from '@/components/visual/OrbMaterial'

export function CorePlanet({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'min(27vw, 112px)' : 'min(24vw, 160px)'
  return (
    <div className="relative flex flex-col items-center justify-center">
      <OrbMaterial
        size={size}
        variant="blue"
        active
        className="min-h-24 min-w-24"
      />
      <span
        className="mt-5 font-display font-semibold"
        style={{
          color: 'rgba(226,235,248,0.94)',
          textShadow: '0 0 30px rgba(143,176,220,0.22)',
          fontSize: compact ? 'clamp(0.82rem,4.2vw,1.05rem)' : 'clamp(1.35rem,2.2vw,2rem)',
        }}
      >
        {SITE_NAME}
      </span>
      <span
        className="mt-3 max-w-[12rem] text-center leading-6"
        style={{
          color: 'rgba(156,173,199,0.72)',
          fontSize: compact ? '0.62rem' : '0.875rem',
          lineHeight: compact ? '0.95rem' : '1.5rem',
        }}
      >
        把每一次投递，收进你的职业星图。
      </span>
    </div>
  )
}
