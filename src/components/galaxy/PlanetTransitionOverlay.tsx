'use client'

import { motion } from 'motion/react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { OrbMaterial, type OrbMaterialVariant } from '@/components/visual/OrbMaterial'

export function PlanetTransitionOverlay({ planet }: { planet: PlanetRoute | null }) {
  if (!planet) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
	      <motion.div
	        className="absolute rounded-full"
	        style={{
	          width: planet.size,
	          height: planet.size,
	        }}
        initial={{ scale: 0.96, opacity: 0.88 }}
        animate={{ scale: 28, opacity: 1 }}
        transition={{ duration: 0.86, ease: [0.2, 0.78, 0.18, 1] }}
	      >
	        <OrbMaterial size="100%" variant={getOrbVariant(planet)} active />
	      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.56 }}
        transition={{ duration: 0.74, ease: 'easeOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(0,0,1,0.5) 54%, rgba(0,0,1,0.84) 100%)',
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
