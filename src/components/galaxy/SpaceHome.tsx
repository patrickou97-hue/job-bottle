'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import { getCurrentUserOrNull } from '@/lib/auth'
import { SITE_NAME } from '@/lib/constants'
import { PLANET_ROUTES, type PlanetRoute } from '@/lib/galaxy-routes'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { CorePlanet } from './CorePlanet'
import { FloatingPlanet } from './FloatingPlanet'
import { OrbitLines } from './OrbitLines'
import { PlanetLabel } from './PlanetLabel'
import { PlanetTransitionOverlay } from './PlanetTransitionOverlay'
import { SpaceBackground } from './SpaceBackground'

const TRANSITION_MS = 860
const MOBILE_PLANET_LAYOUT: Record<string, { orbitRadius: number; initialAngle: number; size: number }> = {
  jobs: { orbitRadius: 210, initialAngle: 350, size: 58 },
  applications: { orbitRadius: 225, initialAngle: 92, size: 58 },
  bottle: { orbitRadius: 185, initialAngle: 202, size: 58 },
  forum: { orbitRadius: 170, initialAngle: 285, size: 48 },
  admin: { orbitRadius: 235, initialAngle: 150, size: 46 },
  auth: { orbitRadius: 155, initialAngle: 35, size: 46 },
}

