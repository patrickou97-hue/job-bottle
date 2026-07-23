import { spawn } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { createClient } from "@supabase/supabase-js";

const ROOT = new URL("..", import.meta.url);
const ENV_FILE = new URL(".env.local", ROOT);
const NEXT_BIN = new URL("node_modules/.bin/next", ROOT);
const SOURCE_INVARIANTS = [
  {
    file: "src/app/layout.tsx",
    mustInclude: ["@vercel/analytics/next", "<Analytics />", "<WelcomeNotice />"],
    mustNotInclude: [],
    label: "根布局启用 Vercel Web Analytics 并覆盖全站首次访问说明",
  },
  {
    file: "src/app/error.tsx",
    mustInclude: ["reset", "重新尝试", "返回首页", "当前页面的数据没有被主动删除"],
    mustNotInclude: [],
    label: "页面级错误边界提供恢复路径且不误报数据删除",
  },
  {
    file: "src/app/global-error.tsx",
    mustInclude: ["<html", "<body", "reset", "账号数据不会因此被删除"],
    mustNotInclude: [],
    label: "根布局错误边界可在全局渲染失败时恢复",
  },
  {
    file: "src/components/onboarding/WelcomeNotice.tsx",
    mustInclude: ["GUEST_NOTICE_KEY", "USER_NOTICE_METADATA_KEY", "auth.updateUser", "欢迎来到拾星", "Vercel", "Supabase", "不会向其他用户公开、出售或用于广告投放", "aria-modal=\"true\"", "Escape", "CommunityHelpLink"],
    mustNotInclude: ["开发者与管理员可见", "不会以任何方式泄露"],
    label: "游客与首次登录用户收到可访问且可兑现的产品和隐私说明",
  },
  {
    file: "src/lib/resume.ts",
    mustInclude: ["saveLocalResumes", "window.localStorage.setItem", "return true", "return false"],
    mustNotInclude: [],
    label: "简历本地保存捕获浏览器配额异常而不让页面崩溃",
  },
  {
    file: "src/lib/resume-ai.ts",
    mustInclude: ["AbortController", "22_000", "isResumePolishResult", "AI 返回内容格式异常", "AI 润色请求超时"],
    mustNotInclude: ["return payload as ResumePolishResult"],
    label: "简历 AI 客户端具备超时与响应结构验证",
  },
  {
    file: "src/lib/applications.ts",
    mustInclude: ["getErrorCode(error) === \"23505\"", "getErrorCode(legacyError) === \"23505\"", "fetchExistingApplication", "APPLICATION_REQUEST_TIMEOUT_MS", ".abortSignal(signal)", "网络响应超时，你填写的内容仍保留"],
    mustNotInclude: [],
    label: "重复点击收录岗位时可从唯一键竞争中恢复",
  },
  {
    file: "src/lib/forum.ts",
    mustInclude: ["/api/admin/forum/posts", "role === \"admin\"", "author_name: \"拾星官方\"", "normalizeGuideCategory"],
    mustNotInclude: ["createComment", "toggleLike", ".from(\"forum_likes\")"],
    label: "拾星指南只展示管理员内容且移除社区互动写入",
  },
  {
    file: "src/components/galaxy/GalaxyMapClient.tsx",
    mustInclude: ["try {", "catch {", "finally {", "岗位星系读取失败"],
    mustNotInclude: [],
    label: "岗位星系加载失败时退出等待态并显示错误",
  },
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
    mustInclude: ["2026 秋招季", "本季统计", "已收进", "FiligreeDivider", "分享我的星瓶"],
    mustNotInclude: ["bg-white/[0.025]", "shadow-[0_28px_90px"],
    label: "星瓶页按 v4 季节容器布局呈现",
  },
  {
    file: "src/components/applications/BottleStage.tsx",
    mustInclude: ["canvasRef", "drawApplicationStar", "drawBottleAtmosphere", "BOTTLE_INNER_PATH", "clipToBottleInterior", "/assets/star-bottle-image2.png", "useReducedMotion", "aspect-[2/3]", "let metrics", "canvas.width !== pixelWidth", "new ResizeObserver(resize)"],
    mustNotInclude: ["Matter", "matter-js", "StackedStar", "const rect = resize();", "context.moveTo(-size * 0.22, 0)", "palette.spark"],
    label: "星瓶使用无中心十字的 canvas 星层和简化落瓶动画且不引入物理引擎",
  },
  {
    file: "src/lib/bottleShape.ts",
    mustInclude: ["BOTTLE_INNER_PATH", "BOTTLE_MAIN_CAVITY_PATH", "isBottleCircleInsideMainCavity", "getBottleSafeRadius"],
    mustNotInclude: ["Math.random"],
    label: "星瓶内腔使用真实几何路径和安全半径判定",
  },
  {
    file: "src/components/applications/bottleGeometry.ts",
    mustInclude: ["getBottleMainHorizontalRange", "isBottleCircleInsideMainCavity", "validateBottleStackPosition"],
    mustNotInclude: ["Math.random"],
    label: "星瓶落位算法逐候选点执行主腔几何判定",
  },
  {
    file: "src/components/galaxy/GalaxyHome.tsx",
    mustInclude: ["<SpaceHome />"],
    mustNotInclude: ["canvas", "StarField", "orbitKeyframes"],
    label: "主页使用拆分后的深空星系组件",
  },
  {
    file: "src/components/galaxy/SpaceHome.tsx",
    mustInclude: ["MOBILE_PLANET_LAYOUT", "OrbitLines", "PlanetTransitionOverlay", "router.prefetch(href)", "window.setTimeout", "markSceneDeparture(href)", "encodeURIComponent(planet.href)", "/brand/shi-xing-wordmark.png", "desktopOrbitScale", "mobileOrbitScale", "planetScale={0.82}", "<CorePlanet compact />", "href: user ? '/profile' : '/login'", "authResolved", "返回拾星主页"],
    mustNotInclude: ["router.push(planet.href)", "href: user ? '/my' : '/login'", "href: user ? '/my-applications' : '/login'", "HomeWorkspace", "bg-white", "rounded-2xl", "<PlanetLabel", "blur(3px)"],
    label: "所有用户主页均保留拾星字标、运行星系和行星进入转场",
  },
  {
    file: "src/components/galaxy/SpaceBackground.tsx",
    mustInclude: ["variant=\"scene\"", "SharedSpaceBackground"],
    mustNotInclude: ["variant=\"work\""],
    label: "主页明确复用星瓶的深空 scene 背景",
  },
  {
    file: "src/components/galaxy/PlanetTransitionOverlay.tsx",
    mustInclude: ["rect.left", "targetX - centerX", "motionDuration.immersive", "motionEase.planetApproach", "useReducedMotion"],
    mustNotInclude: ["scale: 28", "radial-gradient(circle at 50% 50%"],
    label: "首页转场从实际点击行星位置连续靠近并支持减弱动态效果",
  },
  {
    file: "src/lib/motion.ts",
    mustInclude: ["instant: 0.12", "normal: 0.26", "immersive: 0.92", "planetApproach", "pageVariants", "layoutTransition"],
    mustNotInclude: ["gsap", "three"],
    label: "全站复用统一的动效时长、缓动和布局过渡",
  },
  {
    file: "src/components/galaxy/CorePlanet.tsx",
    mustInclude: ["OrbMaterial", "min(20vw, 78px)", "min(20vw, 82px)", "/brand/shi-xing-wordmark.png", "alt=\"拾星\""],
    mustNotInclude: ["把每一次投递", "minWidth: compact ? 132", "{SITE_NAME}</span>\n      <span", "SITE_NAME"],
    label: "主页中心星球使用统一材质，移动端收紧恒星与字标尺寸",
  },
  {
    file: "src/lib/planet-routes.ts",
    mustInclude: ["label: '岗位坐标'", "label: '投递管理'", "label: '简历制作'", "label: '拾星指南'", "label: '星瓶'"],
    mustNotInclude: ["label: '岗位池'", "label: '经验库'", "label: '我的星瓶'"],
    label: "首页行星入口使用统一一级模块名称",
  },
  {
    file: "src/components/galaxy/OrbitLines.tsx",
    mustInclude: ["MAX_HOME_ORBIT_LINES", "orbitScale", "border:"],
    mustNotInclude: [],
    label: "主页轨道线作为星系元素保留且最多四条同心圆",
  },
  {
    file: "src/components/visual/OrbMaterial.tsx",
    mustInclude: ["MAX_SCENE_GLOW_ELEMENTS = 5", "MAX_HOME_ORBIT_LINES = 4", "data-orb-material", "circle at 28% 24%"],
    mustNotInclude: [],
    label: "统一星球材质组件定义光源、光晕预算和首页轨道预算",
  },
  {
    file: "src/components/layout/UserShell.tsx",
    mustInclude: ["<SpaceShell>", "<Navbar appearance={variant} />", "RouteContentTransition"],
    mustNotInclude: ["StarFieldBackground"],
    label: "用户端页面统一使用 SpaceShell 背景",
  },
  {
    file: "src/components/layout/AdminShell.tsx",
    mustInclude: ["theme-work", "md:grid-cols-[210px_minmax(0,1fr)]", "管理导航", "nav-account", "返回首页"],
    mustNotInclude: ["StarFieldBackground", "rounded-[28px]", "rounded-full"],
    label: "管理页使用收紧工具栏而非嵌套圆角浮层",
  },
  {
    file: "src/components/layout/SpaceBackground.tsx",
    mustInclude: ["space-bg__image", "space-bg__vignette", "space-bg__stars--far", "space-bg__stars--near", "space-bg__noise", "space-bg__meteor"],
    mustNotInclude: ["Math.random", "canvas"],
    label: "统一深空背景按视觉规格分层且包含低频流星",
  },
  {
    file: "src/app/globals.css",
    mustInclude: ["../styles/tokens.css", "/assets/space/bg-desktop.png", "/assets/space/bg-mobile.png", "background-size: cover", ".space-bg--work", "#e9ebef", ".scene-arrival-veil", "data-scene-transition=\"arrived\""],
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
    file: "src/styles/tokens.css",
    mustInclude: ["--night-0: #000001", "--night-1: #12294E", "--night-3: #564A71", "--dusk: #7F5568", ".theme-work", "--background: #e9ebef", "--surface-read-bg: #f6f7f9", "--text-primary: #1d1d1f", "--aurora: #12294e", "--apple-radius-control: 8px", ".theme-scene"],
    mustNotInclude: ["--arcane: #8F86F0", "--star-apricot: #D9ADA9", "--aurora: #62D9FF"],
    label: "全站使用林深星渡五色基调和更轻的半透明工作面",
  },
  {
    file: "src/components/applications/shareBottleCard.ts",
    mustInclude: ["background.addColorStop(0, \"#000001\")", "background.addColorStop(0.42, \"#12294E\")", "fill: \"#7E7CB5\""],
    mustNotInclude: ["fill: \"#F2D16D\"", "dark: \"#313B59\""],
    label: "星瓶分享海报同步林深星渡色板",
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
    label: "岗位星使用稳定星云网格布局",
  },
  {
    file: "src/lib/categories.ts",
    mustInclude: ["JOB_CATEGORIES", "normalizeJobCategories", "jobMatchesSelectedCategories", "教师类", "咨询类"],
    mustNotInclude: [],
    label: "岗位类别归一化函数集中定义",
  },
  {
    file: "src/lib/jobs.ts",
    mustInclude: ["RECENT_JOB_WINDOW_DAYS = 7", "isRecentlyListedJob", "job.created_at", "hasJobPreferences", "jobMatchesProfilePreferences", "regionMatched && roleMatched", "/全国|全球/"],
    mustNotInclude: ["isRecentlyListedJob(job.updated_at", "new Date(job.updated_at).getTime() >= cutoff"],
    label: "近七天岗位按收录时间计算且偏好匹配要求已填写维度同时命中",
  },
  {
    file: "src/lib/resume.ts",
    mustInclude: ["ResumeDocument", "ResumeContent", "ResumeLanguage", "createSampleResume", "createEmptyResume(language", "loadLocalResumes", "adoptLocalResumesForUser", "GUEST_STORAGE_KEY", "USER_STORAGE_KEY_PREFIX", "createResumeId", "linkedJobId", "photoDataUrl", "compact", "classic", "modern", "consulting", "technical", "academic", "english_classic", "english_modern", "紧凑中文", "经典商科", "现代单栏", "咨询投研", "技术简洁", "学术研究", "English Classic", "English Modern", "isEnglishResumeTemplate", "getResumeLanguage", "getDefaultResumeTemplate", "getEquivalentTemplateForLanguage", "isResumeId", "getResumeTargetLine"],
    mustNotInclude: ["const STORAGE_KEY = \"job_bottle_resumes_v1\""],
    label: "简历制作器定义结构化模型、多模板和按账号隔离的本地持久化",
  },
  {
    file: "src/components/resume/ResumeBuilderClient.tsx",
    mustInclude: ["ResumeEditor", "ResumePreview", "ResumePdfExportButton", "ResumePageTitle", "AI-Powered", "Snell Roundhand", "inline-block", "px-2", "新建简历", "实时预览", "共用同一套 A4 排版坐标", "prepareTargetResume", "创建岗位版本", "打开岗位版本", "linkedJobId: targetJob.id", "primaryRole", "targetRole: primaryRole", "linkedJobContext={targetJob}", "saveLocalResumes", "adoptLocalResumesForUser", "fetchMyResumes", "upsertMyResume", "MAX_BACKGROUND_SYNC_ATTEMPTS", "isResumeOwnershipConflictError", "onAuthStateChange", "visibilitychange", "正在合并本地与账号简历", "已同步到账号", "请谨慎审核 AI 输出的简历信息"],
    mustNotInclude: ["requestAnimationFrame"],
    label: "简历制作器提供列表、编辑、预览、本地保存和账号同步",
  },
  {
    file: "src/components/jobs/JobDetailActions.tsx",
    mustInclude: ["准备岗位简历", "pathname: \"/resume\"", "company: job.company_name", "job: job.id", "role: job.job_titles"],
    mustNotInclude: [],
    label: "岗位详情可携带真实岗位上下文进入简历版本管理",
  },
  {
    file: "src/components/layout/Navbar.tsx",
    mustInclude: ["岗位坐标", "投递管理", "简历制作", "href: \"/extension\"", "label: \"网申助手\"", "BETA", "nav-beta", "拾星指南", "星瓶", "个人中心", "href: \"/feedback\"", "label: \"反馈\"", "mobileNavItems", "grid-cols-6", "移动主导航", "bottom-0", "primary-nav-indicator", "mobile-nav-indicator", "profile ? \"个人中心\" : \"登录\""],
    mustNotInclude: ["找岗位", "求职交流", "label: \"我的\"", "label: \"首页\""],
    label: "桌面顶部独立展示反馈入口且移动端保持原六项主导航",
  },
  {
    file: "src/components/resume/ResumePreview.tsx",
    mustInclude: ["createResumePreviewLayout", "ResumePreviewOperation", "aspect-[210/297]", "max-w-[210mm]", "data-resume-preview", "data-page-width", "viewBox", "preserveAspectRatio=\"none\"", "lengthAdjust=\"spacingAndGlyphs\"", "textLength={operation.width}", "A4 简历预览第"],
    mustNotInclude: ["min-h-[1123px]", "max-w-[794px] bg-white text-[#111111]"],
    label: "简历预览按共享 PDF 坐标渲染响应式 A4 页面",
  },
  {
    file: "src/components/resume/ResumeEditor.tsx",
    mustInclude: ["PhotoField", "cropPhotoToPortrait", "上传照片", "复制通用简历后", "AI 润色", "ResumePolishDialog", "bg-[#12294e]", "rounded-lg", "focus-visible:ring-[#12294e]/40", "mergeBullets", "撤销"],
    mustNotInclude: ["模板风格", "RESUME_TEMPLATES"],
    label: "简历编辑器聚焦内容填写并支持岗位关联",
  },
  {
    file: "src/components/resume/ResumeTemplatePicker.tsx",
    mustInclude: ["RESUME_TEMPLATES", "consulting", "technical", "academic", "english_classic", "english_modern", "aria-pressed", "简历版式"],
    mustNotInclude: ["先选排版，再填内容", "不会改动你的内容", "template.description"],
    label: "简历制作器在顶层提供克制的八款模板切换器",
  },
  {
    file: "src/components/resume/ResumePdfExportButton.tsx",
    mustInclude: ["/api/resume/download-auth", "hasVerifiedDownloadSession", "cache: \"no-store\"", "credentials: \"same-origin\"", "preserveDraft", "mode=register", "reason=resume-download", "当前简历已保存在本浏览器", "exportResumeToPdf", "正在生成", "PDF 已开始下载"],
    mustNotInclude: ["window.print", "document.title"],
    label: "简历 PDF 下载要求登录并在跳转注册前保留浏览器草稿",
  },
  {
    file: "src/app/api/resume/download-auth/route.ts",
    mustInclude: ["supabase.auth.getUser()", "authenticated: false", "status: 401", "authenticated: true", "Cache-Control", "no-store"],
    mustNotInclude: ["getSession", "service_role"],
    label: "简历下载资格由服务端验证 Supabase 用户而非信任本地 session",
  },
  {
    file: "src/app/login/page.tsx",
    mustInclude: ["拾星 · StarJob", "「用星瓶收录明日坐标」", "让拾星StarJob成为你秋招路上的超级伙伴"],
    mustNotInclude: ["Job Bottle", "Starjob"],
    label: "登录页统一使用 StarJob 品牌名与新版秋招文案",
  },
  {
    file: "src/lib/constants.ts",
    mustInclude: ["拾星 StarJob"],
    mustNotInclude: ["Job Bottle", "Starjob"],
    label: "全站共享英文品牌名统一为 StarJob",
  },
  {
    file: "src/components/auth/LoginForm.tsx",
    mustInclude: ["mode", "register", "reason", "resume-download", "getSafeNextPath", "data.session", "返回简历制作", "placeholder=\"2027\""],
    mustNotInclude: ["router.push(searchParams.get(\"next\")", "placeholder=\"成都\"", "西南财经大学", "金融学"],
    label: "注册登录可安全返回来源页并兼容邮箱确认流程",
  },
  {
    file: "src/lib/profile-options.ts",
    mustInclude: ["PROFILE_ROLE_OPTIONS", "金融", "银行", "证券", "基金", "保险", "投行", "投研", "行研", "量化", "咨询", "战略", "商业分析", "数据分析", "产品", "运营", "市场", "销售", "风控", "审计", "财务", "人力", "软件研发", "硬件工程", "供应链", "生产制造", "设计", "法务", "职能", "管培生", "教师"],
    mustNotInclude: [],
    label: "注册和个人中心提供完整且向后兼容的求职方向选项",
  },
  {
    file: "src/lib/resume.ts",
    mustInclude: ["mergeResumeCollections", "getResumeTimestamp", "consulting", "technical", "academic", "english_classic", "english_modern"],
    mustNotInclude: [],
    label: "本地和云端简历按更新时间无损合并并保留全部模板",
  },
  {
    file: "src/components/resume/resumePdf.ts",
    mustInclude: ["jsPDF", "NotoSerifSC-Regular-common-v1.ttf", "NotoSerifSC-Bold-common-v1.ttf", "NotoSerifSC-Regular-full-v1.ttf", "NotoSerifSC-Bold-full-v1.ttf", "NEXT_PUBLIC_RESUME_FONT_FULL_REGULAR_URL", "NEXT_PUBLIC_RESUME_FONT_FULL_BOLD_URL", "same-origin-common", "cos-full", "same-origin-full", "FONT_TIMEOUT_MS = 10_000", "resetResumePdfCaches", "selectedFontCache", "fontSourceCache", "previewMeasurementPdfCache", "bundleId", "__resumeFontFamily", "regularFileName", "boldFileName", "cache: \"force-cache\"", "format: \"a4\"", "PAGE_WIDTH = 595.28", "PAGE_HEIGHT = 841.89", "exportResumeToPdf", "createResumePreviewLayout", "ResumePreviewOperation", "width: state.pdf.getTextWidth(text)", "addPage(\"a4\", \"portrait\")", "addFileToVFS", "getTemplateOptions", "getResumeTargetLine", "consulting", "technical", "academic", "english_classic", "english_modern", "isEnglishResumeTemplate", "EDUCATION", "Boolean(basics.photoDataUrl) && !isEnglish", "const photoBottom = photoY + photoHeight", "Math.max(y, hasPhoto ? photoBottom", "state.y = headerContentBottom + 15"],
    mustNotInclude: ["NEXT_PUBLIC_RESUME_FONT_REGULAR_URL", "NEXT_PUBLIC_RESUME_FONT_BOLD_URL", "html2canvas", "window.print", "addPage(\"letter\""],
    label: "简历预览与 PDF 共用三级字体选择、矢量 A4 坐标和分页规则",
  },
  {
    file: "src/lib/resume-font-profile.ts",
    mustInclude: ["collectResumeText", "selectResumeFontProfile", "selectResumeDocumentFontProfile", "codePointAt", "RESUME_FONT_COMMON_RANGES", "customSections"],
    mustNotInclude: ["fetch("],
    label: "简历字体 profile 由完整文本和生成的 common 覆盖数据纯函数决定",
  },
  {
    file: "next.config.ts",
    mustInclude: ["/fonts/resume/:path*", "public, max-age=31536000, immutable", "Content-Security-Policy", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy", "frame-ancestors 'none'"],
    mustNotInclude: [],
    label: "版本化简历字体使用仅限字体路径的长期缓存头",
  },
  {
    file: "src/lib/resume-sync.ts",
    mustInclude: ["fetchMyResumes", "upsertMyResume", "deleteMyResume", "withCloudRetry", "withCloudTimeout", "CLOUD_RETRY_DELAYS_MS", "CLOUD_OPERATION_TIMEOUT_MS = 8_000", "content_json", "__job_bottle_template_id", "minimal", "executive", "consulting", "technical", "academic", "english_classic", "english_modern", "isMissingResumeTableError", "isResumeTemplateConstraintError", "isResumeOwnershipConflictError", "getResumeSyncErrorMessage", "PGRST301"],
    mustNotInclude: ["service_role"],
    label: "简历同步层对瞬时失败重试并兼容未运行迁移的本地回退",
  },
  {
    file: "src/lib/resume-file-reader.ts",
    mustInclude: ["MAX_FILE_SIZE", "pdfjs-dist/legacy/build/pdf.mjs", "pdf.worker.min.mjs", "mammoth", "extractRawText", "file.text()", "PDF、DOCX 或 TXT"],
    mustNotInclude: ["fetch(", "FormData", "FileReader.readAsDataURL"],
    label: "已有简历文件先在浏览器本地提取文字且不上传原文件",
  },
  {
    file: "src/lib/resume-import.ts",
    mustInclude: ["parseResumeTextLocally", "createResumeFromImport", "detectResumeLanguage", "getDefaultResumeTemplate", "splitSections", "extractDateRange", "教育背景", "工作经历", "项目经历", "createId", "英文简历", "中文简历"],
    mustNotInclude: ["fetch(", "MIMO_API_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "简历导入先用确定性规则识别基础字段和硬区块再生成平台结构",
  },
  {
    file: "src/app/api/resume/import/route.ts",
    mustInclude: ["auth.getUser", "take_resume_ai_rate_slot", "MIMO_API_KEY", "response_format", "json_object", "localDraft", "sourceText", "preserveDeterministicBasics", "language", "zh-CN", "en-US", "不得虚构", "区块", "Cache-Control", "no-store", "maxDuration = 45", "REQUEST_TIMEOUT_MS = 38_000", "buildLocalReviewHints", "bulletCount", "elapsedMs", "你仍可直接导入程序解析结果"],
    mustNotInclude: ["createAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_", "request.formData", "console.log"],
    label: "AI 只复核提取文字与本地候选并以严格 JSON 返回完整简历草稿",
  },
  {
    file: "src/components/resume/ResumeImportDialog.tsx",
    mustInclude: ["本地读取 · AI 复核 · 确认生成", "extractResumeFileText", "parseResumeTextLocally", "不会上传原文件", "交给 AI 复核", "英文简历", "中文简历", "直接导入解析结果", "导入 AI 复核结果", "AI 超时或失败不会清除当前解析结果", "ResumeImportMode", "AbortController", "43_000", "当前处于离线状态", "取消 AI 复核", "程序解析结果已安全保留"],
    mustNotInclude: ["request.formData", "window.location.reload"],
    label: "简历导入必须先预览程序结果和 AI 警告再由用户确认生成",
  },
  {
    file: "src/components/resume/ResumeBuilderClient.tsx",
    mustInclude: ["ResumeCreateDialog", "ResumeImportDialog", "createResumeFromImport", "createResumeFromTranslation", "requestResumeTranslation", "resume_import_created", "resume_translation_created", "review_mode", "程序解析结果", "AI 复核结果", "导入简历", "新建简历", "AI 转英文", "AI 转中文", "原简历保持不变", "showImportDialog", "showCreateDialog", "deletedResumeIdsRef", "await cloudSaveWorkerRef.current", "再次点击删除即可确认", "取消翻译"],
    mustNotInclude: ["router.refresh()", "window.location.reload()"],
    label: "简历制作器接入语言新建、自动分配导入模板和不覆盖原文的 AI 双语译本",
  },
  {
    file: "src/components/resume/ResumeCreateDialog.tsx",
    mustInclude: ["中文简历", "English Resume", "先选择中文或英文", "getDefaultResumeTemplate", "ResumeTemplatePicker", "使用此模板创建"],
    mustNotInclude: ["shadow-", "bg-gradient"],
    label: "新建简历必须先选择语言并从对应模板中创建",
  },
  {
    file: "src/components/resume/ResumeTemplatePicker.tsx",
    mustInclude: ["getResumeLanguage", "ResumeLanguage", "English templates", "中文模板", "templates.map"],
    mustNotInclude: [],
    label: "简历模板选择器只显示当前简历语言对应的版式",
  },
  {
    file: "src/lib/resume-translation.ts",
    mustInclude: ["createResumeTranslationSource", "requestResumeTranslation", "createResumeFromTranslation", "getEquivalentTemplateForLanguage", "linkedJobId: null", "photoDataUrl", "原简历未改变"],
    mustNotInclude: ["MIMO_API_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_"],
    label: "整份简历翻译只发送可翻译结构并生成保留精确联系方式的独立副本",
  },
  {
    file: "src/app/api/resume/translate/route.ts",
    mustInclude: ["auth.getUser", "take_resume_ai_rate_slot", "MIMO_API_KEY", "response_format", "json_object", "hasMatchingStructure", "preserveDeterministicStructure", "不得润色", "Cache-Control", "no-store"],
    mustNotInclude: ["createAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_", "console.log"],
    label: "整份简历 AI 翻译在服务端校验登录、频率、结构和确定性日期字段",
  },
  {
    file: "package.json",
    mustInclude: ["pdfjs-dist", "mammoth"],
    mustNotInclude: [],
    label: "浏览器简历导入依赖受控的 PDF 与 DOCX 文本提取库",
  },
  {
    file: "src/lib/application-url.ts",
    mustInclude: ["sanitizeApplicationUrl", "click_id", "clickid", "cid", "key.toLowerCase()"],
    mustNotInclude: [],
    label: "投递链接清洗器大小写不敏感地移除 CID 和 click_id",
  },
  {
    file: "src/lib/utils.ts",
    mustInclude: ["sanitizeApplicationUrl", "window.open(sanitizeApplicationUrl"],
    mustNotInclude: [],
    label: "所有统一投递入口在打开官网前使用链接清洗器",
  },
  {
    file: "supabase/migrations/20260710120000_profile_resume_cloud_repair.sql",
    mustInclude: ["create table if not exists public.resumes", "preferred_regions", "target_roles", "minimal", "executive", "resumes_select_own", "resumes_update_own", "grant select, insert, update, delete on public.resumes to authenticated"],
    mustNotInclude: ["service_role"],
    label: "云端资料和简历修复迁移补齐 owner-only RLS 与必要字段",
  },
  {
    file: "src/components/applications/shareBottleCard.ts",
    mustInclude: ["context.drawImage(bottleImage", "globalCompositeOperation = \"screen\"", "bottleSnapshot", "已收到 Offer", "已进面", "companies.slice(0, 5)", "context.fillText(\"……\"", "const qrSize = 170"],
    mustNotInclude: ["意向地区", "意向岗位", "独特简历", "推荐机会"],
    label: "分享海报始终绘制瓶身、使用阶段统计、前五企业和安全二维码",
  },
  {
    file: "supabase/migrations/20260710140000_resume_template_consolidation.sql",
    mustInclude: ["english_classic", "english_modern", "minimal", "executive", "drop constraint if exists resumes_template_id_check"],
    mustNotInclude: [],
    label: "简历模板收敛迁移保留历史模板兼容并新增英文版式",
  },
  {
    file: "supabase/migrations/20260710150000_resume_template_expansion.sql",
    mustInclude: ["consulting", "technical", "academic", "minimal", "executive", "drop constraint if exists resumes_template_id_check"],
    mustNotInclude: [],
    label: "简历模板扩展迁移新增岗位导向版式并保留历史兼容",
  },
  {
    file: "src/components/admin/AdminJobsClient.tsx",
    mustInclude: ["duplicateOnly", "duplicateGroups", "duplicateJobIds", "筛选重复岗位", "疑似重复岗位"],
    mustNotInclude: ["handleMergeDuplicates", "合并失败，请确认管理员权限或稍后再试。"],
    label: "管理员可独立筛选和核验重复岗位，不依赖未部署的合并 RPC",
  },
  {
    file: "supabase/migrations/20260708090000_resumes.sql",
    mustInclude: ["create table if not exists public.resumes", "content_json jsonb", "resumes_select_own", "resumes_update_own"],
    mustNotInclude: ["service_role"],
    label: "简历表迁移预留账号同步和 owner-only RLS",
  },
  {
    file: "src/lib/dates.ts",
    mustInclude: ["Asia/Shanghai", "daysUntilShanghai", "formatShanghaiDateTime", "formatShanghaiDate"],
    mustNotInclude: ["toLocaleDateString", "getDeadlineTone", "getDeadlineLabel", "getDeadlineTime"],
    label: "日期逻辑保留上海时区工具且不再暴露下线日期能力",
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
    file: "src/components/jobs/ChinaJobMap.tsx",
    mustInclude: ["china-provinces.json", "geoMercator", "matchesLocationFilter", "province:", "全国省级岗位分布图", "SMALL_REGION_LABELS", "北京:", "天津:", "上海:", "香港:", "澳门:", "group-focus:underline", "aria-pressed", "Enter", "当前地区暂无匹配岗位", "selectedJobs.slice(0, 8)", "查看全部"],
    mustNotInclude: ["Math.random", "linear-gradient", "Nebula", "ECharts"],
    label: "岗位地图使用本地省级 GeoJSON，并以可点击折线标注强化小型直辖地区",
  },
  {
    file: "src/data/CHINA_GEOJSON_LICENSE.md",
    mustInclude: ["zhChuXiao/ChinaGeoJson", "MIT License", "Copyright (c) 2024 ChuXiao"],
    mustNotInclude: [],
    label: "全国地图保留第三方 GeoJSON 来源和 MIT 版权声明",
  },
  {
    file: "src/components/jobs/HomeClient.tsx",
    mustInclude: ["ChinaJobMap", "岗位地图", "岗位清单", "按省份查看", "正在绘制全国岗位分布", "mapMatchingJobs", "location: \"\"", "selectedLocation={filters.location}", "handleFiltersChange({ ...filters, location })", "CaptureAnimation", "candidateStage", "\"evaluating\"", "\"saved\"", "\"preparing\"", "upsertApplication(supabase, user.id, job.id, \"preparing\")", "openApplicationWebsite(job, applyWindow)", "已加入星瓶并打开官网", "focusJob", "encodeURIComponent(\"/explore\")", "href=\"/my\"", "最新开启", "ApplyReturnConfirm", "visibilitychange", "keep_opened", "useSearchParams", "\"cats\"", "window.history.replaceState", "discoveryScope", "recentJobs", "recentPreferenceJobs", "recentJobs: recentJobs.length", "label=\"近 7 天新发现\"", "grid-cols-2", "sm:grid-cols-4", "filteredJobs.map"],
    mustNotInclude: ["NebulaGateway", "nebulaSelection", "按行业探索", "已加入星瓶。先评估岗位", "encodeURIComponent(\"/jobs\")", "href=\"/my-applications\"", "router.replace(query ? `/explore?${query}` : \"/explore\"", "JOB_LIST_PAGE_SIZE", "displayedJobs", "IntersectionObserver", ">继续加载<"],
    label: "全国地图与线性清单共用筛选，首次加入星瓶后直接打开官网并保留返回确认闭环",
  },
  {
    file: "src/components/jobs/JobFilterBar.tsx",
    mustInclude: ["快捷查看", "近 7 天新上", "近 7 天 · 符合偏好", "按本站收录时间计算", "求职偏好", "disabled={!hasPreferences}"],
    mustNotInclude: ["无限滚动", "继续加载"],
    label: "岗位筛选提供可解释的新上与偏好快捷范围且偏好为空时不制造假匹配",
  },
  {
    file: "src/components/jobs/ApplyReturnConfirm.tsx",
    mustInclude: ["投递完成了吗", "已投递", "还没有", "不投了"],
    mustNotInclude: ["DDL"],
    label: "官网投递返回确认条提供 opened/applied 语义分离",
  },
  {
    file: "src/components/jobs/JobCard.tsx",
    mustInclude: ["application", "StatusPill", "getJobPrimaryAction", "getApplicationStageLabel", "href={`/jobs/${job.id}`}"],
    mustNotInclude: ["CompanyBadge", "DeadlineChip", "grid-cols-[34px_32px", "role=\"button\"", "cursor-pointer"],
    label: "探索列表使用详情入口与明确投递动作，避免误触打开官网",
  },
  {
    file: "src/components/galaxy/GalaxyChoice.tsx",
    mustInclude: ["next/image", "imageSrc", "object-cover", "focus-visible:ring-2"],
    mustNotInclude: ["blur-3xl"],
    label: "岗位星系入口使用真实星云资产而非纯文字发光块",
  },
  {
    file: "src/components/profile/ProfileClient.tsx",
    mustInclude: ["个人中心", "ProfileSection", "基本资料", "求职偏好", "简历与匹配", "投递进展", "title=\"账号\"", "lg:grid-cols-[190px_minmax(0,1fr)]"],
    mustNotInclude: ["eyebrow=", "个人中心 · 用户管理", "账号与反馈", "反馈内容", "FEEDBACK_TYPES", "常用入口", "查看秋招流程", "个人中心分区", "profile-assets", "star-bottle-image2.png", "BottleFact"],
    label: "个人中心按资料、偏好、简历匹配、投递和账号顺序使用开放式平铺布局",
  },
  {
    file: "src/components/feedback/FeedbackClient.tsx",
    mustInclude: ["反馈", "告诉我们您的建议与反馈，这对我们非常重要", "问题类型", "具体情况", "反馈内容", "发送反馈", "隐私说明", "FEEDBACK_TYPES", "mailto:", "不会自动发送简历正文"],
    mustNotInclude: ["rounded-2xl", "shadow-", "bg-gradient"],
    label: "反馈独立为一级开放式页面并保留问题分类、邮件确认和隐私说明",
  },
  {
    file: "src/components/forum/ForumClient.tsx",
    mustInclude: ["QUICK_LINKS", "常用入口", "浏览岗位坐标", "处理投递进度", "管理简历", "查看秋招流程"],
    mustNotInclude: [],
    label: "拾星指南在文章列表前提供常用入口",
  },
  {
    file: "src/app/globals.css",
    mustInclude: [".form-section", ".list-surface", ".table-surface", ".visualization-boundary", ".apple-segmented", ".nebula-job-scroll", "font-size: clamp(1.8rem, 3vw, 2.5rem)", ".space-bg--work"],
    mustNotInclude: [],
    label: "数据页面使用开放集合与收紧的页面层级，避免统一卡片墙",
  },
  {
    file: "src/components/jobs/JobFilterBar.tsx",
    mustInclude: ["start_date_desc", "最新开启", "最近更新优先", "最早开启", "岗位类别", "toggleCategory", "地点层级", "不限", "全国", "省级", "市级", "选择省级地区", "请选择城市", "buildLocationGroups", "left-3", "pl-10", "清空所有岗位筛选"],
    mustNotInclude: ["deadline_asc", "downloadDeadlineDigest", "digest_generate", "岗位标签", "toggleTag"],
    label: "探索筛选默认最新开启且不再提供下线日期入口",
  },
  {
    file: "src/app/jobs/[id]/page.tsx",
    mustInclude: ["generateMetadata", "fetchJobById", "JobDetailActions", "返回岗位坐标", "RelatedJobs", "开启时间", "工作职责", "必须条件", "优先条件", "高频关键词", "原始岗位数据暂未"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY"],
    label: "岗位详情新路由服务端读取并提供收录入口且不展示下线日期",
  },
  {
    file: "src/components/jobs/JobDetailActions.tsx",
    mustInclude: ["加入星瓶", "getJobPrimaryAction", "candidateStage", "upsertApplication(supabase, user.id, job.id, \"preparing\")", "safeOpenUrl", "sanitizeApplicationUrl", "已加入星瓶并打开官网", "ApplyReturnConfirm", "keep_opened", "withdrawn"],
    mustNotInclude: ["router.push(`/login", "登录后加入星瓶，不会直接打开官网。"],
    label: "岗位详情首次收录后直接打开官网并支持回到页面确认投递",
  },
  {
    file: "src/components/applications/ApplicationOrbitSystem.tsx",
    mustInclude: ["投递中", "ApplicationOrbitRing", "ApplicationOrbitDetail", "OrbMaterial", "OrbitTrackLayer", "OrbitSceneBackdrop", "pointer-events-none absolute left-1/2 top-1/2 z-10 size-0", "absolute z-20"],
    mustNotInclude: ["CaptureOrbit", "timeline", "ApplicationOrbitLegend", "投递引力核心", "接递引力核心"],
    label: "投递主视觉使用同心投递轨道",
  },
  {
    file: "src/components/applications/ApplicationOrbitRing.tsx",
    mustInclude: ["getOrbitPoint", "suppressHydrationWarning", "x: path.map", "y: path.map", "showTrack", "pointer-events-none absolute left-1/2 top-1/2 z-20", "pointer-events-auto size-16 -translate-x-1/2"],
    mustNotInclude: ["rotate: 360", "translateX(${radius}px)", "rotate(${angle}deg)"],
    label: "投递轨道星体使用数学坐标运动而非旋转文字父层",
  },
  {
    file: "src/components/applications/ApplicationOrbitSystem.tsx",
    mustInclude: ["OrbitTrackLayer", "application-orbit-plane", "ResizeObserver", "size / 780", "aspect-square", "showTrack={false}", "ORBIT_BANDS.map", "getOrbitBandForStatus"],
    mustNotInclude: ["scaleY"],
    label: "投递轨道按四个视觉轨道带绘制同心圆",
  },
  {
    file: "src/components/applications/ApplicationOrbitStar.tsx",
    mustInclude: ["OrbMaterial", "getCompanyShortLabel", "已停留", "momentumTier", "group pointer-events-auto relative z-20 flex size-16 touch-manipulation", "variant={selected || offer ? \"gold\""],
    mustNotInclude: ["getCompactCompanyLabelStyle", "style={labelStyle}"],
    label: "投递节点使用统一球体材质且公司简称移到球下方",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["application.job.company_name", "StatusPill", "handleApplicationChanged", "handleApplicationDeleted", "type WorkspaceView = \"list\" | \"board\" | \"map\"", "本周求职行动", "ApplicationListItem", "投递视图"],
    mustNotInclude: ["DeadlineChip", "formatDateTime, isValidHttpUrl", "onChanged={loadData}"],
    label: "我的星图列表保留投递状态且不展示下线日期",
  },
  {
    file: "src/components/applications/ApplicationOrbitConfig.ts",
    mustInclude: ["ORBIT_BAND_CONFIG", "探索带", "投递带", "面试带", "Offer 核", "statuses: [\"first_round\", \"second_round\", \"final_round\"]"],
    mustNotInclude: [],
    label: "投递数据七态收敛为四个视觉轨道带",
  },
  {
    file: "src/components/applications/ProgressDrawer.tsx",
    mustInclude: [
      "handleStatusChange",
      "progress-status-node",
      "onBlur={() => void handleNoteBlur()}",
      "结束这条轨道",
      "确认删除?",
      "最近更新",
      "handleNodeKeyDown",
      "saveRequestRef",
      "optimisticApplication",
      "if (!application || saving) return false",
      "Rehydrate only when the drawer opens or switches records",
      "投递渠道",
      "投递账号",
      "使用简历",
      "下一步",
      "状态时间线",
      "复盘",
    ],
    mustNotInclude: ["StatusSelect", "投递状态", "rounded-[22px] border", "variant=\"secondary\"", "variant=\"danger\"", "await onChanged()", "router.refresh", "window.location.reload"],
    label: "投递轨道侧滑面板使用无界轨道节点、备注失焦保存和行内删除确认",
  },
  {
    file: "src/components/applications/MyApplicationsClient.tsx",
    mustInclude: ["当前阶段", "投递管理", "本周求职行动", "材料准备", "投递记录", "getApplicationPhase", "getWorkspaceTasks"],
    mustNotInclude: ["HomeWorkspace", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "阶段推进和本周行动直接合并到投递管理",
  },
  {
    file: "src/app/api/resume/ai-polish/route.ts",
    mustInclude: ["MIMO_API_KEY", "MIMO_BASE_URL", "MIMO_MODEL", "auth.getUser", "REQUEST_TIMEOUT_MS", "MAX_OUTPUT_TOKENS", "response_format", "json_object", "createPolishCacheKey", "X-StarJob-AI-Cache", "take_resume_ai_rate_slot", "logServerError", "不得虚构", "不把“协助/参与/支持”升级", "不强补结果", "warnings", "严格 JSON", "resultSchema", "parseResult", "normalizeResultCandidate", "typeof change === \"string\"", "title: source.title", "subtitle: source.subtitle", "原文未改变"],
    mustNotInclude: ["NEXT_PUBLIC_MIMO", "console.log", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "简历分段润色仅在服务端调用 MiMo 并限制幻觉、输入、超时和频率",
  },
  {
    file: "src/components/resume/ResumePolishDialog.tsx",
    mustInclude: ["当前经历全部描述", "仅处理当前段落", "原始内容", "润色结果", "修改说明", "建议补充", "风险提示", "应用修改", "保留原文", "重新生成", "CommunityHelpLink"],
    mustNotInclude: ["MiMo", "第三方", "MIMO_API_KEY", "MIMO_BASE_URL", "MIMO_MODEL"],
    label: "AI 结果先对比确认且客户端不暴露供应商或服务端配置",
  },
  {
    file: "supabase/migrations/20260711120000_application_workflow_details.sql",
    mustInclude: ["candidate_stage", "priority smallint", "application_channel", "application_account", "contact_name", "next_action_at", "resume_id", "custom_stage_label", "review_note", "set_application_applied_at"],
    mustNotInclude: ["drop table", "delete from public.user_applications"],
    label: "投递工作流迁移以兼容字段补齐候选、优先级、简历绑定和跟进信息",
  },
  {
    file: "supabase/migrations/20260711130000_job_decision_fields.sql",
    mustInclude: ["responsibilities", "must_have", "preferred_qualifications", "keywords text[]", "jobs_keywords_idx"],
    mustNotInclude: ["drop table", "delete from public.jobs"],
    label: "岗位决策字段迁移以可选结构化内容增强详情且不重写旧备注",
  },
  {
    file: "src/app/api/admin/users/route.ts",
    mustInclude: ["requireAdmin", "auth.getUser", "createAdminClient", "listAllAuthUsers", "listUsers", "buildMetrics", "active24h", "active3d", "last_sign_in_at", "matchesFilters", "totalFiltered", "updateUserById", "不能停用或降级当前管理员账号", "ban_duration", "email_confirm: true"],
    mustNotInclude: ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"],
    label: "管理员用户 API 在服务端复核身份并提供全量登录活跃指标、筛选和权限管理",
  },
  {
    file: "src/components/admin/AdminUsersClient.tsx",
    mustInclude: ["用户总数", "最近 24h 活跃", "最近 3 日活跃", "按最近登录统计", "搜索邮箱、姓名、学校、方向或用户 ID", "最近活跃优先", "用户账户", "账户身份", "普通用户", "管理员", "停用账户", "恢复登录", "确认停用", "设为已确认", "确认邮箱"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "deleteUser"],
    label: "管理员用户页用全局事实带和可组合筛选展示账户并提供非破坏性身份管理",
  },
  {
    file: "src/app/api/announcements/latest/route.ts",
    mustInclude: ["auth.getUser", "createAdminClient", "forum_posts", ".eq(\"category\", \"公告\")", "profile.role === \"admin\"", "accountCreatedAt >= announcementCreatedAt", "latest_announcement_seen_id", "private, no-store"],
    mustNotInclude: ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "email", "password"],
    label: "最新公告接口只向登录老用户返回尚未阅读的管理员公告",
  },
  {
    file: "src/components/onboarding/WelcomeNotice.tsx",
    mustInclude: ["announcement", "SIGNED_IN", "/api/announcements/latest", "ANNOUNCEMENT_SEEN_KEY_PREFIX", "latest_announcement_seen_id", "查看全部拾星指南", "关闭公告"],
    mustNotInclude: ["dangerouslySetInnerHTML", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "登录后公告与首次欢迎共用单一弹层并按用户和公告记录已读状态",
  },
  {
    file: "src/components/ui/Drawer.tsx",
    mustInclude: ["theme-work", "apple-sheet", "rounded-lg", "var(--surface-hover-bg)", "aria-modal=\"true\"", "Escape", "returnFocusRef", "CommunityHelpLink", "data-drawer-scroll", "min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain", "md:h-[calc(100svh-2rem)]", "-webkit-overflow-scrolling:touch"],
    mustNotInclude: ["border-l", "<Button"],
    label: "投递侧滑容器使用独立纵向滚动区并保留焦点管理与键盘关闭",
  },
  {
    file: "src/components/ui/CommunityHelpLink.tsx",
    mustInclude: ["href=\"/forum\"", "去拾星指南查看使用教程", "focus-visible:ring-2"],
    mustNotInclude: ["target=\"_blank\""],
    label: "所有业务弹窗复用可访问的拾星指南教程入口",
  },
  {
    file: "src/components/capture/CaptureOrbit.tsx",
    mustInclude: ["投递星图", "CapturedStar"],
    mustNotInclude: [],
    label: "投递包含捕获轨道",
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
    file: "src/app/profile/page.tsx",
    mustInclude: ["ProfileClient", "UserShell"],
    mustNotInclude: ["MyApplicationsClient"],
    label: "个人中心独立于我的星图并使用个人资料管理页面",
  },
  {
    file: "src/lib/track.ts",
    mustInclude: ["track", "events", "Analytics must never block product actions"],
    mustNotInclude: ["throw", "console.info"],
    label: "v4 埋点方法存在且不阻塞产品动作",
  },
  {
    file: "supabase/migrations/20260704020000_events_tracking.sql",
    mustInclude: ["create table if not exists public.events", "events_insert_own", "events_select_admin_all"],
    mustNotInclude: ["service_role"],
    label: "v4 events 埋点迁移存在",
  },
  {
    file: "supabase/migrations/20260714120000_production_debug_repairs.sql",
    mustInclude: ["create table if not exists public.status_history", "create table if not exists public.reports", "create table if not exists public.events", "create table if not exists public.resume_ai_rate_events", "take_resume_ai_rate_slot", "pg_advisory_xact_lock", "status_history_select_own", "events_insert_own", "reports_insert_own", "set comment_count =", "strip_application_tracking_params", "array[U&'\\5176\\4ED6']::text[]"],
    mustNotInclude: ["drop table", "delete from public.user_applications", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "生产补齐迁移以幂等方式恢复状态历史、埋点、举报、AI 限流和数据一致性",
  },
  {
    file: "supabase/migrations/20260722120000_raise_resume_ai_rate_limit.sql",
    mustInclude: ["take_resume_ai_rate_slot", "interval '10 minutes'", "active_count >= 15", "pg_advisory_xact_lock", "grant execute", "authenticated"],
    mustNotInclude: ["drop table", "service_role", "grant execute on function public.take_resume_ai_rate_slot() to anon"],
    label: "简历导入、润色与翻译共用的用户级 AI 限额提升为每十分钟 15 次",
  },
  {
    file: "supabase/migrations/20260704030000_security_audit_followup.sql",
    mustInclude: [
      "set search_path = public, pg_temp",
      "forum_posts_select_public",
      "forum_posts_insert_own",
      "forum_posts_update_own",
      "forum_comments_insert_own",
      "char_length(content) <= 5000",
      "duplicate_rank > 1",
      "user_applications_user_job_unique",
    ],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "service_role"],
    label: "v6 安全跟进迁移加固 is_admin、论坛策略和投递唯一性",
  },
  {
    file: "src/components/forum/PostCard.tsx",
    mustInclude: ["AnimatePresence", "motion.article", "useReducedMotion", "aria-expanded={expanded}", "aria-controls={contentId}", "onClick={onToggle}", "发布于 {formatDateTime(post.created_at)}", "重点推荐", "设为重点", "取消重点", "setPostPinned", "isAdmin", "data-pinned={post.is_pinned}", "编辑内容", "保存修改", "updatePost", "拾星官方", "阅读全文"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "createComment", "toggleLike", "发布评论", "<Drawer open={expanded}"],
    label: "拾星指南原位展开并只向管理员提供内容维护操作",
  },
  {
    file: "src/lib/forum.ts",
    mustInclude: ["fetchForumAuthors", "author_role", "/api/forum/authors", "role === \"admin\"", "拾星官方"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "匿名用户***"],
    label: "拾星指南在客户端只保留管理员发布内容",
  },
  {
    file: "src/app/api/forum/authors/route.ts",
    mustInclude: ["createAdminClient", "MAX_AUTHORS_PER_REQUEST", ".eq(\"role\", \"admin\")", "拾星官方"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"],
    label: "指南作者接口只从服务端确认管理员身份而不开放用户资料表",
  },
  {
    file: "src/components/auth/LoginForm.tsx",
    mustInclude: ["账号或邮箱", "normalizeLoginAccount", "@preset.starjob.space"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"],
    label: "登录页支持五位预设账号并映射到内部认证邮箱",
  },
  {
    file: "scripts/provision_preset_accounts.mjs",
    mustInclude: ["SUPABASE_SERVICE_ROLE_KEY", "auth.admin.createUser", "email_confirm: true", "preset_account", "@preset.starjob.space"],
    mustNotInclude: ["gTpigTHK", "bnFbmOHn", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"],
    label: "预设账户脚本从外部 CSV 幂等创建确认账户且不提交明文密码",
  },
  {
    file: "src/app/api/admin/forum/pin/route.ts",
    mustInclude: ["auth.getUser", "profile?.role !== \"admin\"", "只有管理员可以设置指南重点内容", "is_pinned"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", ".update({ is_pinned: false })", ".neq(\"id\", input.postId)"],
    label: "指南重点接口服务端复核管理员身份且允许多篇内容同时突出",
  },
  {
    file: "src/app/api/admin/forum/posts/route.ts",
    mustInclude: ["getAdminUser", "profile?.role !== \"admin\"", "createAdminClient", "GUIDE_CATEGORIES", "只有管理员可以发布指南内容", "export async function POST", "export async function PATCH", "export async function DELETE"],
    mustNotInclude: ["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "display_name", "forum_comments", "forum_likes"],
    label: "指南发布编辑删除由受保护的管理员 API 执行",
  },
  {
    file: "supabase/migrations/20260714200000_forum_to_guide_center.sql",
    mustInclude: ["delete from public.forum_posts", "profile.role = 'admin'", "delete from public.forum_likes", "delete from public.forum_comments", "delete from public.reports", "'公告', '教程', '分享'", "enforce_guide_admin_author", "forum_posts_insert_admin", "forum_posts_update_admin", "forum_posts_delete_admin_only"],
    mustNotInclude: ["drop table", "profiles_select_public", "service_role"],
    label: "论坛转指南迁移清理普通用户内容和互动并把写权限收紧到管理员",
  },
  {
    file: "supabase/migrations/20260713193000_forum_admin_pinning.sql",
    mustInclude: ["protect_forum_post_pinning", "public.is_admin()", "forum_posts_pinned_created_at_idx", "Only administrators can change forum pinning"],
    mustNotInclude: ["using (true)\nwith check", "delete from public.forum_posts", "create unique index"],
    label: "论坛置顶迁移阻止普通用户篡改且不限制同时置顶数量",
  },
  {
    file: "supabase/migrations/20260704040000_job_categories.sql",
    mustInclude: ["add column if not exists job_categories", "jobs_job_categories_gin_idx", "normalize_job_categories_from_titles", "教师类", "咨询类"],
    mustNotInclude: ["drop column", "service_role"],
    label: "岗位类别迁移新增数组字段、索引和现有数据回填",
  },
  {
    file: "browser-extension/starjob-resume-assistant/manifest.json",
    mustInclude: ["\"manifest_version\": 3", "\"version\": \"0.1.9\"", "\"activeTab\"", "\"scripting\"", "\"storage\"", "https://www.starjob.space/extension*", "https://www.starjob.space/*"],
    mustNotInclude: ["\"cookies\"", "\"tabs\"", "<all_urls>", "localhost", "nowcoder", "牛客"],
    label: "拾星网申助手使用 Manifest V3 和用户触发的最小权限",
  },
  {
    file: "browser-extension/starjob-resume-assistant/fill.js",
    mustInclude: ["fillMode === \"overwrite\"", "analysisOnly", "aiFieldMappings", "createFieldKey", "toAnalysisField", "getExplicitRecordNumber", "getRepeatableOccurrenceKey", "takeNextOccurrenceIndex", "isUsableRecordIndex(normalizedRecordIndex, matchedDefinition)", "isUsableRecordIndex(containerRecordIndex, matchedDefinition)", "\"工作职责\"", "\"职责描述\"", "\"主要工作\"", "\"工作业绩\"", "\"工作成果\"", "[\"描述\", \"description\"].includes(normalizedAlias)", "definition.section !== sectionHint", "recordNumberMaps", "recordContainerMaps", "inferSectionHint", "hasMultipleRecordHeadings", "inferPairedDateKey", "tryExactDatePickerSelection", "findActiveDatePickerPanel", "awards.title", "awards.description", "duplicateAdjacentAnchor", "anchorKeys", "deterministicConfidence", "sensitiveTerms", "input[type='file']", "dispatchEvents", "data-starjob-filled", "manual += 1", "education.description", "certifications.title"],
    mustNotInclude: [".submit()", ".click()", "SUPABASE_SERVICE_ROLE_KEY", "document.cookie", "chrome.cookies"],
    label: "网申填写只处理可核对字段且不读取 Cookie 或自动提交",
  },
  {
    file: "browser-extension/starjob-resume-assistant/sync-bridge.js",
    mustInclude: ["ALLOWED_ORIGINS", "\"READY\"", "\"PONG\"", "SYNC_RESUMES", "chrome.storage.local.set", "4_500_000", "matchTokenExpiresAt", "aiMatchingAvailable", "SYNC_COMPLETE"],
    mustNotInclude: ["localhost", "localStorage", "document.cookie", "fetch("],
    label: "扩展仅接收拾星来源并把有限简历数据保存在浏览器本地",
  },
  {
    file: "src/app/api/resume/extension-profile/route.ts",
    mustInclude: ["auth.getUser", ".eq(\"user_id\", user.id)", ".limit(20)", "photoDataUrl: \"\"", "createExtensionMatchToken", "aiMatchingAvailable", "matchTokenExpiresAt", "Cache-Control", "no-store"],
    mustNotInclude: ["createAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"],
    label: "扩展同步接口只返回当前登录用户的去照片简历",
  },
  {
    file: "src/app/api/resume/extension-match/route.ts",
    mustInclude: ["verifyExtensionMatchToken", "MIMO_API_KEY", "MIMO_BASE_URL", "MIMO_MODEL", "REQUEST_TIMEOUT_MS", "RATE_LIMIT", "CANONICAL_KEYS", "max_tokens", "response_format", "json_object", "deterministicKey", "不包含输入框现有值", "不得把姓名映射为学校", "区块是硬边界", "awards.title", "awards.description", "resultSchema", "Cache-Control", "no-store"],
    mustNotInclude: ["createAdminClient", "SUPABASE_SERVICE_ROLE_KEY", "document.cookie", "resume.content"],
    label: "扩展智能匹配只上传字段元数据并校验令牌、频率和标准字段键",
  },
  {
    file: "src/lib/extension-match-token.ts",
    mustInclude: ["server-only", "createHmac", "timingSafeEqual", "TOKEN_SCOPE", "TOKEN_TTL_MS", "EXTENSION_MATCH_TOKEN_SECRET"],
    mustNotInclude: ["NEXT_PUBLIC_", "console.log", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "扩展智能匹配使用短期受限令牌且签名密钥保持服务端",
  },
  {
    file: "browser-extension/starjob-resume-assistant/popup.js",
    mustInclude: ["正在读取可见表单字段", "analysisOnly", "aiOnly", "extension-match", "matchToken", "智能复核", "SMART_MATCH_TIMEOUT_MS", "SMART_MATCH_MAX_FIELDS = 12", "deterministicConfidence", "AbortController", "立即填写", "后台复核", "aiFieldMappings", "CONFIRM_WINDOW_MS", "再次点击，确认覆盖并填写", "再次点击确认清除", "unmatchedFields", "friendlyFillError", "扩展与当前页面的连接已失效"],
    mustNotInclude: ["MIMO_API_KEY", "MIMO_BASE_URL", "MIMO_MODEL", "SUPABASE_SERVICE_ROLE_KEY", "document.cookie"],
    label: "扩展按字段提取、智能匹配、逐项填写和未填整理四阶段执行",
  },
  {
    file: "browser-extension/starjob-resume-assistant/popup.html",
    mustInclude: ["assets/wordmark.png", "alt=\"拾星\"", "网申助手", "本地读取简历 · 最终由你提交", "一键填写当前页面", "处理进度", "modeHint", "unmatchedDetails", "footer-main-actions", "aria-hidden=\"true\""],
    mustNotInclude: ["<svg", "emoji"],
    label: "扩展弹窗使用拾星品牌与单层任务流结构",
  },
  {
    file: "browser-extension/starjob-resume-assistant/popup.css",
    mustInclude: ["html {", "width: 380px", "body {", "width: 100%", "overflow-x: hidden", ".mode-group label:has(input:checked)", ".mode-hint[data-tone=\"warning\"]", ".result-details", ".result-panel", ".progress-panel", "min-height: 36px", "prefers-reduced-motion"],
    mustNotInclude: ["width: min(380px, 100vw)", "linear-gradient(135deg"],
    label: "扩展弹窗使用稳定的工具栏视口宽度并保留开放工作面、分隔线和状态色",
  },
  {
    file: "src/components/extension/ExtensionHubClient.tsx",
    mustInclude: ["<span className=\"block\">一份简历，</span>", "<span className=\"block\">投向更多可能</span>", "调用拾星网申工具填写常用字段。你只需检查后提交。", "starjob-resume-assistant-iphone17pm.png", "iPhone 17 Pro Max", "获取安装包", "安装后刷新检测", "window.location.reload()", "LEGACY_COMPATIBLE_VERSION = \"0.1.7\"", "0.1.7 可继续同步与填写；需要新版描述识别时可升级 0.1.9", "最新版本 0.1.9", "https://pan.baidu.com/s/13sk2UUdep9S1zoJdEk_sSA?pwd=SXZS"],
    mustNotInclude: ["一份简历，投向更多可能", "常见网申字段按页面顺序填入", "你只需检查，再决定提交", "简历写一次，网申少重复", "请升级到 0.1.8", "extensionVersion !==", "starjob-resume-assistant-popup.png", "https://pan.baidu.com/s/1jl_OHVc_HxXbUrI1-IS56g?pwd=SXZS", "https://pan.baidu.com/s/1z815NaU8NRArpswkEAiU3w?pwd=SXZS", "https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS", "https://pan.baidu.com/s/18t2FPlnjktr3zTG9eE1k2g?pwd=SXZS", "https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS", "https://pan.baidu.com/s/11xaueV0f0D_pFt_czk_MHw?pwd=SXZS"],
    label: "网申助手首屏使用更克制的价值表达与带灵动岛的设备实机展示",
  },
  {
    file: "src/components/extension/ExtensionGuide.tsx",
    mustInclude: ["https://pan.baidu.com/s/13sk2UUdep9S1zoJdEk_sSA?pwd=SXZS", "百度网盘提取码：SXZS", "最新版本 0.1.9", "0.1.7 仍可继续同步和填写，不强制重装", "返回拾星并同步简历", "安装后刷新检测", "步骤 {String(index + 1).padStart(2, \"0\")}"],
    mustNotInclude: ["https://pan.baidu.com/s/1jl_OHVc_HxXbUrI1-IS56g?pwd=SXZS", "https://pan.baidu.com/s/1z815NaU8NRArpswkEAiU3w?pwd=SXZS", "https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS", "https://pan.baidu.com/s/18t2FPlnjktr3zTG9eE1k2g?pwd=SXZS", "https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS", "https://pan.baidu.com/s/11xaueV0f0D_pFt_czk_MHw?pwd=SXZS"],
    label: "网申助手下载页与安装教程共用最新百度网盘地址",
  },
  {
    file: "scripts/build_resume_extension.mjs",
    mustInclude: ["Manifest V3", "manifest.permissions.includes(\"cookies\")", "public", "downloads", "manifest.version", "拾星网申助手-v${manifest.version}.zip"],
    mustNotInclude: ["SUPABASE_SERVICE_ROLE_KEY", "accounts.csv", "password"],
    label: "扩展安装包可复现生成并在打包时复核权限边界",
  },
  {
    file: "scripts/build_resume_extension_dev.mjs",
    mustInclude: ["starjob-resume-assistant-local", "http://localhost:3000", "http://127.0.0.1:3000", "本地测试", "LOCAL-TEST.txt"],
    mustNotInclude: ["public/downloads", "拾星网申助手-v0.1.9.zip", "SUPABASE_SERVICE_ROLE_KEY"],
    label: "本地扩展构建单独放宽 localhost 且不覆盖正式发布包",
  },
  {
    file: "src/app/robots.ts",
    mustInclude: ["disallow: [\"/api/\"]", "sitemap: `${SITE_URL}/sitemap.xml`", "host: SITE_URL"],
    mustNotInclude: ["/login", "/admin", "/profile"],
    label: "robots 公开站点地图并只拦截无搜索价值的 API",
  },
  {
    file: "src/app/sitemap.ts",
    mustInclude: ["/explore", "/forum", "/guide", "/extension/guide", "isJobOpenForSearch", "/jobs/${job.id}"],
    mustNotInclude: ["/admin", "/login", "/profile", "/resume", "/api"],
    label: "网站地图只收录公开页面和仍然有效的岗位详情",
  },
  {
    file: "src/app/jobs/[id]/page.tsx",
    mustInclude: ["alternates: { canonical }", "application/ld+json", "buildJobPosting", "isJobOpenForSearch", "summary_large_image"],
    mustNotInclude: ["@type\": \"JobPosting\""],
    label: "岗位详情提供 canonical、分享信息和单页 JobPosting",
  },
  {
    file: "src/app/admin/layout.tsx",
    mustInclude: ["index: false", "follow: false"],
    mustNotInclude: [],
    label: "管理后台统一禁止搜索引擎收录",
  },
  {
    file: "docs/seo/starjob-guide-drafts-2026-07-19.md",
    mustInclude: ["待审核，未发布", "2027 届秋招什么时候开始", "秋招岗位信息在哪里找", "网申简历怎么填写", "校招投递进度怎么管理", "应届生简历怎么写", "网申助手安全吗", "如何避免错过秋招截止时间"],
    mustNotInclude: [],
    label: "七篇搜索指南作为未公开草稿等待产品审核",
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
  "public/assets/extension/starjob-resume-assistant-popup.png",
  "public/assets/extension/starjob-resume-assistant-iphone17pm.png",
  "public/downloads/starjob-resume-assistant-v0.1.9.zip",
  "browser-extension/starjob-resume-assistant/assets/icon16.png",
  "browser-extension/starjob-resume-assistant/assets/icon48.png",
  "browser-extension/starjob-resume-assistant/assets/icon128.png",
  "browser-extension/starjob-resume-assistant/assets/wordmark.png",
  "public/assets/nebula/nebula-region.png",
  "public/assets/nebula/nebula-industry.png",
  "public/assets/nebula/nebula-batch.png",
  "public/assets/nebula/nebula-captured.png",
  "public/assets/nebula/nebula-role-fork.png",
  "public/assets/nebula/nebula-role-triad.png",
  "public/assets/nebula/nebula-role-crescent.png",
  "public/assets/nebula/nebula-role-spiral.png",
  "public/assets/nebula/nebula-role-cross.png",
  "public/assets/nebula/nebula-role-ring.png",
  "public/assets/nebula/nebula-region-shenzhen.png",
  "public/assets/nebula/nebula-region-guangzhou.png",
  "public/assets/nebula/nebula-region-chengdu.png",
  "public/assets/nebula/nebula-region-national.png",
  "public/assets/nebula/nebula-industry-manufacturing.png",
  "public/assets/nebula/nebula-industry-consumer.png",
  "public/assets/nebula/nebula-industry-healthcare.png",
  "public/assets/nebula/nebula-industry-energy.png",
  "public/assets/nebula/cutouts/nebula-role-fork.png",
  "public/assets/nebula/cutouts/nebula-role-triad.png",
  "public/assets/nebula/cutouts/nebula-role-crescent.png",
  "public/assets/nebula/cutouts/nebula-role-spiral.png",
  "public/assets/nebula/cutouts/nebula-role-cross.png",
  "public/assets/nebula/cutouts/nebula-role-ring.png",
  "public/assets/nebula/cutouts/nebula-region-shenzhen.png",
  "public/assets/nebula/cutouts/nebula-region-guangzhou.png",
  "public/assets/nebula/cutouts/nebula-region-chengdu.png",
  "public/assets/nebula/cutouts/nebula-region-national.png",
  "public/assets/nebula/cutouts/nebula-industry-manufacturing.png",
  "public/assets/nebula/cutouts/nebula-industry-consumer.png",
  "public/assets/nebula/cutouts/nebula-industry-healthcare.png",
  "public/assets/nebula/cutouts/nebula-industry-energy.png",
];
const REQUIRED_TEXT = {
  "/": ["拾星"],
  "/explore": ["岗位坐标", "正在加载岗位"],
  "/my": ["投递管理", "当前阶段"],
  "/profile": ["个人中心"],
  "/feedback": ["反馈", "告诉我们您的建议与反馈，这对我们非常重要", "问题类型", "发送反馈"],
  "/bottle": ["星瓶"],
  "/resume": ["简历制作"],
  "/galaxy": ["岗位星系", "地区星系", "行业星系"],
  "/galaxy/region": ["地区星系", "北京星云", "上海星云"],
  "/galaxy/industry": ["行业星系", "互联网星云", "金融星云"],
  "/jobs": ["岗位坐标", "正在加载岗位"],
  "/login": ["正在打开登录"],
  "/forum": ["拾星指南"],
  "/extension": ["一份简历，", "投向更多可能", "调用拾星网申工具填写常用字段", "获取安装包", "正在检测扩展"],
  "/extension/guide": ["安装拾星网申助手", "加载已解压的扩展", "同步简历"],
  "/admin": ["管理后台"],
};

const FORBIDDEN_COPY = [
  "接递引力核心",
  "投递引力核心",
  "重新读取",
  "发送信号",
  "岗位星体观测",
  "本季沉淀",
  "拒绝和放弃为终止状态",
  "截止待补充",
  "已打开官网",
];

function collectFiles(directoryUrl) {
  const entries = readdirSync(directoryUrl, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directoryUrl);
    if (entry.isDirectory()) return collectFiles(entryUrl);
    if (!entry.isFile()) return [];
    return [entryUrl];
  });
}

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

async function checkSecurityProbe(env) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const smokeEmail = env.SMOKE_USER_EMAIL;
  const smokePassword = env.SMOKE_USER_PASSWORD;
  if (!url || !key) throw new Error("缺少 Supabase URL 或 publishable key");

  const anonymous = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleData, error: roleError } = await anonymous
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", "00000000-0000-0000-0000-000000000000")
    .select("id");
  if (!roleError && (roleData ?? []).length > 0) {
    throw new Error("安全探针失败：匿名用户实际修改了 profiles.role");
  }

  const logoPath = `smoke/anonymous-${Date.now()}.txt`;
  const { error: uploadError } = await anonymous.storage
    .from("company-logos")
    .upload(logoPath, new Blob(["smoke"], { type: "text/plain" }), { upsert: false });
  if (!uploadError) {
    throw new Error("安全探针失败：匿名用户可以上传 company-logos");
  }

  const { data: foreignApplications, error: foreignReadError } = await anonymous
    .from("user_applications")
    .select("id")
    .eq("user_id", "00000000-0000-0000-0000-000000000000");
  if (foreignReadError) {
    throw new Error(`安全探针失败：匿名读取投递记录返回错误 ${foreignReadError.message}`);
  }
  if ((foreignApplications ?? []).length !== 0) {
    throw new Error("安全探针失败：匿名用户读取到了他人的 user_applications");
  }

  if (!smokeEmail || !smokePassword) {
    console.log("✓ 安全探针通过：匿名提权、匿名 logo 上传、匿名跨用户投递读取均被拒绝；登录重复 upsert 探针因未配置 SMOKE_USER_EMAIL/PASSWORD 已跳过");
    return;
  }

  const authenticated = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signIn, error: signInError } = await authenticated.auth.signInWithPassword({
    email: smokeEmail,
    password: smokePassword,
  });
  if (signInError || !signIn.user) {
    throw new Error(`安全探针失败：测试用户登录失败 ${signInError?.message ?? ""}`.trim());
  }

  const { data: job, error: jobError } = await authenticated
    .from("jobs")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();
  if (jobError || !job) {
    throw new Error(`安全探针失败：无法读取测试岗位 ${jobError?.message ?? ""}`.trim());
  }

  const payload = {
    user_id: signIn.user.id,
    job_id: job.id,
    status: "opened",
  };
  const first = await authenticated
    .from("user_applications")
    .upsert(payload, { onConflict: "user_id,job_id" })
    .select("id");
  if (first.error) throw new Error(`安全探针失败：首次 upsert 失败 ${first.error.message}`);

  const second = await authenticated
    .from("user_applications")
    .upsert(payload, { onConflict: "user_id,job_id" })
    .select("id");
  if (second.error) throw new Error(`安全探针失败：重复 upsert 失败 ${second.error.message}`);

  const { count, error: countError } = await authenticated
    .from("user_applications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", signIn.user.id)
    .eq("job_id", job.id);
  if (countError) throw new Error(`安全探针失败：重复 upsert 计数失败 ${countError.message}`);
  if (count !== 1) throw new Error(`安全探针失败：重复 upsert 后记录数为 ${count}`);

  console.log("✓ 安全探针通过：匿名写入被拒、跨用户读取为 0、重复 upsert 仅保留一行");
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

  const copyScanRoots = ["src/", "docs/handoff/"].map((path) => new URL(path, ROOT));
  const sourceFiles = copyScanRoots
    .filter((url) => existsSync(url) && statSync(url).isDirectory())
    .flatMap((url) => collectFiles(url))
    .filter((url) => /\.(tsx?|md|css)$/.test(url.pathname));

  for (const fileUrl of sourceFiles) {
    const source = readFileSync(fileUrl, "utf8");
    for (const text of FORBIDDEN_COPY) {
      if (source.includes(text)) {
        throw new Error(`${fileUrl.pathname.replace(ROOT.pathname, "")} 仍包含下线文案：${text}`);
      }
    }
  }
  console.log("✓ 下线文案未在源码与交接文档中残留");
}

function checkBottleGeometryProbe() {
  const width = 512;
  const centerX = width / 2;
  const mainTopY = 300;
  const mainBottomY = 582;
  const statusWeight = {
    rejected: 0,
    withdrawn: 0,
    opened: 1,
    applied: 1,
    written_test: 2,
    first_round: 2,
    second_round: 2,
    final_round: 2,
    offer: -1,
  };
  const statuses = ["opened", "applied", "written_test", "first_round", "second_round", "final_round", "offer", "rejected", "withdrawn"];

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function jitter(hash, shift, amount) {
    return (((hash >>> shift) % 1000) / 999 - 0.5) * amount;
  }

  function smooth(value) {
    const t = Math.max(0, Math.min(1, value));
    return t * t * (3 - 2 * t);
  }

  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  function getBottleMainHalfWidth(y) {
    if (y < mainTopY || y > mainBottomY) return 0;
    if (y < 334) return lerp(54, 128, smooth((y - mainTopY) / 34));
    if (y < 390) return lerp(128, 166, smooth((y - 334) / 56));
    if (y < 528) return 166;
    return lerp(166, 128, smooth((y - 528) / 54));
  }

  function getBottleSafeRadius(size, status) {
    const bodyRadius = size / 2;
    const glowRadius = status === "offer" ? size * 0.34 : status === "rejected" || status === "withdrawn" ? 3 : size * 0.22;
    return bodyRadius + glowRadius + 3;
  }

  function isPointInsideBottleMainCavity(x, y) {
    const halfWidth = getBottleMainHalfWidth(y);
    if (halfWidth <= 0) return false;
    return Math.abs(x - centerX) <= halfWidth;
  }

  function isBottleCircleInsideMainCavity(x, y, radius) {
    if (y - radius < mainTopY || y + radius > mainBottomY) return false;
    const samples = [
      [0, 0],
      [radius, 0],
      [-radius, 0],
      [0, radius],
      [0, -radius],
      [radius * 0.72, radius * 0.72],
      [radius * 0.72, -radius * 0.72],
      [-radius * 0.72, radius * 0.72],
      [-radius * 0.72, -radius * 0.72],
    ];
    return samples.every(([dx, dy]) => isPointInsideBottleMainCavity(x + dx, y + dy));
  }

  function getBottleMainHorizontalRange(y, radius) {
    const halfWidth = getBottleMainHalfWidth(y);
    if (halfWidth <= 0) return null;
    const min = centerX - halfWidth + radius;
    const max = centerX + halfWidth - radius;
    if (min >= max) return null;
    return { min, max };
  }

  function rowCapacity(row) {
    return Math.max(7, 14 - Math.floor(row * 0.35));
  }

  function getApplicationBottleSize(application, total) {
    const ended = application.status === "rejected" || application.status === "withdrawn";
    if (total > 60) {
      if (application.status === "offer") return 10;
      return ended ? 7 : 9;
    }
    if (total <= 10) {
      if (application.status === "offer") return 26;
      return ended ? 13 : 20;
    }
    if (total <= 30) {
      if (application.status === "offer") return 20;
      return ended ? 10 : 15;
    }
    return ended ? 8 : 12;
  }

  function getRowY(row, total) {
    const step = total > 60 ? 23 : 27;
    return 552 - row * step;
  }

  function isClearOfPlacedStars(x, y, safeRadius, placedStars) {
    return placedStars.every((star) => {
      const minDistance = safeRadius + star.safeRadius + 4;
      const dx = x - star.x;
      const dy = y - star.y;
      return dx * dx + dy * dy >= minDistance * minDistance;
    });
  }

  function findStableBottlePosition(hash, safeRadius, total, rowOccupancy, placedStars) {
    const maxRows = 22;
    for (let row = 0; row < maxRows; row += 1) {
      const y = getRowY(row, total);
      const range = getBottleMainHorizontalRange(y, safeRadius);
      if (!range) continue;
      const rangeWidth = range.max - range.min;
      const capacity = Math.max(1, Math.min(rowCapacity(row), Math.floor(rangeWidth / Math.max(26, safeRadius * 2 + 4))));
      const occupied = rowOccupancy.get(row) ?? 0;
      if (occupied >= capacity) continue;
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const col = (occupied + attempt * 3 + (hash % capacity)) % capacity;
        const slotWidth = rangeWidth / capacity;
        const baseX = range.min + slotWidth * (col + 0.5);
        const x = baseX + jitter(hash, attempt + 3, 4);
        const yJittered = y + jitter(hash, attempt + 13, 2);
        if (
          isBottleCircleInsideMainCavity(x, yJittered, safeRadius) &&
          isClearOfPlacedStars(x, yJittered, safeRadius, placedStars)
        ) {
          rowOccupancy.set(row, occupied + 1);
          return { x, y: yJittered, row };
        }
      }
      const fallbackX = range.min + rangeWidth * 0.5;
      if (
        isBottleCircleInsideMainCavity(fallbackX, y, safeRadius) &&
        isClearOfPlacedStars(fallbackX, y, safeRadius, placedStars)
      ) {
        rowOccupancy.set(row, occupied + 1);
        return { x: fallbackX, y, row };
      }
    }
    throw new Error("星瓶几何探针无法找到合法落位");
  }

  for (const count of [7, 30, 80]) {
    const applications = Array.from({ length: count }, (_, index) => ({
      id: `smoke-bottle-star-${String(index + 1).padStart(2, "0")}`,
      status: statuses[index % statuses.length],
      applied_at: `2026-07-${String((index % 24) + 1).padStart(2, "0")}T08:00:00Z`,
    })).sort((a, b) => {
      const statusDelta = (statusWeight[a.status] ?? 1) - (statusWeight[b.status] ?? 1);
      if (statusDelta !== 0) return statusDelta;
      return new Date(a.applied_at).getTime() - new Date(b.applied_at).getTime();
    });

    const rowOccupancy = new Map();
    const placedStars = [];
    const positions = applications.map((application) => {
      const size = getApplicationBottleSize(application, count);
      const safeRadius = getBottleSafeRadius(size, application.status);
      const point = findStableBottlePosition(hashString(application.id), safeRadius, count, rowOccupancy, placedStars);
      const position = { ...application, size, safeRadius, ...point };
      placedStars.push(position);
      return position;
    });

    const invalid = positions.filter((position) => !isBottleCircleInsideMainCavity(position.x, position.y, position.safeRadius));
    if (invalid.length > 0) {
      throw new Error(`星瓶几何探针失败：${count} 颗场景 ${invalid.map((item) => item.id).join(", ")} 越界`);
    }

    const neckStops = positions.filter((position) => position.y < mainTopY + position.safeRadius);
    if (neckStops.length > 0) {
      throw new Error(`星瓶几何探针失败：${count} 颗场景 ${neckStops.map((item) => item.id).join(", ")} 停在瓶颈`);
    }

    for (let outer = 0; outer < positions.length; outer += 1) {
      for (let inner = outer + 1; inner < positions.length; inner += 1) {
        const a = positions[outer];
        const b = positions[inner];
        const minDistance = a.safeRadius + b.safeRadius + 4;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        if (dx * dx + dy * dy < minDistance * minDistance) {
          throw new Error(`星瓶几何探针失败：${count} 颗场景 ${a.id} 与 ${b.id} 重叠`);
        }
      }
    }

    console.log(`✓ 星瓶几何探针通过：${count} 颗测试星全部位于主腔安全区域且互不重叠`);
  }
}

async function checkCategoryProbe() {
  const typescript = await import("typescript");
  const source = readFileSync(new URL("src/lib/categories.ts", ROOT), "utf8");
  const transpiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(transpiled).toString("base64");
  const categories = await import(`data:text/javascript;base64,${encoded}`);

  const first = categories.normalizeJobCategories("软件研发类, 硬件工程类").categories;
  const second = categories.normalizeJobCategories("市场类（包含商分 战略）").categories;
  const third = categories.normalizeJobCategories("教师").categories;

  if (first.join(",") !== "软件研发类,硬件工程类") {
    throw new Error(`岗位类别探针失败：复合类别输出为 ${first.join(",")}`);
  }
  if (second.join(",") !== "市场类") {
    throw new Error(`岗位类别探针失败：括号注释类别输出为 ${second.join(",")}`);
  }
  if (third.join(",") !== "教师类") {
    throw new Error(`岗位类别探针失败：教师别名输出为 ${third.join(",")}`);
  }

  const fixedJobs = [
    categories.normalizeJobCategories("软件研发类, 硬件工程类").categories,
    categories.normalizeJobCategories("产品类").categories,
    categories.normalizeJobCategories("教师").categories,
    categories.normalizeJobCategories("市场类（包含商分 战略）").categories,
  ];
  const singleCount = fixedJobs.filter((jobCategories) =>
    categories.jobMatchesSelectedCategories(jobCategories, ["产品类"]),
  ).length;
  const dualCount = fixedJobs.filter((jobCategories) =>
    categories.jobMatchesSelectedCategories(jobCategories, ["软件研发类", "教师类"]),
  ).length;

  if (singleCount !== 1) throw new Error(`岗位类别探针失败：单类别筛选返回 ${singleCount}`);
  if (dualCount !== 2) throw new Error(`岗位类别探针失败：双类别筛选返回 ${dualCount}`);

  console.log("✓ 岗位类别探针通过：归一化和单/双类别筛选结果符合预期");
}

async function checkLocationProbe() {
  const typescript = await import("typescript");
  const source = readFileSync(new URL("src/lib/locations.ts", ROOT), "utf8");
  const transpiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const encoded = Buffer.from(transpiled).toString("base64");
  const locations = await import(`data:text/javascript;base64,${encoded}`);

  if (!locations.matchesLocationFilter("成都", "province:四川")) throw new Error("地点探针失败：四川未匹配成都");
  if (locations.matchesLocationFilter("上海", "province:四川")) throw new Error("地点探针失败：四川错误匹配上海");
  if (!locations.matchesLocationFilter("北京 上海 成都", "city:成都")) throw new Error("地点探针失败：市级成都未匹配多地点岗位");
  if (!locations.matchesLocationFilter("全国 海外", "scope:nationwide")) throw new Error("地点探针失败：全国范围未匹配全国岗位");
  if (locations.matchesLocationFilter("上海", "scope:nationwide")) throw new Error("地点探针失败：全国范围错误匹配上海岗位");

  const groups = locations.buildLocationGroups(["全国", "四川", "成都", "上海", "深圳", "宿迁等"]);
  const sichuan = groups.find((group) => group.province === "四川");
  const jiangsu = groups.find((group) => group.province === "江苏");
  if (!sichuan?.cities.includes("成都")) throw new Error("地点探针失败：四川城市层级缺少成都");
  if (!jiangsu?.cities.includes("宿迁")) throw new Error("地点探针失败：模糊值宿迁等未归一化");

  console.log("✓ 地点层级探针通过：全国、省级、市级及多地点匹配符合预期");
}

async function checkResumeFontProbe() {
  const typescript = await import("typescript");
  const compilerOptions = {
    module: typescript.ModuleKind.ES2022,
    target: typescript.ScriptTarget.ES2022,
  };
  const coverageSource = readFileSync(new URL("src/generated/resumeFontCommonCoverage.ts", ROOT), "utf8");
  const coverageModule = typescript.transpileModule(coverageSource, { compilerOptions }).outputText;
  const coverageUrl = `data:text/javascript;base64,${Buffer.from(coverageModule).toString("base64")}`;
  const resumeStub = "export const isEnglishResumeTemplate = (id) => id === 'english_classic' || id === 'english_modern';";
  const resumeStubUrl = `data:text/javascript;base64,${Buffer.from(resumeStub).toString("base64")}`;
  const profileSource = readFileSync(new URL("src/lib/resume-font-profile.ts", ROOT), "utf8")
    .replace("@/generated/resumeFontCommonCoverage", coverageUrl)
    .replace("@/lib/resume", resumeStubUrl);
  const profileModule = typescript.transpileModule(profileSource, { compilerOptions }).outputText;
  const profileUrl = `data:text/javascript;base64,${Buffer.from(profileModule).toString("base64")}`;
  const profile = await import(profileUrl);

  const sampleResume = {
    templateId: "compact",
    targetRole: "产品经理实习生",
    jobTarget: "互联网产品方向",
    content: {
      basics: { name: "王小星", englishName: "Stella Wang", phone: "138 0000 0000", email: "stella@example.com", city: "上海", linkedin: "", github: "", website: "", targetRole: "产品经理实习生" },
      education: [], work: [], projects: [], skills: [], campus: [], awards: [], certifications: [], languages: [], customSections: [],
    },
  };

  if (profile.selectResumeDocumentFontProfile(sampleResume) !== "common") throw new Error("简历字体探针失败：默认简历未选择 common");
  if (profile.selectResumeFontProfile("ASCII 123，。！？") !== "common") throw new Error("简历字体探针失败：ASCII 或常用标点未选择 common");
  if (profile.selectResumeFontProfile("\n\t\r") !== "common") throw new Error("简历字体探针失败：控制空白触发了 full");
  if (profile.selectResumeFontProfile("龘") !== "full") throw new Error("简历字体探针失败：子集外汉字未选择 full");
  if (profile.selectResumeFontProfile("😀") !== "full") throw new Error("简历字体探针失败：代理对未按 code point 选择 full");

  const fontFiles = [
    "NotoSerifSC-Regular-common-v1.ttf",
    "NotoSerifSC-Bold-common-v1.ttf",
    "NotoSerifSC-Regular-full-v1.ttf",
    "NotoSerifSC-Bold-full-v1.ttf",
  ].map((name) => new URL(`public/fonts/resume/${name}`, ROOT));
  for (const fontFile of fontFiles) {
    if (!existsSync(fontFile) || statSync(fontFile).size === 0) throw new Error(`简历字体探针失败：字体缺失 ${fontFile.pathname}`);
  }
  if (statSync(fontFiles[0]).size >= statSync(fontFiles[2]).size || statSync(fontFiles[1]).size >= statSync(fontFiles[3]).size) {
    throw new Error("简历字体探针失败：common 字体未小于 full 字体");
  }

  console.log("✓ 简历字体探针通过：common/full 选择、Unicode 遍历和四个版本化字体均正常");
}

async function checkResumeImportProbe() {
  const typescript = await import("typescript");
  const compilerOptions = {
    module: typescript.ModuleKind.ES2022,
    target: typescript.ScriptTarget.ES2022,
  };
  const resumeSource = readFileSync(new URL("src/lib/resume.ts", ROOT), "utf8");
  const resumeModule = typescript.transpileModule(resumeSource, { compilerOptions }).outputText;
  const resumeUrl = `data:text/javascript;base64,${Buffer.from(resumeModule).toString("base64")}`;
  const resumeRuntime = await import(resumeUrl);
  const importSource = readFileSync(new URL("src/lib/resume-import.ts", ROOT), "utf8")
    .replace("@/lib/resume", resumeUrl);
  const importModule = typescript.transpileModule(importSource, { compilerOptions }).outputText;
  const importer = await import(`data:text/javascript;base64,${Buffer.from(importModule).toString("base64")}`);
  const translationSource = readFileSync(new URL("src/lib/resume-translation.ts", ROOT), "utf8")
    .replace("@/lib/resume", resumeUrl);
  const translationModule = typescript.transpileModule(translationSource, { compilerOptions }).outputText;
  const translator = await import(`data:text/javascript;base64,${Buffer.from(translationModule).toString("base64")}`);
  const sourceText = `王小星
求职意向：产品经理实习生
13800000000 stella@example.com https://github.com/stella

教育背景
复旦大学 | 信息管理与信息系统 | 本科 | 2023.09 - 2027.06 | GPA 3.8/4.0

工作经历
拾星科技 | 产品实习生 | 上海 | 2025.06 - 2025.09
- 参与岗位管理需求梳理，整理用户反馈。
- 协助验证投递流程。

项目经历
秋招信息助手 | 产品负责人 | 2025.01 - 2025.05
- 设计岗位筛选原型并完成测试。

专业技能
产品：用户访谈、Figma、SQL

荣誉奖项
校级一等奖学金`;
  const parsed = importer.parseResumeTextLocally(sourceText, "王小星-产品简历.pdf");
  if (parsed.draft.language !== "zh-CN") throw new Error(`简历导入探针失败：中文简历语言识别为 ${parsed.draft.language}`);
  if (parsed.draft.basics.name !== "王小星") throw new Error(`简历导入探针失败：姓名为 ${parsed.draft.basics.name}`);
  if (parsed.draft.basics.email !== "stella@example.com") throw new Error("简历导入探针失败：邮箱未识别");
  if (parsed.draft.basics.phone !== "13800000000") throw new Error("简历导入探针失败：手机号未识别");
  if (parsed.draft.targetRole !== "产品经理实习生") throw new Error("简历导入探针失败：求职意向未识别");
  if (parsed.draft.education.length !== 1 || parsed.draft.work.length !== 1 || parsed.draft.projects.length !== 1) {
    throw new Error("简历导入探针失败：教育、工作或项目区块未保持独立");
  }
  const document = importer.createResumeFromImport(parsed.draft);
  if (!document.id || document.content.work[0]?.company !== "拾星科技" || document.content.projects[0]?.name !== "秋招信息助手") {
    throw new Error("简历导入探针失败：拾星简历结构转换异常");
  }
  const englishText = `Stella Wang
Target Role: Product Manager Intern
stella@example.com https://github.com/stella

Education
Fudan University | Bachelor | Information Systems | 2023.09 - 2027.06

Work Experience
StarJob | Product Intern | Shanghai | 2025.06 - 2025.09
- Collected user feedback and supported product requirement analysis.
- Validated the application tracking workflow with the engineering team.

Projects
Graduate Recruitment Assistant | Product Lead | 2025.01 - 2025.05
- Designed the job filtering prototype and completed usability testing.

Skills
Product: User Research, Figma, SQL`;
  const englishParsed = importer.parseResumeTextLocally(englishText, "Stella-Wang-Resume.pdf");
  if (englishParsed.draft.language !== "en-US") throw new Error(`简历导入探针失败：英文简历语言识别为 ${englishParsed.draft.language}`);
  const englishDocument = importer.createResumeFromImport(englishParsed.draft);
  if (englishDocument.templateId !== "english_classic") throw new Error("简历导入探针失败：英文简历未分配英文模板");
  if (resumeRuntime.getResumeTemplatesForLanguage("zh-CN").length !== 6 || resumeRuntime.getResumeTemplatesForLanguage("en-US").length !== 2) {
    throw new Error("简历语言探针失败：中英文模板集合不正确");
  }

  document.content.basics.photoDataUrl = "data:image/png;base64,private-photo";
  document.content.basics.linkedin = "linkedin.com/in/private-profile";
  const translatable = translator.createResumeTranslationSource(document);
  const serializedSource = JSON.stringify(translatable);
  if (serializedSource.includes("private-photo") || serializedSource.includes("private-profile") || serializedSource.includes("stella@example.com") || serializedSource.includes("13800000000")) {
    throw new Error("简历翻译探针失败：联系方式、照片或链接进入 AI 翻译载荷");
  }
  const translatedDraft = structuredClone(translatable);
  translatedDraft.title = "Stella Wang · Product Resume";
  translatedDraft.targetRole = "Product Manager Intern";
  translatedDraft.basics.targetRole = "Product Manager Intern";
  translatedDraft.work[0].title = "Product Intern";
  translatedDraft.work[0].bullets = translatedDraft.work[0].bullets.map((_, index) => `Translated work bullet ${index + 1}`);
  const translatedDocument = translator.createResumeFromTranslation(document, translatedDraft, "en-US");
  if (translatedDocument.id === document.id || translatedDocument.templateId !== "english_classic" || translatedDocument.linkedJobId !== null) {
    throw new Error("简历翻译探针失败：译本未生成独立英文模板副本");
  }
  if (translatedDocument.content.basics.phone !== document.content.basics.phone || translatedDocument.content.basics.photoDataUrl !== document.content.basics.photoDataUrl) {
    throw new Error("简历翻译探针失败：精确联系方式或照片未在本地副本中保留");
  }
  console.log("✓ 简历导入与翻译探针通过：语言识别、模板分配、隐私载荷和独立译本转换正常");
}

async function checkApplicationUrlProbe() {
  const typescript = await import("typescript");
  const source = readFileSync(new URL("src/lib/application-url.ts", ROOT), "utf8");
  const transpiled = typescript.transpileModule(source, {
    compilerOptions: {
      module: typescript.ModuleKind.ES2022,
      target: typescript.ScriptTarget.ES2022,
    },
  }).outputText;
  const urlTools = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString("base64")}`);
  const cleaned = urlTools.sanitizeApplicationUrl("https://jobs.example.com/apply?CLICK_ID=secret&job=42&cid=legacy#form");
  if (cleaned !== "https://jobs.example.com/apply?job=42#form") {
    throw new Error(`投递链接探针失败：清洗结果为 ${cleaned}`);
  }
  console.log("✓ 投递链接探针通过：CID/click_id 已移除且其他参数与锚点保留");
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

async function checkSeoEndpoints(baseUrl) {
  const robotsResponse = await fetchWithRetry(`${baseUrl}/robots.txt`);
  const robots = await robotsResponse.text();
  if (!robotsResponse.ok || !robots.includes("Sitemap: https://www.starjob.space/sitemap.xml") || !robots.includes("Disallow: /api/")) {
    throw new Error("SEO 探针失败：robots.txt 未正确声明 sitemap 或 API 抓取规则");
  }

  const sitemapResponse = await fetchWithRetry(`${baseUrl}/sitemap.xml`);
  const sitemap = await sitemapResponse.text();
  if (!sitemapResponse.ok || !sitemap.includes("https://www.starjob.space/explore") || sitemap.includes("https://www.starjob.space/admin")) {
    throw new Error("SEO 探针失败：sitemap.xml 缺少公开页面或混入私密页面");
  }

  const loginResponse = await fetchWithRetry(`${baseUrl}/login`);
  const loginHtml = await loginResponse.text();
  if (!loginHtml.includes('name="robots" content="noindex, nofollow"')) {
    throw new Error("SEO 探针失败：登录页缺少 noindex, nofollow");
  }

  const jobMatch = sitemap.match(/https:\/\/www\.starjob\.space\/jobs\/([^<]+)/);
  if (jobMatch) {
    const jobResponse = await fetchWithRetry(`${baseUrl}/jobs/${jobMatch[1]}`);
    const jobHtml = await jobResponse.text();
    if (!jobHtml.includes('rel="canonical" href="https://www.starjob.space/jobs/') || !jobHtml.includes('"@type":"JobPosting"')) {
      throw new Error("SEO 探针失败：岗位详情缺少 canonical 或 JobPosting");
    }
  }

  console.log("✓ SEO 探针通过：robots、sitemap、私密页 noindex 与岗位结构化数据正常");
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
      if (response.ok && html.includes("拾星")) return candidate;
    } catch {
      // Keep trying the next likely local server.
    }
  }
  return null;
}

async function main() {
  const env = { ...process.env, ...readEnvFile() };
  await checkSupabase(env);
  await checkSecurityProbe(env);
  checkSourceInvariants();
  checkBottleGeometryProbe();
  await checkCategoryProbe();
  await checkLocationProbe();
  await checkResumeImportProbe();
  await checkResumeFontProbe();
  await checkApplicationUrlProbe();

  const reusableServer = await findReusableServer();
  if (reusableServer) {
    console.log(`✓ 复用已有本地站点：${reusableServer}`);
    await checkPages(reusableServer);
    await checkSeoEndpoints(reusableServer);
    console.log("✓ 冒烟检查通过");
    return;
  }

  const port = await getOpenPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  rmSync(new URL(".next/dev", ROOT), { recursive: true, force: true });
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
    await checkSeoEndpoints(baseUrl);
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
