"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, BookOpen, BriefcaseBusiness, FileText, ListChecks, Menu, Pause, Play, ShieldCheck, Sparkles, X } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { PLANET_ROUTES } from "@/lib/planet-routes";
import { HOME_ORBITS, isBehindStar, orbitPath, orbitPosition } from "@/lib/home-orbits";
import "./orbital-home.css";

const GLYPHS = { jobs: BriefcaseBusiness, resume: FileText, applications: ListChecks, extension: Sparkles, bottle: Sparkles, forum: BookOpen, admin: ShieldCheck };

export function SpaceHome() {
  const reducedMotion = useReducedMotion();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(false);
  const sceneRef = useRef<HTMLElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLAnchorElement>());
  const hoverRef = useRef<string | null>(null);
  const focusRef = useRef<string | null>(null);
  const pausedRef = useRef(false);
  const elapsedRef = useRef(0);
  useEffect(() => { pausedRef.current = paused || menuOpen || Boolean(reducedMotion); }, [paused, menuOpen, reducedMotion]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let mounted = true;
    async function loadUser() {
      const current = await getCurrentUserOrNull(supabase);
      if (!mounted) return;
      setUser(current);
      setIsAdmin(false);
      if (current) {
        const { data } = await supabase.from("profiles").select("role").eq("id", current.id).maybeSingle();
        if (mounted) setIsAdmin(data?.role === "admin");
      }
    }
    void loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void loadUser(); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const planets = useMemo(() => PLANET_ROUTES.filter((planet) => !planet.adminOnly || isAdmin), [isAdmin]);
  const hrefFor = (planet: (typeof PLANET_ROUTES)[number]) => planet.requiresAuth && !user ? `/login?next=${encodeURIComponent(planet.href)}` : planet.href;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let width = scene.clientWidth;
    let height = scene.clientHeight;
    let scale = 1;
    let frame = 0;
    let previousTime: number | null = null;
    let stopped = false;

    function resize() {
      width = scene!.clientWidth;
      height = scene!.clientHeight;
      scale = Math.max(.64, Math.min(1.2, Math.min(width / 1160, height / 740)));
      scene!.style.setProperty("--orbit-scale", String(scale));
      render();
    }

    function render() {
      const occupied: { x: number; y: number }[] = [];
      const positions = planets.map((planet, index) => ({ planet, point: orbitPosition(HOME_ORBITS[index], elapsedRef.current) }));
      // Foreground labels get priority; orbital positions are never nudged.
      positions.sort((a, b) => b.point.depth - a.point.depth);
      for (const { planet, point } of positions) {
        const node = nodeRefs.current.get(planet.id);
        if (!node) continue;
        const x = width / 2 + point.x * scale;
        const y = height / 2 + point.y * scale;
        const hiddenByStar = isBehindStar(point, 23 / scale);
        const outside = x < 24 || x > width - 24 || y < 80 || y > height - 44;
        const important = hoverRef.current === planet.id || focusRef.current === planet.id;
        const conflict = occupied.some((label) => Math.abs(label.x - x) < 138 && Math.abs(label.y - y) < 68);
        const showLabel = important || (!hiddenByStar && !outside && !conflict);
        if (showLabel) occupied.push({ x, y });
        node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
        node.style.zIndex = String(1000 + Math.round(point.depth));
        node.style.setProperty("--label-opacity", showLabel ? "1" : "0");
        node.dataset.depth = point.depth < 0 ? "back" : "front";
        node.dataset.occluded = String(hiddenByStar);
        // The static navigation menu remains available for every off-screen route.
        node.tabIndex = hiddenByStar || outside ? -1 : 0;
        node.style.pointerEvents = hiddenByStar ? "none" : "auto";
      }
    }

    function tick(now: number) {
      if (stopped) return;
      if (previousTime !== null && !pausedRef.current && !hoverRef.current && !focusRef.current) {
        elapsedRef.current += Math.min((now - previousTime) / 1000, .1);
      }
      previousTime = now;
      render();
      frame = requestAnimationFrame(tick);
    }
    function onVisibility() {
      cancelAnimationFrame(frame);
      previousTime = null;
      if (!document.hidden && !reducedMotion) frame = requestAnimationFrame(tick);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(scene);
    resize();
    if (!document.hidden && !reducedMotion) frame = requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stopped = true; cancelAnimationFrame(frame); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, [planets, reducedMotion]);

  return (
    <main ref={sceneRef} className="orbital-home" aria-label="拾星主页" onKeyDown={(event) => { if (event.key === "Escape") setMenuOpen(false); }}>
      <header className="orbital-home-header">
        <Link href="/" aria-label="返回拾星主页" className="orbital-home-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/shi-xing-wordmark.png" alt="拾星" width={1216} height={542} />
        </Link>
        <div className="orbital-home-controls">
          <button type="button" aria-label={paused ? "继续行星运动" : "暂停行星运动"} aria-pressed={paused} onClick={() => setPaused((value) => !value)} disabled={Boolean(reducedMotion)}>{paused || reducedMotion ? <Play size={17} /> : <Pause size={17} />}</button>
          <Link href={user ? "/profile" : "/login"}>{user ? "资料" : "登录"}</Link>
          <button type="button" aria-label={menuOpen ? "关闭导航" : "打开导航"} aria-expanded={menuOpen} aria-controls="orbital-home-navigation" onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
      </header>
      {menuOpen ? <nav id="orbital-home-navigation" className="orbital-home-navigation" aria-label="全部功能">{planets.map((planet) => <Link key={planet.id} href={hrefFor(planet)}>{planet.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>)}</nav> : null}
      <div className="orbital-home-dust" aria-hidden="true" />
      <svg className="orbital-home-paths" viewBox="-900 -900 1800 1800" aria-hidden="true">
        {planets.map((planet, index) => <path key={planet.id} d={orbitPath(HOME_ORBITS[index].radius)} className={index === 0 ? "orbital-home-gold-orbit" : undefined} />)}
      </svg>
      <div className="orbital-home-star-orb" aria-hidden="true" />
      <svg className="orbital-home-star" viewBox="-330 -220 660 440" aria-hidden="true">
        <defs>
          <radialGradient id="orbital-star-halo"><stop offset=".4" stopColor="#c8aa77" stopOpacity=".13" /><stop offset="1" stopColor="#c8aa77" stopOpacity="0" /></radialGradient>
        </defs>
        <circle r="215" fill="url(#orbital-star-halo)" />
        <path d={orbitPath(HOME_ORBITS[0].radius, true)} fill="none" stroke="#d2c09a" strokeOpacity=".48" strokeWidth="1" />
      </svg>
      {planets.map((planet, index) => {
        const Glyph = GLYPHS[planet.id as keyof typeof GLYPHS] ?? Sparkles;
        const initial = orbitPosition(HOME_ORBITS[index], 0);
        return <Link
          key={planet.id}
          ref={(node) => { if (node) nodeRefs.current.set(planet.id, node); else nodeRefs.current.delete(planet.id); }}
          href={hrefFor(planet)}
          className={`orbital-home-planet orbital-home-planet--${planet.id}`}
          aria-label={planet.label}
          style={{ transform: `translate3d(calc(50vw + ${initial.x}px),calc(50svh + ${initial.y}px),0)`, zIndex: 1000 + Math.round(initial.depth) }}
          onMouseEnter={() => { hoverRef.current = planet.id; }}
          onMouseLeave={() => { hoverRef.current = null; }}
          onFocus={() => { focusRef.current = planet.id; }}
          onBlur={() => { focusRef.current = null; }}
        >
          <span className="orbital-home-planet-body"><Glyph size={20} strokeWidth={1.5} aria-hidden="true" /></span>
          <span className="orbital-home-planet-label">{planet.label}<ArrowUpRight size={12} aria-hidden="true" /></span>
        </Link>;
      })}
    </main>
  );
}
