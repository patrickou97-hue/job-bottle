const SCENE_ROUTES = new Set(["/", "/bottle", "/galaxy", "/galaxy/region", "/galaxy/industry"]);

export function isSceneRoute(href: string) {
  return Array.from(SCENE_ROUTES).some((route) =>
    route === "/" ? href === route : href === route || href.startsWith(`${route}/`),
  );
}

export function markSceneDeparture(href: string) {
  if (typeof document === "undefined" || isSceneRoute(href)) return;
  document.documentElement.dataset.sceneTransition = "arriving";
}
