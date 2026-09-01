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
  assert.match(notice, /setTimeout\(\(\) => void resolveNotice\(\), 220\)/);
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
  assert.match(kineticWord, /useReducedMotion/);
  assert.match(kineticWord, /clearTimeout/);
});

test("公开岗位列表不下载详情长文本，岗位详情仍可单独读取完整记录", async () => {
  const jobs = await source("src/lib/jobs.ts");

  assert.match(jobs, /PUBLIC_JOB_LIST_COLUMNS/);
  assert.match(jobs, /\.select\(PUBLIC_JOB_LIST_COLUMNS\)/);
  assert.match(jobs, /fetchJobById[\s\S]*?\.select\("\*"\)/);
});
