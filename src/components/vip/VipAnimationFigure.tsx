"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function VipAnimationFigure({ title, caption, className, children }: {
  title: string; caption?: string; className: string; children: ReactNode;
}) {
  const figure = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const element = figure.current;
    if (!element) return;
    let inView = !("IntersectionObserver" in window);
    function sync() {
      const showing = inView && !document.hidden;
      if (showing) setStarted(true);
      setVisible(showing);
    }
    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    });
    observer?.observe(element);
    if (!observer) sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return <figure ref={figure} aria-label={caption ? undefined : title} className={className + " vip-loop"} data-started={started} data-running={visible}>
    {children}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
