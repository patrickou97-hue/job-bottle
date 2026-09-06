'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'motion/react'
import { getCurrentUserOrNull } from '@/lib/auth'
import { PLANET_ROUTES, type PlanetRoute } from '@/lib/galaxy-routes'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { CorePlanet } from './CorePlanet'
import { FloatingPlanet } from './FloatingPlanet'
import { OrbitLines } from './OrbitLines'
import { SpaceBackground } from './SpaceBackground'

// Prefetch first, then give the clicked planet a short emphasis before the
// destination's own content transition takes over.
const TRANSITION_MS = 180
const MOBILE_PLANET_SIZE: Record<string, number> = {
  jobs: 56,
  applications: 56,
  bottle: 56,
  extension: 54,
  resume: 52,
  forum: 48,
  admin: 46,
  auth: 46,
}
const MOBILE_PLANET_LAYOUT = {
  orbitRadius: 210,
  startAngle: -18,
  orbitDuration: 138,
}
const MOBILE_ROUTE_LAYOUT: Record<string, { radius: number; angle: number }> = {
  jobs: { radius: 226, angle: 12 },
  applications: { radius: 226, angle: 104 },
  bottle: { radius: 226, angle: 198 },
  resume: { radius: 146, angle: 302 },
  extension: { radius: 146, angle: 240 },
  forum: { radius: 146, angle: 48 },
  admin: { radius: 226, angle: 276 },
  auth: { radius: 146, angle: 168 },
}