export function SpaceHome() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState<PlanetRoute | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetRoute | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1200)
  const [viewportHeight, setViewportHeight] = useState(900)

  useEffect(() => {
    const onResize = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
    }
    const frame = window.requestAnimationFrame(() => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
    })
    window.addEventListener('resize', onResize)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    let mounted = true

    async function load() {
      const currentUser = await getCurrentUserOrNull(supabase)
      if (!mounted) return
      setUser(currentUser ?? null)
      if (!currentUser) {
        setIsAdmin(false)
        return
      }
      const { data } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle()
      if (mounted) setIsAdmin((data as { role?: string } | null)?.role === 'admin')
    }

    load()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load())

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const planets = useMemo(() => {
    const authPlanet: PlanetRoute = {
      id: 'auth',
      label: user ? '个人中心' : '登录',
      description: user ? '查看你的投递记录和星瓶' : '登录后保存投递记录',
      href: user ? '/my' : '/login',
      orbitRadius: 790,
      orbitDuration: 120,
      initialAngle: 38,
      size: 48,
      variant: 'auth',
    }
    return [...PLANET_ROUTES.filter((planet) => !planet.adminOnly || isAdmin), authPlanet]
  }, [isAdmin, user])

  function enterPlanet(planet: PlanetRoute) {
    if (selectedPlanet) return
    if (planet.adminOnly && !isAdmin) return

    setHovered(planet)
    setSelectedPlanet(planet)

    const href = planet.requiresAuth && !user ? `/login?next=${encodeURIComponent(planet.href)}` : planet.href
    window.setTimeout(
      () => {
        router.push(href)
      },
      reducedMotion ? 80 : TRANSITION_MS,
    )
  }

  const entering = selectedPlanet !== null
  const shouldOrbit = !reducedMotion && !entering
  const desktopMaxOrbitRadius = Math.max(...planets.map((planet) => planet.orbitRadius))
  const desktopOrbitScale = Math.min(
    0.78,
    Math.max(
      0.52,
      Math.min(
        (viewportWidth - 220) / (desktopMaxOrbitRadius * 2),
        (viewportHeight - 120) / (desktopMaxOrbitRadius * 2),
      ),
    ),
  )
  const mobilePlanets = useMemo(
    () =>
      planets.map((planet) => {
        const layout = MOBILE_PLANET_LAYOUT[planet.id]
        if (!layout) return planet
        return { ...planet, ...layout }
      }),
    [planets],
  )
  const mobileMaxOrbitRadius = Math.max(...mobilePlanets.map((planet) => planet.orbitRadius))
  const mobileOrbitScale = Math.min(
    1,
    Math.max(0.72, Math.min((viewportWidth - 112) / (mobileMaxOrbitRadius * 2), (viewportHeight - 320) / (mobileMaxOrbitRadius * 2))),
  )

  return (
    <main
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: 'var(--space-base)', color: 'var(--text-primary)' }}
    >
      <SpaceBackground entering={entering} />

      <div className="pointer-events-none absolute left-6 top-5 z-30 flex items-center gap-3 md:left-10 md:top-8">
        <span className="relative flex size-10 overflow-hidden rounded-full bg-[#08101d]/52 shadow-[0_0_28px_rgba(126,158,214,0.16)]">
          <Image src="/brand/job-bottle-logo-v2.png" alt="" width={40} height={40} className="size-full object-cover" />
        </span>
        <span className="font-display text-base font-semibold tracking-normal" style={{ color: 'rgba(224,233,246,0.9)' }}>
          {SITE_NAME}
        </span>
      </div>

      <button
        type="button"
        disabled={entering}
        onClick={() =>
          enterPlanet({
            id: 'auth',
            label: user ? '个人中心' : '登录',
            description: user ? '查看你的投递记录和星瓶' : '登录后保存投递记录',
            href: user ? '/my' : '/login',
            orbitRadius: 0,
            orbitDuration: 150,
            initialAngle: 0,
            size: 48,
            variant: 'auth',
          })
        }
        className="absolute right-6 top-5 z-30 text-sm font-medium outline-none md:right-10 md:top-8"
        style={{
          color: 'var(--text-secondary)',
          opacity: entering ? 0.25 : 1,
          transition: 'color 180ms ease, opacity 180ms ease',
        }}
      >
        {user ? '个人中心' : '登录'}
      </button>

      <section className="absolute inset-0 z-10 hidden items-center justify-center md:flex">
        <motion.div
          animate={{ opacity: entering ? 0 : 1, scale: entering ? 1.08 : 1 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
        >
          <OrbitLines planets={planets} activeId={hovered?.id} orbitScale={desktopOrbitScale} />
        </motion.div>

        <motion.div
          className="absolute"
          animate={{
            opacity: entering ? 0.12 : 1,
            scale: entering ? 0.82 : 1,
            filter: entering ? 'blur(3px)' : 'blur(0px)',
          }}
          transition={{ duration: 0.52, ease: 'easeOut' }}
        >
          {planets.map((planet) => (
            <FloatingPlanet
              key={planet.id}
              planet={planet}
              hovered={hovered?.id === planet.id}
              entering={entering}
              disabled={entering}
              shouldOrbit={shouldOrbit}
              orbitScale={desktopOrbitScale}
              onSelect={enterPlanet}
              onHover={setHovered}
            />
          ))}
        </motion.div>

        <motion.div
          className="relative z-20"
          animate={{ opacity: entering ? 0.16 : 1, scale: entering ? 0.94 : 1 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
        >
          <CorePlanet />
        </motion.div>
      </section>

      <section className="relative z-10 flex h-full flex-col items-center justify-center gap-12 md:hidden">
        <motion.div
          className="relative flex h-[min(78svh,640px)] min-h-[500px] w-full items-center justify-center"
          animate={{ opacity: entering ? 0.14 : 1, scale: entering ? 0.9 : 1 }}
          transition={{ duration: 0.42, ease: 'easeOut' }}
        >
          <OrbitLines planets={mobilePlanets} activeId={hovered?.id} orbitScale={mobileOrbitScale} />
          <div className="absolute">
            {mobilePlanets.map((planet) => (
              <FloatingPlanet
                key={planet.id}
                planet={planet}
                hovered={hovered?.id === planet.id}
                entering={entering}
                disabled={entering}
                shouldOrbit={shouldOrbit}
                orbitScale={mobileOrbitScale}
                planetScale={0.82}
                onSelect={enterPlanet}
                onHover={setHovered}
              />
            ))}
          </div>
          <div className="relative z-20">
            <CorePlanet compact />
          </div>
        </motion.div>
      </section>

      <PlanetLabel planet={hovered} />
      <PlanetTransitionOverlay planet={selectedPlanet} />
    </main>
  )
}
