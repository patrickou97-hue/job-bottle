'use client'

import { motion } from 'motion/react'
import { Briefcase, FileText, LogIn, MessageSquare, Shield, Sparkles } from 'lucide-react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { planetStyle, PLANET_VISUALS } from './planet-visuals'

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
  const className = planet.id === 'jobs' ? 'size-6' : 'size-5'
  const style = { color: 'rgba(226,235,247,0.76)' }
  if (planet.id === 'jobs') return <Briefcase className={className} style={style} />
  if (planet.id === 'applications') return <FileText className={className} style={style} />
  if (planet.id === 'forum') return <MessageSquare className={className} style={style} />
  if (planet.id === 'admin') return <Shield className={className} style={style} />
  if (planet.id === 'auth') return <LogIn className={className} style={style} />
  return <Sparkles className={className} style={style} />
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
  const visual = PLANET_VISUALS[planet.variant]
  const orbitRadius = planet.orbitRadius * orbitScale
  const planetSize = planet.size * planetScale

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 size-0"
      initial={{ rotate: planet.initialAngle }}
      animate={
        shouldOrbit
          ? {
              rotate: [planet.initialAngle, planet.initialAngle + 360],
            }
          : {
              rotate: planet.initialAngle,
            }
      }
      transition={shouldOrbit ? { duration: planet.orbitDuration, repeat: Infinity, ease: 'linear' } : undefined}
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
        animate={{
          rotate: shouldOrbit ? [-planet.initialAngle, -planet.initialAngle - 360] : -planet.initialAngle,
        }}
        transition={shouldOrbit ? { duration: planet.orbitDuration, repeat: Infinity, ease: 'linear' } : undefined}
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
          className="relative flex size-full items-center justify-center overflow-hidden rounded-full outline-none"
          style={planetStyle(planet.variant, hovered)}
          animate={{
            scale: entering ? 0.68 : hovered ? 1.13 : 1,
            opacity: entering ? 0 : 1,
            filter: entering ? 'blur(5px)' : hovered ? 'brightness(1.12)' : 'brightness(1)',
          }}
          transition={{ duration: entering ? 0.42 : 0.24, ease: 'easeOut' }}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 24%, ${visual.glint} 0 7%, transparent 29%), radial-gradient(circle at 72% 78%, rgba(0,0,0,0.38), transparent 45%)`,
              opacity: hovered ? 1 : 0.78,
            }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-[14%] rounded-full blur-[2px]"
            style={{
              background: `linear-gradient(145deg, ${visual.grain}, transparent 54%)`,
              opacity: hovered ? 0.82 : 0.48,
            }}
          />
          <span className="relative z-10 flex items-center justify-center opacity-80">
            <PlanetGlyph planet={planet} />
          </span>
        </motion.button>
        <motion.span
          className="pointer-events-none absolute left-1/2 top-full mt-4 -translate-x-1/2 whitespace-nowrap text-sm font-medium"
          style={{ color: 'rgba(208,220,238,0.86)', textShadow: '0 0 18px rgba(112,143,185,0.24)' }}
          animate={{ opacity: hovered && !entering ? 1 : 0, y: hovered ? 0 : -4 }}
          transition={{ duration: 0.2 }}
        >
          {planet.label}
        </motion.span>
      </motion.div>
    </motion.div>
  )
}
