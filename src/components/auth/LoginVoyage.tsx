"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { motion, useSpring } from "motion/react";
import { Pause, Play } from "lucide-react";
import "@/components/galaxy/ink-orbs.css";

const motionPreference = () => window.matchMedia("(prefers-reduced-motion: reduce)");
function subscribeMotionPreference(onChange: () => void) {
  const query = motionPreference();
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function LoginVoyage() {
  const reducedMotion = useSyncExternalStore(subscribeMotionPreference, () => motionPreference().matches, () => false);
  const [paused, setPaused] = useState(false);
  const moonRef = useRef<HTMLSpanElement>(null);
  const orbitTime = useRef(0);
  useEffect(() => {
    const moon = moonRef.current;
    if (!moon) return;
    const stage = moon.parentElement;
    if (!stage) return;
    let width = stage.clientWidth;
    let height = stage.clientHeight;
    moon.style.left = "50%";
    moon.style.top = "50%";
    const paint = () => {
      const angle = orbitTime.current / 24000 * Math.PI * 2;
      const tilt = -28 * Math.PI / 180;
      const horizontal = 218 * Math.cos(angle);
      const vertical = 82 * Math.sin(angle);
      const x = (horizontal * Math.cos(tilt) - vertical * Math.sin(tilt)) / 600 * width;
      const y = (horizontal * Math.sin(tilt) + vertical * Math.cos(tilt)) / 600 * height;
      moon.style.transform = `translate(-50%, -50%) translate3d(${x}px, ${y}px, 0)`;
      // The guide is always beneath the satellite; the main planet occludes its far half.
      moon.style.zIndex = Math.sin(angle) < 0 ? "1" : "4";
    };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      paint();
    });
    resize.observe(stage);
    paint();
    if (paused || reducedMotion) return () => resize.disconnect();
    let frame = 0;
    let previous: number | null = null;
    let visible = true;
    const tick = (now: number) => {
      if (previous !== null) orbitTime.current += Math.min(now - previous, 64);
      paint();
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame);
      previous = null;
      if (visible && !document.hidden) frame = requestAnimationFrame(tick);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(stage);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused, reducedMotion]);
  const x = useSpring(0, { stiffness: 75, damping: 22 });
  const y = useSpring(0, { stiffness: 75, damping: 22 });
  const reset = () => { x.set(0); y.set(0); };
  return (
    <aside className="auth-gateway__scene" data-motion-paused={paused || Boolean(reducedMotion)} aria-labelledby="auth-scene-title"
      onPointerMove={(event) => {
        if (reducedMotion || paused || event.pointerType !== "mouse") return;
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width - .5) * 22);
        y.set(((event.clientY - rect.top) / rect.height - .5) * 18);
      }} onPointerLeave={reset}>
      <div className="auth-gateway__caption"><span>拾星 · 航行日志</span><button className="voyage-pause" type="button" disabled={Boolean(reducedMotion)} aria-label={paused ? "继续星体运动" : "暂停星体运动"} aria-pressed={paused} onClick={() => { setPaused(!paused); reset(); }}>{paused || reducedMotion ? <Play size={15} /> : <Pause size={15} />}</button></div>
      <motion.div className="voyage-space" style={{ x, y }} aria-hidden="true">
        <div className="voyage-float">
          <svg viewBox="0 0 600 600" className="voyage-rings" fill="none"><g transform="rotate(-28 300 300)"><path d="M35 300a265 113 0 0 1 530 0" stroke="#748e9a" strokeOpacity=".25"/><path d="M82 300a218 82 0 0 1 436 0" stroke="#b6a077" strokeOpacity=".6"/></g></svg>
          <div className="voyage-world ink-orb ink-orb--jade" />
          <svg viewBox="0 0 600 600" className="voyage-rings voyage-rings--front" fill="none"><g transform="rotate(-28 300 300)"><path d="M565 300a265 113 0 0 1 -530 0" stroke="#748e9a" strokeOpacity=".25"/><path d="M518 300a218 82 0 0 1 -436 0" stroke="#b6a077" strokeOpacity=".6"/></g></svg>
          <span ref={moonRef} className="voyage-moon ink-orb ink-orb--silver" />
        </div>
      </motion.div>
      <div className="auth-gateway__story"><h2 id="auth-scene-title">下一站，<br/>是你的可能。</h2><p>从发现岗位，到记录每一步进展。<br/>把求职的方向，留在自己手里。</p></div>
    </aside>
  );
}
