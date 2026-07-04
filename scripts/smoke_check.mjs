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
    mustInclude: ["loginNextPath = \"/bottle\"", "router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`)", "bottle_view"],
    mustNotInclude: ["router.push(`/login?next=${encodeURIComponent(\"/my-bottle\")}`)", "bg-white/[0.035] p-8"],
    label: "我的星瓶新 /bottle 入口使用登录回跳并记录浏览埋点",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["loginNextPath", "router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`)"],
    mustNotInclude: ["router.push(`/login?next=${encodeURIComponent(\"/my-applications\")}`)"],
    label: "我的投递未登录跳转不留下卡住历史",
  },
  {
    file: "src/app/explore/page.tsx",
    mustInclude: ["HomeClient", "PageShell"],
    mustNotInclude: [],
    label: "PRD 新路由 /explore 使用探索星海页面",
  },
  {
    file: "src/app/jobs/page.tsx",
    mustInclude: ["permanentRedirect(\"/explore\")"],
    mustNotInclude: ["HomeClient"],
    label: "旧 /jobs 列表入口重定向到 /explore",
  },
  {
    file: "src/app/my/page.tsx",
    mustInclude: ["MyApplicationsClient", "loginNextPath=\"/my\""],
    mustNotInclude: [],
    label: "PRD 新路由 /my 承载我的星图",
  },
  {
    file: "src/app/my-applications/page.tsx",
    mustInclude: ["permanentRedirect(\"/my\")"],
    mustNotInclude: ["MyApplicationsClient"],
    label: "旧 /my-applications 重定向到 /my",
  },
  {
    file: "src/components/applications/ApplicationBottle.tsx",
    mustInclude: ["2026 秋招季", "本季沉淀", "已收进", "FiligreeDivider", "生成星图年报"],
    mustNotInclude: ["bg-white/[0.025]", "shadow-[0_28px_90px"],
    label: "星瓶页按 v4 季节容器布局呈现",
  },
  {
    file: "src/components/applications/BottleStage.tsx",
    mustInclude: ["canvasRef", "drawApplicationStar", "drawBottleAtmosphere", "/assets/star-bottle-image2.png", "useReducedMotion"],
    mustNotInclude: ["Matter", "matter-js", "StackedStar"],
    label: "星瓶使用 canvas 星层和简化落瓶动画且不引入物理引擎",
  },
  {
    file: "src/components/galaxy/GalaxyHome.tsx",
    mustInclude: ["<SpaceHome />"],
    mustNotInclude: ["canvas", "StarField", "orbitKeyframes"],
    label: "主页使用拆分后的深空星系组件",
  },
  {
    file: "src/components/galaxy/SpaceHome.tsx",
    mustInclude: ["MOBILE_PLANET_LAYOUT", "OrbitLines", "PlanetTransitionOverlay", "window.setTimeout", "encodeURIComponent(planet.href)", "/brand/job-bottle-logo-v2.png", "desktopOrbitScale", "mobileOrbitScale", "planetScale={0.56}", "<CorePlanet compact />", "href: user ? '/my' : '/login'"],
    mustNotInclude: ["router.push(planet.href)", "href: user ? '/my-applications' : '/login'", "bg-white", "rounded-2xl"],
    label: "主页保留 logo、桌面/移动端运行星系和行星进入转场",
  },
  {
    file: "src/components/galaxy/CorePlanet.tsx",
    mustInclude: ["min(27vw, 112px)", "minWidth: compact ? 96"],
    mustNotInclude: ["minWidth: compact ? 132"],
    label: "移动端主页中心星球缩小以避免行星拥挤",
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
    mustInclude: ["../styles/tokens.css", "/assets/space/bg-desktop.png", "/assets/space/bg-mobile.png", "background-size: cover", "var(--arcane)", "linear-gradient(135deg"],
    mustNotInclude: ["linear-gradient(180deg, #01030a 0%, #02040a 52%, #01030a 100%)"],
    label: "全站背景和控件使用 v5 星穹绘卷 token",
  },
  {
    file: "src/styles/tokens.css",
    mustInclude: ["--night-0", "--dusk", "--star-apricot", "--arcane", "--filigree", "--bottle-glass", "--space-void: var(--night-0)"],
    mustNotInclude: [],
    label: "v5 星穹绘卷 token 已集中定义并兼容旧变量",
  },
  {
    file: "src/components/ui/FiligreeDivider.tsx",
    mustInclude: ["DiamondDot", "var(--filigree)"],
    mustNotInclude: [],
    label: "v5 星纹分割线组件存在",
  },
  {
    file: "src/components/ui/DiamondDot.tsx",
    mustInclude: ["rotate-45", "var(--filigree)"],
    mustNotInclude: [],
    label: "v5 菱形节点组件存在",
  },
  {
    file: "src/lib/star-layout.ts",
    mustInclude: ["buildClusterLayout", "getStableHash", "getShortLabel", "aggregateCount", "cellWidth"],
    mustNotInclude: ["Math.random"],
    label: "岗位星体使用稳定星云网格布局",
  },
  {
    file: "src/lib/dates.ts",
    mustInclude: ["Asia/Shanghai", "daysUntilShanghai", "getDeadlineTone", "getDeadlineLabel", "getDeadlineTime", "截止待补充"],
    mustNotInclude: ["toLocaleDateString"],
    label: "日期和截止时间逻辑集中使用上海时区工具",
  },
  {
    file: "supabase/migrations/20260704010000_phase0_security_hardening.sql",
    mustInclude: [
      "prevent_profile_role_escalation",
      "create table if not exists public.status_history",
      "create table if not exists public.reports",
      "reports_insert_own",
      "reports_select_admin_all",
      "pg_trgm",
      "jobs_search_text_trgm_idx",
      "forum_posts_content_length_check",
    ],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY"],
    label: "Phase 0 安全迁移包含角色保护、状态历史、举报和搜索索引",
  },
  {
    file: "supabase/policies.sql",
    mustInclude: [
      "user_applications_select_own",
      "user_applications_insert_own",
      "user_applications_update_own",
      "using (user_id = auth.uid())",
      "with check (user_id = auth.uid())",
      "company_logos_insert_admin",
    ],
    mustNotInclude: ["using (true)\nwith check"],
    label: "现有 RLS 覆盖投递 owner-only upsert 和 logo 管理员写入",
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
    mustInclude: ["NebulaGateway", "CaptureAnimation", "if (!alreadyCaptured)", "hoveredJobId", "focusJob", "nebulaSelection", "encodeURIComponent(\"/explore\")", "href=\"/my\"", "即将截止优先", "ApplyReturnConfirm", "visibilitychange", "keep_opened"],
    mustNotInclude: ["queueBottleDrop(application.id);\n      if (applyWindow)", "encodeURIComponent(\"/jobs\")", "href=\"/my-applications\""],
    label: "岗位星图有星体观测、捕获动画和官网返回确认闭环",
  },
  {
    file: "src/components/jobs/ApplyReturnConfirm.tsx",
    mustInclude: ["投递完成了吗", "已投递", "还没有", "不投了"],
    mustNotInclude: ["DDL", "截止提醒"],
    label: "官网投递返回确认条提供 opened/applied 语义分离",
  },
  {
    file: "src/components/jobs/DeadlineChip.tsx",
    mustInclude: ["getDeadlineLabel", "getDeadlineTone", "motion-safe:animate-pulse"],
    mustNotInclude: [],
    label: "截止时间 chip 覆盖缺失、临近和已截止状态",
  },
  {
    file: "src/components/jobs/JobCard.tsx",
    mustInclude: ["DeadlineChip", "job={job}", "md:grid-cols"],
    mustNotInclude: ["CompanyBadge", "grid-cols-[34px_32px"],
    label: "探索列表行显示截止时间 chip",
  },
  {
    file: "src/components/jobs/JobFilterBar.tsx",
    mustInclude: ["deadline_asc", "即将截止优先", "分享本周截止", "downloadDeadlineDigest", "digest_generate"],
    mustNotInclude: [],
    label: "探索筛选支持即将截止排序和本周截止分享卡",
  },
  {
    file: "src/app/jobs/[id]/page.tsx",
    mustInclude: ["generateMetadata", "fetchJobById", "JobDetailActions", "返回探索星海", "RelatedJobs", "DeadlineChip", "截止时间"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY"],
    label: "岗位详情新路由服务端读取并提供捕获入口",
  },
  {
    file: "src/components/jobs/JobDetailActions.tsx",
    mustInclude: ["登录后捕获这颗星", "upsertApplication", "safeOpenUrl", "ApplyReturnConfirm", "keep_opened", "withdrawn"],
    mustNotInclude: ["router.push(`/login"],
    label: "岗位详情捕获操作为点位登录提示并支持回到页面后确认投递",
  },
  {
    file: "src/components/applications/ApplicationOrbitSystem.tsx",
    mustInclude: ["投递引力核心", "ApplicationOrbitRing", "ApplicationOrbitLegend", "ApplicationOrbitDetail"],
    mustNotInclude: ["CaptureOrbit", "timeline"],
    label: "我的投递主视觉使用同心投递轨道",
  },
  {
    file: "src/components/applications/ApplicationOrbitRing.tsx",
    mustInclude: ["getOrbitPoint", "x: path.map", "y: path.map", "showTrack"],
    mustNotInclude: ["rotate: 360", "translateX(${radius}px)", "rotate(${angle}deg)"],
    label: "投递轨道星体使用数学坐标运动而非旋转文字父层",
  },
  {
    file: "src/components/applications/ApplicationOrbitSystem.tsx",
    mustInclude: ["OrbitTrackLayer", "aspect-square", "showTrack={false}", "ORBIT_BANDS.map", "getOrbitBandForStatus"],
    mustNotInclude: ["scaleY"],
    label: "投递引力核心按四个视觉轨道带绘制同心圆",
  },
  {
    file: "src/components/applications/ApplicationOrbitStar.tsx",
    mustInclude: ["getCompactCompanyLabelStyle", "getCompanyShortLabel", "已停留", "momentumTier", "overflow-hidden"],
    mustNotInclude: [],
    label: "投递星体手工简称、动态缩放和 Doppler 动量提示存在",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["DeadlineChip", "job={application.job}"],
    mustNotInclude: ["formatDateTime, isValidHttpUrl"],
    label: "我的星图列表显示捕获岗位截止时间",
  },
  {
    file: "src/components/applications/ApplicationOrbitConfig.ts",
    mustInclude: ["ORBIT_BAND_CONFIG", "探索带", "投递带", "面试带", "Offer 核", "statuses: [\"first_round\", \"second_round\", \"final_round\"]"],
    mustNotInclude: [],
    label: "投递数据七态收敛为四个视觉轨道带",
  },
  {
    file: "src/components/applications/ApplicationOrbitLegend.tsx",
    mustInclude: ["ORBIT_BANDS.map", "description", "activeBand"],
    mustNotInclude: ["ORBIT_STATUS_ORDER.map"],
    label: "投递轨道图例显示四个视觉带而非七个细状态",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["statusGroup", "nextStatuses", "statusGroup.includes(application.status)"],
    mustNotInclude: [],
    label: "我的投递列表支持轨道视觉带联动过滤多个状态",
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
  {
    file: "src/app/bottle/page.tsx",
    mustInclude: ["MyBottleClient", "loginNextPath=\"/bottle\""],
    mustNotInclude: [],
    label: "v4 /bottle 星瓶季节容器路由存在",
  },
  {
    file: "src/app/my-bottle/page.tsx",
    mustInclude: ["permanentRedirect(\"/bottle\")"],
    mustNotInclude: ["MyBottleClient"],
    label: "旧 /my-bottle 重定向至 /bottle",
  },
  {
    file: "src/lib/deadline-digest.ts",
    mustInclude: ["downloadDeadlineDigest", "1080", "1350", "job-bottle-digest", "本周截止"],
    mustNotInclude: ["QRCode", "qrcode"],
    label: "本周截止分享卡使用无依赖离屏 canvas 生成",
  },
  {
    file: "src/lib/track.ts",
    mustInclude: ["track", "events", "console.info"],
    mustNotInclude: ["throw"],
    label: "v4 埋点方法存在且不阻塞产品动作",
  },
  {
    file: "supabase/migrations/20260704020000_events_tracking.sql",
    mustInclude: ["create table if not exists public.events", "events_insert_own", "events_select_admin_all"],
    mustNotInclude: ["service_role"],
    label: "v4 events 埋点迁移存在",
  },
];
const REQUIRED_FILES = [
  "public/assets/space-background-desktop.png",
  "public/assets/space-background-mobile.png",
  "public/assets/space/bg-desktop.png",
  "public/assets/space/bg-mobile.png",
  "public/assets/space/stars-far.svg",
  "public/assets/space/stars-near.svg",
  "public/assets/star-bottle-image2.png",
  "public/assets/nebula/nebula-region.png",
  "public/assets/nebula/nebula-industry.png",
  "public/assets/nebula/nebula-batch.png",
  "public/assets/nebula/nebula-captured.png",
];
const REQUIRED_TEXT = {
  "/": ["秋招星瓶"],
  "/explore": ["岗位星图", "筛选", "排序方式", "最近更新优先"],
  "/my": ["我的投递"],
  "/bottle": ["我的星瓶", "季节容器"],
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