export function SpaceHome() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState<PlanetRoute | null>(null)
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null)
  const [isLeaving, setIsLeaving] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(1200)
  const [viewportHeight, setViewportHeight] = useState(900)
  const resizeFrame = useRef<number | null>(null)

  useEffect(() => {
    const updateViewport = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)
      resizeFrame.current = null
    }
    const onResize = () => {
      if (resizeFrame.current !== null) return
      resizeFrame.current = window.requestAnimationFrame(updateViewport)
    }
    resizeFrame.current = window.requestAnimationFrame(updateViewport)
    window.addEventListener('resize', onResize)
    return () => {
      if (resizeFrame.current !== null) window.cancelAnimationFrame(resizeFrame.current)
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

    void load()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load())

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const planets = useMemo(() => {
    return PLANET_ROUTES.filter((planet) => !planet.adminOnly || isAdmin)
  }, [isAdmin])

  function enterPlanet(planet: PlanetRoute) {
    if (isLeaving) return
    if (planet.adminOnly && !isAdmin) return

    setHovered(planet)
    setSelectedPlanetId(planet.id)
    const href = planet.requiresAuth && !user ? `/login?next=${encodeURIComponent(planet.href)}` : planet.href
    router.prefetch(href)
    setIsLeaving(true)
    window.setTimeout(
      () => {
        router.push(href)
      },
      reducedMotion ? 0 : TRANSITION_MS,
    )
  }

  const entering = isLeaving
  const shouldOrbit = !reducedMotion && !entering
  const desktopMaxOrbitRadius = Math.max(...planets.map((planet) => planet.orbitRadius))
  const compactDesktopHeight = viewportHeight <= 720
  const desktopVerticalReserve = compactDesktopHeight ? 220 : 120
  const desktopMinimumScale = compactDesktopHeight ? 0.26 : 0.52
  const desktopOrbitScale = Math.min(
    0.78,
    Math.max(
      desktopMinimumScale,
      Math.min(
        (viewportWidth - 220) / (desktopMaxOrbitRadius * 2),
        (viewportHeight - desktopVerticalReserve) / (desktopMaxOrbitRadius * 2),
      ),
    ),
  )
  const mobilePlanets = useMemo(
    () =>
      planets.map((planet, index) => {
        const angleStep = 360 / Math.max(1, planets.length)
        const mobile = MOBILE_ROUTE_LAYOUT[planet.id]
        return {
          ...planet,
          orbitRadius: mobile?.radius ?? MOBILE_PLANET_LAYOUT.orbitRadius,
          initialAngle: mobile?.angle ?? MOBILE_PLANET_LAYOUT.startAngle + index * angleStep,
          size: MOBILE_PLANET_SIZE[planet.id] ?? planet.size,
          orbitDuration: MOBILE_PLANET_LAYOUT.orbitDuration,
        }
      }),
    [planets],
  )
  const mobileMaxOrbitRadius = Math.max(...mobilePlanets.map((planet) => planet.orbitRadius))
  const mobileOrbitScale = Math.min(
    0.92,
    Math.max(0.78, Math.min((viewportWidth - 90) / (mobileMaxOrbitRadius * 2), (viewportHeight - 300) / (mobileMaxOrbitRadius * 2))),
  )

  return (
    <main
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: 'var(--space-base)', color: 'var(--text-primary)' }}
    >
      <SpaceBackground entering={entering} />

      <Link
        href="/"
        aria-label="返回拾星主页"
        className="absolute left-5 top-5 z-30 md:left-10 md:top-8"
        style={{
          opacity: entering ? 0 : 1,
          transform: entering ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'opacity 180ms ease, transform 180ms ease',
        }}
      >
        <Image
          src="/brand/shi-xing-wordmark.png"
          alt="拾星"
          width={220}
          height={98}
          priority
          className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(29, 47, 79,0.24)] md:h-10"
        />
      </Link>

      <button
        type="button"
        disabled={entering}
        onClick={() =>
          enterPlanet({
            id: 'auth',
            label: user ? '资料' : '登录',
            description: user ? '查看个人资料与简历版本' : '登录后，保存岗位与投递记录',
            href: user ? '/profile' : '/login',
            orbitRadius: 0,
            orbitDuration: 150,
            initialAngle: 0,
            size: 48,
            variant: 'auth',
          })
        }
        className="absolute right-6 top-5 z-30 rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] focus-visible:ring-offset-2 focus-visible:ring-offset-black md:right-10 md:top-8"
        style={{
          color: 'var(--text-secondary)',
          opacity: entering ? 0 : 1,
          transform: entering ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'color 180ms ease, opacity 180ms ease, transform 180ms ease',
        }}
      >
        {user ? '资料' : '登录'}
      </button>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-4 z-20 hidden justify-center md:flex"
        style={{ opacity: entering ? 0 : 1, transition: 'opacity 180ms ease' }}
      >
        <p className="text-[11px] tracking-[0.18em]" style={{ color: 'rgba(201,214,232,0.52)' }}>
          发现机会 <span className="mx-2" style={{ color: 'rgba(224,161,55,0.72)' }}>·</span> 准备材料 <span className="mx-2" style={{ color: 'rgba(224,161,55,0.72)' }}>·</span> 安全网申
        </p>
      </div>

      <section className="absolute inset-x-0 bottom-10 top-20 z-10 hidden items-center justify-center md:flex lg:bottom-8 lg:top-16">
        <motion.div
          animate={{ opacity: entering ? 0 : 1 }}
          transition={{ duration: 0.48, ease: 'easeOut' }}
        >
          <OrbitLines planets={planets} activeId={hovered?.id} orbitScale={desktopOrbitScale} />
        </motion.div>

        <div className="absolute">
          {planets.map((planet) => (
            <FloatingPlanet
              key={planet.id}
              planet={planet}
              hovered={hovered?.id === planet.id}
              selected={selectedPlanetId === planet.id}
              entering={entering}
              disabled={entering}
              shouldOrbit={shouldOrbit}
              orbitScale={desktopOrbitScale}
              onSelect={enterPlanet}
              onHover={setHovered}
            />
          ))}
        </div>

        <motion.div
          className="relative z-20"
          animate={{ opacity: entering ? 0 : 1, scale: entering ? 0.98 : 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <CorePlanet />
        </motion.div>
      </section>

      <section className="relative z-10 flex h-full flex-col items-center justify-center gap-12 md:hidden">
        <div className="relative flex h-[min(78svh,640px)] min-h-[500px] w-full items-center justify-center">
          <motion.div
            animate={{ opacity: entering ? 0 : 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <OrbitLines planets={mobilePlanets} activeId={hovered?.id} orbitScale={mobileOrbitScale} />
          </motion.div>
          <div className="absolute">
            {mobilePlanets.map((planet) => (
              <FloatingPlanet
                key={planet.id}
                planet={planet}
                hovered={hovered?.id === planet.id}
                selected={selectedPlanetId === planet.id}
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
          <motion.div
            className="relative z-20"
            animate={{ opacity: entering ? 0 : 1, scale: entering ? 0.98 : 1 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <CorePlanet compact />
          </motion.div>
        </div>
      </section>
    </main>
  )
}
