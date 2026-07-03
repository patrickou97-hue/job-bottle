import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:net";

const ROOT = new URL("..", import.meta.url);
const ENV_FILE = new URL(".env.local", ROOT);
const NEXT_BIN = new URL("node_modules/.bin/next", ROOT);
const SOURCE_INVARIANTS = [
  {
    file: "src/lib/auth.ts",
    mustInclude: ["DEFAULT_AUTH_TIMEOUT_MS = 1800", "hasStoredBrowserSession", "expires_at", "getSession()", "读取登录状态超时。"],
    mustNotInclude: [],
    label: "登录态读取带本地 session 预判和超时保护",
  },
  {
    file: "src/components/applications/MyBottleClient.tsx",
    mustInclude: ["router.replace(`/login?next=${encodeURIComponent(\"/my-bottle\")}`)", "py-12 text-center"],
    mustNotInclude: ["router.push(`/login?next=${encodeURIComponent(\"/my-bottle\")}`)", "bg-white/[0.035] p-8"],
    label: "我的星瓶未登录跳转不留下卡住历史且等待态无大矩形",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["router.replace(`/login?next=${encodeURIComponent(\"/my-applications\")}`)"],
    mustNotInclude: ["router.push(`/login?next=${encodeURIComponent(\"/my-applications\")}`)"],
    label: "我的投递未登录跳转不留下卡住历史",
  },
  {
    file: "src/components/applications/ApplicationBottle.tsx",
    mustInclude: ["overflow-visible", "backdrop-blur-sm"],
    mustNotInclude: ["bg-white/[0.025]", "shadow-[0_28px_90px"],
    label: "星瓶舞台无大面积矩形背景",
  },
  {
    file: "src/components/applications/BottleStage.tsx",
    mustInclude: ["showFallback ? <BottleFallbackSvg /> : null", "onError={() => setShowFallback(true)}"],
    mustNotInclude: ["<BottleFallbackSvg />\n    </div>"],
    label: "旧版 SVG 瓶身只作为失败 fallback",
  },
  {
    file: "src/components/applications/StackedStar.tsx",
    mustInclude: ["whitespace-nowrap", "fontSize"],
    mustNotInclude: ["truncate"],
    label: "星星公司简称不被省略",
  },
  {
    file: "src/components/galaxy/GalaxyHome.tsx",
    mustInclude: ["<SpaceHome />"],
    mustNotInclude: ["canvas", "StarField", "orbitKeyframes"],
    label: "主页使用拆分后的深空星系组件",
  },
  {
    file: "src/components/galaxy/SpaceHome.tsx",
    mustInclude: ["OrbitLines", "PlanetTransitionOverlay", "window.setTimeout", "encodeURIComponent(planet.href)", "/brand/job-bottle-logo-v2.png", "Math.max(0.9"],
    mustNotInclude: ["router.push(planet.href)", "bg-white", "rounded-2xl"],
    label: "主页保留 logo、大轨道和行星进入转场",
  },
  {
    file: "src/components/galaxy/OrbitLines.tsx",
    mustInclude: ["border: `1px solid", "orbitScale"],
    mustNotInclude: [],
    label: "主页轨道线作为星系元素保留且支持响应式缩放",
  },
  {
    file: "src/components/layout/UserShell.tsx",
    mustInclude: ["<SpaceShell>", "<Navbar />"],
    mustNotInclude: ["StarFieldBackground"],
    label: "用户端页面统一使用 SpaceShell 背景",
  },
  {
    file: "src/components/layout/SpaceBackground.tsx",
    mustInclude: ["space-bg__image", "space-bg__vignette", "space-bg__stars--far", "space-bg__stars--near", "space-bg__noise", "space-bg__meteor"],
    mustNotInclude: ["Math.random", "canvas"],
    label: "统一深空背景按视觉规格分层且包含低频流星",
  },
  {
    file: "src/app/globals.css",
    mustInclude: ["../styles/tokens.css", "/assets/space/bg-desktop.png", "/assets/space/bg-mobile.png", "background-size: cover"],
    mustNotInclude: ["linear-gradient(180deg, #01030a 0%, #02040a 52%, #01030a 100%)"],
    label: "全站背景使用统一 space 资产和 token，避免横向分层渐变",
  },
  {
    file: "src/styles/tokens.css",
    mustInclude: ["--space-void", "--light-silver", "--gold-base", "--surface-read-bg", "--ease-out-cine"],
    mustNotInclude: [],
    label: "视觉规格 token 已集中定义",
  },
  {
    file: "src/lib/star-layout.ts",
    mustInclude: ["buildClusterLayout", "getStableHash", "getShortLabel", "aggregateCount", "cellWidth"],
    mustNotInclude: ["Math.random"],
    label: "岗位星体使用稳定星云网格布局",
  },
  {
    file: "src/components/opportunity/OpportunityStarfield.tsx",
    mustInclude: ["buildClusterLayout", "maxVisiblePerCluster", "onHoverJob", "聚合"],
    mustNotInclude: ["hashString", "Math.random"],
    label: "岗位星图不再随机散点并支持聚合与联动",
  },
  {
    file: "src/components/galaxy/NebulaGateway.tsx",
    mustInclude: ["NebulaNode", "NebulaCompanyField", "返回星云入口", "onSelectionChange"],
    mustNotInclude: ["Math.random"],
    label: "岗位星体观测默认进入星云入口并可下钻到公司星体",
  },
  {
    file: "src/components/galaxy/NebulaNode.tsx",
    mustInclude: ["next/image", "whileHover", "imageSrc", "个岗位"],
    mustNotInclude: ["border-aurum", "金色"],
    label: "星云入口使用图片资产而非方框卡片",
  },
  {
    file: "src/components/jobs/HomeClient.tsx",
    mustInclude: ["NebulaGateway", "CaptureAnimation", "if (!alreadyCaptured)", "hoveredJobId", "focusJob", "nebulaSelection"],
    mustNotInclude: ["queueBottleDrop(application.id);\n      if (applyWindow)"],
    label: "岗位星图有星体观测和捕获动画且重复点击不重复落星",
  },
  {
    file: "src/components/applications/ApplicationOrbitSystem.tsx",
    mustInclude: ["投递引力核心", "ApplicationOrbitRing", "ApplicationOrbitLegend", "ApplicationOrbitDetail"],
    mustNotInclude: ["CaptureOrbit", "timeline"],
    label: "我的投递主视觉使用同心投递轨道",
  },
  {
    file: "src/components/applications/ApplicationOrbitRing.tsx",
    mustInclude: ["getOrbitPoint", "x: path.map", "y: path.map"],
    mustNotInclude: ["rotate: 360", "translateX(${radius}px)", "rotate(${angle}deg)"],
    label: "投递轨道星体使用数学坐标运动而非旋转文字父层",
  },
  {
    file: "src/components/applications/ApplicationOrbitStar.tsx",
    mustInclude: ["slice(0, 3)", "已停留", "momentumTier"],
    mustNotInclude: [],
    label: "投递星体简称限制和 Doppler 动量提示存在",
  },
  {
    file: "src/components/applications/ApplicationOrbitConfig.ts",
    mustInclude: ["opened", "radius: 260", "offer", "radius: 48"],
    mustNotInclude: [],
    label: "投递状态按外圈到 Offer 内圈映射",
  },
  {
    file: "src/components/capture/CaptureOrbit.tsx",
    mustInclude: ["我的投递轨道", "CapturedStar"],
    mustNotInclude: [],
    label: "我的投递包含捕获轨道",
  },
  {
    file: "src/app/galaxy/page.tsx",
    mustInclude: ["GalaxyGateway"],
    mustNotInclude: [],
    label: "岗位星系入口路由存在",
  },
];
const REQUIRED_FILES = [
  "public/assets/space-background-desktop.png",
  "public/assets/space-background-mobile.png",
  "public/assets/space/bg-desktop.png",
  "public/assets/space/bg-mobile.png",
  "public/assets/space/stars-far.svg",
  "public/assets/space/stars-near.svg",
  "public/assets/nebula/nebula-region.png",
  "public/assets/nebula/nebula-industry.png",
  "public/assets/nebula/nebula-batch.png",
  "public/assets/nebula/nebula-captured.png",
];
const REQUIRED_TEXT = {
  "/": ["秋招星瓶"],
  "/galaxy": ["岗位星系", "地区星系", "行业星系"],
  "/galaxy/region": ["地区星系", "北京星云", "上海星云"],
  "/galaxy/industry": ["行业星系", "互联网星云", "金融星云"],
  "/jobs": ["秋招星瓶", "筛选", "排序方式", "最近更新优先"],
  "/login": ["登录秋招星瓶", "邮箱", "密码"],
  "/forum": ["讨论区"],
  "/admin": ["管理后台"],
};

