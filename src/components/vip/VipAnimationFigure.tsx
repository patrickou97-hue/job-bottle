"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export function VipAnimationFigure({ title, caption, className, children }: {
  title: string; caption?: string; className: string; children: ReactNode;
}) {
  const figure = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const element = figure.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = requestAnimationFrame(() => setStarted(true));
      return () => cancelAnimationFrame(frame);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio < 0.18) return;
      observer.disconnect();
      setStarted(true);
    }, { threshold: 0.18 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <figure ref={figure} aria-label={caption ? undefined : title} className={className + " vip-animation"} data-started={started}>
    {children}
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
