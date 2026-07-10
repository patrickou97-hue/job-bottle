import Image from 'next/image'
import { OrbMaterial } from '@/components/visual/OrbMaterial'

export function CorePlanet({ compact = false }: { compact?: boolean }) {
  const size = compact ? 'min(20vw, 78px)' : 'min(16vw, 116px)'
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
        className="pointer-events-none mt-3 h-auto object-contain drop-shadow-[0_0_20px_rgba(156,190,238,0.2)]"
        style={{ width: compact ? 'min(20vw, 82px)' : 'min(13vw, 128px)' }}
      />
    </div>
  )
}
