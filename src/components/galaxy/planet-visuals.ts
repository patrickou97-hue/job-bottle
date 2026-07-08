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
        'radial-gradient(circle at 32% 25%, rgba(226,238,255,0.72) 0 4%, rgba(111,145,188,0.58) 8%, rgba(29,51,89,0.94) 34%, rgba(5,12,28,1) 100%)',
      boxShadow:
        '0 0 34px rgba(105,139,184,0.24), 0 0 92px rgba(60,91,135,0.12), inset -18px -24px 42px rgba(0,0,0,0.58), inset 14px 10px 28px rgba(182,210,242,0.08)',
    },
    hoverGlow: '0 0 46px rgba(151,181,218,0.34), 0 0 120px rgba(74,112,158,0.18), inset -18px -24px 42px rgba(0,0,0,0.54)',
    glint: 'rgba(231,242,255,0.5)',
    grain: 'rgba(173,199,230,0.16)',
  },
  applications: {
    surface: {
      background:
        'radial-gradient(circle at 31% 27%, rgba(198,224,232,0.58) 0 5%, rgba(64,101,111,0.82) 20%, rgba(11,35,47,0.98) 58%, rgba(2,10,18,1) 100%)',
      boxShadow:
        '0 0 30px rgba(68,132,146,0.2), 0 0 84px rgba(46,91,112,0.09), inset -16px -22px 38px rgba(0,0,0,0.6), inset 10px 8px 24px rgba(181,223,232,0.07)',
    },
    hoverGlow: '0 0 42px rgba(109,177,191,0.3), 0 0 108px rgba(51,104,124,0.16), inset -16px -22px 38px rgba(0,0,0,0.55)',
    glint: 'rgba(218,245,249,0.42)',
    grain: 'rgba(145,207,221,0.14)',
  },
  bottle: {
    surface: {
      background:
        'radial-gradient(circle at 35% 24%, rgba(238,246,255,0.68) 0 4%, rgba(119,136,174,0.62) 16%, rgba(25,31,58,0.98) 55%, rgba(5,7,18,1) 100%)',
      boxShadow:
        '0 0 34px rgba(174,197,230,0.18), 0 0 112px rgba(91,108,161,0.11), inset -16px -24px 40px rgba(0,0,0,0.62), inset 12px 8px 26px rgba(223,234,255,0.08)',
    },
    hoverGlow: '0 0 48px rgba(197,215,239,0.28), 0 0 126px rgba(96,112,168,0.16), inset -16px -24px 40px rgba(0,0,0,0.56)',
    glint: 'rgba(241,248,255,0.48)',
    grain: 'rgba(183,199,228,0.12)',
  },
  resume: {
    surface: {
      background:
        'radial-gradient(circle at 34% 25%, rgba(242,229,189,0.58) 0 4%, rgba(105,100,140,0.62) 18%, rgba(49,59,89,0.98) 58%, rgba(6,9,20,1) 100%)',
      boxShadow:
        '0 0 30px rgba(242,209,109,0.16), 0 0 82px rgba(105,100,140,0.11), inset -14px -20px 36px rgba(0,0,0,0.62), inset 10px 8px 22px rgba(242,229,189,0.06)',
    },
    hoverGlow: '0 0 40px rgba(242,229,189,0.24), 0 0 104px rgba(105,100,140,0.16), inset -14px -20px 36px rgba(0,0,0,0.55)',
    glint: 'rgba(255,246,227,0.42)',
    grain: 'rgba(217,173,169,0.11)',
  },
  auth: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(225,236,249,0.5) 0 4%, rgba(62,91,129,0.7) 23%, rgba(13,25,47,0.98) 62%, rgba(3,7,16,1) 100%)',
      boxShadow:
        '0 0 28px rgba(90,135,194,0.19), 0 0 76px rgba(41,77,126,0.1), inset -14px -18px 34px rgba(0,0,0,0.6), inset 8px 7px 18px rgba(206,226,250,0.06)',
    },
    hoverGlow: '0 0 38px rgba(126,166,218,0.3), 0 0 94px rgba(64,101,154,0.16), inset -14px -18px 34px rgba(0,0,0,0.55)',
    glint: 'rgba(232,243,255,0.38)',
    grain: 'rgba(150,180,220,0.11)',
  },
  forum: {
    surface: {
      background:
        'radial-gradient(circle at 32% 27%, rgba(215,208,241,0.44) 0 4%, rgba(80,76,118,0.68) 24%, rgba(26,22,51,0.98) 62%, rgba(6,5,17,1) 100%)',
      boxShadow:
        '0 0 24px rgba(123,110,178,0.16), 0 0 68px rgba(79,68,132,0.08), inset -12px -18px 30px rgba(0,0,0,0.62), inset 7px 6px 16px rgba(211,204,240,0.06)',
    },
    hoverGlow: '0 0 34px rgba(154,141,205,0.24), 0 0 84px rgba(91,77,150,0.12), inset -12px -18px 30px rgba(0,0,0,0.55)',
    glint: 'rgba(230,224,252,0.34)',
    grain: 'rgba(184,172,220,0.1)',
  },
  admin: {
    surface: {
      background:
        'radial-gradient(circle at 34% 28%, rgba(218,226,240,0.36) 0 4%, rgba(68,73,86,0.68) 24%, rgba(17,19,26,0.98) 62%, rgba(4,5,10,1) 100%)',
      boxShadow:
        '0 0 20px rgba(134,146,164,0.13), 0 0 56px rgba(72,82,102,0.08), inset -12px -18px 30px rgba(0,0,0,0.64), inset 7px 6px 16px rgba(217,226,240,0.05)',
    },
    hoverGlow: '0 0 28px rgba(163,176,195,0.22), 0 0 72px rgba(88,101,124,0.12), inset -12px -18px 30px rgba(0,0,0,0.56)',
    glint: 'rgba(226,234,246,0.28)',
    grain: 'rgba(178,190,210,0.09)',
  },
}

export function planetStyle(variant: PlanetVariant, hovered = false): CSSProperties {
  const visual = PLANET_VISUALS[variant]
  return {
    ...visual.surface,
    boxShadow: hovered ? visual.hoverGlow : visual.surface.boxShadow,
  }
}
