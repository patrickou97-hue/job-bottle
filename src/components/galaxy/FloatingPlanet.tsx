'use client'

import { motion } from 'motion/react'
import { Briefcase, FileText, LogIn, MessageSquare, ScrollText, Shield, Sparkles } from 'lucide-react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'

type FloatingPlanetProps = {
  planet: PlanetRoute
  hovered: boolean
  entering: boolean
  disabled: boolean
  shouldOrbit: boolean
  orbitScale: number
  planetScale?: number
  onSelect: (planet: PlanetRoute, rect: DOMRect) => void
  onHover: (planet: PlanetRoute | null) => void
}

function PlanetGlyph({ planet }: { planet: PlanetRoute }) {
  const className = 'size-5'
  if (planet.id === 'jobs') return <Briefcase className={className} />
  if (planet.id === 'applications') return <FileText className={className} />
  if (planet.id === 'resume') return <ScrollText className={className} />
  if (planet.id === 'forum') return <MessageSquare className={className} />
  if (planet.id === 'admin') return <Shield className={className} />
  if (planet.id === 'auth') return <LogIn className={className} />
  return <Sparkles className={className} />
}

function getOrbVariant(planet: PlanetRoute): OrbMaterialVariant {
  if (planet.id === 'applications') return 'violet'
  if (planet.id === 'bottle') return 'gold'
  if (planet.id === 'resume') return 'cream'
  if (planet.id === 'forum') return 'rose'
  if (planet.id === 'auth') return 'cream'
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

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 size-0"
      initial={{ rotate: planet.initialAngle }}
      animate={
        shouldOrbit
          ? { rotate: [planet.initialAngle, planet.initialAngle + 360] }
          : { rotate: planet.initialAngle }
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
          x: orbitRadius,
        }}
        initial={{ rotate: -planet.initialAngle }}
        animate={
          shouldOrbit
            ? { rotate: [-planet.initialAngle, -planet.initialAngle - 360] }
            : { rotate: -planet.initialAngle }
        }
        transition={shouldOrbit ? { duration: planet.orbitDuration, repeat: Infinity, ease: 'linear' } : { duration: 0.2, ease: 'easeOut' }}
      >
        <motion.button
          type="button"
          aria-label={planet.label}
          disabled={disabled}
          onClick={(event) => onSelect(planet, event.currentTarget.getBoundingClientRect())}
          onMouseEnter={() => onHover(planet)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(planet)}
          onBlur={() => onHover(null)}
	          className="relative flex size-full items-center justify-center rounded-full outline-none"
	          whileTap={disabled ? undefined : { scale: 0.975 }}
	          animate={{
	            scale: entering ? 0.86 : hovered ? 1.04 : 1,
	            opacity: entering ? 0 : 1,
	            filter: hovered ? 'brightness(1.15)' : 'brightness(1)',
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
            color: hovered ? 'rgba(241,239,255,0.94)' : 'rgba(201,197,228,0.74)',
            textShadow: hovered ? '0 0 18px rgba(126,124,181,0.26)' : 'none',
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
