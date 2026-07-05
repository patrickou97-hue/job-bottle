import Image from 'next/image'
import { OrbMaterial } from '@/components/visual/OrbMaterial'

export function CorePlanet({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'min(34vw, 132px)' : 'min(24vw, 160px)'
  return (
    <div className="relative flex items-center justify-center">
      <OrbMaterial
        size={size}
        variant="blue"
        active
        className="min-h-24 min-w-24"
      />
      <Image
        src="/brand/shi-xing-wordmark.png"
        alt="拾星"
        width={420}
        height={188}
        priority
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-auto -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_0_20px_rgba(156,190,238,0.28)]"
        style={{ width: compact ? 'min(31vw, 122px)' : 'min(17vw, 172px)' }}
      />
    </div>
  )
}