function readEnvFile() {
  if (!existsSync(ENV_FILE)) return {};
  return Object.fromEntries(
    readFileSync(ENV_FILE, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^["']|["']$/g, "")];
      }),
  );
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getOpenPort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : null;
      server.close(() => {
        if (port) resolve(port);
        else reject(new Error("无法分配本地端口"));
      });
    });
  });
}

async function fetchWithRetry(url, options = {}, attempts = 45) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`${url} 返回 ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await wait(1000);
  }
  throw lastError;
}

async function checkSupabase(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("缺少 Supabase URL 或 publishable key");

  const endpoint = `${url}/rest/v1/jobs?select=id&is_active=eq.true&limit=1`;
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      prefer: "count=exact",
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase jobs 读取失败：${response.status} ${await response.text()}`);
  }
  const contentRange = response.headers.get("content-range") ?? "";
  const count = Number(contentRange.split("/")[1] ?? "0");
  if (!Number.isFinite(count) || count < 1) {
    throw new Error(`Supabase jobs 计数异常：${contentRange || "无 content-range"}`);
  }
  console.log(`✓ Supabase jobs 可读：${count} 条开放岗位`);
}

function checkSourceInvariants() {
  for (const file of REQUIRED_FILES) {
    if (!existsSync(new URL(file, ROOT))) throw new Error(`缺少关键资源：${file}`);
    console.log(`✓ 资源存在：${file}`);
  }

  for (const invariant of SOURCE_INVARIANTS) {
    const fileUrl = new URL(invariant.file, ROOT);
    if (!existsSync(fileUrl)) throw new Error(`缺少关键文件：${invariant.file}`);
    const source = readFileSync(fileUrl, "utf8");
    for (const text of invariant.mustInclude) {
      if (!source.includes(text)) {
        throw new Error(`${invariant.file} 未满足约束“${invariant.label}”：缺少 ${text}`);
      }
    }
    for (const text of invariant.mustNotInclude) {
      if (source.includes(text)) {
        throw new Error(`${invariant.file} 违反约束“${invariant.label}”：包含 ${text}`);
      }
    }
    console.log(`✓ 源码约束正常：${invariant.label}`);
  }
}

