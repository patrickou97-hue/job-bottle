'use client'

import { motion } from 'motion/react'
import type { PlanetRoute } from '@/lib/galaxy-routes'
import { planetStyle, PLANET_VISUALS } from './planet-visuals'

export function PlanetTransitionOverlay({ planet }: { planet: PlanetRoute | null }) {
  if (!planet) return null

  const visual = PLANET_VISUALS[planet.variant]

  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center overflow-hidden">
      <motion.div
        className="absolute rounded-full"
        style={{
          width: planet.size,
          height: planet.size,
          ...planetStyle(planet.variant, true),
        }}
        initial={{ scale: 0.96, opacity: 0.88 }}
        animate={{ scale: 28, opacity: 1 }}
        transition={{ duration: 0.86, ease: [0.2, 0.78, 0.18, 1] }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 24%, ${visual.glint} 0 7%, transparent 28%), radial-gradient(circle at 72% 76%, rgba(0,0,0,0.42), transparent 44%)`,
          }}
        />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.56 }}
        transition={{ duration: 0.74, ease: 'easeOut' }}
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(1,3,10,0.54) 54%, rgba(1,3,10,0.9) 100%)',
        }}
      />
    </div>
  )
}
