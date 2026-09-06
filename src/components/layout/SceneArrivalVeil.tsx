"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";

const DESTINATION_LABELS: Record<string, string> = {
  "/explore": "前往岗位坐标",
  "/my": "前往投递管理",
  "/resume": "前往简历制作",
  "/forum": "前往拾星指南",
  "/profile": "前往个人中心",
  "/guide": "前往秋招流程",
  "/login": "前往登录",
  "/admin": "前往管理后台",
};

export function SceneArrivalVeil() {
  const pathname = usePathname();
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.sceneTransition !== "arriving") return;

    const frame = window.requestAnimationFrame(() => {
      root.dataset.sceneTransition = "arrived";
    });
    const timer = window.setTimeout(() => {
      delete root.dataset.sceneTransition;
    }, reducedMotion ? 140 : 480);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      delete root.dataset.sceneTransition;
    };
  }, [pathname, reducedMotion]);

  const label = Object.entries(DESTINATION_LABELS).find(([route]) =>
    route === "/admin" ? pathname.startsWith(route) : pathname === route,
  )?.[1] ?? "前往工作台";

  return (
    <div className="scene-arrival-veil" aria-hidden="true">
      <div className="scene-arrival-veil__stars" />
      <span>{label}</span>
    </div>
  );
}
