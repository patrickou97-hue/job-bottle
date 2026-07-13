"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";

const DESTINATION_LABELS: Record<string, string> = {
  "/explore": "进入岗位坐标",
  "/my": "进入投递管理",
  "/resume": "进入简历制作",
  "/forum": "进入求职社区",
  "/profile": "进入个人中心",
  "/guide": "进入秋招流程",
  "/login": "进入登录",
  "/admin": "进入管理后台",
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
    }, reducedMotion ? 140 : 680);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      delete root.dataset.sceneTransition;
    };
  }, [pathname, reducedMotion]);

  const label = Object.entries(DESTINATION_LABELS).find(([route]) =>
    route === "/admin" ? pathname.startsWith(route) : pathname === route,
  )?.[1] ?? "进入工作台";

  return (
    <div className="scene-arrival-veil" aria-hidden="true">
      <div className="scene-arrival-veil__stars" />
      <span>{label}</span>
    </div>
  );
}
