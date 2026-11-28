"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";

export function VipAnimationFigure({ title, caption, className, children }: {
  title: string; caption?: string; className: string; children: ReactNode;
}) {
  const figure = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const [revision, setRevision] = useState(0);
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

  const toggle = paused ? "继续" : "暂停";
  return <figure ref={figure} className={className + " vip-loop"} data-started={started} data-running={visible && !paused}>
    <Fragment key={revision}>{children}</Fragment>
    <figcaption>{caption && <span>{caption}</span>}
      <span className="vip-playback">
        <button type="button" aria-label={toggle + title} title={toggle + "动画"} onClick={() => setPaused(!paused)}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <button type="button" aria-label={"重播" + title} title="从头播放" onClick={() => { setRevision(n => n + 1); setPaused(false); }}>
          <RotateCcw size={15} />
        </button>
      </span>
    </figcaption>
  </figure>;
}
