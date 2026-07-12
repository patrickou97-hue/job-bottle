'use client'

import { motion, useReducedMotion } from 'motion/react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { motionDuration, motionEase } from '@/lib/motion'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'

type PlanetTransition = { planet: PlanetRoute; rect: DOMRect }

export function PlanetTransitionOverlay({ transition }: { transition: PlanetTransition | null }) {
  const reducedMotion = useReducedMotion()
  if (!transition) return null

  const { planet, rect } = transition
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  const targetSize = Math.max(window.innerWidth, window.innerHeight) * 1.7
  const targetX = window.innerWidth * (window.innerWidth < 768 ? 0.5 : 0.58)
  const targetY = window.innerHeight * 0.48
  const scale = targetSize / Math.max(rect.width, 1)

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden="true">
	      <motion.div
	        className="absolute z-10 rounded-full"
	        style={{
	          left: centerX - rect.width / 2,
	          top: centerY - rect.height / 2,
	          width: rect.width,
	          height: rect.height,
	          transformOrigin: '50% 50%',
	        }}
        initial={{ x: 0, y: 0, scale: 0.975, opacity: 1 }}
        animate={reducedMotion
          ? { opacity: 0 }
          : { x: targetX - centerX, y: targetY - centerY, scale, opacity: 1 }}
        transition={{
          duration: reducedMotion ? motionDuration.instant : motionDuration.immersive,
          ease: reducedMotion ? motionEase.exit : motionEase.planetApproach,
        }}
	      >
	        <OrbMaterial size="100%" variant={getOrbVariant(planet)} active />
	      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: reducedMotion ? 0.72 : 0.5 }}
        transition={{ duration: reducedMotion ? motionDuration.instant : motionDuration.slow, ease: motionEase.enter }}
        style={{
          background: 'rgba(0,0,1,0.58)',
        }}
      />
    </div>
	  )
}

function getOrbVariant(planet: PlanetRoute): OrbMaterialVariant {
  if (planet.id === 'forum') return 'violet'
  if (planet.id === 'admin') return 'muted'
  return 'blue'
}
