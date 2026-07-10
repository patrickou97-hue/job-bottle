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
        'radial-gradient(circle at 32% 25%, rgba(241,239,255,0.76) 0 4%, rgba(126,124,181,0.58) 8%, rgba(18,41,78,0.9) 34%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 34px rgba(126,124,181,0.26), 0 0 92px rgba(18,41,78,0.16), inset -18px -24px 42px rgba(0,0,0,0.58), inset 14px 10px 28px rgba(231,226,255,0.08)',
    },
    hoverGlow: '0 0 46px rgba(158,156,210,0.36), 0 0 120px rgba(86,74,113,0.2), inset -18px -24px 42px rgba(0,0,0,0.54)',
    glint: 'rgba(241,239,255,0.54)',
    grain: 'rgba(201,197,228,0.16)',
  },
  applications: {
    surface: {
      background:
        'radial-gradient(circle at 31% 27%, rgba(231,226,255,0.62) 0 5%, rgba(126,124,181,0.66) 20%, rgba(18,41,78,0.96) 58%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 30px rgba(126,124,181,0.22), 0 0 84px rgba(18,41,78,0.12), inset -16px -22px 38px rgba(0,0,0,0.6), inset 10px 8px 24px rgba(231,226,255,0.07)',
    },
    hoverGlow: '0 0 42px rgba(158,156,210,0.32), 0 0 108px rgba(86,74,113,0.18), inset -16px -22px 38px rgba(0,0,0,0.55)',
    glint: 'rgba(231,226,255,0.46)',
    grain: 'rgba(181,174,211,0.14)',
  },
  bottle: {
    surface: {
      background:
        'radial-gradient(circle at 35% 24%, rgba(241,239,255,0.72) 0 4%, rgba(126,124,181,0.64) 16%, rgba(18,41,78,0.96) 55%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 34px rgba(158,156,210,0.22), 0 0 112px rgba(86,74,113,0.12), inset -16px -24px 40px rgba(0,0,0,0.62), inset 12px 8px 26px rgba(231,226,255,0.08)',
    },
    hoverGlow: '0 0 48px rgba(184,180,224,0.3), 0 0 126px rgba(86,74,113,0.17), inset -16px -24px 40px rgba(0,0,0,0.56)',
    glint: 'rgba(241,239,255,0.5)',
    grain: 'rgba(201,197,228,0.12)',
  },
  resume: {
    surface: {
      background:
        'radial-gradient(circle at 34% 25%, rgba(242,222,233,0.64) 0 4%, rgba(127,85,104,0.66) 18%, rgba(86,74,113,0.96) 58%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 30px rgba(127,85,104,0.24), 0 0 82px rgba(86,74,113,0.14), inset -14px -20px 36px rgba(0,0,0,0.62), inset 10px 8px 22px rgba(242,222,233,0.06)',
    },
    hoverGlow: '0 0 40px rgba(173,120,142,0.3), 0 0 104px rgba(127,85,104,0.18), inset -14px -20px 36px rgba(0,0,0,0.55)',
    glint: 'rgba(242,222,233,0.46)',
    grain: 'rgba(173,120,142,0.12)',
  },
  auth: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(231,226,255,0.54) 0 4%, rgba(126,124,181,0.7) 23%, rgba(18,41,78,0.96) 62%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 28px rgba(126,124,181,0.22), 0 0 76px rgba(18,41,78,0.12), inset -14px -18px 34px rgba(0,0,0,0.6), inset 8px 7px 18px rgba(231,226,255,0.06)',
    },
    hoverGlow: '0 0 38px rgba(158,156,210,0.32), 0 0 94px rgba(86,74,113,0.18), inset -14px -18px 34px rgba(0,0,0,0.55)',
    glint: 'rgba(231,226,255,0.42)',
    grain: 'rgba(181,174,211,0.11)',
  },
  forum: {
    surface: {
      background:
        'radial-gradient(circle at 32% 27%, rgba(242,222,233,0.5) 0 4%, rgba(127,85,104,0.7) 24%, rgba(86,74,113,0.96) 62%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 24px rgba(127,85,104,0.22), 0 0 68px rgba(86,74,113,0.12), inset -12px -18px 30px rgba(0,0,0,0.62), inset 7px 6px 16px rgba(242,222,233,0.06)',
    },
    hoverGlow: '0 0 34px rgba(173,120,142,0.28), 0 0 84px rgba(127,85,104,0.16), inset -12px -18px 30px rgba(0,0,0,0.55)',
    glint: 'rgba(242,222,233,0.38)',
    grain: 'rgba(173,120,142,0.1)',
  },
  admin: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(225,220,241,0.4) 0 4%, rgba(86,74,113,0.66) 24%, rgba(18,41,78,0.94) 62%, rgba(0,0,1,1) 100%)',
      boxShadow:
        '0 0 20px rgba(181,174,211,0.16), 0 0 56px rgba(18,41,78,0.1), inset -12px -18px 30px rgba(0,0,0,0.64), inset 7px 6px 16px rgba(225,220,241,0.05)',
    },
    hoverGlow: '0 0 28px rgba(201,197,228,0.24), 0 0 72px rgba(86,74,113,0.14), inset -12px -18px 30px rgba(0,0,0,0.56)',
    glint: 'rgba(231,226,255,0.3)',
    grain: 'rgba(181,174,211,0.09)',
  },
}

export function planetStyle(variant: PlanetVariant, hovered = false): CSSProperties {
  const visual = PLANET_VISUALS[variant]
  return {
    ...visual.surface,
    boxShadow: hovered ? visual.hoverGlow : visual.surface.boxShadow,
  }
}
