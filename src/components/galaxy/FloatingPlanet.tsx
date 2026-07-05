'use client'

import { motion } from 'motion/react'
import { Briefcase, FileText, LogIn, MessageSquare, Shield, Sparkles } from 'lucide-react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'

const ORBIT_Y_SCALE = 0.62
const ORBIT_ROTATION_DEG = -7
const ORBIT_KEYFRAME_OFFSETS = [0, 60, 120, 180, 240, 300, 360]

type FloatingPlanetProps = {
  planet: PlanetRoute
  hovered: boolean
  entering: boolean
  disabled: boolean
  shouldOrbit: boolean
  orbitScale: number
  planetScale?: number
  onSelect: (planet: PlanetRoute) => void
  onHover: (planet: PlanetRoute | null) => void
}

function PlanetGlyph({ planet }: { planet: PlanetRoute }) {
  const className = 'size-5'
  if (planet.id === 'jobs') return <Briefcase className={className} />
  if (planet.id === 'applications') return <FileText className={className} />
  if (planet.id === 'forum') return <MessageSquare className={className} />
  if (planet.id === 'admin') return <Shield className={className} />
  if (planet.id === 'auth') return <LogIn className={className} />
  return <Sparkles className={className} />
}

function getOrbVariant(planet: PlanetRoute): OrbMaterialVariant {
  if (planet.id === 'forum') return 'violet'
  if (planet.id === 'admin') return 'muted'
  return 'blue'
}

export function FloatingPlanet({
  planet,
  hovered,
  entering,
  disabled,
  shouldOrbit,
  orbitScale,
  planetScale = 1,
  onSelect,
  onHover,
}: FloatingPlanetProps) {
  const orbitRadius = planet.orbitRadius * orbitScale
  const planetSize = planet.size * planetScale
  const staticPoint = getOrbitPoint(planet.initialAngle, orbitRadius)
  const path = ORBIT_KEYFRAME_OFFSETS.map((offset) => getOrbitPoint(planet.initialAngle + offset, orbitRadius))

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 size-0"
      initial={false}
      animate={
        shouldOrbit
          ? { x: path.map((point) => point.x), y: path.map((point) => point.y) }
          : { x: staticPoint.x, y: staticPoint.y }
      }
      transition={shouldOrbit ? { duration: planet.orbitDuration, repeat: Infinity, ease: 'linear' } : { duration: 0.2, ease: 'easeOut' }}
    >
      <motion.div
        className="absolute"
        style={{
          width: planetSize,
          height: planetSize,
          marginLeft: -planetSize / 2,
          marginTop: -planetSize / 2,
        }}
      >
        <motion.button
          type="button"
          aria-label={planet.label}
          disabled={disabled}
          onClick={() => onSelect(planet)}
          onMouseEnter={() => onHover(planet)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(planet)}
          onBlur={() => onHover(null)}
	          className="relative flex size-full items-center justify-center rounded-full outline-none"
	          animate={{
	            scale: entering ? 0.68 : hovered ? 1.04 : 1,
	            opacity: entering ? 0 : 1,
	            filter: entering ? 'blur(5px)' : hovered ? 'brightness(1.15)' : 'brightness(1)',
	          }}
	          transition={{ duration: entering ? 0.42 : 0.24, ease: 'easeOut' }}
	        >
	          <OrbMaterial
	            size="100%"
	            variant={getOrbVariant(planet)}
	            active={hovered}
	            icon={<PlanetGlyph planet={planet} />}
	          />
	        </motion.button>
	        <motion.span
	          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-xs font-medium"
	          style={{
	            color: hovered ? 'rgba(230,238,250,0.94)' : 'rgba(156,173,199,0.74)',
	            textShadow: hovered ? '0 0 18px rgba(112,143,185,0.24)' : 'none',
	          }}
	          animate={{ opacity: entering ? 0 : 1, y: hovered ? 1 : 0 }}
	          transition={{ duration: 0.2 }}
	        >
          {planet.label}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}

function getOrbitPoint(angleDeg: number, radius: number) {
  const angle = (angleDeg * Math.PI) / 180
  const rotation = (ORBIT_ROTATION_DEG * Math.PI) / 180
  const x = Math.cos(angle) * radius
  const y = Math.sin(angle) * radius * ORBIT_Y_SCALE
  return {
    x: x * Math.cos(rotation) - y * Math.sin(rotation),
    y: x * Math.sin(rotation) + y * Math.cos(rotation),
  }
}
