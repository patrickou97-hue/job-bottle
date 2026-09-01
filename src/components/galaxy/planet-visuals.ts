import type { CSSProperties } from 'react'
import type { PlanetRoute } from '@/lib/galaxy-routes'

export type PlanetVariant = PlanetRoute['variant']

type PlanetVisual = {
  surface: CSSProperties
  hoverGlow: string
  glint: string
  grain: string
}

export const PLANET_VISUALS: Record<PlanetVariant, PlanetVisual> = {
  jobs: {
    surface: {
      background:
        'radial-gradient(circle at 32% 25%, rgba(255,249,227,0.82) 0 4%, rgba(243,198,77,0.62) 8%, rgba(16,38,74,0.92) 34%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 34px rgba(243,198,77,0.28), 0 0 92px rgba(16,38,74,0.18), inset -18px -24px 42px rgba(0,0,0,0.58), inset 14px 10px 28px rgba(255,249,227,0.08)',
    },
    hoverGlow: '0 0 46px rgba(243,198,77,0.38), 0 0 120px rgba(30,59,102,0.22), inset -18px -24px 42px rgba(0,0,0,0.54)',
    glint: 'rgba(255,249,227,0.56)',
    grain: 'rgba(216,225,239,0.17)',
  },
  applications: {
    surface: {
      background:
        'radial-gradient(circle at 31% 27%, rgba(255,249,227,0.68) 0 5%, rgba(216,166,47,0.72) 20%, rgba(16,38,74,0.96) 58%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 30px rgba(243,198,77,0.24), 0 0 84px rgba(16,38,74,0.14), inset -16px -22px 38px rgba(0,0,0,0.6), inset 10px 8px 24px rgba(255,249,227,0.07)',
    },
    hoverGlow: '0 0 42px rgba(243,198,77,0.34), 0 0 108px rgba(30,59,102,0.2), inset -16px -22px 38px rgba(0,0,0,0.55)',
    glint: 'rgba(255,249,227,0.48)',
    grain: 'rgba(216,225,239,0.15)',
  },
  bottle: {
    surface: {
      background:
        'radial-gradient(circle at 35% 24%, rgba(255,249,227,0.78) 0 4%, rgba(243,198,77,0.7) 16%, rgba(16,38,74,0.96) 55%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 34px rgba(243,198,77,0.24), 0 0 112px rgba(30,59,102,0.14), inset -16px -24px 40px rgba(0,0,0,0.62), inset 12px 8px 26px rgba(255,249,227,0.08)',
    },
    hoverGlow: '0 0 48px rgba(243,198,77,0.32), 0 0 126px rgba(30,59,102,0.19), inset -16px -24px 40px rgba(0,0,0,0.56)',
    glint: 'rgba(255,249,227,0.52)',
    grain: 'rgba(216,225,239,0.13)',
  },
  resume: {
    surface: {
      background:
        'radial-gradient(circle at 34% 25%, rgba(255,249,227,0.7) 0 4%, rgba(216,166,47,0.72) 18%, rgba(16,38,74,0.96) 58%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 30px rgba(243,198,77,0.26), 0 0 82px rgba(30,59,102,0.16), inset -14px -20px 36px rgba(0,0,0,0.62), inset 10px 8px 22px rgba(255,249,227,0.06)',
    },
    hoverGlow: '0 0 40px rgba(243,198,77,0.34), 0 0 104px rgba(30,59,102,0.2), inset -14px -20px 36px rgba(0,0,0,0.55)',
    glint: 'rgba(255,249,227,0.48)',
    grain: 'rgba(216,166,47,0.13)',
  },
  auth: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(255,249,227,0.62) 0 4%, rgba(243,198,77,0.76) 23%, rgba(16,38,74,0.96) 62%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 28px rgba(243,198,77,0.24), 0 0 76px rgba(16,38,74,0.14), inset -14px -18px 34px rgba(0,0,0,0.6), inset 8px 7px 18px rgba(255,249,227,0.06)',
    },
    hoverGlow: '0 0 38px rgba(243,198,77,0.34), 0 0 94px rgba(30,59,102,0.2), inset -14px -18px 34px rgba(0,0,0,0.55)',
    glint: 'rgba(255,249,227,0.44)',
    grain: 'rgba(216,225,239,0.12)',
  },
  forum: {
    surface: {
      background:
        'radial-gradient(circle at 32% 27%, rgba(255,249,227,0.58) 0 4%, rgba(216,166,47,0.76) 24%, rgba(16,38,74,0.96) 62%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 24px rgba(243,198,77,0.24), 0 0 68px rgba(30,59,102,0.14), inset -12px -18px 30px rgba(0,0,0,0.62), inset 7px 6px 16px rgba(255,249,227,0.06)',
    },
    hoverGlow: '0 0 34px rgba(243,198,77,0.3), 0 0 84px rgba(30,59,102,0.18), inset -12px -18px 30px rgba(0,0,0,0.55)',
    glint: 'rgba(255,249,227,0.4)',
    grain: 'rgba(216,166,47,0.11)',
  },
  admin: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(237,242,248,0.44) 0 4%, rgba(216,166,47,0.7) 24%, rgba(16,38,74,0.94) 62%, rgba(6,19,40,1) 100%)',
      boxShadow:
        '0 0 20px rgba(216,166,47,0.18), 0 0 56px rgba(16,38,74,0.12), inset -12px -18px 30px rgba(0,0,0,0.64), inset 7px 6px 16px rgba(237,242,248,0.05)',
    },
    hoverGlow: '0 0 28px rgba(243,198,77,0.26), 0 0 72px rgba(30,59,102,0.16), inset -12px -18px 30px rgba(0,0,0,0.56)',
    glint: 'rgba(255,249,227,0.34)',
    grain: 'rgba(216,225,239,0.1)',
  },
}

export function planetStyle(variant: PlanetVariant, hovered = false): CSSProperties {
  const visual = PLANET_VISUALS[variant]
  return {
    ...visual.surface,
    boxShadow: hovered ? visual.hoverGlow : visual.surface.boxShadow,
  }
}
