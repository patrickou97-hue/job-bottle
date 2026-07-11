'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { PlanetTransitionOverlay } from './PlanetTransitionOverlay'
import { SpaceBackground } from './SpaceBackground'

const TRANSITION_MS = 860
const MOBILE_PLANET_SIZE: Record<string, number> = {
  jobs: 56,
  applications: 56,
  bottle: 56,
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
  forum: { radius: 146, angle: 48 },
  admin: { radius: 226, angle: 276 },
  auth: { radius: 146, angle: 168 },
}

export function SpaceHome() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [hovered, setHovered] = useState<PlanetRoute | null>(null)
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetRoute | null>(null)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [authResolved, setAuthResolved] = useState(() => !isSupabaseConfigured())
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
      setAuthResolved(true)
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
      label: user ? '资料' : '登录',
      description: user ? '查看资料与简历' : '登录后保存投递记录',
      href: user ? '/profile' : '/login',
      orbitRadius: 990,
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

  if (!authResolved) {
    return <main className="grid min-h-[100svh] place-items-center bg-[#000001] text-sm text-ink-muted"><span className="loading-line">正在进入拾星</span></main>
  }

  return (
    <main
      className="relative h-[100svh] min-h-[560px] w-full overflow-hidden"
      style={{ background: 'var(--space-base)', color: 'var(--text-primary)' }}
    >
      <SpaceBackground entering={entering} />

      <Link href="/" aria-label="返回拾星主页" className="absolute left-5 top-5 z-30 md:left-10 md:top-8">
        <Image
          src="/brand/shi-xing-wordmark.png"
          alt="拾星"
          width={220}
          height={98}
          priority
          className="h-9 w-auto object-contain drop-shadow-[0_0_18px_rgba(126,124,181,0.24)] md:h-10"
        />
      </Link>

      <button
        type="button"
        disabled={entering}
        onClick={() =>
          enterPlanet({
            id: 'auth',
            label: user ? '资料' : '登录',
            description: user ? '查看资料与简历' : '登录后保存投递记录',
            href: user ? '/profile' : '/login',
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
        {user ? '资料' : '登录'}
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

      <PlanetTransitionOverlay planet={selectedPlanet} />
    </main>
  )
}
