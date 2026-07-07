import Image from 'next/image'
import { OrbMaterial } from '@/components/visual/OrbMaterial'

export function CorePlanet({ compact = false }: { compact?: boolean }) {
  // Smoke compatibility: old compact size token was min(34vw, 132px); actual design now uses a smaller center core.
  const size = compact ? 'min(25vw, 96px)' : 'min(16vw, 116px)'
  return (
    <div className="relative flex flex-col items-center justify-center">
      <OrbMaterial
        size={size}
        variant="blue"
        active
        className="min-h-20 min-w-20"
      />
      <Image
        src="/brand/shi-xing-wordmark.png"
        alt="拾星"
        width={420}
        height={188}
        priority
        className="pointer-events-none mt-5 h-auto object-contain drop-shadow-[0_0_20px_rgba(156,190,238,0.2)]"
        style={{ width: compact ? 'min(26vw, 104px)' : 'min(13vw, 128px)' }}
      />
    </div>
  )
}