async function checkPages(baseUrl) {
  for (const [path, requiredTexts] of Object.entries(REQUIRED_TEXT)) {
    const response = await fetchWithRetry(`${baseUrl}${path}`);
    const html = await response.text();
    if (html.includes("未来星瓶")) {
      throw new Error(`${path} 仍包含旧品牌“未来星瓶”`);
    }
    for (const text of requiredTexts) {
      if (!html.includes(text)) {
        throw new Error(`${path} 缺少关键文案：${text}`);
      }
    }
    console.log(`✓ ${path} 页面关键文案正常`);
  }
}

async function findReusableServer() {
  const candidates = [
    process.env.SMOKE_BASE_URL,
    "http://127.0.0.1:3001",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { signal: AbortSignal.timeout(1200) });
      const html = await response.text();
      if (response.ok && html.includes("秋招星瓶")) return candidate;
    } catch {
      // Keep trying the next likely local server.
    }
  }
  return null;
}

async function main() {
  const env = { ...process.env, ...readEnvFile() };
  await checkSupabase(env);
  checkSourceInvariants();

  const reusableServer = await findReusableServer();
  if (reusableServer) {
    console.log(`✓ 复用已有本地站点：${reusableServer}`);
    await checkPages(reusableServer);
    console.log("✓ 冒烟检查通过");
    return;
  }

  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const child = spawn(
    NEXT_BIN.pathname,
    ["dev", "--hostname", "127.0.0.1", "--port", String(port)],
    {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  try {
    await fetchWithRetry(baseUrl, {}, 60);
    await checkPages(baseUrl);
    console.log("✓ 冒烟检查通过");
  } catch (error) {
    console.error(output.slice(-4000));
    throw error;
  } finally {
    child.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(`✗ 冒烟检查失败：${error.message}`);
  process.exit(1);
});
