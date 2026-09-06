'use client'

import type { CSSProperties } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Briefcase, FileText, LogIn, ScrollText, Shield, Sparkles } from 'lucide-react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'
import { cn } from '@/lib/utils'

type FloatingPlanetProps = {
  planet: PlanetRoute
  hovered: boolean
  selected: boolean
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
  if (planet.id === 'resume') return <ScrollText className={className} />
  if (planet.id === 'forum') return <BookOpen className={className} />
  if (planet.id === 'admin') return <Shield className={className} />
  if (planet.id === 'auth') return <LogIn className={className} />
  return <Sparkles className={className} />
}

function getOrbVariant(planet: PlanetRoute): OrbMaterialVariant {
  if (planet.id === 'applications') return 'rose'
  if (planet.id === 'extension') return 'cyan'
  if (planet.id === 'bottle') return 'gold'
  if (planet.id === 'resume') return 'cream'
  if (planet.id === 'forum') return 'violet'
  if (planet.id === 'auth') return 'muted'
  if (planet.id === 'admin') return 'muted'
  return 'blue'
}

export function FloatingPlanet({
  planet,
  hovered,
  selected,
  entering,
  disabled,
  shouldOrbit,
  orbitScale,
  planetScale = 1,
  onSelect,
  onHover,
}: FloatingPlanetProps) {
  const focused = hovered || selected
  const orbitRadius = planet.orbitRadius * orbitScale
  const planetSize = planet.size * planetScale
  const orbitStyle = {
    '--planet-angle': `${planet.initialAngle}deg`,
    '--planet-counter-angle': `${-planet.initialAngle}deg`,
    '--planet-orbit-radius': `${orbitRadius}px`,
    '--planet-orbit-duration': `${planet.orbitDuration}s`,
    '--planet-size': `${planetSize}px`,
  } as CSSProperties

  return (
    <div
      className={cn(
        'home-orbit absolute left-1/2 top-1/2 size-0',
        !shouldOrbit && 'home-orbit--paused',
      )}
      style={orbitStyle}
    >
      <div className="home-orbit__planet absolute">
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
          whileTap={disabled ? undefined : { scale: 0.975 }}
          animate={{
            scale: entering ? (selected ? 1.08 : 0.94) : hovered ? 1.04 : 1,
            opacity: entering ? (selected ? 1 : 0.16) : 1,
          }}
          transition={{ duration: entering ? 0.18 : 0.24, ease: 'easeOut' }}
        >
          <OrbMaterial
            size="100%"
            variant={getOrbVariant(planet)}
            active={focused}
            icon={<PlanetGlyph planet={planet} />}
          />
        </motion.button>
        <motion.span
          className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-xs font-medium"
          style={{
            color: focused ? 'rgba(241,239,255,0.96)' : 'rgba(201,214,232,0.76)',
            textShadow: focused ? '0 0 18px rgba(29, 47, 79,0.28)' : 'none',
          }}
          animate={{ opacity: entering ? (selected ? 1 : 0) : 1, y: focused ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {planet.label}
        </motion.span>
      </div>
    </div>
  )
}
