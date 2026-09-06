import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");

async function source(relativePath) {
  return readFile(resolve(root, relativePath), "utf8");
}

test("主页轨道持续运动使用 compositor-friendly CSS 而不是 Motion keyframe 循环", async () => {
  const component = await source("src/components/galaxy/FloatingPlanet.tsx");
  const styles = await source("src/app/globals.css");

  assert.match(component, /home-orbit/);
  assert.doesNotMatch(component, /rotate:\s*\[/);
  assert.match(styles, /@keyframes starjob-orbit/);
  assert.match(styles, /@keyframes starjob-counter-orbit/);
  assert.match(styles, /will-change:\s*transform/);
});

test("主页首屏不再等待认证态，认证与公告在首屏之后处理", async () => {
  const home = await source("src/components/galaxy/SpaceHome.tsx");
  const notice = await source("src/components/onboarding/WelcomeNotice.tsx");

  assert.doesNotMatch(home, /if\s*\(\s*!authResolved\s*\)/);
  assert.match(home, /requestAnimationFrame\(updateViewport\)/);
  assert.match(notice, /setTimeout\(\(\) => void resolveNotice\(\), 900\)/);
});

test("主页转场使用目标行星轻微强调和内容淡出，不创建全屏遮罩", async () => {
  const home = await source("src/components/galaxy/SpaceHome.tsx");
  const planet = await source("src/components/galaxy/FloatingPlanet.tsx");
  const route = await source("src/components/layout/RouteContentTransition.tsx");
  const styles = await source("src/app/globals.css");

  assert.match(home, /TRANSITION_MS = 180/);
  assert.match(home, /selectedPlanetId/);
  assert.match(home, /setIsLeaving\(true\)/);
  assert.doesNotMatch(home, /PlanetTransitionOverlay|markSceneDeparture\(href\)/);
  assert.match(planet, /selected: boolean/);
  assert.match(planet, /selected \? 1\.08 : 0\.94/);
  assert.match(planet, /selected \? 1 : 0\.16/);
  assert.match(route, /initial=\{reducedMotion \? false : "initial"\}/);
  assert.doesNotMatch(styles, /planet-transition-overlay|clip-path: polygon\(50% 0%/);
});

test("主页把网申助手放入求职主路径并使用独立的太阳系色彩", async () => {
  const routes = await source("src/lib/planet-routes.ts");
  const planet = await source("src/components/galaxy/FloatingPlanet.tsx");
  const core = await source("src/components/galaxy/CorePlanet.tsx");
  const material = await source("src/components/visual/OrbMaterial.tsx");

  assert.match(routes, /id: 'extension'[\s\S]*?label: '网申助手'[\s\S]*?href: '\/extension'[\s\S]*?variant: 'extension'/);
  assert.match(planet, /planet\.id === 'extension'\) return 'cyan'/);
  assert.match(core, /variant="gold"/);
  assert.match(material, /rgba\(163,78,74,0\.82\)/);
  assert.match(material, /rgba\(67,144,163,0\.85\)/);
});

test("岗位清单使用原生窗口化连续滚动而不是把全部结果挂进 DOM", async () => {
  const list = await source("src/components/jobs/VirtualJobList.tsx");
  const home = await source("src/components/jobs/HomeClient.tsx");

  assert.match(list, /useWindowVirtualizer/);
  assert.match(list, /getItemKey/);
  assert.match(list, /directDomUpdates: true/);
  assert.match(list, /containerRef/);
  assert.match(home, /<VirtualJobList/);
  assert.doesNotMatch(home, /filteredJobs\.map\(\(job, index\) =>/);
});

test("网申助手演示复刻 Chrome 插件点击链路且动效只作用于小型模拟面板", async () => {
  const demo = await source("src/components/extension/ExtensionDemoDialog.tsx");
  const hub = await source("src/components/extension/ExtensionHubClient.tsx");
  const styles = await source("src/app/globals.css");

  assert.match(demo, /ChromeTabBar/);
  assert.match(demo, /starjob-resume-assistant-icon48\.png/);
  assert.match(demo, /打开拾星网申助手插件/);
  assert.match(demo, /选择拾星简历/);
  assert.match(demo, /只填空白项/);
  assert.match(demo, /覆盖已有内容/);
  assert.match(demo, /AI 智能填写/);
  assert.match(demo, /w-\[min\(278px/);
  assert.match(demo, /text-\[7px\]/);
  assert.match(demo, /text-left text-\[8px\]/);
  assert.match(demo, /实习经历/);
  assert.match(demo, /AI 正在分析当前表单/);
  assert.match(demo, /读取页面字段/);
  assert.match(demo, /setTimeout/);
  assert.match(demo, /#fbbc04/);
  assert.match(demo, /#34a853/);
  assert.match(demo, /useReducedMotion/);
  assert.match(demo, /transform|opacity/);
  assert.doesNotMatch(demo, /setInterval|requestAnimationFrame/);
  assert.match(hub, /gold-button/);
  assert.match(hub, /体验使用流程/);
  assert.match(styles, /@layer base \{[\s\S]*button,[\s\S]*font: inherit;/);
});

test("非主页共享页脚接入且登录 slogan 保持动效降级入口", async () => {
  const shell = await source("src/components/layout/UserShell.tsx");
  const footer = await source("src/components/layout/SiteFooter.tsx");
  const login = await source("src/app/login/page.tsx");
  const styles = await source("src/app/globals.css");
  const kineticWord = await source("src/components/ui/KineticWord.tsx");

  assert.match(shell, /<SiteFooter\s*\/>/);
  assert.match(footer, /site-footer__logo brand-wordmark/);
  assert.match(login, /<KineticWord/);
  assert.match(login, /login-page__story-word-group/);
  assert.match(login, /<br aria-hidden="true" \/>/);
  assert.doesNotMatch(login, /求职工作台/);
  assert.doesNotMatch(login, /欢迎回来/);
  assert.match(login, /登录拾星/);
  assert.match(styles, /starjob-login-bottle-frames-v2\.png/);
  assert.match(styles, /login-bottle-frames 2s steps\(1, end\) infinite/);
  assert.match(kineticWord, /useReducedMotion/);
  assert.match(kineticWord, /clearTimeout/);
  assert.match(kineticWord, /FLIP_TRANSITION_MS/);
  assert.match(kineticWord, /CHAR_STAGGER_MS = 20/);
  assert.match(kineticWord, /FLIP_TRANSITION_MS = 300/);
  assert.match(kineticWord, /transitionDelay/);
  assert.match(styles, /kinetic-word__line--in \.kinetic-word__char/);
  assert.match(styles, /kinetic-word__line--out \.kinetic-word__char/);
  assert.match(styles, /transform: translateY\(110%\)/);
  assert.match(styles, /transform: translateY\(-120%\)/);
  assert.doesNotMatch(styles, /perspective: 16rem/);
  assert.doesNotMatch(styles, /rotateX\(84deg\)/);
});

test("公开岗位列表不下载详情长文本，岗位详情仍可单独读取完整记录", async () => {
  const jobs = await source("src/lib/jobs.ts");

  assert.match(jobs, /PUBLIC_JOB_LIST_COLUMNS/);
  assert.match(jobs, /\.select\(PUBLIC_JOB_LIST_COLUMNS\)/);
  assert.match(jobs, /fetchJobById[\s\S]*?\.select\("\*"\)/);
});
