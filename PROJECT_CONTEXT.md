# PROJECT_CONTEXT.md — 秋招星瓶 (Job Bottle)

## 2026-09-06 首页、性能、网申助手与反馈改动统一发布候选（待推送）

- 用户目标：把前面已在本地验证、但尚未上线的产品改动统一发布，包括首页轻量转场与太阳系配色、岗位列表性能、网申助手演示与网申前准备、真实 0.2.8 popup、以及管理员反馈解决按钮。
- 发布边界：纳入网站源码、公开的 `public/downloads/starjob-resume-assistant-v0.2.8.zip`、扩展源码和相关回归测试；不纳入未跟踪的 PRD、`promo-video/` 或浏览器夹具之外的本地宣传/探索材料。真实 Chrome Web Store 上架不等同于网站安装包上线，本次只发布网站可下载包与官网入口。
- 兼容边界：不新增 Supabase migration/RLS/DDL，不写入用户数据，不改变真实扩展的敏感字段、验证码、密码、自动提交禁止规则；网申前准备仍绑定当前 `ResumeDocument`，可以跳过，不阻断正常填写。首页贴图实验已回退，不发布行星贴图资源、土星环或额外纹理请求。
- 发布前验证：`node --test scripts/tests/motion-performance.test.mjs` 8/8；`npm test` 166/166；`npm run lint` 0 errors、保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`npm run build:extension` 与 `npm run verify:extension-package` 通过；`git diff --check` 通过。`npm run test:extension` 在当前机器因 Chrome 未输出页面内容仍未作为通过证据。
- Git、部署与外部状态：当前改动仍在本地 `main` 工作区，尚未生成本轮发布提交、推送或触发 Vercel；待与 `origin/main` 的 favicon 提交安全合并后发布。正式站点、线上缓存、登录态网申填写和 Chrome Web Store 状态在发布完成前不宣称已验证。

## 2026-09-06 首页转场改为轻量目标星球淡出（本地已验证，未部署）

- 用户目标：试用方案 3，取消首页点击后的十字星全屏放大；保留星系首页，让目标星球轻微强调、其余内容淡出，再由新页面轻微上移淡入。
- 决策：不删除首页、不新增动画库、不使用全屏 `blur` / `backdrop-filter`；转场只使用 `opacity`、`transform` 和已有 Motion，点击后等待 180ms 让目标星球完成轻微强调再导航。首页直接跳工作台时不再调用 `markSceneDeparture`，避免额外触发深色全屏 arrival veil；其他 scene 页面原有导航仍保留自己的到达处理。
- 实际改动：`src/components/galaxy/SpaceHome.tsx` 删除 `PlanetTransitionOverlay` 和中心十字星遮罩，改为 `selectedPlanetId` + `isLeaving` 状态；点击目标星球放大至 1.08、其他星球降至 0.94/0.16 透明度，轨道线、中心星和顶部品牌轻量淡出，保留 `router.prefetch` 与登录跳转逻辑。`src/components/galaxy/FloatingPlanet.tsx` 增加目标态并把选中反馈限制在小行星组件内；`src/components/layout/RouteContentTransition.tsx` 启用已有 `pageVariants` 的 `opacity: 0 → 1`、`y: 8 → 0` 页面进入；删除不再使用的 `PlanetTransitionOverlay.tsx` 及对应 CSS；同步更新动效测试和 smoke 契约。
- 性能与兼容边界：不引入 canvas、GSAP、Lottie、持续 `requestAnimationFrame` 或整页动态模糊；动画主要落在合成友好的透明度和变换，reduced-motion 下直接导航。数据库、Supabase、简历、网申助手、权限和其他 scene 路由不变。
- 验证：定向动效测试 7/7；`npm test` 165/165；`npm run lint` 0 errors，保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；本地生产服务 `http://127.0.0.1:3110/` 实际点击“简历制作”后进入 `/resume`，截图确认没有十字星遮罩且目标页面正常呈现；`git diff --check` 通过。
- Git、部署与外部状态：修改继续保留在当前 `main` 工作区，未提交、未推送、未部署；本地 3110 预览已重启并保留首页检查点。

## 2026-09-06 首页太阳系配色与求职主路径重排（本地已验证，未部署）

- 用户目标：继续保留星系首页，但重新安排首页应该承载的内容；参考太阳系为星球增加可辨认的低饱和配色，并让用户一眼看懂“找岗位 → 做简历 → 网申 → 管理投递”的主路径。
- 决策：不砍首页，也不把首页改成信息卡片工作台。中心星球作为太阳；第一层轨道放“岗位坐标、简历制作”，第二层放“投递管理、网申助手”，外层放“星瓶、拾星指南”；登录/资料保留在右上角，不再重复占用一个轨道位。首页底部增加极轻的“发现机会 · 准备材料 · 安全网申”提示，提供动线解释但不制造新的卡片和请求。
- 实际改动：`src/lib/planet-routes.ts` 新增真实的 `网申助手` `/extension` 行星并按四层轨道重新编排；`src/components/galaxy/SpaceHome.tsx` 移除轨道内重复的登录星球、补充网申助手移动端位置和主路径提示；`src/components/galaxy/FloatingPlanet.tsx` 为网申助手和星瓶补充图标/配色映射；`src/components/galaxy/CorePlanet.tsx` 将中心材质改为太阳金色；`src/components/visual/OrbMaterial.tsx` 将岗位、网申、投递、简历、星瓶、指南和登录/管理员分别映射为地球青蓝、天王星青色、火星红、土星沙金、木星琥珀、海王星蓝紫和月面灰；`src/components/galaxy/planet-visuals.ts`、`MobilePlanetList.tsx` 同步扩展网申助手视觉类型和映射；同步补充动效测试与首页 smoke 契约。
- 性能与兼容边界：配色只使用现有 CSS radial-gradient、box-shadow、opacity/transform 和已有图标，不新增图片、canvas、动画库、持续 `requestAnimationFrame`、网络请求或 Supabase 读写；轨道仍由最多四条 CSS 同心线承载，移除一个重复账号星球后首页 DOM 更少。所有真实路由、登录回跳、简历、网申助手、投递数据和权限语义保持不变。
- 验证：`node --test scripts/tests/motion-performance.test.mjs` 8/8；`npm test` 166/166；`npm run lint` 0 errors，保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`git diff --check` 通过。重启本地生产服务 `http://127.0.0.1:3110/` 后截图确认中心太阳、分层轨道和多色行星已生效；浏览器实际从首页到达 `/extension` 并确认“拾星网申助手”页面可用，随后恢复首页检查点。
- Git、部署与外部状态：修改继续保留在当前 `main` 工作区，未提交、未推送、未部署；没有写入 Supabase。真实设备的 FPS、登录态云端数据和线上 CDN 缓存仍未在本轮宣称通过；当前本地生产预览为 `http://127.0.0.1:3110/`。

## 2026-09-06 首页真实行星贴图试用后回退（本地已验证，未部署）

- 用户反馈：尝试成熟行星贴图后，视觉观感偏“塑料”，要求回退成原来的首页材质。
- 决策：撤销本轮贴图实验，不保留真实表面图、土星环或贴图资源；保留上一轮已经确认的太阳系色彩映射、首页主路径和轻量转场。首页继续使用现有 CSS radial-gradient、box-shadow 和图标材质，避免因为追求写实而失去拾星的品牌感。
- 实际回退：从 `src/components/visual/OrbMaterial.tsx` 移除 `textureSrc`、贴图背景层和贴图 data attribute；从 `CorePlanet.tsx` 移除太阳贴图；从 `FloatingPlanet.tsx` 移除土星环和星瓶试验图标；移除 `public/assets/space/planets/` 下本轮下载的贴图与 README；同步删除贴图专用测试和 smoke 断言。此前的 `OrbMaterial` 太阳系低饱和配色和首页内容重排不回退。
- 性能与兼容边界：本轮最终不新增图片请求、静态资源、依赖、WebGL、运行时纹理处理或数据库行为；首页恢复到贴图前的资源负担。Solar System Scope 贴图仅作为设计评估材料，不进入产品发布包。
- 验证：`node --test scripts/tests/motion-performance.test.mjs` 8/8；`npm test` 166/166；`npm run lint` 0 errors，保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`git diff --check` 通过。重启 `http://127.0.0.1:3110/` 后截图确认真实贴图和土星环已消失，上一版 CSS 行星配色仍在。
- Git、部署与外部状态：修改继续保留在当前 `main` 工作区，未提交、未推送、未部署；没有写入 Supabase。当前 localhost 已重启并停留在首页检查点。

## 2026-09-06 网申助手演示二次收紧与流程入口强化（本地已验证，未部署）

- 用户目标：把网申前准备归属到网申助手 section 内，先选择本次使用的简历，再可选补充基本资料和经历；针对用户截图继续缩小网页演示中的插件面板字号，同时让“体验使用流程”入口在首屏明显可见。
- 决策：简历制作顶层只维护 `ResumeDocument`；`/extension` 内的准备流程先确定简历来源，后续基本信息、教育/实习/工作、项目和技能检查都绑定当前简历，跳过准备不阻断正常填写。演示仅模拟视觉和交互，不替代真实扩展的 AI 请求、字段安全判断或提交边界。
- 实际改动：`src/components/extension/ExtensionPreparation.tsx`、`src/components/resume/ApplicationPrepPanel.tsx` 和 `ExtensionHubClient.tsx` 完成选择简历、保存与同步当前简历；`browser-extension/starjob-resume-assistant/sync-bridge.js` / `popup.js` 保留并展示网页端选中的简历，AI 文案明确只使用当前简历；`browser-extension/starjob-resume-assistant/popup.css` 修复主按钮继承浏览器默认 16px 的问题，收紧真实 popup；`src/components/extension/ExtensionDemoDialog.tsx` 将网页演示 Chrome popup 从 304px 收窄到 278px，继续降低标题、说明、简历卡、模式按钮、主按钮和安全文案字号，并单独将“选择拾星简历”设为 8px、三种填写方式设为 7px、主操作文字设为 9px，保留标准四色 Chrome logo、实习字段和 2.6 秒 AI 分析序列；`ExtensionHubClient.tsx` 将“体验使用流程”改为蓝色主按钮并置于安装教程之前；测试补充面板宽度、四个操作文字字号和入口样式断言。排查发现网页演示字号异常的根因是 `src/app/globals.css` 中未分层的 `button, input, textarea, select { font: inherit; }` 覆盖了 Tailwind 的 `text-[7px]`、`text-[9px]` 和 `font-medium`，导致浏览器实际计算仍是 16px/400；已将该控件重置移入 `@layer base`，让局部字号和字重真正生效。
- 兼容边界：不新增数据库、migration、RLS、API 或第二套简历；云端仍复用现有 `resumes` 读写，本地仍复用现有简历存储。真实 popup 的 AI 分析流程不被演示动画替换；演示没有持续循环、`requestAnimationFrame` 或重型滤镜，reduced-motion 下跳过等待直接展示结果。
- 验证：`npm run typecheck` 通过（由生产 build 内 TypeScript 检查覆盖）；根因修复前浏览器计算样式为模式按钮 16px/400/24px、高 58px，修复后为 7px/500/10.5px、高 20.5px；主按钮实际为 9px/500/13.5px、高 25.5px，确认不是浏览器缩放或 `devicePixelRatio` 问题。`npm test` 165/165；`npm run lint` 0 errors，保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`npm run build:extension` 成功生成 `public/downloads/starjob-resume-assistant-v0.2.8.zip`（173203 bytes）；`git diff --check` 通过。`http://127.0.0.1:3110/extension` 已实际完成“首屏明显入口 → 打开插件 → 选择简历 → AI 分析 → 填写完成”，浏览器截图和 computed-style 检查确认网页演示面板已收窄至 278px、入口为蓝色主按钮、操作字不再被全局样式放大；DOM 验证了 10 个字段、6 个空白项、三段分析状态和 6 个字段结果。真实设备 FPS、登录态云端保存和真实 Chrome/ATS 填写仍是独立验收项。
- Git、部署与外部状态：所有修改继续保留在当前 `main` 工作区，未提交、未推送、未部署，未写入 Supabase；当前本地生产预览为 `http://127.0.0.1:3110/extension`。

## 三文档不可绕过死命令（2026-08-09 起）

**死命令：任何代码、组件、样式、路由、API、类型、脚本、migration / RLS / DDL、数据库或外部数据写入、数据源或导入规则、环境变量、自动化、依赖、产品或视觉决策、测试、Git、部署、回滚、风险边界或验证证据只要发生变化，都必须在同一工作会话内同时、等量更新 `PROJECT_CONTEXT_FINAL.md`、`PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md`。三份任一漏写、内容不一致或缺少证据时，禁止暂存、提交、推送、部署、宣称完成或交接。后续代理无权跳过、弱化、延期、改成单文档记录，也不得用聊天记录、代码注释、提交信息或其他文档替代。**

## 2026-09-06 浏览器 favicon 改为拾星黑色文字标（已上线）

- 用户目标：解决浏览器标签仍显示 Vercel 默认图标的问题，改为白底、带圆角边框的黑色“拾星”文字 Logo。
- 根因与决策：`src/app/icon.png`、`src/app/apple-icon.png` 与 `src/app/favicon.ico` 原先使用星瓶图标，正式站缓存或路由未命中时会回退到默认图标；沿用现有拾星文字 Logo 源素材，保留抗锯齿透明边缘并重绘为近黑色，生成白色圆角卡片和浅灰边框，同时覆盖 Next 图标路由与传统 favicon 路由。
- 实际改动：更新 `src/app/icon.png`（512×512）、`src/app/apple-icon.png`（180×180）和 `src/app/favicon.ico`（16/32/48 多尺寸），均为白底、浅灰圆角边框、黑色“拾星”文字标；未改页面布局、业务逻辑或登录流程。
- 兼容边界：只替换浏览器图标资源，不改变品牌正文 Logo、manifest、Open Graph 图片、数据库、API、认证、用户数据、并行开发中的其他源码或环境变量；主工作区并行修改保持不动。
- 验证：资源格式与尺寸检查通过；生成图视觉检查通过；`npm run typecheck` 通过；`npm test` 155/155；`npm run lint` 0 错误，保留 `scripts/seed_official_referral_sources.mjs:44` 的既有 1 条 warning；`npm run build -- --webpack` 成功生成 62 个路由；`git diff --check` 通过。正式站 `https://www.starjob.space/login?release_check=f56fc42` 的 HTML 已同时引用 `/favicon.ico`、`/icon.png` 和 `/apple-icon.png`，三个资源均返回 HTTP 200，新图标 hash 与本地构建一致。
- 发布与当前状态：提交 `f56fc42` 已推送到 `origin/main` 并由 Vercel 正式部署；线上资源最后更新时间为 2026-09-06 07:41 UTC。主工作区并行修改保持不动，未执行数据库写入或 migration。

## 2026-09-06 favicon 圆角透明角修正（本地待发布）

- 用户反馈：浏览器标签中白色图标仍呈方块，圆角边框在深色标签栏上不可见。
- 根因与实际改动：原图标以不透明白色填满整个画布，圆角仅为内部描边；现将 512×512、180×180 和多尺寸 favicon 的画布四角改为透明，白色圆角牌面缩进约 7%，保留黑色“拾星”文字与浅灰边框。
- 兼容边界：仅调整 favicon 资源，不改页面、业务、数据库、API、认证或并行开发中的源码。
- 验证与状态：透明角像素和资源格式检查通过，视觉检查通过；改动位于 `codex/favicon-wordmark` 本地分支，尚未推送或部署。

每次三文档记录至少写明：日期、用户目标、根因/决策、实际改动文件与行为、兼容边界、验证命令和结果、提交与部署证据（如有）、已确认和未确认的外部状态。若本次只完成诊断而没有修改，也必须在三份文档中同步写清“零修改/零部署”及诊断证据。

## 2026-09-06 管理员反馈解决状态（本地未部署）

- 用户目标：在反馈管理中加入“解决反馈”按钮；解决状态只对管理员可见，普通用户不能看到反馈是否已解决。
- 决策：复用现有 `feedback_submissions.resolved_at` 字段，不新增 migration、RLS、DDL 或第二套状态；管理员通过同一路径的受保护 `PATCH /api/admin/feedback` 写入解决时间，操作使用当前管理员会话客户端，数据库在写入时再次复核管理员权限。
- 实际改动：`src/app/api/admin/feedback/route.ts` 新增 UUID 校验、管理员鉴权、幂等的解决写入与状态返回；`src/lib/admin-feedback.ts` 新增 `resolveAdminFeedback`；`src/components/admin/AdminFeedbackClient.tsx` 在未解决反馈行加入“解决反馈”按钮，保存后刷新列表和待处理/已处理统计。普通 `/api/feedback` 与 `createFeedback` 仍只返回提交成功和反馈 ID，不返回 `resolved_at`。
- 兼容边界：不改变普通用户提交反馈、网页/小程序来源、反馈内容、搜索筛选、分页和现有后台读取；状态只存在管理员接口和管理员页面中。没有执行数据库写入，没有把解决状态暴露到用户端，也没有新增“撤销解决”行为。
- 验证：新增 `tests/admin-feedback.test.ts`，验证解决写入必须经过 `requireAdminAccess`、使用 caller-scoped Supabase 更新、普通反馈接口不暴露解决字段；`npm test` 159/159；`npm run typecheck` 通过；`npm run lint` 0 errors，保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；本地生产 `/admin/feedback` 返回 200，匿名 GET/PATCH `/api/admin/feedback` 分别返回 401；`git diff --check` 通过。没有管理员真实登录态，因此未宣称真实点击写入和刷新统计的 authenticated E2E 已通过。
- Git、部署与外部状态：修改留在当前 `main` 工作区，未提交、未推送、未部署；没有写入 Supabase。已有性能整改、网申助手演示、PRD、测试夹具和 `promo-video/` 等用户工作区修改保持不动。

## 2026-09-06 网申助手真实 popup 与演示一致化（本地已打包，未部署）

- 用户目标：将真实 Chrome/Chromium 扩展 popup 对齐当前更好看的网申助手演示，并保证真实能力、演示流程和官网最新安装包一致。
- 决策：真实 popup 保留真实的三种填写语义（只填空白项、覆盖已有内容、AI 智能填写）和原有安全边界，以演示面板的 Chrome 视觉为基准：拾星插件图标、当前网申页卡片、简历卡片、圆角白色面板、安全模式、蓝色主操作和“由你检查并提交”提示。演示同步补齐覆盖模式，不再只展示两种填写方式。
- 实际改动：`browser-extension/starjob-resume-assistant/popup.html` / `popup.css` / `popup.js` 重做 popup 结构、颜色、圆角、间距与当前页上下文；popup 只在打开时读取活动标签页标题/路径元数据，不读取表单内容，点击填写仍沿用原有 `fill.js`、跨 iframe、AI 批次和敏感字段防护。`ExtensionDemoDialog.tsx` 将演示面板的填写方式改为与真实 popup 相同的三态。`manifest.json` 升为 0.2.8，官网 `ExtensionHubClient.tsx` / `ExtensionGuide.tsx` 与 README、smoke 契约改指向 0.2.8；生成 `public/downloads/starjob-resume-assistant-v0.2.8.zip` 和 `dist/拾星网申助手-v0.2.8.zip`。
- 兼容边界：未改变网申字段识别、AI 接口、同步协议、权限、自动提交禁止规则、敏感字段边界、数据库、Supabase、网站登录和既有 0.2.5 载荷兼容；没有把演示当成真实填写。0.2.7 及更早版本仍可被网站识别，0.2.8 只新增 popup 视觉与上下文展示。
- 验证：`npm test` 160/160；popup 与演示定向契约 12/12；`npm run typecheck` 通过；`npm run lint` 0 errors、保留 3 条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`npm run build:extension` 生成 171,694 bytes 的 0.2.8 包；`npm run verify:extension-package` 确认官网包与 dist 副本 12/12 文件逐字节一致；`git diff --check` 通过。`npm run test:extension` 在当前机器因 Chrome 未输出页面内容而失败，未把它记为扩展夹具通过，也未将该环境失败归因于 popup 修改。
- 视觉验收：本地静态 popup 预览已显示与演示一致的当前网申页、简历卡片、三态填写按钮、安全提示和 footer；本地生产 `/extension` 重启后实际打开演示并检查到三态按钮。真实 Chrome 加载解压扩展、已登录账户同步和真实网申填写仍是独立验收项。
- Git、部署与外部状态：修改保留在当前 `main` 工作区；尝试暂存时 `.git/index` 返回 `EPERM`，无法安全 commit/push。随后从 `origin/main` 生成只含本次网申助手文件的临时发布目录，但 Vercel CLI 返回“没有现有 credentials”，因此未发布到 Vercel/Chrome Web Store，也没有把临时部署当成正式上线。0.2.8 安装包已在工作区生成，可在获得仓库或 Vercel 发布凭据后直接发布。当前本地生产预览为 `http://127.0.0.1:3110/extension`。

## 2026-09-06 网申前准备层与实际扩展提示（本地已验证，未部署）

- 用户目标：在真正开始网申填写前增加一次可选择的基本资料检查，让用户知道补充后会更准确；未填写时不影响正常使用；同时重新梳理简历制作、网申助手与真实扩展之间的用户动线。
- 决策：不重构成第二套简历，也不新建数据库字段。把“网申准备”作为现有简历编辑器中的独立四步章节：基本资料、可选补充、经历检查、使用确认；所有输入直接写回当前 `ResumeDocument`。网申助手首页提供显式入口，准备页始终提供“跳过准备，直接使用网申助手”；没有准备度门槛，扩展仍按原安全策略填写并由用户检查、提交。
- 实际改动：新增 `src/lib/application-prep.ts`，统一计算姓名、手机号、邮箱、城市、目标岗位、出生日期、性别、国籍/地区、期望地点的准备度及教育/经历/项目/技能数量；新增 `src/components/resume/ApplicationPrepPanel.tsx`，在 `ResumeEditor` 增加“网申准备”章节和四步向导，经历卡片可直接跳回已有编辑章节。`src/app/resume/page.tsx` 支持 `?action=prepare`，`ResumeBuilderClient.tsx` 增加桌面/移动入口和版本卡片准备度。`ExtensionHubClient.tsx` 增加网申前准备说明和入口。`/api/resume/extension-profile` 随同步下发同一份准备度摘要，真实 popup 与官网演示在简历卡片下显示“资料准备度”；补充 popup 契约和 `tests/application-prep.test.ts`。
- 兼容边界：复用既有简历编辑、浏览器本地保存、云端同步、扩展同步协议和 `content_json`，不新增 migration、RLS、DDL、Supabase 表、第二套后端或敏感字段采集；不自动填写身份证、户籍、政治面貌、家庭信息、验证码、密码和敏感声明；准备度仅作提示，低准备度不阻止普通填写。现有字段变化仍由简历编辑器、导入、翻译、PDF、扩展和小程序共享同一份简历数据。
- 验证：`npm test` 163/163；准备层、popup 和动效定向测试 15/15；`npm run typecheck` 通过；`npm run lint` 0 errors，保留 3 条既有 warning（promo-video 2 条、seed 脚本 1 条）；`npm run build -- --webpack` 成功生成 62 个路由；`npm run build:extension` 生成 172,670 bytes 的 0.2.8 包；`npm run verify:extension-package` 确认 12/12 个文件与源码逐字节一致；`git diff --check` 通过。
- 体验验收：本地生产 `http://127.0.0.1:3110/resume?action=prepare` 实际落到“网申准备”，四步前进/回退可用，经历卡片可跳回教育编辑；`http://127.0.0.1:3110/extension` 首屏实际显示“先检查一遍网申资料”、准备入口与“可跳过，不会阻止填写”；本地视觉复核未发现新增横向溢出或连续重型动效。真实 Chrome 加载扩展、登录后同步和真实 ATS 填写仍需独立验收。
- Git、部署与外部状态：修改继续保留在当前 `main` 工作区，未提交、未推送、未部署；没有写入 Supabase。`.git/index` 仍曾返回 EPERM，未强行暂存。当前本地生产预览为 `http://127.0.0.1:3110/extension`，扩展安装包已在工作区生成，可在取得发布权限后再发布。

## 2026-09-06 网申准备归属与首页转场诊断（本轮零代码修改）

- 用户目标：评估是否应把网申前准备放入网申助手 section，并判断首页点击行星后的快速放大是否应改为十字星展开转场。
- 诊断与决策：建议将入口和体验归属放到 `/extension`，但继续复用简历的基础信息作为唯一数据源；简历编辑器保留基础字段，不再把网申准备作为另一套顶层工作流。当前首页在点击后 160ms 执行路由跳转，同时叠加行星位移放大、主页整体缩放/淡出、轨道淡出和目标页星幕进入，视觉节奏过快且合成层/绘制任务叠加。建议改为一次性中心十字星展开覆盖：只动画 `transform` 与 `opacity`，不使用全屏 blur、粒子或持续循环；保留预取和 reduced-motion 直接进入。
- 用户动线建议：`/extension` 首屏先展示“网申前准备”，进入后选择简历、补充可选基本信息、检查安全边界，完成或跳过后再同步/打开扩展；popup 仅展示准备度和“可补充、不阻断”的提示。简历与扩展继续共享同一份 `ResumeDocument`。
- 实际改动与验证：本轮只完成代码阅读和设计诊断，没有修改产品代码、测试、依赖、数据库、环境变量、Git 或部署；未执行新的本地转场改动或上线。诊断依据为 `SpaceHome.tsx`、`PlanetTransitionOverlay.tsx`、`OrbMaterial.tsx`、`SceneArrivalVeil.tsx` 和 `src/lib/motion.ts` 的当前实现。

## 2026-09-06 StarJob 性能整改与网申助手体验演示（本地未部署）

- 用户目标：依据用户提供的共享对话和《StarJob-agent-handoff.md》，改善 www.starjob.space 的掉帧、点击迟滞、页面切换和网申助手首次体验；比较 NextOffer 时保留 StarJob 的品牌、数据与业务边界，不删除首页。
- 根因与决策：当前线上探针显示 StarJob 各页面可返回 200，但首页约 0.706 秒、/explore 约 0.751 秒、/my-applications 与 /my-bottle 约 1.36 秒；NextOffer 首次约 0.455 秒、预热后约 0.207 秒，说明网络/服务端等待存在差异，但无法解释内容已加载后的持续掉帧。历史源码证据显示岗位清单会将约 1263 条结果全部保留为 DOM；因此本轮优先处理浏览器主线程、布局和 DOM 数量，不把问题归因于 Vercel + Supabase，也不以删除首页作为方案。
- 实际改动：新增 `@tanstack/react-virtual`；新增 `src/components/jobs/VirtualJobList.tsx`，使用原生 window scroll、稳定岗位 ID、完整高度占位、测量行高和 8 项 overscan，只挂载视口附近岗位；`HomeClient.tsx` 将公开岗位先渲染、认证后并行补齐个人投递/简历/偏好，并收窄 profile 查询字段；`JobCard.tsx` 使用 memo；`RouteContentTransition.tsx` 移除旧页面退出与新页面同时存在的 popLayout 过渡；`WelcomeNotice.tsx` 将非关键认证/公告查询延后到 900ms；`SpaceHome.tsx` 将点击后的路由等待从 720ms 改为 160ms（reduced motion 为 0）；`/extension` 的 `ExtensionHubClient.tsx` 动态加载 `ExtensionDemoDialog.tsx`，新增 `public/assets/extension/starjob-resume-assistant-icon48.png`，以 Chrome 标签栏、地址栏、插件图标、弹出面板、选择简历和“只填空白项 / AI 智能填写”完成真实点击链路；结果页只演示本地字段变化，不执行登录、安装、同步、读取网页或提交。动效复用现有 Motion，仅对小型模拟面板使用短时 transform/opacity cubic-bezier，并尊重 reduced motion。
- 兼容边界：保留连续滚动、筛选、排序、地图定位、浏览器返回位置和真实扩展同步/填写链路；没有改变 Supabase schema、RLS、migration、API、认证、用户数据或首页品牌功能；演示只在用户点击“体验使用流程”后动态载入。更新 `scripts/tests/motion-performance.test.mjs`，不恢复已淘汰的旧 220ms 断言。
- 验证：`npm run typecheck` 通过；`npm test` 159/159；`node --test scripts/tests/motion-performance.test.mjs` 6/6；`npm run lint` 0 errors，保留 `promo-video/src/PromoVideo.tsx` 两条和 `scripts/seed_official_referral_sources.mjs` 一条既有 warning；`npm run build -- --webpack` 成功生成 62 个路由；`git diff --check` 通过。没有执行 `npm run smoke` 的完整页面阶段，因此没有宣称真实浏览器 FPS、认证态 E2E 或设备验收通过。
- 浏览器复核补充：本地生产页 `/explore` 实际显示约 9–27 个岗位行，列表总高度仍约 14–15 万像素；滚动到长列表中段后搜索“腾讯”，结果为 6 条且列表自动回到清单可视区域。`/extension` 的“体验使用流程”已实际完成 4 个动作：点击 Chrome 右上角拾星插件图标、点击“选择拾星简历”、点击“AI 智能填写”、看到 2 个空白字段变为已填并完成关闭；期间未登录、未安装、未同步、未读取网申页、未提交。已接受桌面截图作为视觉复核证据；真实 Chrome/设备验收仍需单独进行。浏览器控制层对长页面滚动存在节流，本轮未将深滚动后的返回位置记为通过证据。
- Git、部署与外部状态：尝试创建 `codex/starjob-performance-rework` 时被当前环境的 `.git` 写权限阻止，改为在现有 `main` 工作区保留未提交修改；已保留原有三份项目文档修改、PRD、测试夹具和 `promo-video/`，没有覆盖或删除。未提交、未推送、未部署，未写入 Supabase；正式线上仍是原版本。

## 2026-09-05 工作区与 Git 风险清理（已完成）

- 用户目标：彻底对齐未完成状态和 Git 风险，清除过往不需要的备份，并整理当前脏工作区。
- 盘点与决策：主工作区原先位于落后 `origin/main` 24 个提交的 `codex/deploy-login-declutter`，同时混有已发布代码的旧版本差异、分阶段暂存、未暂存修改和历史生成物。已先将完整 tracked diff、状态清单和唯一未合并的 `codex/official-referral-100` 提交导出到 `/private/tmp/starjob-workspace-cleanup-20260905/`，再将 tracked 文件精确重置到 `origin/main@b4879a0`；该临时归档可用于恢复，不属于项目工作区或发布内容。
- Git 整理：已移除已合并的 `codex/applied-position-confirmation`、落后的 `main`、未合并但不再保留为本地分支的 `codex/official-referral-100`，以及 7 个失效/临时 worktree（含其 prunable 元数据）；主工作区现已改名为本地 `main` 并跟踪 `origin/main`。未保留任何额外本地分支或失效 worktree。
- Git 对象回收：确认被删除分支的唯一未合并提交已另存为 patch 后，执行 `git reflog expire --expire=now --all` 与 `git gc --prune=now`；复查 `git fsck --unreachable` 无输出，松散对象为 0，未留下不可达 Git 状态。
- 备份清理：已删除 14 个仅由项目历史生成的 `backups/starjob-before-*` 快照目录（包括约 152MB 的完整源码包）；对应版本仍可从 Git 提交历史回退。已将未使用的 `public/assets/login/starjob-login-bottle-frames-v1.png` 与 `.codex-artifacts/` 移到上述临时归档；PRD、ATS 测试夹具等用户材料未删除。
- 兼容边界：本轮不改变产品源码、依赖、环境变量、Supabase schema/RLS/DDL、用户数据、API 或部署；只清理 Git 引用、ignored/生成物和主工作区脏状态。用户材料仍以未跟踪文件保留，后续如需纳入版本控制需单独确认。
- 验证与当前状态：`git reset --hard origin/main`、`git worktree prune` 后，`git worktree list` 仅剩主工作区，`git branch -vv` 仅剩本地 `main` 且与 `origin/main` 同一提交；清理记录随本次文档提交同步到 `main` 后，`git status --short` 无 tracked 修改，仅列出 8 个保留的 PRD/ATS/promo-video 用户材料（`promo-video/` 为本轮盘点后出现，已保留）。未执行产品测试、数据库写入或产品代码部署；生产代码状态保持此前已发布版本。

## 2026-09-05 投递完成确认与实际投递岗位展示（已上线）

- 用户目标：投递管理中不再把招聘岗位方向或“软件研发类、市场类”等岗位分类显示为用户自己的投递岗位；用户从岗位入口打开公司官网、返回拾星后，通过弹窗确认是否完成投递，并可同时填写实际投递的具体岗位。未填写时列表保持为空，之后仍可使用投递详情中已有的“我实际投递的岗位”字段补填。
- 决策与实际改动：`src/components/jobs/ApplyReturnConfirm.tsx` 从页面内确认条升级为复用 `MotionDialog` 的可访问弹窗，新增 160 字以内的可选实际岗位输入；`HomeClient.tsx`、`JobDetailActions.tsx` 与 `GalaxyJobsClient.tsx` 三个官网投递入口统一将确认结果和 `applied_position` 一起保存，并在字段尚未部署时如实提示“投递已记录、岗位暂未同步”。`src/lib/applications.ts` 新增实际岗位清洗与展示函数，只接受用户明确填写的值，不回退到 `job_titles` 或 `job_categories`。
- 投递管理展示：`MyApplicationsClient.tsx` 的公司下方只显示 `applied_position`，空值保留空白行；地点、行业和批次仍作为独立元信息显示，但岗位分类不再作为缺省内容。`ProgressDrawer.tsx` 头部只在已有实际岗位时显示该岗位，不再显示“岗位方向”或招聘标题回退；“我实际投递的岗位”输入停止 700ms 后自动保存、失焦时立即保存，清空也会保存为 `null`，无需点击“保存进度”。自动保存只提交岗位字段，不会把旁边尚未编辑完的流程内容一并落库；失败时保留当前输入并停止循环重试。
- 兼容边界：未改变岗位筛选与后台岗位分类、状态枚举、投递流程节点、认证、RLS、数据库结构、API 路径、依赖、小程序或浏览器扩展；空输入规范化为 `null`，不猜测岗位。沿用现有 `applied_position` 兼容保护：如果生产库仍缺少该字段，只保存可兼容的投递状态且不谎称岗位已保存；正式登录账号的真实保存仍需单独验证。
- 验证：`npm run typecheck` 通过；`npm test` 155/155（含输入防抖与失焦保存源码回归）；`npm run lint` 0 错误，保留 `scripts/seed_official_referral_sources.mjs:44` 的既有 1 条 warning；`npm run build -- --webpack` 在隔离工作树接入现有 `.env.local` 后成功生成 62 个路由。首次构建因隔离工作树缺少 Supabase 公共环境变量而在 `/sitemap.xml` 停止，补充只读环境文件引用后通过，不是源码错误。
- 视觉与冒烟：使用临时 QA 路由检查确认弹窗，桌面 1280×720 为 512×322 居中面板；移动端 390×844 为底部面板，输入和三个动作无横向溢出，临时路由已删除。默认 `npm run smoke` 完成 1263 条开放岗位只读读取、资源与前置源码检查后，仍在历史主题断言处停止，原因是 `src/styles/tokens.css` 不再包含旧值 `--night-3: #564A71`；本轮未修改主题 token，也未把 Smoke 记为完整通过。
- 发布与生产证据：功能提交 `50eb965` 与自动保存提交 `14dc490` 已从隔离分支快进推送到 `origin/main`；GitHub Vercel check 对 `14dc490` 返回 `success / Deployment has completed`，deployment 为 `AAzqTJTjcNYTG6CE3CmsEAq8jD7T`。正式站 `/`、`/explore`、`/galaxy`、`/my` 均返回 HTTP 200，线上 HTML 与客户端资源合并检查已检出“这次投递完成了吗”“实际投递岗位（可选）”“确认已投递”“输入后自动保存”和允许留空文案。
- 数据库与验收边界：正式 Supabase 对 `user_applications?select=applied_position&limit=0` 的匿名只读 schema 探针返回 HTTP 200 / `[]`，确认生产 schema 当前已有 `applied_position`，本轮没有执行 migration 或数据库写入。未修改原有脏工作区；当前没有可用的正式登录测试账号，因此尚未把匿名 schema 探针或页面资源命中当作真实用户“输入→自动保存→刷新回读”的 authenticated E2E 证据。

## 2026-09-02 可编辑星瓶海报与简历教育字段（已上线）

- 用户目标：将分享星瓶海报改为可复用、数据驱动且可编辑的参考海报样式；企业投递过多时折叠展示；为教育背景增加可选学院和本科/硕士字段。
- 实际改动：新增 `src/components/applications/SharePosterEditor.tsx` 与 `shareBottleData.ts`，海报标题、短句、底部寄语、企业展示数量和显示模块可编辑，PNG/PDF 预览与导出共用同一数据模型；`shareBottleCard.ts` 使用当前投递数据生成统计、投递足迹、星瓶、企业清单和二维码。教育字段贯穿 `ResumeEditor`、PDF、导入、翻译、网申助手和小程序兼容结构，均为可选字段，不改变既有数据库 schema。
- 兼容边界：保留现有投递记录、星瓶状态、认证、API、扩展安全边界和 RLS；企业同名投递在海报中合并，超出数量折叠为剩余企业提示；不把个人联系方式、内部 ID 或简历元数据写入分享海报。
- 验证：`npm run typecheck`、`npm run lint`（0 错误，保留既有 seed warning）、`npm test`（152/152）、`npm run build -- --webpack`（62 routes）和 `git diff --check` 通过；`npm run smoke` 通过岗位读取、资源与源码门禁，但在历史 `src/styles/tokens.css` 缺少已淘汰 `--night-3: #564A71` 断言处停止。
- 发布：提交 `1c51ffd` 已 fast-forward 推送至 `origin/main`；Vercel 正式站 `https://www.starjob.space` 已返回 `/bottle`、`/resume` HTTP 200，生产 JS 已检出“编辑我的星瓶海报”“企业展示数量”“学院（可选）”“学历层次（可选）”；本次未执行数据库迁移或数据写入。回退可从 `1c51ffd` 的上一个发布提交 `27cb7df` 恢复，原工作区仍保留既有备份和未提交内容。
- 本地开发说明：旧分支的“正在整理简历”是开发 CSP 缺少 `unsafe-eval` 导致 hydration 未接管；线上 `main` 已包含 `5040422`，正式 CSP 仍未放宽。

## 2026-09-02 岗位列表分页修复（本轮待发布）

- 用户目标：解决网页端岗位列表看起来最多只有 1000 条的问题，确保数据库记录超过 Supabase 单次返回上限时仍能完整展示。
- 根因与决策：网页端 `fetchActiveJobs` 只发起一次未分页查询，Supabase/PostgREST 默认最多返回 1000 条；同步脚本已有分批读取逻辑。本轮采用每页 1000 条、按 `updated_at` 与 `id` 稳定排序、返回不足一页即停止的循环分页，不固定限制为两次请求。
- 实际改动：`src/lib/jobs.ts` 的 `fetchActiveJobs` 增加 `.range(from, from + 999)` 循环并合并各页；新增 `scripts/tests/jobs-pagination.test.mjs`，验证超过 1000 条时继续读取第二页。
- 兼容边界：不改变筛选、排序语义（增加 `id` 作为同时间戳的稳定次序）、岗位详情、同步规则、数据库结构、API、认证或外部数据；当前 1009 条 active 岗位将读取为两批，未来更多记录会自动继续分页。
- 验证：`node --test scripts/tests/jobs-pagination.test.mjs` 1/1；`npm test` 150/150；`npm run typecheck`、`npm run lint` 和 `npm exec next build -- --webpack`（62 个路由）通过；直接读取 Supabase 返回 `Content-Range: 0-999/1009`，确认此前网页端确实被 1000 条上限截断。
- 部署证据：提交待生成，推送至 `origin/main` 后由 Vercel 自动部署；部署完成后需用带提交探针的正式 `/explore` 或 `/api` 请求复核。
- 当前状态：本次分页代码已通过本地验证，尚未提交、推送或部署；工作区其他未提交改动未纳入。

## 2026-09-01 配色回调与首页品牌文字去重（已上线）

- 用户目标：在保留上一轮登录、管理员、星瓶和投递功能的前提下，回调大部分页面配色到原有浅灰、冷白、深蓝气质；统一蓝色层级；将黄色收回为品牌和少量结果强调；移除已有拾星 Logo 旁重复显示的“拾星 · StarJob”。
- 根因与决策：上一轮把暖黄色复用为全局交互色，导致按钮、选中态、轨道、星球、后台图表和登录页局部大面积偏金；本轮恢复冷静的蓝色基础层，采用 #12294E 深蓝、#3567A8 主蓝、#244A7C 中蓝和 #E8EDF4 浅蓝作为统一层级，黄色 #F4C542 仅保留在英文品牌标、Offer/捕获星等语义明确的少量强调。首页/登录左侧已有中文 Logo，因此删除登录页重复眉题文字，保留页面 title、Logo alt 和无障碍语义。
- 实际改动：src/styles/tokens.css、tailwind.config.ts 建立蓝色层级和冷色主题；src/app/globals.css 回调工作区、场景、登录、管理员、按钮、输入、选中态、图表和导航状态；星图、投递、星瓶、机会地图、简历、推荐码、管理员分析等相关组件的硬编码颜色同步到蓝色系统；src/app/login/page.tsx 删除重复的“拾星 · StarJob”。未改变业务逻辑、动画时序或品牌图片资产。
- 兼容边界：不改变登录/注册、管理员权限、计费、来源同步、简历、投递、数据库、API、Supabase schema/RLS/DDL、migration、环境变量或依赖；保留 gold-button 等既有类名，仅调整其视觉为蓝色主按钮，Offer/品牌小元素仍可使用黄色。
- 备份与验证：当前版本文件已备份至 backups/starjob-before-palette-revert-20260901/；npm run typecheck、npm test（149/149）、npm run lint（0 错误，保留既有 seed 脚本 1 个 warning）、npm run build -- --webpack（62 个路由）、git diff --check 均通过；本地登录页桌面预览（1280×720）与移动端预览（390×844）通过，移动端无横向溢出且重复眉题不存在。正式探针 https://www.starjob.space/login?release_check=71ae79b 返回 HTTP 200，页面不再包含 login-page__eyebrow，英文 Logo 返回 HTTP 200、image/png、269459 bytes，v2 星瓶资源返回 HTTP 200、image/png、353404 bytes，线上 CSS 命中 2 秒 login-bottle-frames 规则。首次 Turbopack 本地预览因隔离工作树的 node_modules 跨文件系统 symlink 被拒绝，已切换 Webpack 预览，不是源码错误。
- 当前状态与未确认项：提交 71ae79b 已推送 origin/main 并触发 Vercel 正式部署，正式站点已切换到本轮蓝色配色和品牌文字去重版本；未执行数据库写入或 migration，也未改变认证、API 或业务逻辑。没有正式登录态和真实账户数据验收，因此未宣称认证后端到端通过；主工作区原有未完成改动未覆盖、未删除。

## 2026-09-01 示例简历重复创建修复（已上线）

- 用户目标：解决每次重新登录后多出一份“示例简历”的问题，同时保留未登录访客预览与用户主动创建、编辑、导入和复制简历的能力。
- 根因与决策：`ResumeBuilderClient` 在没有云端简历时自动生成 `createSampleResume()`；退出登录时该示例被保存进访客本地存储，下一次登录时 `adoptLocalResumesForUser` 为访客简历换新 ID 并同步到云端，导致每次登录新增一份。现在示例简历带 `isSample` 预览标记，未编辑的示例不写入本地/云端，也不参与访客认领；旧版本示例按稳定内容特征过滤，避免历史示例继续出现在当前列表和同步链路。
- 实际改动：`src/lib/resume.ts` 增加示例标记、旧示例识别和编辑后转为用户简历的规则；`src/components/resume/ResumeBuilderClient.tsx` 过滤示例同步、过滤云端旧示例，并确保岗位版本和复制操作会生成可保存简历；`src/lib/resume-sync.ts` 将示例标记写入已有 `content_json` 元数据，不新增数据库字段；`tests/resume.test.ts` 增加预览与登录认领回归测试。
- 兼容边界：不改变登录协议、简历表结构、RLS、API 路径、用户主动保存/删除、导入、翻译、岗位版本和小程序简历能力；不自动删除云端历史示例数据，只在用户简历列表与同步入口中安全排除，避免误删用户材料。
- 备份与验证：修复前文件已备份至 `backups/starjob-before-resume-demo-fix-20260901/`；`npm test` 149/149、`npm run typecheck`、`npm run lint`（0 错误，保留既有 seed 脚本 1 个 warning）、`npm run build -- --webpack`（62 个路由）和 `git diff --check` 均通过。本轮未执行数据库写入或 migration。
- 当前状态与未确认项：提交 `6b9a991`（`fix: prevent duplicate sample resumes on login`）已推送 `origin/main` 并在正式站点生效；缓存穿透后的 `/resume?release_check=6b9a991` 返回 HTTP 200，客户端资源命中 `isSample` 隔离逻辑，登录页返回 HTTP 200，新版 Logo 返回 HTTP 200、`image/png`、269459 bytes。该版本未执行数据库写入或 migration；线上历史示例数据没有物理删除，只在当前列表和同步链路中排除。没有正式登录态和真实账户数据验收，因此未宣称真实登录后的浏览器端到端通过；主工作区原有未完成改动保持不动。
## 2026-09-01 星瓶动效提速与管理员界面发布（已上线）

- 用户目标：将星瓶变化动画调整到约 2 秒，并把上一轮管理员工作台深度重构、移动端优化、可折叠诘星计费和双色 StarJob 标识一起上线。
- 决策与实际改动：src/app/globals.css 将登录页 login-bottle-frames 逐帧切换从 8 秒改为 2 秒，保留 8 秒轻微漂浮和 reduced-motion 降级；scripts/tests/motion-performance.test.mjs 增加 2 秒节奏回归断言。双色英文标识改用 Imagen 生成的 public/brand/starjob-wordmark-v1.png，再去除棋盘格并裁去透明留白，最终为 2104×327、RGBA、真实透明背景，Star 使用暖黄色、Job 使用原本的深蓝色，并在字母 O 内加入一颗小型黄色四芒十字星；src/components/brand/StarJobWordmark.tsx 通过图片组件接入。管理员重构保留原权限和业务行为：src/components/layout/AdminShell.tsx 分层导航并折叠“更多工具”，src/app/admin/page.tsx 重做高频入口和低频工具区，src/components/admin/AdminJobTable.tsx 增加移动端岗位卡片，src/app/login/page.tsx、src/components/layout/SiteFooter.tsx 和管理员壳层将英文标识定位到拾星中文标识右下角，并统一登录、页脚、管理员及主要业务视觉为深蓝、黄色和中性灰配色；scripts/smoke_check.mjs 同步新管理员壳层源码契约。
- 兼容边界：未改变登录协议、管理员角色校验、任何管理员路由、按钮动作、API、计费数据读写、Supabase schema/RLS/DDL、migration、环境变量或依赖；仅改变登录星瓶切帧节奏、品牌资产呈现和管理员导航/响应式展示层。图片生成使用现有拾星中文字标作为风格参考，不复制中文字符，不新增第三方运行时。
- 备份与验证：回退备份位于 backups/starjob-before-admin-refactor-20260901/RESTORE.md，包含管理员壳层、管理员首页、岗位表、登录页、页脚和全局样式快照；新增图片 Logo 的回退方式已记录。当前独立干净 main 工作树已通过 npm run typecheck、npm run lint（0 错误，保留既有 seed 脚本 1 个 warning）、node --test scripts/tests/motion-performance.test.mjs（4/4）、npm test（147/147）、npm run build -- --webpack（62 个路由）、git diff --check 和 node --check scripts/smoke_check.mjs。npm run smoke 的只读岗位、资源和源码约束通过，但页面阶段因独立工作树的 node_modules 跨文件系统 symlink 被 Next 16 Turbopack 拒绝，未将页面冒烟记为通过。
- 当前状态与未确认项：提交 8ec5a09（feat: unify StarJob palette and brand lockup）已推送 origin/main；正式站点资源探针已确认登录页 HTTP 200、HTML 引用新 Logo、线上 CSS 命中星瓶逐帧动效规则，/brand/starjob-wordmark-v1.png 返回 HTTP 200、image/png、269459 bytes，/admin 页面壳返回 HTTP 200。该版本未修改数据库、API、认证协议或计费数据。没有管理员真实登录态，因此尚未宣称真实管理员数据展示、移动端真实触控和 FPS 验收通过；当前用户工作区原有未完成 cherry-pick、登录页/全局样式修改、未跟踪 PRD、测试夹具和 .codex-artifacts/ 均未覆盖、未删除。回退到 52c6b26 可恢复本次配色与 Logo 调整前的已发布版本。

## 2026-09-01 登录页星瓶动效修正（已上线）

- 用户目标：让星瓶四帧动画再快一点，并移除插画右侧无法理解的紫色悬浮点。
- 根因与决策：该点是登录页额外渲染的 `login-page__orbit-beacon` 脉冲装饰，不属于星瓶线稿本体；删除该独立装饰及其 keyframes，仅将星瓶切帧由 10 秒调整为 8 秒，保留 8 秒的轻微漂浮，避免增加新的视觉噪音或运行时逻辑。
- 实际改动：`src/app/login/page.tsx` 删除 `.login-page__orbit-beacon` 节点；`src/app/globals.css` 删除对应样式与 `login-beacon-pulse`，将 `.login-page__bottle-frames` 的 `login-bottle-frames` 时长改为 `8s`。未修改官方来源功能、认证流程、数据库、API、其他页面或用户材料。
- 兼容边界：不改变登录路由、表单字段、认证协议、动态 slogan、reduced-motion 降级、星瓶素材和页脚；未执行数据库写入或 migration。
- 验证与外部状态：`git diff --check` 通过；定向动效回归 4/4 通过；`npm run typecheck` 通过；`npm run lint` 0 errors、保留项目既有的 1 条未使用变量 warning；Webpack 生产构建（62 routes）通过；正式 `https://www.starjob.space/login?release_check=06a8439` 返回 HTTP 200，登录页主体不含“欢迎回来”“求职工作台”和 beacon 标记，线上 CSS 命中 `login-bottle-frames` 8 秒且不含 beacon 规则；星瓶素材与 `/api/referrals/source` 均返回 HTTP 200。
- Git、部署与回滚：提交 `06a8439`（`fix: refine login bottle motion`）已推送 `origin/main`，正式站已由 Vercel 自动发布并通过上述缓存穿透探针；回退到 `31ddd36` 可恢复本次调整前的已发布版本，登录页完整基线备份仍保留在 `backups/starjob-before-login-declutter-20260901/RESTORE.md`。

## 2026-09-01 官方来源落库与发布（已上线）

- 用户目标：将已经核验的 27 秋招公开内推码以“拾星小助手整理”官方发布者写入内推码广场，并上线展示；不冒用管理员或普通用户的 `user_id`。
- 根因与决策：既有 `referral_codes.user_id` 强制引用 `auth.users`，且社区记录的审核/举报链路不适合伪造官方身份；因此新增独立 `official_referral_sources` 表，用固定 `publisher_name`、原始平台链接和稳定 `source_key` 表达官方整理来源，API 仅将其映射为可追溯的公开来源行。
- 实际改动：新增 `supabase/migrations/20260901100000_official_referral_sources.sql`（表、唯一来源键、27 批次安全文本、平台/HTTPS/代码格式约束、RLS 公开只读与 service_role 写权限）；新增 `scripts/seed_official_referral_sources.mjs`（严格读取 `DY0VXc3BFTFJUbUhw`/`t3r1vl`/`vdHovb`、只接受实时 27 秋招公司、按 `source_key` 幂等插入/更新）；`/api/referrals/source` 优先读取该表并在表暂不可用时保持已有静态来源回退；内推码广场显示“拾星小助手整理”。
- 兼容边界：不写入 `referral_codes`、不创建虚拟认证用户、不改变社区上传/审核/举报；实时腾讯源仍遇到非 27、空数据、字段/身份变化或无效凭据即零写入；来源码必须有公开 HTTPS 链接并明确包含 27/2027 批次。
- 验证与外部状态：定向来源测试 10/10、全量 `npm test` 147/147、`npm run typecheck`、`npm run lint` 和 Webpack 生产构建（62 routes）通过，`git diff --check` 通过；Supabase dry-run 确认待应用两项迁移，随后已成功应用 `20260830120000_application_position.sql` 与 `20260901100000_official_referral_sources.sql`。官方来源 dry-run 读取严格锁定的实时源得到 961 条源记录、957 条有效 27 秋招岗位、4 条无效行、0 条非 27 行；首次幂等导入新增 43 条，复跑 dry-run 为 existing 43、inserts 0、updates 0、unchanged 43。提交 `82d7f4d` 已推送 `origin/main` 并触发正式部署；缓存穿透后的线上 `GET https://www.starjob.space/api/referrals/source?probe=82d7f4d` 返回 46 条（3 条腾讯文档来源 + 43 条官方公开来源），官方发布者字段均为“拾星小助手整理”；Supabase 匿名只读核验返回 43 条、20 家公司、43 个唯一公司+代码组合。普通无参数接口可能受 300 秒 CDN 缓存影响，缓存刷新后即为同一版本。

## 2026-09-01 登录页减法重排（本地未上线）

- 用户目标：减少登录页拥挤感，删除左侧“求职工作台”和登录态右侧大标题“欢迎回来”，缩小 slogan，并重新安排品牌眉题、说明、表单标签和辅助入口的字号与间距；星瓶逐帧动画略微提速。
- 决策与实际改动：保留现有 split layout、黑色拾星字标、简约线条星瓶和动态 slogan，仅做信息层级减法；`src/app/login/page.tsx` 删除“求职工作台”和底部重复说明，将右侧眉题改为“登录拾星”；`src/components/auth/LoginForm.tsx` 将登录态 h1 改为无障碍保留的隐藏“登录拾星”，删除“欢迎回来”视觉标题，并收紧登录说明；`src/app/globals.css` 缩小 slogan、品牌小字、表单标签、输入框和按钮的尺度，收窄星瓶场景并改善桌面/移动端留白；星瓶切帧从 12 秒调整为 10 秒一轮，漂浮仍为 8 秒。
- 兼容边界：没有改变登录路由、认证协议、账号字段、Supabase schema/RLS/API、导航或业务动作；注册态仍保留可见的“创建拾星账号”；删除的大标题仅从登录态视觉层移除，语义 h1 仍由屏幕阅读器可读取。
- 备份与验证：已将当前本地基线 `cd45458` 涉及的登录页、表单、布局组件、动效组件、全局样式和 smoke 脚本备份至 `backups/starjob-before-login-declutter-20260901/RESTORE.md`；`npm run typecheck`、`npm run lint`、`npm test`（146/146）、`npm run build`（62 个页面）、`npm run smoke` 和 `git diff --check` 均通过。本地浏览器以 1440×900 与 390×844 验收：登录页范围内两处旧标题均消失，登录态视觉 h1 隐藏但语义保留，slogan 桌面为 46.8px、移动端为 32px，星瓶切帧为 `10s`、漂浮为 `8s`，无横向溢出且文案与星瓶安全分离；开发服务器另有本机 Watchpack `EMFILE` 文件句柄警告，但不影响本次页面加载与截图验收。尚未提交、推送或部署，正式站点仍是上一轮已发布版本。

## 2026-09-01 公开内推码导入扩展（本地未上线）

- 用户目标：在已登录的小红书 Safari 会话中核验 27 秋招公开内推码，并补充牛客、力扣等可信公开来源，放入内推码广场对应公司；同时保持 27 批次隔离、来源可追溯和历史数据不被重复写入。
- 检索边界：只使用公开帖子中同时明确出现“27/2027 秋招或校招”和可复制内推码的记录。Safari 读取仅限可见页面、标题、正文、海报和公开链接；没有读取 Cookie、账号凭据、验证码、浏览器存储，也没有绕过登录、验证码或私信限制。二维码-only、无法读出明确代码、要求私聊/付费或仅实习/26 秋招的内容全部排除。
- 当前核验清单：新增 43 条外部公开来源记录，其中小红书 7 条、牛客 34 条、力扣 2 条；覆盖腾讯 OOP3FB5J、立信 EVKM3J/EVKM3S/EVVM3H、网易互娱 shqAig、三一集团 EVVM20/ESVMBJ，以及搜狐畅游、鹰角、九号、拼多多、波克/4399、元戎启行、卓驭、蔚来、天翼云、基恩士、大疆、网易互娱、米哈游、小马智行、小米、腾讯和腾讯音乐等公开来源码。每条记录均保留原始帖子链接、平台、适用岗位说明和 2026-09-01 核验时间；部分来源未公开发布时间，使用前仍需在官方投递页确认有效期。
- 实际改动：新增 `src/lib/referral-external-sources.ts` 与 `tests/referral-external-sources.test.ts`，维护可审计的公开来源清单；`src/app/api/referrals/source/route.ts` 在严格读取腾讯文档 27 秋招源后，按当前实时岗位公司名过滤外部记录，将其作为 `public_post` 虚拟来源行合并并按“公司 + 内推码”去重；`src/lib/referral-codes.ts` 扩展来源字段；`ReferralCodeHub.tsx` 显示平台、来源链接和“来源同步”标记，并隐藏虚拟来源行的无效举报入口。外部来源不写入 `referral_codes`，不伪造用户或数据库 UUID。
- 兼容边界：腾讯文档仍严格锁定 `DY0VXc3BFTFJUbUhw` / `t3r1vl` / `vdHovb`，只接受 27 秋招候选，批次、字段结构、空数据、凭据和同源身份保护任一失败即停止；接口缓存 3 小时。外部码只有在公司仍出现在实时 27 秋招岗位源时才展示，源接口失败不会把外部清单写入数据库。
- 验证：实时腾讯源读取 933 条有效 27 秋招、0 条非 27 行；`npm test` 146/146、`npm run typecheck`、`npm run lint`、`npm run build`（62 routes）和 `git diff --check` 均通过；本地生产 `GET /api/referrals/source` 返回 HTTP 200、46 行（3 条 `tencent_job_link` + 43 条 `public_post`），外部来源字段和去重结果可见。没有执行 Supabase 写入、migration、提交、推送或部署；当前正式站点不会自动出现这些新增码，需明确上线后才会发布。

## 2026-09-01 动效、登录与来源同步发布（已上线）

- 用户目标：将当前工作区已经完成并验证的动效、响应性能、登录页、非主页页脚、来源同步接口和交接文档统一发布到正式站点。
- 发布范围：功能提交 `e81d75b3198955dfb0f753bf81a24426d31bdd01`（`feat: publish motion and login evolution`）已包含 28 个网站文件，覆盖 CSS compositor 轨道、登录页 split layout、简约线条星瓶四帧素材、动态 slogan、黑色页脚 logo、公开岗位轻量读取和来源同步接口；用户既有 PRD、浏览器测试夹具、`.codex-artifacts/` 与未接入的 v1 精细插画未纳入。
- 部署证据：提交已推送到 `origin/main`，GitHub 对应 Vercel check 返回 `success / Deployment has completed`；Vercel deployment 为 `5Z85nt3pNedJbkAAt8hYRNH7d6Zu`，地址为 `https://vercel.com/job-bottle/job-bottle/5Z85nt3pNedJbkAAt8hYRNH7d6Zu`。正式 `https://www.starjob.space/login` HTML 已检出无标点新版标语“把明日的坐标收进星瓶”和 `starjob-login-bottle-frames-v2`；正式 v2 素材返回 HTTP 200，`/api/referrals/source` 返回 HTTP 200。
- 验证与边界：发布前 `npm run typecheck`、`npm run lint`、`npm test`（143/143）、`npm run build`（62 个页面）、`npm run smoke` 和 `git diff --check` 均通过；本地 1440×900 与 390×844 登录页检查通过。没有执行 Supabase migration、RLS/DDL、用户数据写入或认证协议变化；正式站点 HTTP 200、匿名只读接口和 Vercel success 不替代真实登录态 E2E、真实设备 FPS/网络瀑布和数据库字段兼容验收。
- 回滚准备：全量基线备份为 `backups/starjob-before-motion-evolution-20260901/RESTORE.md`，登录细节改造前备份为 `backups/starjob-before-login-detail-redesign-20260901/RESTORE.md`；提交仍可通过 Git 回退，用户原有未跟踪材料未覆盖、未删除。

## 2026-09-01 内推码来源同步与小红书检索边界（历史快照，已由上方扩展记录取代）

- 用户目标：把腾讯文档 27 秋招岗位链接中明确的内推码放进“内推码广场”对应公司，并探索公开小红书中的 27 秋招内推码。
- 决策与证据：严格读取 `DY0VXc3BFTFJUbUhw` / `t3r1vl` / `vdHovb` 后，来源快照为 937 条记录、933 条有效 27 秋招岗位、4 条无效行、0 条非 27 行；链接中识别到 4 条明确来源记录，合并为 3 枚公司级来源码：蚂蚁集团 `RI2D8Qo_53mjwttzQKtL6z1ZIgy8ysp5ZdhFF3N6Hoo=`、米哈游 `MN72G`（覆盖提前批与正式批两个岗位）、网易互娱 `ryyQNNu`。只接受明确的 `recommendationCode`（且 `isRecommendation=true`）、`referralCode`，以及蚂蚁官方域名的 `code`；`spread`、`scene`、`sourceToken`、`t`、`projectCode` 等入口/跟踪/路由参数全部排除。
- 实际改动：新增 `src/lib/referral-source.mjs` 及类型声明和 `scripts/tests/referral-source.test.mjs`；新增只读服务端 `/api/referrals/source`，使用锁定腾讯文档、严格 27 秋招校验和 3 小时缓存；`src/lib/referral-codes.ts` 将来源码与既有社区记录按公司+码去重合并；`ReferralCodeHub.tsx` 标注“来源同步”、显示来源说明并不对虚拟来源码开放无效的社区举报写入。来源记录由实时岗位源派生，不伪造上传者、不占用 `referral_codes.user_id`，既有社区数据不变。
- 小红书边界（初次扫描）：公开搜索页要求登录后才能查看搜索结果；当时没有读取账号、Cookie、验证码或绕过登录，也没有把其他站点的转载内容冒充小红书来源导入。后续用户已授权 Safari 可见页面核验，最新结果以文档上方“公开内推码导入扩展”记录为准。
- 兼容边界：源码同步仍按原有 27 秋招零写入保护运行；来源码 API 读取失败时仅回退到既有广场记录，不阻塞社区内推码。来源码不进入举报表，避免把不存在的数据库 UUID 写入 `referral_code_reports`。
- 验证：`node --test scripts/tests/referral-source.test.mjs` 3/3 通过；`npm test` 143/143、`npx tsc --noEmit`、`npm run lint`、`npm run build`（62 个页面，包含 `/api/referrals/source`）和 `git diff --check` 通过；锁定来源实时解析为 933 条有效岗位、0 条非 27 行，并得到 3 枚唯一来源码；本地生产进程 `curl http://localhost:3107/api/referrals/source` 返回 3 条 `tencent_job_link` 来源记录且 `job_id` 均为空。`npm run smoke` 复跑因已有 Next dev server 占用端口而未取得新证据，未杀进程、未把旧进程结果当成本轮通过；未执行部署、Supabase migration 或任何用户/数据库写入。
- 当前外部状态：正式 Supabase 只读岗位快照为 952 条；`referral_codes` 仍无来源同步写入。本轮代码和 API 仅在工作区存在，尚未推送或部署到正式域名。

## 2026-09-01 登录页插画与版式微调（本地未上线）

- 用户目标：将登录页插画收敛为简约线条、少量色块、大留白和童趣叙事；用星瓶把星系里的星星慢慢收入瓶中；修复瓶子与文案的重叠，并让瓶子落在蓝色动态词的右下方；动态大标题去掉逗号和句号，变化词使用独立的星光蓝。
- 决策与实际改动：否决前一版精细插画，保留其文件但不接入；使用 Imagen 生成的 `public/assets/login/starjob-login-bottle-frames-v2.png` 四帧透明 PNG，CSS 以 12 秒 `steps` 慢速切帧表现“星星靠近并进入星瓶”，再叠加 8 秒轻微漂浮。`src/app/login/page.tsx` 将大标题固定为“把明日的 / 收进星瓶”，不渲染逗号和句号；`src/app/globals.css` 将变化词设为星光蓝，缩小瓶子与场景，并在桌面端将场景移到动态词右下方、移动端恢复居中；`scripts/smoke_check.mjs` 同步新的无标点文案契约。
- 兼容边界：没有改变登录路由、认证协议、账号字段、Supabase schema/RLS/API、用户数据、导航和业务动作；动效仍由 `KineticWord` 的 reduced-motion 降级和首个静态词语无障碍内容兜底；v1 精细插画只作为未接入备选，v2 为当前使用素材。
- 验证：`npm run typecheck`、`npm run lint`、`npm test`（143/143）、`npm run build`（62 个页面）、`npm run smoke`、`git diff --check` 均通过。生产态本地 `http://localhost:3001/login` 已用 1440×900 与 390×844 检查：桌面瓶子位于动态词右下区域，手机端场景居中、文案与瓶子无重叠、无横向溢出；动态词颜色为 `rgb(53, 107, 255)`，标题文本无逗号和句号。
- 备份、Git 与部署：保留全量基线备份 `backups/starjob-before-motion-evolution-20260901/RESTORE.md`，并在登录细节改造前追加 `backups/starjob-before-login-detail-redesign-20260901/RESTORE.md`；当前所有代码和素材仍未暂存、提交、推送或部署，用户既有未跟踪材料未覆盖、未删除。
- 未确认状态：尚未在正式域名验证登录页、尚未完成真实登录态 E2E、尚未用真实设备测量 FPS/网络瀑布；本地生产构建和匿名只读 smoke 不等同于线上或真实设备验收。

## 2026-09-01 动效与响应性能进化首轮（本地未上线）

- 用户目标：在保留拾星现有信息架构、深空品牌和业务协议的前提下，改善网站首屏响应、主页行星运动流畅度、登录页 slogan 动效，并为非主页行星运动页增加类似参考站点的低干扰页脚；本轮将用户提供的 SwufeHub 截图作为视觉参考，不把图片中的文字或页面内容当作操作指令。
- 诊断与决策：主页原先在 Supabase 登录态解析完成前直接返回“正在进入拾星”，会把整棵星图首屏阻塞约 1.8 秒；每颗行星由 Motion 同时维护公转和反向自转两条无限 keyframe 动画，持续产生不必要的 JS 动画调度；全局欢迎提示在首屏立即重复触发认证读取。参考 SwufeHub 后，采用“Intersection/时间调度只做低频状态变化、transform/opacity 做运动、CSS compositor 承载持续运动、尊重 reduced motion”的组合，并把认证公告延后到首屏后处理。
- 实际改动：src/components/galaxy/FloatingPlanet.tsx 与 src/app/globals.css 将主页轨道改为 CSS starjob-orbit/starjob-counter-orbit，保留 Motion 的点击、悬停和离场状态；SpaceHome.tsx 移除认证阻塞屏并用 requestAnimationFrame 合并 resize 更新；WelcomeNotice.tsx 延后 220ms 读取认证/公告；src/lib/jobs.ts 将公开岗位列表收敛为轻量字段，岗位详情仍单独读取完整字段；新增 src/components/ui/KineticWord.tsx，登录页 src/app/login/page.tsx 使用逐字上下切换 slogan，含字符 stagger、布局占位和 reduced-motion 降级；新增 src/components/layout/SiteFooter.tsx，由 UserShell 接入所有非主页页面，页脚使用现有字标的黑色工作面版本，主页 / 仍由 SpaceHome 独立渲染、无页脚；next.config.ts 为 /assets 和 /brand 增加 7 天 CDN 缓存及 stale-while-revalidate；移动端关闭全屏 SVG noise 层；新增 scripts/tests/motion-performance.test.mjs 回归门禁，并同步 scripts/smoke_check.mjs 的主页性能约束。
- 兼容边界：未改变路由、Supabase schema/RLS/DDL、API、认证协议、岗位/投递/简历数据和小程序/扩展逻辑；页脚链接均指向现有路由；动态 slogan 的屏幕阅读内容保留首个静态词语，动画关闭或 reduced motion 时显示静态版本。为避免完整源码备份被主工程 typecheck 扫描，tsconfig.json 排除 backups，.gitignore 忽略备份目录。
- 验证：npm run typecheck、npm run lint、npm test（140/140）、npm run build（62 个页面）、npm run smoke 和 git diff --check 已通过；本地生产态使用 http://localhost:3001，主页确认 footerCount=0、阻塞文案计数为 0、轨道 CSS 动画为 starjob-orbit，登录页确认页脚 1 个且 logo 使用黑色工作面滤镜、slogan 占位宽度稳定、动态行正常切换，390×844 移动端确认底部导航仍在；公开岗位列表字段门禁、详情完整读取门禁和页脚黑色 logo 回归门禁通过。3000 端口已有旧进程，本轮未杀进程；没有把旧进程结果作为新版本证据。
- Git、备份与部署：当前 Git 基线为 f31447f2a3ff164b5a34e862a047c4b1be695453；已从该 HEAD 导出完整已跟踪源码快照至 backups/starjob-before-motion-evolution-20260901，并记录 RESTORE.md，用户原有未跟踪材料未覆盖、未删除；本轮改动尚未暂存、提交、推送或部署，未执行 Vercel、Supabase、用户数据或其他外部写入。
- 未确认状态：尚未在正式域名验证本轮改动、尚未完成真实登录态 E2E、尚未用真实设备测量 FPS/网络瀑布，也未宣称 Vercel/CDN 延迟已被线上修复；Vercel 与 Supabase 的区域、上游 RTT 和真实用户网络仍需在明确上线后单独测量。

## 2026-08-31 管理员反馈管理（已上线）

- 用户目标：在管理员后台增加反馈查看入口，集中查看用户通过网页和小程序提交的问题与建议。
- 决策：新增 `/admin/feedback` 与受保护的只读 `GET /api/admin/feedback`。页面提供全部、待处理、已处理和近 7 天统计，支持反馈内容/类型/邮箱搜索、网页/小程序来源筛选、处理状态筛选、分页和展开详情；本轮不加入标记已处理等写操作。
- 实际改动：新增 `src/components/admin/AdminFeedbackClient.tsx`、`src/lib/admin-feedback.ts`、`src/app/admin/feedback/page.tsx` 和 `src/app/api/admin/feedback/route.ts`；`AdminShell.tsx` 增加反馈管理导航，`src/app/admin/page.tsx` 增加反馈管理入口。服务端使用 `requireAdminAccess` 和 server-only `createAdminClient` 读取现有 `feedback_submissions` 表，返回平台、分类、原文、联系邮箱、提交时间、处理时间和统计计数；查询支持边界分页，并对搜索通配符进行转义。
- 兼容边界：没有新增 migration、RLS/DDL、环境变量、依赖或任何用户/数据库写入；不改变网页/小程序反馈提交接口，匿名和非管理员请求不会获得反馈数据。
- 验证：定向 ESLint、`npm run typecheck`、全量 `npm run lint`、`npm test`（136/136）、`npm run build`（62 个页面，包含 `/admin/feedback` 和 `/api/admin/feedback`）、`git diff --check` 已通过；本地生产模式 `/admin/feedback` 返回 200，匿名 `GET /api/admin/feedback?page=1&pageSize=25&status=all&platform=all` 返回 401，浏览器导航与未登录保护检查已通过。综合 `npm run check` 的类型检查、lint 和 Node 测试通过，但在既有 `npm run test:extension` 阶段因本机 Chrome 未输出页面内容而中断；独立 `npm run verify:extension-package` 和小程序 `npm --prefix starjob-miniprogram run check` 均通过。未使用真实管理员登录态，因此尚未声明真实反馈数据展示、管理员登录浏览器 E2E 或标记处理流程验收；`npm run smoke` 延续本轮已记录的 Next 16 Turbopack 本地持久化数据库阻断，未再次运行。
- Git 与部署：提交 `feb42f59951efd7e6c8709a3b76a7801de4c98c3`（`feat: add admin analytics and feedback views`）已推送 `origin/main`，正式域名 `https://www.starjob.space/admin/feedback` 返回 HTTP 200，页面 HTML 命中“反馈管理”和“数据分析”；匿名 `GET https://www.starjob.space/api/admin/feedback?page=1&pageSize=25&status=all&platform=all` 返回 HTTP 401。Vercel 自动部署已生效；本次未修改 `.codex-artifacts/`、五份未跟踪 PRD、浏览器测试夹具和其他用户工作区材料。

## 2026-08-31 管理员数据分析总览（已上线）

- 用户目标：新增独立的管理员数据分析界面，参考 Vercel 后台的信息密度，集中查看用户增长、活跃、功能使用、简历、投递链路、岗位热度和运营风险；普通用户不可见。
- 决策：新增 `/admin/analytics` 与受保护的 `GET /api/admin/analytics`。页面沿用现有 `AdminShell`、浅色工作主题和拾星管理后台导航，提供近 7/14/30/90 天切换、每日趋势、用户活跃分层、使用链路、投递状态、目标岗位/地区、投递热度、功能事件和内推/反馈提醒，并支持导出趋势 CSV。
- 实际改动：新增 `src/components/admin/AdminAnalyticsClient.tsx`、`src/lib/admin-analytics.ts`、`src/app/admin/analytics/page.tsx` 和 `src/app/api/admin/analytics/route.ts`；`AdminShell.tsx` 增加数据分析导航，`src/app/admin/page.tsx` 增加入口。服务端使用 `requireAdminAccess` 复核当前会话和 `is_admin`，再由 server-only `createAdminClient` 读取 Auth 用户及最小化聚合数据；service role key 不进入浏览器。事件、用户画像、简历、投递、岗位、内推、反馈和微信身份读取均按页处理，避免单次 PostgREST 行数上限；可选数据源失败时只显示明确的部分数据提示，不伪造数字。
- 兼容边界：没有新增 migration、RLS/DDL、环境变量、依赖或任何用户/数据库写入；不改变现有用户管理、岗位管理、内推码和计费流程。管理员页面继续使用现有客户端保护壳，数据接口单独服务端拒绝匿名和非管理员请求。
- 验证：`npm run typecheck`、全量 `npm run lint`、`npm test`（136/136）、`npm run build`（62 个页面，包含 `/admin/analytics`、`/api/admin/analytics`、`/admin/feedback` 和 `/api/admin/feedback`）和 `git diff --check` 已通过；本地生产模式 `/admin/analytics` 返回 200，匿名 `GET /api/admin/analytics?range=30` 返回 401，浏览器未登录保护检查和 1280px 无横向溢出检查已通过。综合 `npm run check` 的类型检查、lint 和 Node 测试通过，但在既有 `npm run test:extension` 阶段因本机 Chrome 未输出页面内容而中断；独立扩展安装包一致性和小程序校验均通过。`npm run smoke` 的源码约束、资源和数据探针已通过，但其本地 Next 16 Turbopack 开发服务器因持久化数据库报 `Failed to open database / invalid digit found in string` 而未完成页面检查；没有管理员真实登录态，因此尚未声明真实数据加载、管理员浏览器 E2E 或视觉验收通过。
- Git 与部署：提交 `feb42f59951efd7e6c8709a3b76a7801de4c98c3`（`feat: add admin analytics and feedback views`）已推送 `origin/main`，正式域名 `https://www.starjob.space/admin/analytics` 返回 HTTP 200，页面 HTML 命中“数据分析”和“反馈管理”；匿名 `GET https://www.starjob.space/api/admin/analytics?range=30` 返回 HTTP 401。Vercel 自动部署已生效；`.codex-artifacts/`、五份未跟踪 PRD、浏览器测试夹具和用户其他工作区材料未修改、未纳入本次改动。

## 2026-08-31 投递管理默认排序修复（已上线）

- 用户目标：修复投递管理中“刚调整岗位状态后反而排到下面”的排序痛点；默认应把最近更新的投递放在最上方，保留其他排序方式供用户手动选择。本轮只修已有逻辑，不新增产品功能。
- 根因与证据：`src/components/applications/MyApplicationsClient.tsx` 原本默认 `ApplicationSort` 为 `attention`。该模式会按进行中投递的无更新天数倒序，把长期没有进展的记录优先展示；状态调整虽然会正确更新 `updated_at`，但新记录在“需要关注优先”模式下自然会排到后面。
- 实际改动：默认排序和“清除筛选”均改为 `recent`；排序选择器将“最近更新优先（默认）”置于第一项，`filtersActive` 以 `recent` 为无额外排序状态；`compareApplications` 既有的 `updated_at` 倒序逻辑继续作为最近更新排序；“需要关注优先”和“按公司名称”仍可手动选择。`tests/applications.test.ts` 增加默认值、重置值、筛选状态、比较方向和界面选项的回归门禁。
- 兼容边界：只改变网页端默认排序、清除筛选后的回到状态和选择器提示，不改变数据库、API、投递状态保存、流程编辑、数据顺序字段或 Mac App/小程序；没有新增依赖、migration、RLS/DDL 或用户功能。
- 验证与发布：`npm run typecheck`、`npm run lint`、`npm test`（136/136）、`npm run build`（58 个页面）、`npm run smoke` 和 `git diff --check` 已通过；本地回归覆盖排序默认值、重置值、筛选状态、比较方向和选择器提示。提交 `0f73f4f`（`fix: default application list to recent updates`）已推送 `origin/main`；正式 `https://www.starjob.space/my` 返回 HTTP 200，加载的 15 个 JS 资源已检出“最近更新优先（默认）”，确认修复已进入生产。未发生数据库、认证投递或其他线上数据写入。

## 2026-08-30 投递流程保存兼容修复（已上线）

- 用户目标：修复用户反馈的网页版“无法修改投递流程”，只解决已有保存链路的卡点，不新增产品功能；本轮完成本地验收后上线网页修复。
- 根因与证据：当前正式 Supabase 只读 schema 已有 `workflow_nodes`、`workflow_node_id`、`custom_stage_label` 等投递流程字段，但仍缺 `user_applications.applied_position`。新版 `ProgressDrawer.saveProgress` 在修改状态、流程或详情时会把该可选字段一起提交，PostgREST 因整次 PATCH 包含不存在字段返回 HTTP 400 / `PGRST204`（`Could not find the 'applied_position' column ... in the schema cache`），于是其他流程字段也没有保存。使用不存在的固定 UUID 做同样请求只验证 schema 解析，未命中任何真实记录、未产生数据写入。
- 实际改动：`src/lib/applications.ts` 的 `updateApplication` 在明确识别到仅 `applied_position` 缺失时，自动去掉这一列重试同一更新，继续保存已存在的状态、流程节点和跟进字段；其他缺失工作流列仍维持 fail-closed，不静默丢字段。`src/components/applications/ProgressDrawer.tsx` 读取兼容结果后不会把未落库的岗位名伪装成已保存：保留当前输入为未保存状态、从确认行移除不支持字段，并提示“投递流程已保存；实际投递岗位暂未同步”。`tests/applications.test.ts` 新增两个回归用例，覆盖“岗位名缺列但流程继续保存”和“只填岗位名时不误报成功”。
- 兼容边界：线上已有的投递流程字段不受影响，状态下拉、流程编辑器、节点顺序和其他详情字段可以在 `applied_position` 缺失期间继续保存；“实际投递岗位”本身仍需执行 `supabase/migrations/20260830120000_application_position.sql` 后才能写入，不能把本地兼容重试当成 migration 已上线。没有修改数据库、RLS、migration、Mac App、小程序或新增用户功能。
- 验证：定向回归测试 2/2、`npm run typecheck`、定向 ESLint、全量 `npm test` 135/135、`npm run build`（58 个页面）通过；清理并恢复可重建 `.next` 缓存后，在允许字体请求的临时本地服务上 `npm run smoke` 通过，包含 908 条岗位只读探针、公开页面和 SEO 探针。首次冒烟仅受本地缓存格式和 Google Fonts 网络阻断，复跑成功；未执行 authenticated E2E、真实投递写入或线上部署。
- 验收边界：`npm run check:release` 的网站核心阶段通过，但扩展夹具阶段仍因当前环境 Chrome 未输出页面内容而中断；`npm run verify:extension-package` 与小程序校验通过。该扩展环境问题不影响本次网页构建或投递保存修复。
- Git 与部署：网页修复与回归测试已提交为 `a2272f2`（`fix: preserve application workflow saves across schema lag`）并推送 `origin/main`；正式域名 `https://www.starjob.space/my` 返回 HTTP 200，加载的 Next JS 资源已检出本次新增兼容提示文案，确认修复已进入生产。正式 Supabase migration 仍未执行，未发生本轮数据库写入；工作区其他未跟踪材料未纳入提交。

## 2026-08-30 投递单条化、岗位补充与 logo 兼容优化（未上线）

- 用户目标：根据三张本地截图修复投递管理的真实痛点：不再把一家公司误展示成父级栏目；一条 `user_applications` 记录可以填写实际投递岗位并拥有自己的进度；详情面板提高信息密度；删除没有真实 logo 时的公司名字球；本轮仍只提供本地版本，不上线。
- logo 评估与决策：已核对 [Simple Icons](https://github.com/simple-icons/simple-icons) 及其 [logo CDN](https://github.com/LitoMore/simple-icons-cdn)，其覆盖虽广但以 SVG 为主、中文公司覆盖不完整且品牌授权需逐项确认；[Clearbit 免费 Logo API 已于 2025-12-08 停止公开服务](https://clearbit.com/changelog)。因此不引入运行时 logo 搜索或第三方图片请求，不把不确定的网上 PNG 批量塞进仓库；`CompanyBadge` 现在只展示岗位已有的可信 `logo_url`，使用透明背景和 `object-contain` 适配，logo 缺失或加载失败时直接不渲染名字球。按当前免费服务额度，少量本地静态素材本身可承受，但本轮没有必要新增素材维护成本。
- 单条记录决策：现有 `user_applications.status` 本来就是逐条保存的独立进度，之前的公司聚合层反而造成了模型误解；移除 `/my` 的公司父级分组和公司计数，改成一条投递一行。新增可选 `user_applications.applied_position`，仅用于用户填写“我实际投递的岗位”，没有新建公司表、岗位表或多进程表。
- 实际改动：`src/components/applications/MyApplicationsClient.tsx` 改为平铺单条投递清单，搜索包含 `applied_position`，已结束记录仍默认折叠；`src/components/applications/ProgressDrawer.tsx` 增加实际投递岗位输入和明确的“当前投递进度”选择，保留可点击轨道、既有状态枚举、优先级、简历、下一步、备注、复盘和时间线；`src/components/ui/Drawer.tsx` 增加仅投递详情使用的 wide 尺寸；`src/components/jobs/CompanyBadge.tsx` 删除默认名字球，仅显示真实 logo；`src/lib/types.ts`、`src/lib/applications.ts`、`supabase/schema.sql` 与 `supabase/migrations/20260830120000_application_position.sql` 同步字段和 160 字限制；`scripts/smoke_check.mjs` 同步新结构门禁。
- 视觉与交互：详情头部把公司、实际岗位、招聘岗位方向、状态和元信息分层；顶部把实际岗位、优先级、所用简历排成高密度网格；当前进度同时提供明确选择器和轨道；联系来源、下一步动作、备注/复盘和历史各自分区，桌面宽屏下备注与复盘并列，移动端继续单列。
- 兼容边界：新 migration 只写入本地仓库，尚未执行到正式 Supabase；旧投递没有回填，缺少 `applied_position` 时继续回退显示招聘信息中的 `job_titles/job_categories`。因此当前本地可检查完整界面，但新岗位名称写入正式库仍需用户确认后单独执行 migration，不能把本轮本地源码检查写成线上保存已通过。没有新增路由、第三方依赖、运行时 logo API、Vercel 部署或线上数据写入。
- 验证：本轮 `npm run typecheck`、`npm run lint`、`npm test`（133/133）、`npm run build`（58 个页面）和清理可重建 `.next` 缓存后的 `npm run smoke` 均通过；`git diff --check` 已通过。`npm run smoke` 首次因同一 `.next` 持久化缓存格式错误失败，清理后复跑成功；未执行 authenticated E2E、真实投递保存或视觉验收。
- Git 与部署：未暂存、未提交、未推送、未部署；保留工作区中其他既有修改和未跟踪文件。

## 2026-08-30 投递管理视觉层级微调（未上线）

- 用户反馈：列表中岗位标题过于醒目而公司名称过弱；详情头部同一份岗位信息重复展示三次。要求公司名称成为第一视觉层级，岗位降为次级信息，详情只保留一条岗位说明。
- 实际改动：`src/components/applications/MyApplicationsClient.tsx` 将公司名称改为深色、较大、较重的主标题，将实际投递岗位改为较小、常规字重的次级文本，地点/行业/批次继续作为更低层级元信息。`src/components/applications/ProgressDrawer.tsx` 将公司标题提升为 3xl/4xl，保留状态标签和一条动态岗位说明（有实际岗位时显示实际投递岗位，否则显示岗位方向），删除重复的招聘岗位方向与岗位分类行；可编辑的“我实际投递的岗位”字段仍保留，因为它是该条记录的编辑入口。
- 兼容边界：只调整前端文字层级与详情头部展示，不改变 `user_applications` 数据模型、状态、保存逻辑、官网入口、流程编辑、移动端布局或线上数据；`scripts/smoke_check.mjs` 增加了公司优先层级和详情不重复岗位信息的源码门禁。
- 验证：本轮修改后 `npm run typecheck`、`npm run lint`、`npm test`（133/133）、`npm run build`（58 个页面）、`npm run smoke` 与 `git diff --check` 均通过；本地预览仍使用 `http://localhost:3000`，不声称 authenticated E2E、真实投递保存或视觉验收通过。
- Git 与部署：本次仍未暂存、未提交、未推送、未部署。

## 2026-08-30 已上线：当前网站版本与投递管理视觉修正

- 用户明确要求：先把当前已验证的网站版本上线；另需准备一段可由用户自行发布的《拾星指南》更新日志，本轮不自动发布指南内容。
- 发布范围：当前工作区已验证的网页、投递管理、简历/网申助手、源码门禁、三份交接文档、0.2.7 安装包和 `20260830120000_application_position.sql` 均纳入提交 `04e306f`（`feat: publish current StarJob updates`）；PRD 草稿、`.codex-artifacts` 和测试夹具未纳入。提交已推送 `origin/main`。
- 正式部署：GitHub Vercel check 对提交回报 `success`，Vercel deployment 为 `6Fo8n38aqP5j54J86FwoaV8XUYk6`，正式部署地址为 `https://vercel.com/job-bottle/job-bottle/6Fo8n38aqP5j54J86FwoaV8XUYk6`。`https://www.starjob.space/`、`/my`、`/referrals`、`/guide`、`/extension` 均实测 HTTP 200；正式 HTML 已检出投递管理单条记录文案、内推码广场文案和 0.2.7 网申助手标识。
- 数据库边界：正式 Supabase 只读探针仍返回 `user_applications.applied_position` 不存在（HTTP 400 / PostgreSQL `42703`）。本机 Supabase CLI 无可用登录凭据且 migration list 无法完成，因此未执行 hosted migration/DDL；线上新增“我实际投递的岗位”暂不能保存，页面会按既有错误保护提示先执行 migration，其他已存在投递状态和旧字段不受影响。不得把本次网站部署写成数据库字段已上线。
- 验证：发布前后已通过 `npm run typecheck`、`npm run lint`、`npm test`（133/133）、`npm run build`（58 个页面）、`npm run smoke`、`git diff --check`，并完成正式域名页面探针。未执行 authenticated E2E、真实投递保存或指南内容发布。
- Git 与部署：功能与网站提交已推送并由 Vercel 成功部署；本条部署证据随后以文档提交补回，未执行 Supabase migration、指南发布或其他外部数据写入。

## 2026-08-30 岗位偶发无法读取诊断（零代码修改）

- 用户问题：浏览器有网络时，网页偶尔提示“岗位暂时无法读取”，并询问此前做过但尚未上线的更新。本次只做本地代码、Git、部署记录和正式 Supabase 的只读核对，不新增功能、不修代码、不执行数据库写入或重新部署。
- 已确认的读取链路：网页公开岗位页由浏览器使用 Supabase publishable key 直接查询 `jobs`；`src/lib/jobs.ts` 的 `fetchActiveJobs` 使用 `.select("*").eq("is_active", true).order("updated_at", { ascending: false })`，通过 `Promise.race` 设置 7 秒总超时，但没有给底层请求传 `AbortSignal`。`/explore` 的 `HomeClient` 和首页岗位星系复用该岗位读取函数。
- 主要根因判断：系统“有网络”只说明设备具备联网能力，不代表浏览器到 Supabase Edge、Supabase REST、数据库连接池和查询结果返回均在 7 秒内完成。当前请求一次拉取全部开放岗位和全部字段后再在浏览器筛选；本次只读测速返回约 814KB，5 次均成功、耗时约 0.87–1.78 秒，没有复现失败，但仍存在偶发超过 7 秒的窗口。历史构建证据也记录过 `/sitemap.xml` 的岗位数据库瞬时超时后重试成功，支持“上游偶发慢于固定阈值”的判断。
- 放大问题：`HomeClient.loadData` 先读岗位，随后还会并行读登录用户的 `profiles`、`user_applications`、`resumes`；这些后续请求任一失败，也会落入同一个“岗位暂时无法读取”提示，即使岗位列表已经成功返回。超时后底层岗位请求未被取消，连续点击重试还可能留下多个进行中的大请求；当前只有手动重试，没有带退避的重试或上一次成功数据兜底。以上是用户看到“有网但岗位读不到”的代码级解释，并不把当前测速成功误写成问题已修复。
- 后续优化方向（本次不实施）：把岗位列表读取与用户私有数据读取拆开报错；将公开岗位查询改为只取页面需要的字段并考虑服务端缓存/分页；为岗位请求增加可取消的超时与一次退避重试；保留最近一次成功列表，避免瞬时上游抖动清空页面。它们都是稳定性与性能修复，不属于新增产品功能。
- 未上线核对：本轮没有发现仍停留在仓库工作区、且应当作为网页版本发布的已完成代码；`04e306f` 已包含此前投递管理单条化、详情层级、真实 logo 兼容、网页界面痛点修复、简历/网申助手 0.2.7 和安装包，Vercel 已成功部署。文档中 2026-08-30 的“未上线”章节是发布前历史记录，不能按当前状态解读。
- 仍未完全上线的唯一实质项是 `supabase/migrations/20260830120000_application_position.sql`：代码和页面已部署，但正式 Supabase 只读探针仍显示 `user_applications.applied_position` 不存在（HTTP 400 / PostgreSQL `42703`），所以“我实际投递的岗位”目前不能保存；需要单独执行 hosted migration 后再做登录态保存验收。未跟踪的 PRD、`.codex-artifacts` 和测试夹具属于工作材料，不是漏发的产品更新；《拾星指南》更新日志也按用户要求未自动发布。
- 证据：岗位请求代码见 `src/lib/jobs.ts`、`src/components/jobs/HomeClient.tsx`、`src/lib/supabase/client.ts`；本次只读测速为 5/5 HTTP 200、约 814KB、0.87–1.78 秒；当前 Git HEAD 为 `1de6f72`，本次仅新增三份等量诊断记录，其余 tracked 文件无修改；本次零代码修改、零数据库写入、零部署。


## 2026-08-30 本地网站界面痛点修复（未上线）

- 用户目标：先阅读 Downloads 中的原始 PRD 和仓库已有设计惯例，集中排查网页已有的卡顿、拥挤、状态不清和样式失效问题；本轮不新增产品功能、不上线，先保留本地版本供用户查看。
- 依据与决策：原始 PRD、v6 视觉冻结说明、网站审计和现有组件约束均要求保留“冷色星空 + 玻璃星瓶”识别、现有页面入口和业务流程。因此只修现有界面摩擦，不做全站换肤、业务重构或新增入口。
- 根因：移动端岗位探索页的地图默认占用首屏，筛选器在窄屏直接纵向展开，岗位清单被推后；登录、反馈、简历新建选项和移动端分隔线仍引用不存在的旧 CSS 变量；投递进度轨道残留旧暖金色，与当前冷色 token 不一致。另保留已有桌面导航、移动六项导航、岗位行操作结构和简历 `AI-Powered` 标识。
- 实际改动：
  - `src/components/jobs/JobFilterBar.tsx`：窄屏增加现有筛选的展开/收起容器、已启用条件计数、把清空动作放在筛选标题行；桌面仍保持原侧栏筛选；工作地点改为语义化 `fieldset/legend`。
  - `src/components/jobs/HomeClient.tsx`：仅在移动端让现有岗位地图默认收起，并提供明确的打开/收起状态；桌面地图和联动逻辑不变；岗位页标题区域只做现有摘要布局收敛。
  - `src/app/globals.css`：补齐全站焦点/按压反馈、筛选与地图响应式样式，并复用现有冷色 token；没有引入新设计语言。
  - `src/components/applications/ProgressDrawer.tsx`：将投递轨道的旧暖金色改为现有冷色 token，保留节点、点击推进和工作流逻辑。
  - `src/components/auth/LoginForm.tsx`、`src/components/feedback/FeedbackClient.tsx`、`src/components/resume/ResumeCreateDialog.tsx`、`src/components/layout/Navbar.tsx`：仅修复不存在的 CSS 变量或硬编码状态色，恢复可见状态。
- 兼容边界：本轮无新增路由、API、数据库写入、migration/RLS/DDL、依赖、扩展逻辑或小程序逻辑。过程中冒烟约束发现不应修改的首页引导、快捷入口、导航收敛、岗位公司徽标和简历标识均已撤回；既有未提交文件和用户其他改动保持不动。
- 验证：`npm run typecheck` 通过；`npm run lint` 通过；`npm test` 133/133 通过；`npm run verify:extension-package` 通过；`npm run smoke` 通过并只读读取 908 条开放岗位。第一次 `npm run build` 因 `/sitemap.xml` 岗位数据库瞬时超时，第二次成功完成 58 个页面构建。`npm run test:extension` 在当前环境因 Chrome 未输出页面内容失败，未作为网站改动的通过证据；未执行真实登录态第三方页面 E2E。
- 本地与外部状态：`WATCHPACK_POLLING=true npm run dev` 已启动本地 `http://localhost:3000`，公开页面请求均返回 200；本轮没有 Git 暂存、提交、推送或 Vercel/线上部署。当前只提供本地预览，待用户确认后再决定是否进入下一轮。

## 2026-08-30 本地投递管理工作台优化（未上线）

- 用户目标：在不擅自新增产品功能、不上线的前提下，修复投递管理中公司与岗位关系不直观、每行操作重复且过大、官网入口不醒目、已拒绝/已放弃记录占据首屏等问题；用户明确希望先查看本地版本。
- GitHub 参考与取舍：只读参考了 [JobTrail](https://github.com/kaylaehman/jobtrail) 的公司/岗位/状态高密度清单与筛选结构、[Track My Tranquility](https://github.com/yewen-jin/job-tracker) 的状态筛选和优先级排序、[JobSync](https://github.com/Gsync/jobsync) 的单条投递详情记录。没有复制其代码、视觉或自动化功能，也没有引入新依赖。
- 根因与决策：原页面把一条 `user_applications` 同时铺成公司、岗位、状态选择、最近进展、下一步和多项操作，导致同一公司的多岗位无法形成层级，状态选择器与详情入口重复。保留现有每条投递独立保存流程的事实模型，增加仅前端展示层的公司聚合；不新建公司表、岗位表或手工新建岗位接口。
- 实际改动：`src/components/applications/MyApplicationsClient.tsx` 按公司归组并以岗位作为子行，岗位各自显示状态、节点数、最近进展、下一步与优先级；移除列表行内的大型 `ApplicationStageSelect`，状态改从已有详情抽屉的投递轨道修改；操作区改为“打开官网 / 查看详情”双列，编辑流程收为“编辑当前岗位流程”文字操作；已结束投递统一默认折叠，选择“已结束”筛选时自动展开；统计与空状态文案改为岗位/投递语义，官网链接继续使用既有清洗器。
- `src/components/applications/ProgressDrawer.tsx` 提升详情中的“打开官网投递”入口为双列操作区的高可见次要动作，并在头部明确显示岗位名称、岗位类别与元信息；`src/components/applications/ApplicationWorkflowRail.tsx` 将流程编辑说明改为“只影响当前这条岗位投递记录”，避免多个岗位被误解为共用流程。
- 兼容边界：未新增路由、API、数据库字段、migration/RLS/DDL、依赖、手工岗位创建、公司级共享流程或线上写入；现有投递详情、轨道推进、失焦保存、行内删除确认和数据清洗规则保留。移除列表快捷状态选择仅改变入口位置，不改变状态枚举或持久化契约。
- 验证：`npm run typecheck` 通过；`npm run lint` 通过；`npm test` 133/133 通过；`npm run build` 成功生成 58 个页面；`npm run smoke` 在清理一次可重建 `.next` 持久化缓存并停止占用 3000 端口的旧本地服务后通过，包含 908 条开放岗位读取、投递管理新源码门禁、公开页面与 SEO 探针。首次冒烟失败原因分别是 3000 端口被既有开发服务占用、随后 `.next` 缓存格式损坏，均非业务代码失败。
- 本地与外部状态：已重新启动 `WATCHPACK_POLLING=true npm run dev`，本地地址为 `http://localhost:3000`；当前浏览器未有本地登录态，访问 `/my` 会按既有逻辑跳转 `/login?next=%2Fmy`，因此本轮没有冒充 authenticated E2E 或真实投递保存通过。未 Git 暂存、提交、推送，未部署 Vercel/正式官网；等待用户在本地登录后查看并确认。



## 2026-08-30 已同步：Excel-5 导入并恢复 27 秋招自动更新

- 用户要求先按 `/Users/wangrui/Downloads/27秋招信息整理-5.xlsx` 更新岗位，再排查自动更新停止原因并重新搭建。工作簿只读核验确认共有三张表，解析范围严格锁定第三张 `27秋招正式批+提前批` 的 `A1:I895`；前两张 26 秋招表没有进入候选集、去重或写入。目标表表头九字段与项目契约一致，公式错误扫描 `#REF!`、`#DIV/0!`、`#VALUE!`、`#NAME?`、`#N/A` 均为 0。
- 目标表共有 893 条业务行，其中有效 27 秋招 889 条（正式批 741、提前批 148）、非 27 行 0、源内重复 0；4 条无效行全部跳过：第 3 行“理性看待秋招 人生没有终点”缺批次/链接，第 709 行益丰大药房、第 856 行中国电子科技集团公司第十四研究所信息处理研究链接格式无效，第 860 行万得wind 链接格式无效。
- 使用现有 `job-sync-utils.mjs` 的链接清洗、业务指纹、历史身份去重和身份冲突保护，Excel 新记录 ID 由清洗后的 27 岗位业务指纹确定性生成。正式库 dry-run 为既有 819、新增 89、更新 0、未变化 0、历史重复跳过 800、源内重复 0、写入 0；确认无 26 批次和身份冲突后正式写入 89 条。立即复跑为既有 908、新增 0、更新 0、未变化 89、历史重复跳过 800、源内重复 0、写入 0，证明幂等且旧岗位没有重复导入。数据库只读批次核验为 908 条，`27秋招正式批` 754、`27秋招提前批` 154，无其他批次。
- 自动任务停止的根因不是定时器或凭据，而是腾讯同一源记录被编辑后核心身份发生漂移，`assertNoJobIdentityConflicts` 按设计在任何 upsert 前 fail-close。只读逐字段审计确认 `rE1Yxi` 仅“投递链接”变化且公司、日期、行业、批次、岗位、地点、备注和启用状态一致；`rbQr3m` 仅公司名“海尔智家”→“海尔”和“投递链接”变化，其余同步字段全部一致。公众号页面受验证码拦截，未把正文可访问性当作依据。
- 在重新读取锁定来源后，使用 service role 做精确 compare-and-set：`rE1Yxi` 仅将旧链接替换为当前源链接；`rbQr3m` 仅将公司名和旧链接替换为当前源值；每条均同时匹配固定 UUID、旧公司、批次和旧链接，返回恰好 1 条。没有放宽或绕过身份守卫，未来未核验的公司、链接或批次漂移仍会全批次零写入。
- 修复后先运行 `node --test scripts/tests/sync_27_autumn_jobs.test.mjs`，10/10 通过；再按正式命令运行 `node --env-file=.env.local scripts/sync_27_autumn_jobs.mjs --apply`，锁定 `DY0VXc3BFTFJUbUhw` / `t3r1vl` / `vdHovb`，读取 893 条源记录，其中有效 889、无效 4、非 27 行 0；正式库既有 908、新增 0、更新 0、未变化 294、历史重复跳过 595、源内重复 0、实际写入 0。自动同步已恢复。
- Codex 自动化 `27` 已重新登记为 `ACTIVE`，按北京时间每天 09:00、12:00、15:00、18:00、21:00 检测，失败仅通知；提示词明确要求测试先行、来源三元组锁定、异常零写入和成功/失败计数报告。仓库 `.github/workflows/sync-27-autumn-jobs.yml` 保持 Node 24、UTC 01/04/07/10/13（对应北京时间上述五档）、并发互斥和“测试通过后 apply”顺序，作为独立备用通道。
- 本轮修改了三份交接文档并更新了 Codex automation 配置；没有修改业务代码、同步脚本、测试、GitHub workflow、依赖、环境变量、migration、DDL 或页面，没有 Git 暂存/提交/推送和 Vercel 部署。源工作簿未被修改；正式 Supabase 发生的写入仅为 Excel 新增 89 条及上述两条已审计身份对齐，均可由本记录中的固定条件和复跑结果追溯。

## 2026-08-24 已恢复并同步：X-MOTORS 链接对齐后新增 108 条 27 秋招岗位

- 用户要求同步最新岗位。`node --test scripts/tests/sync_27_autumn_jobs.test.mjs` 首次 10/10 通过，但正式 apply 被腾讯记录 `rAuuHi` 的“投递链接”身份冲突在任何 upsert 前安全拦截并保持零写入。只读审计严格锁定 `DY0VXc3BFTFJUbUhw` / `t3r1vl` / `vdHovb`，读取 758 条源记录，其中有效 27 秋招 754、无效 4、非 27 行 0；冲突之外的计划为新增 108、更新 0、未变化 139、历史重复跳过 506、源内重复 0。
- `rAuuHi` 的固定 job UUID 为 `68240410-d5c3-5ba3-a75d-80411797a13d`。腾讯源与正式库的公司 `X-MOTORS`、开启时间 `8.18`、行业 `科技`、批次 `27秋招正式批`、岗位、地点 `全球` 和备注完全一致，仅 `apply_url` 从 `https://mp.weixin.qq.com/s/9B1i5zHCyD4ARRlC1lUxiA` 变为当前源值 `https://mp.weixin.qq.com/s/1L2GOewiBWsQ3a-WlwWZuw`。公众号页面在服务器和应用内浏览器均只返回微信通用页/验证码，未独立确认文章正文；本次合法性判断基于锁定来源记录与数据库其余全部同步字段逐项一致，不把该链接变化泛化为可自动放行规则。
- 修复未弱化或绕过 `assertNoJobIdentityConflicts`，也未修改同步脚本、守卫测试、自动化或 workflow。使用 service role 对正式 `jobs` 表执行精确 compare-and-set：同时匹配固定 UUID、公司、`27秋招正式批` 和旧链接后，只更新 `apply_url` 为当前腾讯源值，返回命中恰好 1 条；命中数量不是 1 时原本会立即停止。
- 链接对齐后再次运行守卫测试仍为 10/10。正式 apply 的统计为源记录 758、有效 754、无效 4、非 27 行 0；正式库既有 664、新增 108、更新 0、未变化 140、历史重复跳过 506、源内重复 0、实际写入 108。四条无效行继续跳过：说明行缺批次/链接，万得wind、益丰大药房和中国电子科技集团公司第十四研究所信息处理研究的链接格式无效。
- 紧接的只读幂等复查为正式库既有 772、新增 0、更新 0、未变化 248、历史重复跳过 506、源内重复 0、写入 0，证明新增岗位不会重复导入。仓库文件只等量更新三份交接文档；诊断和精确数据修复脚本位于 `/private/tmp`，不属于仓库。无代码、依赖、环境变量、migration、DDL、自动化或 workflow 变更，无 Git 暂存、提交、推送或 Vercel 部署；岗位数据已直接写入正式 Supabase，即时供网站读取。

## 2026-08-20 已同步：`27秋招信息整理-4.xlsx` 精确导入 46 条岗位

- 用户指定 `/Users/wangrui/Downloads/27秋招信息整理-4.xlsx` 手动同步岗位。工作簿只读检查确认共有三张表：`26秋招致谢`、`26秋招正式批+提前批`、`27秋招正式批+提前批`；导入范围被严格锁定为第三张表 `A1:I652`，表头位于第 2 行且九个字段与项目契约完全一致，前两张 26 秋招表没有进入解析、去重或写入候选集。
- 目标表共有 650 条业务行：`27秋招正式批` 500 条、`27秋招提前批` 149 条、批次空白说明行 1 条；有效 27 秋招 646 条、非 27 行 0、源内重复 0。四条无效行被保留为跳过证据：第 3 行“理性看待秋招 人生没有终点”缺批次和链接，第 466 行益丰大药房、第 613 行中国电子科技集团公司第十四研究所信息处理研究、第 617 行万得wind 的链接格式无效。公式错误扫描对 `#REF!`、`#DIV/0!`、`#VALUE!`、`#NAME?`、`#N/A` 为 0 命中。
- 导入使用项目现有 `job-sync-utils.mjs` 的链接清洗、业务指纹、历史身份去重和身份冲突校验，并按现有类别与标签规则生成数据库字段；新记录 ID 由清洗后的岗位业务指纹确定性生成。正式库 dry-run 为既有 618、新增 46、更新 0、历史重复跳过 600、源内重复 0、写入 0，没有身份冲突或非 27 数据，因此获准执行写入。
- 正式 apply 恰好写入 46 条，更新 0；随后用同一 Excel 立即只读复跑，正式库为既有 664、新增 0、更新 0、未变化 46、历史重复跳过 600、源内重复 0、写入 0，直接证明本次导入幂等且旧数据不会重复导入。源工作簿未被修改，四条无效行未写入。
- 本轮没有修改同步脚本、页面、组件、API、类型、依赖、环境变量、migration、DDL、自动化或 GitHub workflow；项目文件只等量更新三份交接文档，临时导入程序位于 `/private/tmp` 且不属于仓库。没有 Git 提交、推送或 Vercel 部署；岗位数据已直接写入正式 Supabase，无需前端重新部署。腾讯实时同步仍会因未确认的 X-MOTORS 记录 `rAuuHi` 链接变化而安全停止，该身份冲突没有被本次 Excel 导入绕过、修改或认定为已解决。

## 2026-08-20 本地完成待上线：网申助手 0.2.7 常见字段与经历分组策略升级

- 用户提供八张真实网申截图并要求针对基本信息、教育、工作/实习、项目、作品、获奖、语言能力和自我评价完善自动填写。继续审计确认剩余根因是“资料源缺字段”：简历没有性别、国籍/地区、期望工作地点、项目链接和明确经历类型，导致扩展即使识别到字段，也只能留空或根据职位名猜工作/实习。决策是先给用户可核对的显式资料入口，再让扩展只消费明确保存的事实。
- `resume.ts` 与 `ResumeEditor.tsx` 已加入性别、国籍/地区、期望工作地点、经历类型（实习/正式工作/其他）和项目链接；旧简历缺少经历类型时仅把含明确实习语义的标题归为实习，其余回退为“其他”，不把历史正式工作误改成实习。新字段同步贯通简历本地/云端结构、智能导入、翻译短键计划、网页与小程序校验和兼容保存；翻译保持经历枚举、性别和 URL 原值，仅翻译国籍与地点文字，完整结构校验后才生成独立译本。
- `fill.js`、`popup.js`、`extension-autofill` 和 `extension-match` 已把这些显式字段加入白名单。性别、国籍/地区、期望地点和项目链接只在所选简历明确非空时填写，支持原生多选地点；年龄仍只由明确出生日期计算。“没有工作经历”只检查正式工作，显式标记为实习的“商业分析岗/估值分析”即使标题不含“实习”也不会串入正式工作；项目附件仍不分析、不上传，证件/婚姻/户籍/薪资/验证码等继续禁填，所有页面仍不自动提交。
- 浏览器测试新增 `common-ats-safety-fixture.html`，与原截图正向夹具共同验证显式字段、无关键词实习分组、项目 URL、空值零猜测、正式工作存在时不误勾无工作和文件附件排除；真实无头 Chrome 为 7/7，扩展契约 5/5，全量 Node 133/133，翻译计划 2/2，TypeScript 与完整 ESLint 通过。Next.js 58 路由 production build 和只读 Smoke 通过，Smoke 读取 664 条开放岗位并完成公开页面与 SEO 探针；首次 Smoke 被可重建 `.next/dev/cache` 的 `CURRENT 2` 重复缓存阻断，删除整个可重建 `.next` 后重新 build + smoke 成功。
- 使用本地 production server 与应用内浏览器完成交互验收：`/resume` 可实际选择性别、填写国籍和多个期望地点，经历页显示三类经历并可切换，项目页项目链接可编辑；`/extension` 下载入口可见且精确指向 `/downloads/starjob-resume-assistant-v0.2.7.zip`。重打安装包后 public 与 dist 副本逐字节一致，ZIP 12/12 文件校验通过，大小 168,321 bytes，SHA-256 `b6ae945a6fc4233a8bec3952f6b32914dd153094d2da06c3fe0041adbf7daf38`。
- 本轮零 migration/RLS/DDL、零数据库或外部数据写入、零依赖与环境变量变化；用户原有 `package.json`、`.codex-artifacts/`、五份 PRD 和三文档既有未提交记录均保留。尚未 Git 暂存、提交、推送或部署，正式官网仍为上一版本；尚未在真实第三方 ATS 与真实登录简历上执行 authenticated E2E，因此当前证据证明源码、浏览器夹具、本地交互、构建与安装包状态，不代表已经上线。


## 2026-08-18 已上线：完整撤下诘星公开彩蛋页与体验招募公告

- 用户先要求撤掉 Logo 旁彩色十字星入口与“诘星 StarInterview Preview 体验招募中”公告，随后明确不要做最小隐藏，而要做完整、最优的退场。决策是删除已结束的公开宣传链路和所有专属展示分支，同时明确保留仍在使用的 StarInterview 连接授权、服务端 API、管理员授权及计费能力，避免把“撤宣传页”误做成“停产品后端”。
- 顶部导航已移除彩色四角星彩蛋及其 `/interview?preview=recruitment` 跳转，品牌字标仍作为清晰的首页入口；公开 `/interview` 页面、`StarInterviewTeaser` 组件与专属样式已经删除，生产构建路由只保留动态 `/interview/connect`。历史宣传 PNG 已无运行时引用，但作为非执行资源保留，不影响页面或构建产物。
- 拾星指南已删除本地 `?preview=star-interview` 注入逻辑、虚拟招募帖、内部识别标签、专属“了解详情”区块和申请邮件模板；`ForumClient` 与 `PostCard` 回到统一的真实帖子数据、标准标签与管理员维护流程。Smoke 契约同步改为禁止彩蛋 URL、预览状态和招募特例回归。
- 正式 Supabase 先用 UUID、标题和内部标签三重条件做前置校验，恰好命中 1 条后精确删除公告 `fe145b95-ba83-44d0-91f9-e1cc7d01cf8c`，删除返回 1 条，随后只读复查剩余 0 条；其他指南内容零修改。该线上删除不能在后台直接撤销，如需恢复只能从 Git 历史重建并重新发布。
- 验证结果：定向 ESLint 通过，`npm test` 132/132 通过，`npm run smoke` 通过，`npm run build` 通过且路由表无 `/interview`、仍有 `/interview/connect`；首次 TypeScript 校验被旧 `.next/dev/types` 路由缓存误报，确认正本包含当前内推码路由后只清理可重建的旧类型副本，复跑 `npm run typecheck` 通过。代码提交 `08f0f63` 后推送 `main`，Vercel 状态回报 `Deployment has completed`；生产探针确认 `/`、`/guide`、`/referrals`、`/interview/connect` 均为 HTTP 200，`/interview` 为 404，主页和指南 HTML 不含彩蛋入口，`/api/guide/posts` 不含已撤公告标题或内部标签。未用真实一次性授权码执行诘星登录 E2E，但连接页标题与失效授权保护正常。

## 2026-08-18 已恢复：27 秋招自动同步的拓竹科技链接身份冲突

- 用户发现 27 秋招自动更新停止。诊断确认自动化仍在按北京时间 09:00、12:00、15:00、18:00、21:00 运行，真正阻塞点是腾讯记录 `rSdw3J` 的“投递链接”发生核心身份变化；`assertNoJobIdentityConflicts` 按设计在任何 upsert 前连续停止并保持零写入，不是定时任务失效或凭据过期。
- 腾讯源与数据库只读对比显示该记录仍为“拓竹科技”、开启时间 `8.7`、`27秋招正式批`，行业、岗位类别、地点、备注和启用状态全部一致，仅链接从拓竹科技飞书招聘的校招列表变为同一 `bambulab.jobs.feishu.cn` 官方域名下的内推短链。GET 探针确认短链一次跳转后为 HTTP 200，页面标题为“拓竹科技内推”；旧链接页面标题为“欢迎加入拓竹科技”。据此把本次变化认定为同一岗位来源的合法链接更新，而不是腾讯记录 ID 被复用。
- 修复没有弱化或绕过身份保护，也没有修改 `scripts/sync_27_autumn_jobs.mjs`、`scripts/lib/job-sync-utils.mjs`、测试、GitHub workflow 或自动化配置。使用 service role 对正式 `jobs` 表执行精确条件更新：同时匹配固定 job UUID、公司、`27秋招正式批` 和旧链接后，只把 `apply_url` 改为当前腾讯源短链；返回命中恰好 1 条。任意未来公司、批次或未核验链接变化仍会触发全批次零写入。
- 更新前 `node --test scripts/tests/sync_27_autumn_jobs.test.mjs` 为 10/10。随后正式 apply 锁定 `DY0VXc3BFTFJUbUhw` / `t3r1vl` / `vdHovb`，读取 583 条源记录，其中有效 27 秋招 579、无效 4、非 27 行 0；数据库计划/结果为既有 595、新增 2、更新 0、未变化 117、历史重复跳过 460、源内重复 0、实际写入 2，新增岗位记录为赛乐医疗（8.4）和经纬恒润（7.24）。紧接的只读幂等复查为既有 597、新增 0、更新 0、未变化 119、历史重复跳过 460、源内重复 0、写入 0。
- 自动化 `27` 已回查为 `ACTIVE` heartbeat，仍投递到当前主线程，时刻和失败时通知策略未变；仓库 GitHub Actions 仍使用 Node 24 和相同五个北京时间档位。四条无效源行继续被跳过，27 批次、字段结构、空数据、凭据和身份冲突保护全部保留。本轮项目文件只等量更新三份交接文档；无代码、依赖、环境变量、migration、DDL、自动化或 workflow 变更，无 Git 提交、推送或 Vercel 部署，网站数据已通过正式 Supabase 写入即时恢复。

## 2026-08-18 已上线：内推码广场、即时 MiMo 单次审核与管理员下架

- 用户先要求建立独立内推码系统，随后明确最终审核规则：登录用户提交后先立即公开，再在同一次服务端请求中立刻调用 MiMo 审查；每条码最多调用模型一次，高置信度判定为求职机构、求职辅导、付费服务、代投或引流时自动下架，证据不足保留公开；管理员还必须能在后台查看状态并填写原因人工下架。每三小时任务不再重复审查正常记录，只补偿因请求中断而尚未开始首次审核的漏单。
- 用户端 `/referrals`、岗位清单行内“内推码”入口和公司抽屉继续按公司聚合匿名分享，支持搜索、有效期筛选、复制与举报。上传公司的长下拉已改为当前开放岗位库搜索组合框，完全匹配优先、最多 8 条，支持键盘与鼠标选择；此前截图中的下拉透底叠字由未定义 `--surface-strong-bg` 导致，现使用不透明 `--surface-read-bg-strong`、独立层叠上下文和 13rem 内部滚动区。用户可见文案仅写“智能审核”，不暴露模型供应商。
- 新增 `/api/referrals` 与 `referral-moderation.ts`：浏览器不能直接写表，接口先用真实会话鉴权并调用 service-role-only `create_referral_code_for_review`，数据库原子复核公司/岗位、唯一键并以 advisory lock 限制每账号十分钟最多 5 条；记录写入时 `is_active=true`，因此在审核开始前已公开。随后 `claim_referral_code_for_review` 先把 `review_attempts` 从 0 原子改为 1，再调用 MiMo；模型请求关闭 thinking、要求严格 JSON、把全部用户字段视作不可信内容，并只在指定违规类别且置信度至少 0.8 时下架。模型配置缺失、超时、空响应、非法 JSON或持久化异常均不重复调用，记录保持公开并进入人工复核，服务端日志不写码、公司、说明、原始模型响应或密钥。
- migration `20260817180000_referral_code_plaza.sql` 现在同时定义 `referral_codes`、`referral_code_reports`、单次审核状态/时间/分类/置信度、AI/管理员下架审计字段与六个受控 RPC。匿名和普通登录用户只可读取 `is_active=true` 的公开列，公开列不含 `user_id` 与审核内部字段；普通客户端没有 insert/update grant，只保留 owner 删除和登录举报。批量 claim 使用 `FOR UPDATE SKIP LOCKED`，每次最多 100 条；已领取后失联超过一小时的记录只转人工，不再调用模型。
- 新增 `.github/workflows/review-referral-codes.yml` 与 `scripts/review_referral_codes.mjs`，每三小时运行一次，只领取 `review_attempts=0` 的漏单并最多四条并发完成首次审核；workflow 使用仓库加密的 Supabase 与 MiMo 密钥，日志只输出 claimed/approved/rejected/error 计数。新增 `/admin/referrals`、管理员 API 和 `AdminReferralsClient.tsx`，可按公开/下架/等待/通过/智能下架/人工复核筛选，查看审核依据、置信度、举报数和发布时间；人工下架必须填写 2–240 字原因，API 与数据库 RPC 在提交时双重复核管理员权限，不允许普通用户调用。
- 上传弹窗明确说明“提交后先公开并立即完成一次智能审核”，提交按钮显示“正在上传并审核”；通过、自动下架、人工复核和 localhost 演示分别返回真实状态文案。风险提示仍要求回到官方渠道核对并拒绝联系方式、外链、收费交易和敏感凭证；localhost 仅在正式表/服务不可用时保留显式假演示码回退，正式域名不展示演示数据。
- 已通过内推专项 9/9、Node 全量 132/132、TypeScript、定向 ESLint、完整只读 Smoke（595 条开放岗位）、59 页生产构建和 `git diff --check`。Supabase dry-run 只列出 `20260817180000`，正式 apply 成功；空队列脚本为 0/0/0/0，匿名公开列为 HTTP 200 / `[]`，匿名 `user_id` 为 HTTP 401。功能提交 `90ac876` 与首轮文档提交 `8e4a056` 已推送 `main`，推送前 `HEAD=origin/main=49bd603`；用户原有 `package.json`、`.codex-artifacts/` 与五份 PRD 未暂存、未提交。Vercel deployment `G35tjoLWGnm2ocut3do92ntta6aF` 对 `8e4a05662ae24acf18debc8eae0a3e13d4b6e54d` 返回 `success / Deployment has completed`；正式 `/referrals` 与 `/admin/referrals` 为 200，匿名上传与匿名后台 API 均为预期 401，正式 HTML 检出“内推码广场”和“发布后会立即进行一次智能审核”。GitHub 手动验收 run `32047631473` 的全部步骤成功，五项环境变量均被遮蔽，计数 `claimed=0, approved=0, rejected=0, error=0`。真实 MiMo 合成探针将普通官方填写说明判为 `approved / legitimate_referral / 0.95`，将一对一求职方案和简历面试服务判为 `rejected / career_coaching / 0.95`，未写数据库。没有可用正式登录测试账号，因此真实登录上传→短暂公开→即时保留/下架和管理员人工下架仍未声明 authenticated E2E 通过。

## 2026-08-17 已上线：单一投递清单与每家公司独立星轨

- 用户进一步明确：不同公司的招聘流程不同，星轨不能按账户全局共用，必须允许逐公司单独编辑；“现在要做”和独立“材料准备”对当前管理无帮助，应从主工作台移除；所有公司应集中在一张交互清晰的列表中，并支持按进程与跟进时效组合筛选。
- `MyApplicationsClient.tsx` 已收敛为唯一公司清单，不再并列展示行动面板、材料区、看板或星图。列表直接呈现公司/岗位、当前进程、最近进展、下一步与操作；每行都能原地切换阶段、打开详情或编辑该公司的流程。顶部提供准备投递、已投待反馈、笔试/面试、Offer、已结束等进程筛选，并提供今天有进展、7 天内有进展、7/14 天以上无进展、下一步已逾期等时效筛选，以及需要关注、最近更新、公司名称排序。最近进展明确按该记录最后一次状态或信息更新时间计算，不伪装成已知企业反馈时间。
- `application-workflow.ts`、`ApplicationWorkflowRail.tsx` 与 `ProgressDrawer.tsx` 改为逐条 `user_applications` 读取和编辑星轨。每家公司可独立新增、删除、改名、排序和恢复默认节点，限制为 2–12 个节点、名称最多 12 字且不能重复；自定义节点用金色菱形与金色状态标签突出。每个节点仍映射既有标准状态，使阶段筛选、统计、历史和旧客户端保持兼容；抽屉按该公司节点绘制可横向滚动的轨道，并保留简历绑定、优先级、渠道、账号、联系人、备注、复盘、时间线和结束轨道。
- migration `20260817090000_application_workflow_custom_nodes.sql` 在 `user_applications` 增加 `workflow_nodes jsonb` 与 `workflow_node_id`，流程随投递记录保存并沿用该表既有 owner RLS，不再创建账户级 `application_workflows` 表。数据库约束要求数组为 2–12 个节点；客户端继续做节点 ID、名称、标准状态和重复名称校验。正式 Supabase 项目 `uzzdcjdjlbnxmhvilldj` 的 dry-run 只列出这一条迁移，随后 `db push --linked` 成功；远端 migration history 已回查为 local/remote 同为 `20260817090000`，匿名 REST 对两个新列返回 200，未重写现有投递记录。
- `StatusPill.tsx` 与工作主题状态色继续保持标准阶段可区分，自定义进程使用独立金色语义；已删除不再使用的全局星轨容器样式。自动回归新增“不同公司流程互不影响”覆盖，Smoke 门禁改为要求单一列表、组合筛选和逐公司 migration，并明确禁止重新加入“现在要做”、独立“材料准备”、账户全局星轨及投递看板/星图。
- 最终通过 `npm run typecheck`、定向 ESLint、Node 全量 123/123、`git diff --check`、55 路由生产构建与完整 `npm run smoke`；Smoke 只读读取 595 条开放岗位并验证 `/my` 等 17 个页面与 SEO。首次 Smoke 遇到可重建 Turbopack 持久化缓存损坏，精确清理 `.next` 后第二次发现页面探针仍要求已删除的“当前阶段”旧文案，修正门禁后完整复跑通过。真实登录桌面预览加载 8 条投递且无控制台错误，“笔试 / 面试”筛选准确得到 4/8 条，点击行内“编辑流程”正确打开对应公司的独立 7 节点编辑器；没有点击保存或改写真实记录。移动端视觉、owner RLS 和自定义流程真实保存 E2E 仍未确认。
- 功能提交 `d230d4da69b9c702070e34caf11171e1316b35a8`（`feat: simplify application tracking workspace`）已精确推送 `main`，提交包含 14 个本次文件；提交前 `HEAD`、`origin/main`、`FETCH_HEAD` 均为 `12a4e333d6d059c55c41abf9e6d435282dd30d33`，没有远端并发更新。正式 `https://www.starjob.space/my` 返回 200 / `x-vercel-cache: PRERENDER`，HTML 与 16 个客户端脚本检出“一张清单管理所有公司”“编辑流程”“7 天以上无进展”“这套节点只影响这家公司”“需要关注优先”，旧“现在要做”“材料准备”为 0 命中，确认应用内容已在正式域名生效。GitHub 对该提交的 Vercel check suite 仍为 `queued` 且 combined status 尚无回写，故截至本记录没有 deployment ID 或 `Deployment has completed` 回执，不把正式内容探针等同于该回执。
- 本地预览继续使用 `npm run build` + `npm start`，避免 Next.js 开发热更新所需 `unsafe-eval` 与项目正式 CSP 冲突导致页面停在“正在整理投递记录”；正式安全策略未放宽。用户原有 `package.json`、`.codex-artifacts/`、五份 PRD 和三文档中 2026-08-17 自动化 heartbeat 记录均保留未覆盖且未进入功能提交。

## 2026-08-15 已上线：简历翻译合法语言膨胀被误判为结构异常

- 用户反馈整份简历翻译每次都提示“译文未通过结构校验，原简历未改动，请重试”。诊断确认不是鉴权、空响应、JSON 或键数错误，而是翻译计划把译文字符上限错误地设成源字段上限；中文转英文会自然膨胀，只要一个字段译后超过中文上限，完整且结构正确的译文也会被统一映射为 `invalid_result`，重试无法改变结果。
- 使用当前配置的正式模型做无用户数据合成探针：普通区块为 3/3 键、24 项区块为 24/24 键，均为 HTTP 200、严格 JSON、无缺键/未知键/重复键；边界区块同样 3/3 且结构正确，但目标方向返回 247 字符（旧上限 180）、经历 bullet 返回 1,579 字符（旧上限 1,000），确定复现误拒绝根因。
- `src/lib/resume-translation-plan.ts` 新增统一四倍目标语言安全膨胀系数，翻译计划按目标上限校验模型值；`src/app/api/resume/translate/route.ts` 将可翻译字段的输入/输出 schema 使用同一目标上限，日期、GPA、自定义时间等不翻译确定性字段继续保持原上限。键必须完整且唯一、数组和 bullet 基数、短键路径、拼音白名单、80KB 请求上限、原子合并、失败不改原简历、鉴权、限流和超时均未放宽。
- 新增 `tests/resume-translation-plan.test.ts`，确定性证明 247 字符目标方向和 1,579 字符经历可以在结构不变时合并，同时 721 字符短字段仍因超过四倍上限被拒绝；`scripts/smoke_check.mjs` 增加对应源码与测试门禁。网页 `/api/resume/translate` 与复用它的 `/api/miniprogram/resume/translate` 同时受益，旧请求/NDJSON 契约不变。
- 已通过定向 2/2 测试、TypeScript、定向 ESLint、`git diff --check`、全量 118/118 测试、完整只读 Smoke（读取 489 条开放岗位）和 55 路由生产构建。零 migration/RLS/DDL、零数据库或外部数据写入、零依赖/环境变量/额度变化；用户既有 `package.json`、`.codex-artifacts/` 和五份 PRD 未修改。
- 精确发布提交 `001e01b656475135630812080d1093de1dab5754`（`fix: accept valid expanded resume translations`）已推送 `main`；提交只包含翻译接口、翻译计划、测试、Smoke 与三份同步交接文档。Vercel deployment `B5w9G7BBJCYZBdd5Z69BRgQjv2wo` 对该 commit 返回 `success / Deployment has completed`，完成时间 `2026-08-15T02:58:13Z`。正式 `https://www.starjob.space/resume` 返回 200；网页 `/api/resume/translate` 与小程序兼容 `/api/miniprogram/resume/translate` 的匿名 POST 均返回预期 401。正式登录账号真实简历完成翻译及译本持久化仍未验证，部署成功与匿名鉴权探针不替代 authenticated E2E。

## 2026-08-11 诊断提案：投递管理工作台信息与状态直观性

- 用户要求先阅读三份项目交接文档，再构思 `/my` / `/my-applications` 投递管理工作台的优化方向；本轮只做诊断与方案，不实施界面、组件、数据或交互改动，全部建议待用户确认。
- 当前根因不是功能缺失，而是首屏并列呈现总数、本周待办、材料准备、搜索筛选、列表/看板/星图与完整抽屉，缺少一个明确的“现在先做什么”主线；`tasks.slice(0, 4)` 让顶部“待跟进”数实际最多为 4，不能代表全部待处理数量；工作主题下状态胶囊基本同色，列表优先级显示为数字，状态、紧急度和下一步动作难以快速扫读。
- 候选决策是把默认首屏改成行动优先工作台：先展示逾期/今天/本周待办与下一步动作，再展示四段主流程（候选、已投、选拔、结果），完整记录放在后面；状态保留现有数据库枚举与候选子阶段，只重组信息层级，不删除列表、看板、星图、星瓶、简历绑定、进度抽屉或历史记录。
- 本轮仅将用户提供的 `PROJECT_CONTEXT_FINAL.md`、`PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md` 从 Downloads 移入项目根目录，并同步本条诊断记录；零业务代码改动、零 API/类型/migration/RLS/数据库或外部数据写入、零依赖与环境变量变化、零测试命令、零 Git 暂存/提交/推送、零部署。诊断证据来自三文档相关章节以及只读检查 `MyApplicationsClient.tsx`、`career-workspace.ts`、`StatusPill.tsx`、`ProgressDrawer.tsx`、`ApplicationOrbit*` 与 `globals.css`；真实登录数据态、桌面/移动端视觉验收和用户可用性测试尚未执行。

## 2026-08-10 已上线：网申助手展示图 Retina 清晰度修复

- 用户在 iPad Safari 截图中反馈 `/extension` 首屏右侧产品展示图明显发糊。根因已实测：源 PNG 只有 380×840 px，页面以最高约 350 CSS px 宽展示；在 2× Retina 屏幕上需要约 700 个物理像素，旧图被放大后每个设备像素只能获得约 0.54 个源像素。左侧网页文字由浏览器实时渲染所以清楚，右侧位图模糊；PNG 格式或网络压缩不是主因。
- 使用 0.2.6 当前真实 `popup.html`、`popup.css`、`popup.js` 预览状态，以本机 Chrome `force-device-scale-factor=2` 原生重新栅格化为 760×1680 PNG，没有对旧图做插值放大。新 `public/assets/extension/starjob-resume-assistant-popup-v026.png` 为 155,148 bytes，SHA-256 `60aef3c018467d36f119e436fe6dc175630c868f24bc9a94d2555e8b4e882c05`；视觉检查确认文字、1px 分隔线、进度条和按钮边缘清晰。
- `ExtensionHubClient.tsx` 的图片内在尺寸同步改为 760×1680，并显式使用 `h-auto w-full`，在现有 `max-w-[350px]` 容器内保持相同版式、比例和移动端行为，只提高高分屏采样密度。没有改变首屏结构、扩展功能、0.2.6 安装包、旧安装包、API、数据库、权限或用户数据。
- `scripts/smoke_check.mjs` 新增 PNG 文件头与 IHDR 宽高回归门禁，产品图不是精确 760×1680 时发布检查直接失败，避免以后重新引入 1× 低清资产。
- 已通过 `npm run typecheck`、定向 ESLint、`git diff --check`、55 路由 `npm run build` 和完整只读 `npm run smoke`；Smoke 明确输出“网申助手产品图为 760×1680 Retina 2× PNG”，并读取 474 条开放岗位、验证全部公开主路径与 SEO。2× 桌面 2880×1800、移动 780×1688 页面截图未发现图片比例变化、裁切或新增横向溢出；首次访问欢迎弹层属于既有行为，不计作本次回归。
- 本轮三项任务文件已精确提交并推送 `48b3f3c0c79856624ad776adb85342167e18d1e3`（`fix: sharpen extension product preview`）；提交前本地、`origin/main`、`FETCH_HEAD` 均为 `b717730758fe9b3c97901471aa9e4e5bcf1b203c`，无远端并发更新。用户现有 `package.json` 元数据、`.codex-artifacts/` 和五份 `docs/prd` 保持未暂存、未提交。
- GitHub Vercel 状态对精确 commit 返回 `success / Deployment has completed`，deployment `9UkYrKdYUeQmwYAmSVHUmceeyezs`，完成时间 `2026-08-10T13:12:42Z`。正式 `/extension` 为 200；正式 PNG 实读为 760×1680、155,148 bytes、SHA-256 `60aef3c018467d36f119e436fe6dc175630c868f24bc9a94d2555e8b4e882c05`，与本地逐字节一致。响应为 `content-type: image/png`、`cache-control: public, max-age=0, must-revalidate`、`x-vercel-cache: MISS`，不会长期锁住旧 380×840 资产；正式 14 个客户端脚本已检出该资产和 760×1680 内在尺寸，供应商名称为 0 命中。

## 2026-08-10 已上线：简历导入全文 AI 重构、全功能体验清扫、网申助手 0.2.6 与正式数据库加固

### 用户反馈、根因与产品决策

- 用户用真实英文简历截图反馈：PDF 提取文本出现 `· ü`、``、`` 等字体项目符号乱码；AI 复核经常卡在第三个区块；工作、项目和网址等记录边界被合并；最终结果没有体现“AI 读完整份简历后自己决定每个区块怎么填写”。目标不是修补第三块，而是让 AI 先理解全文，再一次性给出基础信息、教育、工作、项目、技能与其他区块的完整结构。
- 根因分为两层：PDF 自定义字体把项目符号映射成 `ü` 等字符，污染了本地识别和模型输入；旧 `parallel_parts_v2` 让三个请求各自看同一全文但只输出局部结构，任何一个区块失败又会把程序本地草稿静默混回 AI 结果，导致用户看到“复核成功”但第三块仍是错误合并内容。独立分块还无法统一判断一个新公司、新项目、网址或页眉到底属于哪个区块。
- 决策改为 `holistic_structure_v3`：单次 AI 必须先通读全文、识别全部区块边界并返回一份完整 JSON；只有全结构通过 schema、字段清理和确定性基础信息保护后才显示智能结果。任何失败都不混入局部兜底，不再把程序结果包装成 AI 成功。本地识别结果仍单独保留，用户可以明确选择直接导入。

### 实际改动、体验与兼容

- 新增 `src/lib/resume-import-text.ts`，在文件提取与本地解析两层确定性清理行首 Wingdings / PDF 伪项目符号、软连字符和排版噪声；只处理行首模式，`München` 等正文合法变音字符保持不变。`resume-file-reader.ts` 与 `resume-import.ts` 共用该归一化逻辑，避免浏览器和服务端理解不同文本。
- `/api/resume/import` 改为一次完整结构调用：120 秒函数上限、100 秒上游窗口、关闭 thinking、7,600 output token；提示词明确禁止把联系方式、网址、页眉页脚当作经历，要求每个公司、项目和日期范围建立独立记录，并清理三类伪项目符号。返回后统一执行 `sanitizeReviewedDraft`、完整 schema 校验和确定性基础信息保护，不再存在 `createFallbackPart` 或三块 `Promise.all`。
- 导入弹窗流程改为“01 本地读取 · 02 AI 理解全文 · 03 确认导入”，按钮使用“AI 智能整理 / 导入智能整理结果”，等待上限 118 秒；进度只展示可证实的两步：AI 返回后进入完整校验、全部区块校验通过。界面明确说明失败不会混入未复核局部结果，程序本地结果始终可单独预览和导入。
- 请求与最终 JSON 契约保持不变，旧网页和小程序兼容入口仍可解析结果；没有删除本地导入、中文/英文模板、原文保护或确认导入步骤。正式界面继续使用供应商中性“AI”文案。用户截图不是原 PDF 文件，因此尚不能把其私人文件在正式账号下的最终导入声明为 authenticated E2E。

### 正式数据库与验证证据

- 正式 Supabase 项目已在用户授权的 Chrome 登录会话中核对为 `uzzdcjdjlbnxmhvilldj`。按序成功执行并登记迁移历史：`20260810110000_extension_autofill_durable_rate_limit`、`20260810142000_admin_user_mutation_guard`、`20260810143000_star_interview_completion_reservations`、`20260810144500_star_interview_asr_reservations`。
- 第四条迁移首次执行在第 451 行 `case` 表达式处得到 PostgreSQL `42601 syntax error at end of input`；整个事务自动回滚，未形成半迁移。代码随后把 `reserved_fen <> case ... end` 改为带括号的 `reserved_fen <> (case ... end)`，新增回归断言，ASR 专项 13/13 通过后重新执行成功，返回 cron schedule `2`。
- 正式库最终只读总核验：目标表 6/6、关键函数 19/19；目标函数 `service_role_only=true`，匿名与 authenticated 均无执行权；三个 cron 为 `star-interview-asr-lease-reconcile`、`star-interview-completion-cache-purge`、`star-interview-maintenance-history-purge`；active admin guards=0；迁移历史回查 4/4。
- 本地最终门禁：TypeScript、ESLint、Node 116/116、扩展真实 Chrome 夹具 5/5、0.2.6 ZIP 12/12 文件一致与 0.2.5 旧载荷兼容、小程序 11 页面/60 文件检查、Next.js production build 55 个路由、完整只读 smoke 和 `git diff --check` 全部通过。Smoke 增加运行时乱码样本与 `München` 保留断言，并验证教育、工作、项目区块独立。
- 数据库迁移完成后已精确提交并推送 `b717730758fe9b3c97901471aa9e4e5bcf1b203c`（`feat: harden StarJob workflows and resume import`），共 118 个任务文件；提交前 `HEAD`、`origin/main`、`FETCH_HEAD` 均为 `788386a24eb5d616e200437880ab60c73994b6ca`，无远端并发更新。用户原有 `package.json` 元数据、`.codex-artifacts/` 与五份 `docs/prd` 均未进入提交；`package.json` 只暂存发布脚本和 `pdfjs-dist` 两处任务 hunk。
- GitHub Vercel 状态对该精确 commit 返回 `success / Deployment has completed`，deployment `BR8roTQX5hWyxQxcpi8HH1i2CsQo`，完成时间 `2026-08-10T03:51:49Z`。正式 `/resume`、`/extension`、`/extension/guide` 均为 200；正式 0.2.6 ZIP 为 160,719 bytes，SHA-256 `014c07b693aae8737c22012cc0cd51dec6fe2c064f0ad1ef067b617d9cee178a`，与仓库逐字节一致，0.2.5 旧包仍为 154,175 bytes；导入与 extension-autofill 匿名 POST 均为预期 401。正式 `/resume` 的 16 个客户端脚本已检出“AI 理解全文”“导入智能整理结果”“失败不会混入未复核的局部结果”和 118 秒窗口，供应商名称为 0 命中。

## 2026-08-10 上线前审计历史快照：用户批准 A/B/C、六项页面优化、网申助手 0.2.6、管理员与诘星计费加固（后续状态以上一节为准）

### 用户目标、审计范围与决策

- 用户要求从真实使用角度全面扫描网站、网页简历、小程序、浏览器扩展和服务端底层逻辑，直接修复不改变既有产品方向与协议的缺陷；涉及视觉层级和排版方向的调整先形成编号方案，等待用户审核后再改。正式用户界面继续使用“AI 智能填写 / AI 分析”等供应商中性文案。
- 用户随后明确回复“A、B、C 都做，同意”，因此本轮已在保持现有冷色深空设计体系、旧协议与全部原功能的前提下实施六项页面优化；用户同时确认正式 Supabase 已在 Chrome 登录。该确认允许进入 migration 操作，但在实际读取项目 SQL 编辑器、执行并回查之前不得写成 hosted DDL 已完成。
- 本轮静态审计覆盖 `src/app` 的 28 个页面入口、51 个 API 路由、27 份数据库迁移、小程序配置中的 11 个页面以及 Manifest V3 网申助手；本地浏览器分别在 1280×720、768×1024、390×844 等视口检查首页、岗位探索、个人中心、简历、拾星指南、扩展下载与教程等主路径，并实际验证岗位关键词筛选从 453 条缩小到 3 条后可恢复 453 条。
- 修复原则是：错误、空状态和取消必须可恢复；不可观测的模型内部过程不得伪造百分比；长列表不得为动画牺牲交互速度；兼容旧网页 JSON、旧小程序请求与旧扩展安装包；无真实账号、真实企业 ATS 或隔离测试库时，不把匿名探针、构建或源码审查写成 authenticated E2E。

### 实际改动与行为

- Web 端补齐岗位、投递、指南、个人资料等加载失败与重试状态，避免把网络错误误呈现为“没有数据”；个人中心先完成登录态判定再显示登录页，消除未登录界面闪烁。清空岗位筛选现在同步恢复关键词、类别、地点层级、快捷范围、视图和 URL；完整 453 条列表不再给每一行做布局测量动画，结果不超过 80 条时才保留克制过渡，筛选与滚动明显减负。
- 用户批准的六项页面优化已经实现：768–1023px 顶部导航收为三个主入口与“更多”菜单，岗位统计在平板改为有标签的 2×2；首页在不超过 720px 高度时降低轨道最小缩放并预留顶部/底部安全区；移动端置顶指南把分类/重点标签与标题分层，标题允许两行且“阅读全文”独立占位；简历移动端只保留“新建简历”一个主 CTA，网申助手与导入收进“更多”；导航、浮动 AI 任务、抽屉和欢迎弹层共用 safe-area 变量；`/explore` 平板收紧段落间距并在 768px 起使用地图/岗位预览双栏，地图最小高度按移动/平板/桌面分级，完整连续岗位清单保持不变。
- 扩展下载页已用 0.2.6 自身 `popup.html` / `popup.css` / `popup.js` 的真实本地预览状态重新由 Chrome 渲染产品图，展示“只填空白项 / 覆盖已有内容 / AI 智能填写”、填写结果和四段处理进度；新资源为 `public/assets/extension/starjob-resume-assistant-popup-v026.png`，380×840，SHA-256 `1528b82cf6ed65f9960b78f8ee1b1c23459c0d2a6d3f9389eddb27ea14ba5119`，旧宣传资产保留但正式页面不再引用旧两模式设备图。
- 统一业务弹窗补齐焦点初始落点、Tab 焦点循环、Escape、关闭后焦点归还、多弹窗滚动锁计数和移动端 overscroll；全站增加“跳到主要内容”，为搜索、筛选、分段选择和视图切换补齐 label、group、`aria-pressed`、状态播报与错误语义。若干误导文案、重复欢迎弹窗逻辑、岗位动作回调、空状态与按钮命名同步收敛。
- 网申助手升级为 0.2.6：按从上到下的顺序处理完整表单，50 字段一批、最多 750 字段；只有所有 AI 批次成功并通过服务端白名单、事实来源、选项、日期/描述绑定和敏感字段校验后才一次写入页面，任一批次失败为零写入，超过 750 字段也在模型调用前明确停止。同一次点击使用可选 `operationId` 合并批次额度，0.2.5 不传该字段仍按原协议工作；跨 iframe 字段键把 frame 和字段序号放在截断前缀，避免长路径碰撞错填。进度条使用 ARIA 且不再每秒打断读屏，旧 Chromium 使用安全随机数回退生成操作 ID；仍不读取 Cookie、不自动提交、不放宽敏感字段和事实来源约束。
- 小程序导入、润色、整份翻译改为诚实的不定进度、真实已用时和独立取消，不再用时间推算 60%–95% 或虚构“核对事实”阶段。取消状态覆盖 token 获取、刷新、401 重试、RequestTask 创建、页面隐藏/卸载和服务端写库前边界；已取消任务不会从隐藏页弹窗或跳转，导入取消与失败也不再覆盖已有简历列表。服务端将请求中止信号传给 AI 与 Supabase 查询，并在创建简历或译本前再次检查取消。
- 服务端补强：`20260810110000_extension_autofill_durable_rate_limit.sql` 将网申助手额度改为数据库原子窗口（15 批/操作、5 操作/用户/10 分钟、15 批/用户/10 分钟），不再依赖单实例 Map；`20260810142000_admin_user_mutation_guard.sql` 以持久 guard、权威 Auth/Profile 回读和 300 秒恢复栅栏编排管理员角色、封禁与诘星权限修改，管理页可独立列出并恢复未完成 guard。余额发放每一笔在数据库事务内复核主管理员身份，浏览器按标准化载荷的 SHA-256 摘要跨刷新/标签页复用 24 小时幂等 UUID，只有服务端明确全量成功才清除。
- 诘星回答与 ASR 分别由 `20260810143000_star_interview_completion_reservations.sql`、`20260810144500_star_interview_asr_reservations.sql` 做上游前原子预占、同载荷并发合并、24 小时结果缓存、明确失败退款和失联 lease cron 回收；调用方在供应商请求发出后取消按已消费结算，避免断开重试免单。每次真正 dispatch 前再次从 Auth/Profile、封禁和 guard 重算权限与 unlimited 模式；ASR 同一音频成功后直接回放缓存，不再二次调用供应商，缓存过期或发出后取消的 key 转为 `consumed` 并要求新请求。
- StarInterview ASR 继续由服务端解析实际 WAV PCM/Float 数据长度计费，拒绝截断、伪造 byteRate、重复 `fmt` 等歧义结构；管理员策略禁止主管理员被停用/降级、普通管理员操作其他管理员或管理员修改自己；27 秋招同步在同一来源记录的公司、链接或批次发生身份漂移时 fail-close；简历写入继续保留 CAS 冲突保护，AI 长请求统一向上游传递取消和超时。
- PDF 文本提取依赖由受影响的 `pdfjs-dist@6.1.200` 精确升级至修复版 `6.2.108`，并增加 loading task/page 清理、60,000 字增量上限和用户可理解的失败文案。类型检查前置脚本只删除与正本逐字节相同的 `.next/types/* 2.ts` 等数字后缀缓存副本，缺少正本或内容不同则直接失败；Chrome 扩展夹具增加真正超时终止，新增安装包源码逐文件一致性、0.2.5 真包兼容、小程序递归密钥扫描和只读 smoke 契约。

### 兼容与安装包边界

- 0.2.6 官网包为 `public/downloads/starjob-resume-assistant-v0.2.6.zip`，160,719 bytes，SHA-256 `014c07b693aae8737c22012cc0cd51dec6fe2c064f0ad1ef067b617d9cee178a`；`dist/拾星网申助手-v0.2.6.zip` 与其逐字节一致，ZIP 内 12/12 文件与当前源码逐字节一致且 `unzip -t` 通过。
- 0.1.7–0.2.5 官网安装包全部保留；校验器直接读取 0.2.5 真包，确认其仍发送不含 `operationId` 的 `{ resume, fields }`，当前服务端保持该字段可选，因此没有把升级 0.2.6 作为旧客户端继续工作的前提。本轮未增加扩展权限、未删除本地规则填写、覆盖填写或 AI 智能填写能力。
- 本轮唯一依赖安全升级是 `pdfjs-dist` 6.2.108；新增 110000、142000、143000、144500 四份 migration，但截至本记录生产只读 REST/OpenAPI 探针仍显示 5 张新表为 404、6 个新 RPC 不存在，说明 hosted DDL 尚未执行。正式发布必须严格先执行 110000，再执行 142000 → 143000 → 144500，核对函数权限与 cron 后才推送应用；反序会让新管理/诘星路由按设计 fail-closed 503。27 秋招同步只读 dry-run 为 source 439、valid 435、invalid 4、database 453、inserts 0、updates 0、written 0。

### 验证证据

- 发布前最终复跑 `npm run check:release`，在允许启动本机无头 Chrome 的发布环境完整通过：TypeScript、ESLint、Node 114/114、真实 Chrome 扩展夹具 5/5、0.2.6 包一致性、0.2.5 兼容、小程序 typecheck/validate、Next.js production build 和只读 smoke 全部成功；production build 编译 55 个静态/动态页面与路由，smoke 读取 453 条开放岗位并验证 17 个页面及 SEO。构建后再次 `npm run typecheck` 通过，证明数字后缀缓存预检可重复工作；`git diff --check` 通过。默认 Codex 沙箱禁止启动本机 Chrome 时会得到空 stdout 的假失败，不得据此误判扩展代码失败；夹具启动器已增加独立远程调试端口和“Chrome 未输出页面内容”诊断，使环境启动失败与表单断言失败明确分离。
- 二次独立只读审计结论为代码层 P0=0、P1=0：诘星/请求键/WAV 聚焦 59/59、管理员 23/23、余额幂等 5/5 均通过；完整 smoke 与 build 通过。新增 ASR 成功缓存 partial index 后又完成一次只读复核，ASR 专项 13/13 与完整 smoke 通过，索引未改变 RLS、RPC 权限或滚动兼容，也未引入新 P0/P1。该结论不替代生产 migration 门禁，也不等于真实账号计费 E2E。
- 小程序结构校验确认 11 个页面、递归扫描 60 个客户端源码文件，未发现服务端密钥标识。WAV 真实时长、重复 `fmt`、管理员权限、同步身份漂移、AI 请求键、取消竞态、页面离开、iframe 隔离、字段异常和旧扩展载荷均有自动化回归覆盖。
- `npm audit --omit=dev --audit-level=high` 仍报告 6 个无可用修复的传递依赖问题（4 moderate、2 high）：`jspdf -> dompurify` 与 `next/postcss -> nanoid`；PDF.js 6.1.200 所在的 GHSA-hq66-cqwq-w95j 已不再出现。不能据此宣称依赖风险为零，后续等待上游发布并复核真实调用路径。
- 浏览器截图证据位于 `/tmp/starjob-full-audit-2026-08-10/`：`24-home-postbuild-1280x720.png`、`27-explore-postbuild-loaded-768x1024.png`、`17-resume-mobile.png`、`18-forum-mobile.png`、`26-extension-postbuild-390x844.png` 等。基础响应式、主路径加载、筛选恢复和公开信息层级已实测；没有登录测试账号，因此投递保存、云端简历、管理操作、真实 AI 额度扣费与跨用户 RLS 未做 authenticated E2E。

### 已知风险与禁止过度声明

- 代码层已无 P0/P1；剩余 P2 必须保留：ASR 权限确认事务与真实 `fetch` 之间存在不可完全消除的极短窗口；ASR 仍以 `reserved` 表示已确认请求，极端进程冻结超过 120 秒可能先被 cron 退款后产生一次供应商重复成本；缓存过期扫描已增加 `cache_expires_at` partial index，但单次仍最多处理 500 行，规模扩大后需观察锁竞争。8 月 17 日前的 rolling alias 每账户只桥接一个旧 meter；管理员恢复 300 秒是时间栅栏而非 GoTrue fencing token；余额 UUID 24 小时后及无持久存储能力的旧浏览器跨重启不保证复用。
- 若新代码运行后数据库存在 active admin guard，禁止直接回滚到旧管理员 route；必须先确认 guard=0，或保留 guard-aware 路由完成恢复。真实企业 ATS、Word/WPS/Canva/LaTeX PDF 导出、小程序开发者工具与真机、正式登录计费链路和隔离测试库跨用户 RLS 仍未实测。

### 用户已批准并实施的排版优化

1. 平板 768–1023px 已将八项顶部导航收成三个主入口加“更多”，453/422/0/116 等统计已改为有标签的 2×2 网格。
2. 首页已为不超过 720px 的低高度桌面增加轨道安全区和动态缩放下限，保持现有星系风格。
3. 移动端指南置顶内容已允许标题两行，并为分类、重点标签和阅读动作分别保留空间。
4. 扩展下载页已换成真实 0.2.6 三种填写方式、结果与进度界面。
5. 简历移动端已只保留“新建简历”主 CTA，网申助手和导入进入紧凑“更多”菜单；相关浮层共用 safe-area 变量。
6. `/explore` 平板首屏已收紧地图前空白与地图最小高度，并保持完整连续岗位清单。

### Git、部署与用户既有文件

- 本轮已获用户明确上线授权，但截至本记录仍停留在本地发布候选态：`HEAD` 与 `origin/main` 均仍为 `788386a24eb5d616e200437880ab60c73994b6ca`；没有暂存、提交、推送、Vercel 部署、正式包发布或回滚。用户已确认 Chrome 中正式 Supabase 登录完成；下一步必须在该已登录会话核对项目 ref 后按上述顺序迁移并回查，再精确暂存、提交和推送。
- 用户原有 `package.json` 元数据修改、`.codex-artifacts/` 和五份未跟踪 PRD 均保留且未暂存；任务新增脚本与依赖修改虽与 `package.json` 同文件共存，但没有覆盖或回退用户内容。正式提交必须只交互式暂存 `package.json` 的任务脚本与 `pdfjs-dist` hunk，绝不能把用户元数据或上述未跟踪文件带入提交。

## 2026-08-09 已上线：AI 长任务体验清扫与网申助手 0.2.5

### 用户目标、根因与决策

- 用户要求对简历导入、分段润色、整份翻译和网申 AI 智能填写做一次彻底体验清扫：生成过程全面可见、等待逻辑更清楚、速度更快、可取消、失败不损坏原内容，并继续支持原有网页、小程序、扩展同步协议和旧安装包。正式界面继续只使用“AI 智能填写 / AI 分析”等供应商中性文案。
- 审计确认慢并不只是模型本身：导入旧接口要求一次生成整份大型 JSON，网申助手超过 50 个字段时两批串行，导入/润色/翻译各自维护不同等待 UI，22/43/60 秒等客户端与服务端窗口互不一致；因此用户只能看到旋转图标或静态四行状态，无法判断系统是否仍在工作。
- 采用统一任务状态与“可证实进度”原则：确有区块/批次完成时才显示百分比；模型内部不可观测时只显示持续处理中和真实已用时，不伪造阶段百分比。所有写入型流程继续在完整结果通过校验后才执行，取消和失败保持原文、原简历、本地识别结果或页面原有内容。

### 实际改动与行为

- 新增 `src/components/ui/AiTaskProgress.tsx`，统一真实区块进度、不确定等待条、已用时、ARIA progressbar、减弱动态效果、保护说明和取消按钮。`ResumeBuilderClient.tsx` 的整份翻译改为复用该组件，仍使用服务端 NDJSON 的真实 completed/total，全部区块成功后才创建独立译本。
- `ResumePolishDialog.tsx` 接入统一任务条，原文与建议稿继续并排；生成时明确“完成后先展示对照稿”，只有用户点击应用才替换。浏览器超时由 22 秒调整为 55 秒，服务端由 18 秒调整为 45 秒、函数上限 60 秒；thinking 关闭、严格 JSON、缓存、事实/核实约束与旧响应结构不变。
- `src/app/api/resume/import/route.ts` 改为 `parallel_parts_v2`：同一份完整提取原文分别复核“基础信息与教育”“工作与项目”“技能与其他”三个较短输出区块，三批并行、各自最多 70 秒，并显式关闭 thinking。网页可选 `progressMode=ndjson` 接收 start/progress/result/error；旧调用不传该键时继续得到原完整 JSON。单一区块失败时只对该区块回退到程序本地草稿并给出 warning；三块全部失败则整体失败，绝不把纯本地结果伪装成智能复核成功。网页端等待上限 105 秒，始终保留“直接导入本地结果”和停止复核。
- 网申助手升级为 0.2.5：弹窗新增真实批次进度条、百分比、阶段文案和已用时；最多 100 个字段仍按 50 个一批，但两批由串行改为并行，单批窗口从 60 秒调整为 85 秒。用户可在分析阶段取消；进入最终页面写入前会关闭取消入口并显示“正在安全写入页面”，因此取消成功时页面尚未改变。只有所有批次成功后才把映射写入扩展存储并执行 `fill.js`，原子边界不变。
- `extension-autofill` 服务端窗口调整为 75 秒、函数上限 90 秒。模型若多返回未知短键或重复短键，不再让整批直接报“安全校验失败”，而是丢弃这些映射并记录不含用户内容的计数；已知映射仍逐项经过原字段键恢复、最低置信度、事实来源、字段类型、选项白名单、记录日期/描述绑定、敏感字段和主观题硬限制，没有放宽实际可写值的安全门。
- 安装包与官网/教程统一指向 `public/downloads/starjob-resume-assistant-v0.2.5.zip`；扩展 README、manifest、popup HTML/CSS/JS、`ExtensionHubClient.tsx`、`ExtensionGuide.tsx` 和 Smoke 约束同步更新。0.1.7–0.2.4 文件和旧扩展同步/填写能力未删除。

### 兼容边界与验证证据（最终）

- 已通过 `npx next typegen`、清理三个确认的 `.next/types/* 2.ts` 数字后缀生成缓存副本后 `npx tsc --noEmit`、定向 ESLint、`node --check popup.js`、完整 `npm run smoke`（读取 453 条开放岗位）、`npm run build`（55 个静态/动态路由）和 `git diff --check`。`npm run build:extension` 可复现生成 154,175-byte 0.2.5 ZIP，SHA-256 为 `bffa022da721d3a765ee419cc45a23b952f04f2ca78900e2d43ca988be259404`；`unzip -t` 全文件通过，public 与 dist 副本逐字节一致，manifest 仍为 MV3 且只有 activeTab/scripting/storage 最小权限。
- 本地正式构建 HTTP 探针：0.2.1、0.2.2、0.2.3、0.2.4、0.2.5 五个安装包均为 200；网页导入旧 JSON 请求、NDJSON 请求和润色请求匿名均为预期 401，证明鉴权先于模型调用且没有暴露服务配置。用户可见简历/扩展组件中供应商名称命中数为 0。
- in-app browser 在 1024×768 实测 `/resume`、导入初始态和 370 字合成 TXT 的本地识别态；01/02/03 层级、文件仅本地读取、识别信号、直接导入和唯一主操作均可见，无裁切或横向溢出。截图证据为 `/tmp/starjob-ai-ux-audit/after-resume-desktop.png`、`after-import-dialog.png`、`after-import-local-result.png`。浏览器安全策略不允许直接打开 `file://` 扩展弹窗，因此扩展视觉只完成 HTML/CSS/ARIA 源码、语法、ZIP 与 Smoke 检查，不把它写成浏览器实装验收。
- 精确提交 `788386a24eb5d616e200437880ab60c73994b6ca`（`feat: make AI workflows visible and resilient`）只包含 17 个任务文件，`main` 与 `origin/main` 已同步。Patrick Vercel deployment `4kHetXzT6U1y1XWfcHJMLTYiPxgF` 已返回 `success / Deployment has completed`。正式 `/resume`、`/extension`、`/extension/guide` 均为 200；正式 0.2.5 ZIP 为 154,175 bytes 且 SHA-256 与本地完全一致，0.2.1–0.2.4 旧包继续为 200；导入旧 JSON、导入 NDJSON、润色和 extension-autofill 匿名 POST 均为预期 401。正式 `/resume` 的 16 个客户端脚本已检出分区复核、润色任务条、统一保护文案、翻译原子创建与 105 秒客户端窗口，官网/教程检出 0.2.5 且供应商名称为 0 命中。
- 本轮无 migration、hosted DDL、数据库/外部数据写入、环境变量、依赖或小程序客户端发布。没有正式登录测试账号，因此未把真实简历经正式域名完成导入/润色/翻译、或 0.2.5 在真实企业 ATS 的整页填写声明为 authenticated E2E；部署成功、匿名鉴权、静态标记和 ZIP 一致性不替代该边界。用户既有 `package.json`、`.codex-artifacts/` 与五份未跟踪 PRD 保持未暂存、未提交。

## 2026-08-09 Current Authority — English Resume Name Priority

> 当前 `main` / `origin/main` / production 基线为 `417dce8`（`fix: prefer English names in translated resumes`）。Patrick Vercel deployment `FtKvhEDjwWuKK9cPQDTnAwPGJWu9` 已返回 `success / Deployment has completed`。

- 英文译本姓名现在按确定优先级处理：已填写 `englishName` 时，英文副本的 `name` 和 `englishName` 都使用该值且不调用模型；英文名为空、中文姓名存在时才创建受限 `person_name_pinyin` 短键，要求姓在前、名在后并禁止自造英文名；原姓名已为拉丁字符时直接保留。转中文不从英文反向猜测中文姓名。
- 服务端只接受由英文字母、空格、点、撇号和连字符构成的拼音结果；非法结果使区块失败，原子合并和原简历保护不放宽。客户端创建英文副本时也以 `englishName` 再次统一 `name`，兼容旧响应。
- Smoke 验证 `Stella Wang` 优先和 `王小星` → `Wang Xiaoxing`；正式配置合成姓名 1.34 秒 / HTTP 200 / reasoning 0 / 拉丁字符校验通过。TypeScript、定向 ESLint、完整 Smoke、55-route build 与 diff check 通过。
- 正式 `/resume` 200，网页与两个小程序翻译入口匿名请求仍为 401。没有 migration、数据库写入、环境变量、扩展或小程序发布；无登录态 production 姓名翻译 E2E。

## 2026-08-09 Current Authority — Chunked Resume Translation and Real Progress

> 当前 `main` / `origin/main` / production 基线为 `c7bfebfc3b81df710621b98f52f15ce0b57a1991`（`fix: translate resumes in resilient chunks`）。Patrick Vercel deployment `po5SRvex5n5TnNgoLMs2UdTQTJ4E` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- 继续失败的瓶颈已从超时误分类收敛到单次大输出：旧链路要求一个请求生成完整严格简历 JSON，长简历输出增长会同时放大耗时和结构校验失败面。现在 `/api/resume/translate` 只向模型发送非空文字叶子的 `t0...` 短键；每块最多 24 项/约 1,800 源字符，两块并行、单块 60 秒、整批 150 秒，并在一次鉴权和一次用户级限流槽内完成。
- 用户填写的英文名、日期、GPA、current、联系方式、链接和照片仍由确定性代码保护；仅转英文且英文名为空时允许中文姓名通过受限拼音短键处理。所有块必须返回精确、唯一且完整的短键；只有全部成功后才按内部路径写入克隆、执行完整 schema 与数组/bullet 结构校验并创建独立译本。任一块失败不会产生部分副本或改写原简历。
- 网页新客户端以可选 `progressMode=ndjson` 消费 start/progress/result/error 流，固定底部进度条只按真实完成区块推进，显示区块数并保留取消；包含 `role=progressbar`、ARIA 数值和 reduced-motion 支持。旧网页调用、小程序兼容入口 `/api/miniprogram/resume/translate` 及旧 `/api/miniprogram/resumes/[id]/translate` 均不传该模式，因此继续使用原最终 JSON 契约和原 180 秒函数窗口。
- 正式配置双块探针：16+16 项并行分别 23.0 秒/21.2 秒，总 23.0 秒，32/32 短键完整、reasoning=0。定向 ESLint、TypeScript、完整 Smoke、55-route build、diff check 通过；桌面和 390px 手机布局无横向溢出。
- 正式 `/resume` 为 200，线上客户端含 NDJSON、真实翻译进度、区块计数、原文保护和取消标记；网页及两个小程序翻译入口匿名 POST 均为 401。没有 migration、数据库写入、环境变量、扩展包或小程序客户端变化；没有正式登录账号，故真实用户简历的 production authenticated E2E 仍未声称通过。用户原有 `package.json`、`.codex-artifacts/` 和五份 PRD 均未入提交。

## 2026-08-09 Current Authority — Resume Translation Reliability Fix

> 当前 `main` / `origin/main` 基线为 `6ee31a7`（`fix: align translation runtime config`），主体功能提交为 `ac6cf54`（`fix: make resume translation reliable`）。Patrick Vercel deployment `EnG6YdBxiSyoBRo9j1dgE4qBA5ZK` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- `/api/resume/translate` 的旧 32 秒上游窗口会在响应头 200、正文仍读取时触发 abort；`response.json().catch(() => null)` 随后把 abort 吞成空响应，最终错误显示“AI 未返回译文”。该接口也遗漏了结构化翻译需要的 thinking 关闭参数。
- 修复后使用 180 秒函数上限、150 秒上游窗口和 165 秒浏览器窗口；thinking 已关闭。正文 abort 继续作为 504 超时传播，非法 JSON、真实空正文、鉴权和繁忙分别映射，不再混为同一提示。
- 网页 `/api/resume/translate`、小程序兼容 `/api/miniprogram/resume/translate` 和旧版 `/api/miniprogram/resumes/[id]/translate` 均保留原路径及契约；后两个入口同步采用 180 秒函数窗口。成功仍创建独立译本，失败仍不修改原简历，严格结构与事实保护没有放宽。
- 新增 Smoke 静态契约锁定三个入口的运行窗口、thinking 模式、客户端时限和 AbortError 分类。定向 ESLint、TypeScript、完整 Smoke、55-route build、diff check 均通过；真实合成翻译 22.3 秒 / HTTP 200 / reasoning 0，结构计数完整。
- 正式 `/resume` 返回 200；网页、小程序兼容和旧版小程序三个翻译入口的匿名请求分别保持 401；线上客户端 chunk 检出 165 秒等待、超时提示、进行中提示和取消翻译。正式响应头确认 Node 函数仍在项目级 `iad1` 执行；`preferredRegion` 对 Node Route Handler 无效且仅适用于 Edge runtime，因此校正提交不保留该声明，也不把本次单路由热修扩大为全站区域迁移。没有 migration、hosted DDL、Supabase 数据写入、环境变量变化、扩展包或小程序客户端发布；因没有可用真实登录账号，正式域名真实简历翻译尚未做登录态端到端。

## 2026-08-05 Addendum — Anonymous 27-Autumn SmartSheet Sync

- Source is hard-locked to Tencent document `DY0VXc3BFTFJUbUhw`, tab `t3r1vl`, view `vdHovb`. `scripts/sync_27_autumn_jobs.mjs` reads the public anonymous SmartSheet data endpoint and validates the document/tab/view on both the page URL and resolved endpoint; no login or position-dependent export click is required.
- Import is fail-closed for season safety: only values beginning with `27秋招` are candidates, and detection of any other season aborts the entire run before writes. Missing/invalid required values are reported and skipped. The 2026-08-05 live read returned 397 source records, 393 valid 27-autumn jobs, 0 wrong-season rows and 4 invalid rows (one notice plus three malformed source URLs).
- Idempotency uses deterministic UUIDs derived from Tencent record IDs, normalized full job fingerprints, and legacy identities based on company+URL+batch or company+start-date+batch. Existing jobs are fully paginated. The first apply skipped 354 previously imported jobs and inserted 39, increasing the hosted jobs table from 372 to 411; the immediate second dry-run returned 0 inserts, 0 updates, 39 unchanged source-owned rows and 354 historical skips.
- Manual Excel import in `src/lib/csv.ts` now reads only `27秋招正式批+提前批`, locates headers within the first 10 rows and rejects every non-27 row. It no longer reads the workbook's first sheet, which in the supplied example belongs to 26 autumn recruitment. The selected example sheet had 389 rows, its header on row 2 and 386 populated batch values, all 27 autumn.
- Local Codex automation `27` is ACTIVE and runs at Beijing 09:00, 12:00, 15:00, 18:00 and 21:00, executing tests before apply and notifying only on failures. The GitHub workflow is also pushed and active on the same Beijing schedule; both required repository Actions secrets are configured without exposing their values. Initial hosted run `31013414780` failed before querying because Node 20 lacked the native WebSocket now initialized by Supabase; commit `f27af05` moved the runner to Node 24, and hosted run `31013563683` then completed all steps successfully.
- Conversation-retention update on 2026-08-09: automation `27` now instructs every generated run to call `set_thread_archived` after its final result report, including success, no-change and safely stopped runs. Eighteen existing idle threads produced by automation `27` were precisely archived; unrelated project tasks and normal conversations were not touched. The automation remains ACTIVE with the same schedule and failure-only notifications.
- Archive-order correction on 2026-08-14: the previous wording attempted to archive after the final response, when no later tool call could run. Automation `27` now requires a real `set_thread_archived` call before sending its final summary, then sends the summary only after that tool completes. Sixteen newly accumulated automation-27 tasks were archived by exact IDs, and a follow-up recent-thread listing contained no matching sync task. Schedule, data guards, ACTIVE status and notification policy remain unchanged.
- Thread-generation correction on 2026-08-17: self-archiving prompts did not prevent a cron automation from creating a standalone sidebar task per run. Automation `27` was therefore converted from `cron` to a `heartbeat` targeting the main project thread `019fd078-91bd-7d61-8af2-638f91b1b470`. Commands, 27-autumn fail-closed guards, Beijing 09:00/12:00/15:00/18:00/21:00 schedule, ACTIVE status and failure-only notifications are unchanged. Thirteen newly accumulated automation-27 threads were archived by exact IDs; the following 30-thread listing contained zero matching sync tasks. Future results stay in the main thread instead of creating sidebar tasks.
- Verification passed: 8 Node guard/deduplication tests, script syntax, targeted ESLint, `npx tsc --noEmit`, full smoke, and a 55-route production build. The live apply wrote 39 rows and its immediate replay was idempotent; the successful GitHub replay independently returned source 397 / valid 393 / wrong-season 0 / existing 411 / inserts 0 / updates 0 / written 0. Feature commit `1aa669c` and runner fix `f27af05` are on `main` / `origin/main`; Vercel deployment `6CcfYxzv1kxpAJ5eRJuyF6Vjm96W` completed successfully.

## 2026-08-03 Production Addendum — Extension AI Autofill 0.2.2

> 当前最新权威状态为 `main` / `origin/main` / `af0fe57`；功能提交为 `55bd498`，用户界面供应商去标识提交为 `af0fe57`。Patrick Vercel deployment `DwUUCDgVzjdU592ZYjegBrqsKNXc` 已返回 `success / Deployment has completed`，正式域名和官网安装包已切换到 0.2.2。

### Product behavior

- AI 模式仍从上到下处理所有安全空白字段。新增受约束的自我描述生成，仅识别自我描述、自我评价、个人总结、个人优势、个人简介和 profile summary；内容必须由教育、经历、项目、技能、荣誉和目标岗位原有事实组成，评价性形容词、性格、愿望、新数字或新成果会被服务端过滤。其他主观申请题继续留空。
- 简历基础信息新增 `birthDate` 日期输入，定位为“可选，仅用于网申助手”，不进入简历 PDF。只有用户明确保存且当前页面存在出生日期字段时才会发送和填写；年龄、教育日期、证件号不参与推断。旧简历由 `createEmptyResume` / normalize fallback 补空值，小程序 update schema 使用 optional default，因此无需 migration 且保持旧客户端兼容。
- `fill.js` 新增 `basics.birthDate` 定义、`bday` autocomplete 和条件敏感策略；出生地、年龄及其他人口属性仍排除。日期面板年份导航由 12 年扩至 150 年，覆盖常见出生年份。
- 正式用户界面不再展示 AI 供应商或模型名称；弹窗、进度、超时、官网、README 和隐私文案统一为“AI 智能填写 / AI 分析”。内部 server-only 环境变量和调用链未变。

### Failure fix and safety contract

- 0.2.1 的 50 字段批次仍可能失败，因为每个页面 `fieldKey` 可达约 520 字符，模型被要求原样回传 50 个长键，4,500 output token 下会截断 JSON。0.2.2 在服务端生成 `f0...f49` 供 AI 回传，校验后按索引恢复原键；客户端协议和旧扩展请求结构不变。
- 空映射偶发的 `confidence:null` 只被归一为 0 并丢弃；非空值仍要求数值置信度至少 0.82。未知/重复短键、非法 JSON、非白名单 option、无简历依据的直接值和不安全派生仍拒绝。
- 自我描述安全层要求至少一到两项可逐字定位的简历事实、不允许新增数字、不允许未在简历中的性格/评价/愿望词；教育结束日期在当前月份之后时拒绝“毕业于 / graduated from”。
- 出生日期在 AI payload 中按需最小化：没有出生日期字段的页面发送空字符串；有字段但简历未保存时客户端在分析阶段即标为敏感，不上报字段。

### Build, release and evidence

- 正式包 `/downloads/starjob-resume-assistant-v0.2.2.zip` 为 135,555 bytes，SHA-256 `2d05bd7aaf2e59f2c966950e45992187c84021328471d6bed84d05e9525eaca3`。线上包大小、哈希和 manifest 0.2.2 一致；0.1.7–0.2.1 旧包继续 HTTP 200。
- 50 个超长字段的真实本地 AI 探针由约 51 秒 / 502 改为 10.4 秒 / 200，接受自我描述、出生日期和姓名三项；三字段最终回归 2.9 秒 / 200。浏览器夹具返回 `STARJOB_AI_AUTOFILL_TEST_PASS`，从 2026 年回退 26 次选择 2000-02-03，并确认自我描述、select、radio、已有邮箱保留、身份证和隐私勾选不动。
- `npx tsc --noEmit`、定向 ESLint、`npm run smoke`、`npm run build`（55 routes）、`git diff --check` 与扩展构建通过。GitHub Vercel status 对 deployment `DwUUCDgVzjdU592ZYjegBrqsKNXc` 为 success；正式 `/extension`、`/extension/guide` 和 0.2.2 ZIP 命中最新版本且用户可见供应商名称为 0，匿名 autofill 为 401。
- 尚未在真实携程 ATS 上安装 0.2.2 并以用户简历完成人工核对后的整页验收；当前只确认合成 AI 链路与 Ant 风格日期组件夹具，不扩大为所有企业自定义控件、iframe 或 shadow DOM。未自动提交申请。用户既有 dirty `package.json`、`.codex-artifacts/` 和五份 PRD 未入提交。

## 2026-08-03 Production Addendum — Extension Full-Form AI Autofill 0.2.1

> 本节为 0.2.1 历史基线，当前状态以上方 0.2.2 节为准。功能提交为 `e6f075c71a07ee57b625026683df142961402940`；Patrick Vercel deployment `5zKM1joDnUs3zda61s7VmmDiGbeS` 已返回 `success / Deployment has completed`。

### Product and extension behavior

- `popup.html` 新增 `fillMode=ai` 的“AI 智能填写”第三选项；`popup.css` 将现有下划线标签布局扩展为稳定三列。AI 文案明确按页面顺序处理全部安全字段，以所选简历为唯一依据，无依据就留空。
- `popup.js` 在 AI 模式先用 `analysisOnly` 读取最多 100 个非敏感可见字段及原生 select / 安全 radio 选项，再将去照片/内部 ID 的所选结构化简历和字段清单 POST 到 `/api/resume/extension-autofill`。0.2.1 按页面顺序每 50 个字段一批，每批最多等待 60 秒，全部批次成功后才按 merge 写入；页面已有内容不进入请求体且不会被覆盖。
- `fill.js` 新增 `aiAutofillOnly` / `aiValueMappings` 直值通道，与既有 `aiOnly` / `aiFieldMappings` 字段分类补充通道分离。MiMo 从上到下对全部字段给出有依据的值：直接事实 `basis=resume`，拼音、格式、毕业状态或选项等唯一派生为 `basis=derived`；后者使用琥珀色轮廓，前者保持绿色。
- 原生 select 和安全 radio group 可按 options 精确选择；协议/隐私/声明 checkbox、敏感人口属性、文件、密码和提交控件继续排除。重复经历改为 DOM 记录容器优先、显式字段编号次之，修复测试网页错误数组编号造成的项目描述互换。

### Server and privacy contract

- 新路由 `src/app/api/resume/extension-autofill/route.ts` 复用 `verifyExtensionMatchToken` 和现有 MiMo 三项服务端配置。128 KB 实际请求体限制、每用户 10 分钟 5 次、50 秒上游超时、60 秒函数时限、严格 Zod 输入/输出、字段键去重和最低 0.82 置信度均在服务端执行。
- 服务端 prompt 要求严格按字段数组顺序从上到下处理所有安全字段，简历明确事实尽量完整填写，只有无明确依据时才返回 null。简历/字段被定义为不可信数据；证件、人口属性、薪资、健康、家庭、法律同意、验证码/密码、主观申请题、测评和提交为硬禁止项。
- 服务端不再只信模型置信度：直接值必须能由简历事实构成；MiMo 省略的空项按原字段顺序补 null；毕业/在读/应届状态由教育结束日期和当前月份确定并覆盖模型错误值；拼音派生只允许进入明确的拼音或姓名拆分字段。
- `README.md`、`PRIVACY.md` 和官网 `ExtensionHubClient` 已区分两类数据流：普通模式智能复核只发送字段元数据；用户主动选择 AI 模式才发送净化后的结构化简历文字。两类模式都不发送页面已有输入内容。

### Verification and release boundary

- 通过：Node syntax、targeted ESLint、tsc、Smoke、55-route production build、extension package build 和 diff check。`ai-autofill-fixture.html` 在 Chrome 得到 `STARJOB_AI_AUTOFILL_TEST_PASS`，覆盖 `Wang Xiaoxing`、学历 select、在读 radio、已有邮箱保留、身份证与隐私协议 checkbox 排除。
- 真实 MiMo 诊断：12 字段 11.4 秒，60 字段 31.6 秒；严格逐字段提示后拼音与毕业状态返回完整。曾复现模型把 2027 毕业误答“否”，事实校验层上线后同一用例稳定改为“是”。正式域名授权合成请求 7.7 秒 / HTTP 200，证明生产鉴权、MiMo 配置、模型返回与事实过滤整链可用。
- 正式包 `/downloads/starjob-resume-assistant-v0.2.1.zip` 为 133,778 bytes，SHA-256 `5bfb31a349810f7c8f56821d6559d5bf9d0974cb4ce1a878ed55b2fab5b20ecd`，线上哈希一致。官网两页已指向 0.2.1；0.1.7–0.2.0 四个旧包仍为 HTTP 200，旧 READY/PONG/SYNC_RESUMES/SYNC_COMPLETE 协议和原有填写模式保持兼容。
- 正式新旧三个 API 的匿名请求均为 401。尚未用用户真实简历在安永 ATS 完成人工核对后的整页验收；安永重型页面的浏览器只读扫描曾超时，故不声明所有第三方自定义控件、跨域 iframe 与 shadow DOM 已通过，也没有自动提交任何网申。
- 用户既有 `package.json` 修改、`.codex-artifacts/` 与五份未跟踪 PRD 未触碰、未暂存、未提交。

## 2026-08-01 Production Addendum — DeepSeek V4 Flash for StarInterview Answers

> 当前最新权威状态为 `main` / `origin/main` / `128f3dc488b6068c8f763f6a03c9114d85affdbf`。正式域名 `https://www.starjob.space/` 已返回新版 StarInterview health 结构。

- StarInterview completion 现由独立 DeepSeek 配置驱动，默认 `deepseek-v4-flash`；ASR 继续由独立 MiMo 配置驱动，默认 `mimo-v2.5-asr`。两条路由不再共享配置对象，客户端模型字段只用于 Build 37 / 38 协议兼容，不能选择实际上游。
- Completion 上游请求统一使用 `max_tokens`、禁用 thinking 与 JSON Object；流式代理、首段前扣费、认证、限流和计费边界保持不变。Health 同时检查 completion 与 ASR，并分别返回非敏感配置状态。
- tsc、lint、54-page build、Smoke、diff check、9 项 completion 测试与 4 项微信支付测试均通过。macOS Build 38 为 204/204 测试通过、Release 严格验签通过，已唯一安装到 `/Applications/StarInterview.app`。
- 正式 health 返回 200 / `ready + completion ready + asr ready`；两条未登录 API 探针均为 401。当前 macOS 应用未登录且机器随后锁屏，因此真实上游生成、流式 JSON、计费和真实音频 ASR 仍需登录态端到端验收，不能以 health 或构建结果替代。
- 当前 CLI 指向 Ray 同名项目，不是本轮生产发布权威；本轮仅推送 Patrick `main` 并用正式域名切流结果验收，没有读取环境变量值。没有 migration、hosted DDL、Supabase 写入或小程序发布；受保护的用户工作区文件未纳入提交。

## 2026-07-27 Production Addendum — Resume AI Detail Verification

> 当前最新权威状态为 `main` / `origin/main` / `6f6604899b9e2c2e8b80b1d8874e5a9986dff1cf`。GitHub Production deployment `5624719350` 为 `success`，环境 URL 为 `https://job-bottle-elsdkw9j1-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/resume`。

- 分段润色规则已采用 `resume-experience-rewriter` 的事实台账和安全量化边界：允许把已确认事实写得更清楚，并在缺少方法、范围或业务背景时生成少量非量化候选细节；数字、成果、客户、组织、技能、职责等级和因果关系不得推测。
- AI 返回新增 `verificationItems`，逐项记录建议稿中需要用户核实的表述及原因。存在待核实项时，客户端显示专门警示，并在用户勾选“我已逐项核实，以上细节真实且可以解释”之前禁用“核实后应用”。
- tsc、lint、51-route build、Smoke、diff check 和 production dependency audit 全部通过；Smoke 同步覆盖服务端事实边界、客户端确认状态，并修正诘星页面按语义拆行后的旧文案探针。
- 正式 `/resume` 为 200，生产客户端 chunk 检出三条新核实文案；匿名润色请求仍为 401。独立 Vercel 环境 URL 因 SSO 返回 302，正式域名不受影响。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 写入或小程序发布。没有真实登录测试账号，因此生产登录态 AI 生成—核实—应用—保存流程仍未作为端到端通过；受保护工作区改动未纳入提交。

## 2026-07-27 Production Addendum — Final StarInterview Teaser Visuals

> 当前最新权威状态为 `main` / `origin/main` / `835d9465049e9a1c2f1186d7da6f8b302febc36a`。GitHub Production deployment `5617472637` 为 `success`，环境 URL 为 `https://job-bottle-bnqbhav4e-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/interview`。

- 汇聚十字星现在用原生 96px 图形、只缩不放且固定 100% 不透明，在首屏末端不再淡出，而是随整段页面自然划走。
- 三个能力章节和问题示例按语义换行；“你的经历，留在拾星。”已强化为清晰章节锚点。
- 实机图改为最终实时辅导截图 `product-live-coach.png`（2458×1594，SHA-256 `f55b32166bc9811918c1856fa2efd78d8a4770eb79fd21f5c141807490b4954d`），旧 `product-home.png` 删除并同步 Smoke 契约。
- 桌面与 390×844 移动端本地实看通过，无横向溢出；tsc、lint、51-route build、Smoke 和 diff check 通过。dependency audit 因 npm registry TLS 故障未取得新结果，依赖文件未变。
- 正式页面与新 PNG 均为 200，正式 HTML 只引用新资源，线上 PNG 的尺寸与哈希和上传截图一致。正式浏览器导航超时，因此不声明生产视觉浏览器 E2E。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 写入或小程序发布；工作区其他在途改动均未纳入提交。

## 2026-07-27 Production Addendum — StarInterview Story Copy Refinement

> 当前最新权威状态为 `main` / `origin/main` / `b620dc9bfa8b2dea534e4cc5507fc562c01bc4af`。GitHub Production deployment `5616062680` 为 `success`，环境 URL 为 `https://job-bottle-562406m94-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/interview`。

- “不是临场编造，是找回做过的事。”已改为“协助你结构化表达你曾经做过的事。”；校园咨询项目示例及装饰线已整体删除，RECALL 章节改为开放式单栏。
- “先给你一条路，再陪你把话说完整。”已改为“陪你把话表达清楚。”；Smoke 已覆盖两句新文案。
- 同期按量计费代码已落地，因此 Smoke 的旧“暂不计费”源码契约同步校正为现行扣费调用；没有修改计费业务实现。
- tsc、lint、52-route build、Smoke 与 diff check 全部通过。npm registry TLS 握手连续失败，故本轮 dependency audit 没有取得新结果；依赖文件未变，上一未变依赖基线为 0 vulnerabilities。
- 正式 `/interview` 返回 200，检出两句新文案且未检出两句旧标题与校园项目示例。本次提交没有 migration、hosted DDL、环境变量、Supabase 写入或小程序发布；受保护工作区改动未纳入提交。没有执行新的最终视觉浏览器 E2E。

## 2026-07-27 Production Addendum — StarInterview Teaser Easter Egg

> 当前最新权威状态为 `main` / `origin/main` / `593c348da5b91631407795be3e1928521a9e826b`。GitHub Production deployment `5612347537` 为 `success`，环境 URL 为 `https://job-bottle-mgf407bmx-job-bottle.vercel.app`，正式域名为 `https://www.starjob.space/`。

- 顶部 Dock 在拾星 Logo 左侧新增彩色十字星入口，公开路由 `/interview` 提供诘星 StarInterview 新品预告。页面包含大字透视汇聚、清晰四角星核、居中的应用图标和官方文字 Logo、slogan“谛听察意，应答成章”、macOS 实机图，以及听懂问题、找回经历、组织回答三段连续叙事。
- 页面保持无卡片的开放式发布页结构，支持桌面、移动端与 reduced motion。`public/brand/star-interview/` 的三份资源来自只读 ASS 项目；ASS 未改动。
- tsc、lint、47-route build、Smoke、diff check 和 production dependency audit 全部通过。正式 `/interview` 与 `/explore` 均为 200，预告文案、彩蛋入口和三份 PNG 资源均已检出。
- 最终局部视觉收口后的自动浏览器复截图被本地 URL 安全策略阻止；上一版桌面/手机视觉与无溢出检查通过，因此当前生产确认覆盖代码、构建、HTML、资源和路由，不宣称最终局部版浏览器 E2E。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据或小程序发布变化；工作区既有受保护修改继续保留且未纳入提交。

## 2026-07-26 Production Addendum — System Copy Refinement

> 当前最新权威状态为 `main` / `origin/main` / `597c17b3f653138fbb2560ccdace21b77dc1835b`。Vercel Production deployment `dpl_DAgQBniJ9gN8sZowogHSuB6BQeKK` 为 `READY`，正式域名为 `https://www.starjob.space/`。

- 网页端全局、登录、首页、岗位、投递、星瓶、简历、个人中心、反馈、网申助手、诘星连接与后台系统文案已按最终优化稿统一；通知与教程没有改动。
- 普通用户可见的数据库环境变量、SQL Editor 与 migration 文件名已移除，替换为准确的服务状态、数据保留说明和重试建议。功能语义、路由、Supabase 数据结构、鉴权和 StarInterview 权限没有变化。
- tsc、lint、46-route build、Smoke、diff check、production dependency audit 全部通过；桌面与 390×844 的四个高频页面无横向溢出。正式五个抽样页面均为 200，资源检出新版核心文案。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据或小程序发布变化。既有 `package.json` 与小程序主页本地改稿继续留在工作区，未暂存、未提交、未推送。

## 2026-07-26 Production Addendum — Refined User Management and StarInterview Unlimited Access

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `288cbc62952a3b1e487acd487cb0f931800ce1b0`（`feat: refine admin user access management`）。Patrick Vercel deployment `Cq1bopiabm3yvxHGfCdH5Txkh3jx` 已返回 `success / Deployment has completed`。

- 用户后台采用概览、组合筛选、摘要行和展开编辑结构；新增 StarInterview 无限访问指标、筛选和状态管理。
- 无限访问写入服务端 Auth app metadata。管理员未显式设置时默认无限访问，普通用户默认标准访问；只有 profile 为 admin 且邮箱精确匹配主管理员账户的会话可写入。
- 只读 hosted 审计为 212 个用户、1 个管理员、1 个管理员无限访问、0 个非管理员无限访问；这是动态快照。
- 本轮没有 migration / hosted DDL / 小程序改动。完整网页检查、Smoke、审计和小程序 check 通过；正式页面和匿名权限探针通过。由于没有可用管理员浏览器登录态，真实后台视觉与权限写入 E2E 未执行。

## 2026-07-26 Production Addendum — Secure WeChat Web Login and Mini Program 0.2.1

> 当前 Git 基线为 `main` / `origin/main` / `95bc865`（交接同步），功能提交为 `30b503e`，服务端主体提交 `5144713`、Cookie 修复 `17c9aa2`。Patrick Vercel production 已返回 `success / Deployment has completed`。

- 小程序已开放 8 位网页登录码，网页通过同一 Supabase 用户建立 Cookie Session。代码 5 分钟有效、单次消费，生成最短间隔 30 秒；网页消费限定可信 Origin 与 8 位数字格式。
- `20260724183000_wechat_web_login_codes.sql` 文件存在且 hosted DDL 已执行，远端 migration history 已确认 applied。数据库 RPC 负责原子预留、消费、微信身份门禁和 10 分钟 10 次的持久猜码限制。
- 纯微信账号的技术邮箱带 `account_origin=wechat`、`email_kind=internal` 标记，不作为真实邮箱展示或确认；管理后台区分仅邮箱、仅微信和已绑定，并展示 Auth User ID 与微信身份映射 ID。
- 真实小程序 → 无痕 Chrome → `/profile` E2E 已通过，重放同一码被拒绝。网页完整检查、小程序 `npm run check`、生产 RPC 探针均通过。
- 小程序 `0.2.1` 已预览并上传（455,243 bytes），未提交审核、未审核通过、未发布；用户已提交审核的 `0.2.0` 未被覆盖。本轮未独立核验其审核进度，也未完成 iPhone/Android 真机与完整跨端投递/简历写入验证。

## 2026-07-26 Production Addendum — Flexible Web Resume Editing

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `74254922b1959a50bab8e236656b0d47f73b50e2`。GitHub 对应 Vercel production deployment `dpl_3AGPjS2ez3fjNSGbzin2KTrirK6v` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- 网页端教育、工作和项目经历描述改为默认 4 行、可纵向拉高的多行输入框；开始和结束时间明确为可选。
- 预览和 PDF 会省略空时间与空字段，不再输出学校、公司、岗位或项目名称占位词，并过滤整条空经历。未填写兴趣/爱好时中文标题只显示“技能”，存在对应分类内容时才显示“技能/兴趣”。
- tsc、lint、40-route build、Smoke、diff check 和生产依赖高危审计全部通过。正式 `/resume` 为 HTTP 200，生产客户端资源已检出新描述提示与可选时间文案。
- 本次没有 migration、hosted DDL、环境变量或 Supabase 写入，也没有修改或发布小程序。因缺少真实登录会话，正式环境中的编辑、保存、预览和 PDF 导出仍需人工端到端验收。其他在途小程序/登录修改及用户未跟踪内容未纳入提交。

## 2026-07-23 Production Addendum — Extension Download Link Update

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `104aa05766585d511a66190a7cb34c7ae75be96d`。Vercel production deployment `dpl_4XGUsyKGa63PLNKNpuYJY1hJimkt` / `https://job-bottle-nezz4xjph-raywang6688-7050s-projects.vercel.app` 为 READY，正式域名为 `https://www.starjob.space/`。

- `/extension` 与 `/extension/guide` 下载入口统一改为 `https://pan.baidu.com/s/1q9gVenToSLL5x5tXZzYLig?pwd=SXZS`，提取码 `SXZS`；上一地址已从生产 HTML 移除并纳入 Smoke 禁止项。
- tsc、lint、40-route build、Smoke、diff check 和生产依赖高危审计全部通过。正式两个页面均为 HTTP 200，各自检出新地址一次、旧地址零次。
- 本次没有重打或改动 0.1.9 ZIP，也没有改变 0.1.7 兼容逻辑；没有 migration、hosted DDL、环境变量或 Supabase 写入。真实企业 ATS 端到端验收边界不变，用户未跟踪内容未触碰。

## 2026-07-23 Production Addendum — 0.1.9 Project Description Fix and Download Link

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `8c5ba4e3af6dee705bd1690e0ca9c76e1530374c`，下载链接提交为 `afcdc62`。Vercel production deployment `dpl_2bfLbdFXAvFp15RZss4URALeTmjq` / `https://job-bottle-e80irarow-raywang6688-7050s-projects.vercel.app` 为 READY。

- 保持 `0.1.9` 版本号并重打安装包。项目经历区支持“描述、职责描述、项目职责、项目成果、项目业绩、主要内容、个人贡献”及英文别名；仅有“项目经历”区块标题时也能确定项目区。
- 官网和教程下载按钮改为 `https://pan.baidu.com/s/13sk2UUdep9S1zoJdEk_sSA?pwd=SXZS`，旧地址已从生产页面移除。生产 ZIP 为 118,766 bytes，SHA-256 `8caa29d511e89ef7fab78cc5f8467882c2fbf902082ae1569821444b32b8109e`。
- 扩展语法与打包、tsc、lint、40-route build、Smoke、diff check 和 dependency audit 全通过；生产两个助手页面及 ZIP 均为 200，线上 ZIP 已直接确认包含项目描述规则。
- 没有 migration、hosted DDL、环境变量修改或 Supabase 写入。临时浏览器夹具被安全策略禁止加载，未绕过；真实企业 ATS 项目描述填写仍需用户实际页面验收，未跟踪内容未触碰。

## 2026-07-23 Production Addendum — Extension 0.1.9 Description Recognition

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `4f79d82bf2f1b89e14c9a78d268c8e48101d212d`。Vercel production deployment `dpl_7XxZsN7AotZuww8VE9V6YDw2uYtJ` / `https://job-bottle-nn2tp1abt-raywang6688-7050s-projects.vercel.app` 为 READY，正式域名为 `https://www.starjob.space/`。

- 网申助手 `0.1.9` 修复实习/工作经历里的“描述”“职责描述”“工作职责”“主要工作”“工作成果”及英文 responsibility / duties / description 等字段完全识别不到的问题。
- 多段经历按页面编号、记录容器和同类字段出现顺序逐级对应。受控浏览器测试覆盖三段通用描述、三段职责描述、工作内容 1/2/3、合并保留、覆盖替换、区外模糊描述不填和身份证不填。
- 官网和教程下载链接改为 `https://pan.baidu.com/s/1jl_OHVc_HxXbUrI1-IS56g?pwd=SXZS`。生产 ZIP 为 118,110 bytes，SHA-256 `6ce6cab2c1c9ced80c61b77a5cec2374df6d9fbc530dbd1d3f71d7d29d25876f`。
- 0.1.7 继续兼容既有通信协议，可继续同步与填写；本次描述识别能力需要升级 0.1.9，但网站不按版本强制阻止旧用户。Next.js / DOMPurify / Sharp 已升级到 16.2.11 / 3.4.12 / 0.35.3，生产依赖高危审计为 0。
- 扩展构建与语法检查、tsc、lint、40-route build、Smoke、diff check 和 dependency audit 全通过。正式 `/`、`/extension`、`/extension/guide` 与 0.1.9 ZIP 均为 200，线上页面检出新版本、链接及兼容文案。
- 没有 migration、hosted DDL、环境变量或 Supabase 写入。真实企业 ATS + 真实登录账号 + 已安装扩展的完整端到端，以及真实 0.1.7 / 0.1.8 浏览器回归仍未执行；用户未跟踪内容未触碰。

## 2026-07-23 Production Addendum — Extension 0.1.8 and 0.1.7 Compatibility

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `2c7948b`，主体功能提交为 `d5e7d92`。Vercel production deployment `dpl_BVsLVS3qwArWXPJJtTYm3gMDH3M5` / `https://job-bottle-qj06utx47-raywang6688-7050s-projects.vercel.app` 为 READY，正式域名为 `https://www.starjob.space/`。

- 网申助手 `0.1.8` 使用更克制的开放式弹窗设计，并增加覆盖内容、清除本地数据的二次确认、待人工字段清单、中文错误恢复提示和每页最多 12 个低置信字段复核。
- 官网与安装教程增加未检测到扩展时的恢复路径和完整第五步；下载链接改为 `https://pan.baidu.com/s/1z815NaU8NRArpswkEAiU3w?pwd=SXZS`，提取码 `SXZS`。
- 0.1.7 继续兼容，不强制用户重复下载。网站仍接受 0.1.7 使用的 READY / PONG / SYNC_RESUMES / SYNC_COMPLETE 协议，且不会按版本号阻止同步；页面明确提示老版本可继续使用。
- build:extension、tsc、lint、40-route build、Smoke、diff check 全通过；Smoke 只读 273 条开放岗位。正式 `/`、`/extension`、`/extension/guide` 为 200，两个助手页面均检出新链接与兼容提示。生产 0.1.8 ZIP 为 116,782 bytes，SHA-256 `81d6fa44f7acdaf874f066ec19feb397a0da6492def6a9150638fbcbcc09024a`。
- 没有 migration、hosted DDL、环境变量或 Supabase 数据写入。未使用真实安装的 0.1.7 / 0.1.8 和登录账号完成企业网申端到端填写，仍需人工验收；用户未跟踪内容未触碰。

## 2026-07-22 Production Addendum — Recent Job Metric and Resume AI Allowance

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `9adbbb0`；岗位统计提交为 `62799ed`。Vercel production deployment `dpl_5pGfqLqmifLb2XbpjpXCsjcjopn2` / `https://job-bottle-chz1lubvk-raywang6688-7050s-projects.vercel.app` 为 READY。

- `/explore` 顶部新增“近 7 天新发现”，复用当前开放岗位 `created_at` 的滚动 7×24 小时口径；桌面四列、移动端 2×2，数字为动态数据而非常量。
- 简历导入、AI 润色和整份翻译共用的用户级上限从 10 分钟 6 次提高到 15 次，足以覆盖 1 次导入、约 7–11 个简历区块润色及少量翻译/重试；仍要求登录并保留 10 分钟窗口。网申助手智能匹配的独立额度未调整。
- migration `20260722120000_raise_resume_ai_rate_limit.sql` 已提交，且 production hosted DDL 已实际执行；远端 migration history 已登记 applied。旧迁移只补齐历史登记，没有重新执行，业务数据未改写。
- tsc、lint、40-route build、Smoke、diff check 全通过；Smoke 只读 261 条开放岗位。正式 `/explore` 为 200 且 chunk 含新标签，匿名 AI 导入仍为 401。
- 没有环境变量变化或 Supabase 用户业务数据写入。未使用真实登录账号连续调用 15 次，因此第 15 次成功、第 16 次限流以及完整导入—逐段润色体验仍待真实账号验收；用户未跟踪内容未触碰。

## 2026-07-20 Production Addendum — Application Drawer Scrolling

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `077a451`；Vercel production deployment `dpl_HUbnLdDvrmUiqnjvGZP3yrX7SWYW` / `https://job-bottle-g9wcmvg7m-raywang6688-7050s-projects.vercel.app` 为 READY。

- 修复星瓶投递侧滑面板超过视口后无法下滑。共用 Drawer 从“整个动画 aside 滚动”改为“固定高度 flex 外壳 + 独立内容滚动区”；标题与关闭按钮保持固定。
- 内容区使用 `min-h-0 flex-1 overflow-y-auto`，补充 `touch-pan-y`、`overscroll-contain` 和 iOS momentum scrolling；桌面高度明确为 `100svh - 2rem`，移动端最高 88svh。修复同时覆盖 `/bottle`、`/my` 和探索页的投递面板。
- tsc、lint、40-route build、Smoke、diff check 均通过；提交 `077a451` 已推送。生产 `/`、`/bottle`、`/my` 为 200，后两页客户端 chunks 已检出新滚动标记和规则。
- 没有 migration、hosted DDL、环境变量或 Supabase 写入。无真实登录浏览器会话，生产真实表单滚轮/触控滑到底仍待用户体验确认；用户未跟踪内容未触碰。

## 2026-07-19 Production Addendum — Search Indexing and Signup Privacy

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `862f4b4`；Vercel production deployment `dpl_8A4FMMZx6YtrQ64HswTEeRp7Fy6M` / `https://job-bottle-68s71ri1y-raywang6688-7050s-projects.vercel.app` 为 READY，正式域名为 `https://www.starjob.space/`。

- 新增 `/robots.txt` 与动态 `/sitemap.xml`。生产 sitemap 包含 6 个公开入口和本轮 250 个有效岗位详情，不包含后台、登录、个人/投递/简历页面或 API；岗位数量为动态快照。公开核心页补 canonical 和分享元数据，私密页补 `noindex, nofollow`。
- 单个岗位页生成公司/方向/地点/批次/日期相关的搜索标题、摘要、canonical、分享信息和 `JobPosting` JSON-LD。过期岗位从 sitemap 排除，标记 noindex 且不输出 JobPosting；岗位列表页没有批量结构化岗位。
- 注册页删除成都、西南财经大学和金融学提示，只保留 2027；个人中心删除成都提示。求职方向扩展到 30 项并保留旧值兼容。
- 7 篇指南完整草稿保存在 `docs/seo/starjob-guide-drafts-2026-07-19.md`，尚未公开、尚未加入 sitemap，等待用户审核。
- tsc、lint、40-route build、Smoke、diff check 和 production dependency audit 均通过；Smoke 只读 250 条开放岗位并验证实际 SEO 输出。提交 `862f4b4` 已推送。
- 第一次 deployment `dpl_4ThqEXEZD26jm8pnaimhVzRKWoJv` 因缺少 Production 环境变量失败且未替换正式站；恢复 Supabase public 与 MiMo 的 5 项既有项目配置后，`dpl_8A4FMMZx6YtrQ64HswTEeRp7Fy6M` READY。正式域名 `/`、robots、sitemap、登录、后台和指南均 200，抽样岗位含 canonical / JobPosting，私密页含 noindex。
- 无 migration、hosted DDL 或 Supabase 写入。Google Search Console 只到新增站点欢迎页，尚未完成站点添加、DNS 验证或 sitemap 提交；百度登记也未完成。`.codex-artifacts/` 与五份未跟踪 PRD 未触碰。

## 2026-07-19 Production Addendum — Admin Email Confirmation

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `3ada808`；Vercel production deployment `dpl_J4e7xBPJgdmEuKfQcsKzGMb9c73r` / `https://job-bottle-i88tfvucj-raywang6688-7050s-projects.vercel.app` 为 READY。

- `/admin/users` 对邮箱未确认账号显示“设为已确认”，第二次点击“确认邮箱”才执行，并明确提示会跳过验证邮件。该动作只确认邮箱，不修改身份、资料、停用状态或用户业务数据；停用账号确认邮箱后仍保持停用。
- `PATCH /api/admin/users` 的 `confirm_email` 动作沿用服务端管理员复核，只通过 server-only Supabase admin client 执行 `updateUserById(..., { email_confirm: true })`。已确认账号重复调用无副作用，失败保留原状态。
- “邮箱未确认”筛选中成功确认后，用户行、结果数和分页即时同步；其他筛选只更新该行状态。Smoke 增加 API 和界面源码约束，禁止 service-role key 下发客户端。
- `npx tsc --noEmit`、`npm run lint`、38-route build、Smoke、diff check、production dependency audit 均通过；Smoke 只读 248 条开放岗位。提交 `3ada8081663363e32e6c373482729701e205dbf4` 已推送。
- 生产 `/`、`/admin/users`、`/forum` 均 200；线上 chunks 含“设为已确认”“确认邮箱”“邮箱状态已正常”和 `confirm_email`；匿名 PATCH `/api/admin/users` 返回 401。
- 无 migration 文件、hosted DDL、环境变量变更或生产真实用户写入。本轮没有真实管理员浏览器 session，因此登录后按钮视觉和真实未确认账号成功写入仍待人工验收。`.codex-artifacts/` 与五份未跟踪 PRD 未触碰。

## 2026-07-18 Production Addendum — Login Announcements and Admin User Insights

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `69e8ff9`；Vercel production deployment `dpl_Bd66Y3725uHvkCqiiSjorRHEAR89` / `https://job-bottle-94y0b1ddx-raywang6688-7050s-projects.vercel.app` 为 READY。

- 登录老用户会收到“拾星指南”最新管理员公告的一次性弹层：账户创建时间必须早于公告，且 user metadata / user-scoped localStorage 均未记录该公告 ID。新用户仍优先首次欢迎；两种内容复用同一弹层，避免叠窗。公告纯文本渲染，支持关闭、ESC、焦点圈定和进入 `/forum`。
- 新增受保护 `GET /api/announcements/latest`：服务端重新验证 session，使用 server-only client 查询 `forum_posts.category = 公告` 并确认作者 profile 为 admin；匿名 401、private/no-store。已读写入 `latest_announcement_seen_id` / `latest_announcement_seen_at` Auth metadata，并有本地去重兜底；没有新增公告表或 migration。
- `/api/admin/users` 改为读取全部 Auth 分页后执行服务端全局搜索、筛选、排序和分页，不再只搜索当前 100 人。支持邮箱/姓名/学校/方向/user ID、24h/3日/7日/从未登录、角色、可登录/停用/未确认和最近活跃/注册/邮箱排序。投递和简历计数只查当前结果页并分页读取，profile 只取必要字段。
- `/admin/users` 顶部事实带直接展示并可筛选用户总数、最近 24h 活跃、最近 3 日活跃、从未登录；活跃明确按 Auth `last_sign_in_at` 统计。结果支持 25/50/100 每页、刷新和一键重置；刷新期间保留内容但锁定账户变更，避免保存竞态。既有自我降级/停用保护和非破坏性停用保持不变。
- hosted 只读快照（2026-07-18）：总用户 135、24h 9、3 日 19、从未登录 109、停用 0；存在最新管理员公告（创建于 2026-07-16 11:58:30 UTC）。数字是动态快照，不是代码常量；“活跃”不是浏览行为 DAU。
- 全套验证通过：tsc、ESLint、38-route build、Smoke、diff check、production dependency audit 0 vulnerabilities。Smoke 只读 242 条开放岗位，匿名安全探针和新公告/用户筛选契约通过。本地 1440×900 管理后台匿名保护页与 390px 页面无横向溢出；无真实登录态，故登录后管理页视觉、公告实际弹出和 metadata 写回仍待真实账号验收。
- 提交 `69e8ff9` 已推送。生产 `/`、`/admin/users`、`/forum` 为 200；chunks 含活跃指标和公告入口；两个新/改受保护 API 匿名均 401。0.1.7 ZIP 仍为 111,586 bytes、SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。
- 无 migration、hosted DDL、环境变量变更或主动 Supabase 写入；只读探针未改数据。用户确认公告后会正常写自己的 Auth metadata。排除的 `.codex-artifacts/` 和五份 PRD 未触碰。

## 2026-07-16 Production Addendum — Stability, Data Safety, AI Cancellation and Rendering Performance

> 本节是当前最新权威状态。`main` / `origin/main` 已同步到 `8d143d1`；Vercel production deployment `dpl_AnAnXbUMPpgxkqfRaEd3cUboGytt` 为 READY。

- 星瓶内岗位星的中心十字已删除：移除 Canvas 五角星完成后额外绘制的水平 / 垂直 spark stroke，并清理对应 palette 字段。星体渐变、描边、光晕、背景、落瓶动画与分享海报均不变。提交 `8d143d1` 已推送；production `dpl_AnAnXbUMPpgxkqfRaEd3cUboGytt` READY；tsc、lint、build、smoke、diff check 全通过。
- 岗位坐标与岗位详情的首次“加入星瓶”现在直接以 `preparing` 收录，随后打开清洗后的官网链接；用户返回拾星后确认“已投递 / 还没有 / 不投了”。不再经过“评估 → 保留候选 → 开始准备”三次额外点击。为避免保存 await 后被浏览器拦截，新岗位在点击事件中预开空白窗口，只有保存成功才导航，失败会关闭。提交 `d878c59` 已推送；deployment `dpl_2J7FnUF37kTnt4bboy2R2pgW77TU` READY，正式 `/explore` 200 且客户端 chunk 含新文案和 `preparing`。
- “现代单栏”照片与页眉横线的共享 A4 坐标已修复：分隔线改为位于文字 / 照片较低边界之后，预览和 PDF 均不会再让横线穿过照片。“学术研究”模板按用户最新指令继续保留，既有模板 ID、同步兼容和历史简历不变。
- 投递数据层所有请求加入 12 秒 AbortSignal 截止；进度侧滑面板按 application ID 初始化，父级乐观更新不会覆盖正在填写的字段，保存期间阻止并发状态动作。岗位与投递页用 request generation 丢弃迟到响应。
- 简历删除先二次确认、等待同步 worker、执行云端删除，再更新本地；tombstone 阻止删除记录被后台重新上传，云端失败则保留本地版本。AI 导入、润色、翻译均可取消；导入有 43 秒客户端截止和 10 / 26 秒进度提示，离线、失败或超时均保留程序结果 / 原文。
- 星瓶 canvas 尺寸只在初始化与 ResizeObserver 时更新，不再逐帧 reset；背景转场与行星 hover 移除 filter 动画。岗位清单按用户反馈恢复为一次渲染全部匹配岗位，不保留 40 行分页、按钮或 IntersectionObserver 无限加载。
- 岗位筛选新增“快捷查看”：全部、近 7 天新上、近 7 天且符合偏好。新上严格按 `created_at` 的最近 7×24 小时计算。偏好对已填写维度使用 AND：地区和岗位都填写时两类必须同时命中；全国 / 全球对地区视为匹配。没有偏好时匹配选项禁用并引导到 `/profile`，不会制造空偏好推荐。
- 验证：tsc、lint、38-route production build、smoke、diff check 全通过；Smoke 读取 hosted 岗位并通过匿名安全探针。浏览器在 1440×900 与 390×844 下无关键 console 错误且无横向溢出；hosted 数据在测试中由 225 增到 231，默认 DOM 同步显示全部 231 行，近 7 天从 44 增至 50 且筛选后为 50 行。未登录偏好选项正确禁用；岗位数量仅是 2026-07-16 验证快照。
- Git / deployment：当前 `main` / `origin/main` 为 `d878c59`（`fix: open job site after capture`）；前一稳定性提交为 `7d11f45`。生产 URL `https://job-bottle-kqbgs6102-raywang6688-7050s-projects.vercel.app`，deployment `dpl_2J7FnUF37kTnt4bboy2R2pgW77TU` 经 CLI inspect 为 READY。正式域名 `/explore`、`/resume` 均 200，岗位 chunk 已检出“已加入星瓶并打开官网”、无效链接防护和 `preparing`。
- 边界：无真实登录态，未端到端验证云端删除、投递保存与真实 AI 取消 / 超时。没有 migration、hosted DDL、环境变量或 Supabase 写入；`.codex-artifacts/` 与五份 PRD 保持未触碰。

## 2026-07-15 Production Addendum — User-Controlled Resume Import

> 导入选择权与超时降级已提交、推送并部署。当前生产为 `fd73dcd` / `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL`，状态 READY。

- 本地解析完成后，用户可立即“直接导入解析结果”，也可“交给 AI 复核”；AI 成功后可使用“导入 AI 复核结果”，程序结果仍保留。AI 失败或超时不再阻断导入。
- 504 文案明确提示仍可直接导入。导入埋点只增加 `review_mode` 区分 program / ai，不发送正文。
- AI prompt 改用本地字段锚点与 bullet / skill 数量，不再重复发送完整 bullets；原文仍是 AI 唯一事实来源。上游截止 38 秒，函数 maxDuration 45 秒。
- 新日志只记录 elapsedMs、sourceChars、education / work / project / bullet counts 和 outcome，不含文件名、正文、联系方式或完整草稿。
- TypeScript、lint、build、smoke、diff check 全通过；首轮只清理允许的 `.next/**/* 2.ts` 缓存。提交 `fd73dcdc3c2d349f4df30a8ce2213fa87ed4138c` 已同步 main / origin/main；部署 `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL` / `https://job-bottle-b3i6vmypq-raywang6688-7050s-projects.vercel.app` READY。
- 生产 `/resume` 200，客户端资源含三个新文案和 `review_mode`；未登录导入 API 401，ZIP 未变化且哈希一致。真实登录下的三条分支和 A4 仍待人工验收。无 migration、hosted DDL 或 Supabase 写入，排除文件未触碰。

## 2026-07-15 Diagnostic Addendum — Resume Import Timeout

> 本节仅记录诊断，没有代码、提交或部署变化。生产仍为 `dc71b9c` / `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM`。

- “智能导入请求超时，未创建简历，请重试”可明确定位到导入 API 的 22 秒服务端 AbortController；客户端无独立截止，其他错误分支使用不同文案。
- 请求同时发送最多 24,000 字原文和完整本地草稿，并要求非流式返回整份严格 JSON，max output 为 4,500 tokens。复杂简历会同时扩大重复输入与完整输出，当前 22 秒预算不足。
- 合成探针中，低复杂度 1,356 / 7,910 / 22,000 字请求均在约 5–7 秒返回；8 段工作 + 8 个项目 + 多 bullet 的复杂请求原文仅 4,348 字，但 prompt 达 12,313 字，35 秒仍 Abort。结论是结构 / 输出复杂度比原文字数更关键。
- 生产 Lambda 在 `iad1`、MiMo 为中国区 host，跨区域链路会放大波动。当前日志缺少 elapsed / 字数 / 区块数 / request ID，且历史查询未返回可用样本，真实 P50 / P95 尚未量化。
- 建议优先改成 AI 只补本地未确认字段 / 区块并减少重复载荷，再调整函数区域与增加无正文指标；延长超时只做兜底。本轮未修改源码、未部署、未使用真实用户简历，无 migration、hosted DDL 或 Supabase 写入。

## 2026-07-15 Production Addendum — Bilingual Resume Templates and AI Translation

> 本节功能已提交、推送并部署。当前 `main` / `origin/main` 为 `dc71b9c`，功能提交为 `f212d51`；生产 deployment 为 `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM`，状态 READY。

- “新建简历”现在先选中文 / 英文，再从同语言模板创建；编辑中的模板选择器也按当前简历语言过滤。中文 6 套、英文 2 套。语言由既有 template ID 派生，不新增数据库字段或 migration。
- 简历导入本地规则新增正文语言识别，AI 严格返回结构同步加入 `language`；用户确认生成时自动使用中文 `compact` 或英文 `english_classic` 默认模板，并在复核区显示识别语言。
- 已有简历可一键 AI 中译英 / 英译中。翻译创建完全独立的简历和段落 ID，切换到目标语言等价模板，不覆盖原简历、不继承岗位绑定。空白简历在客户端直接停止，不调用 AI。
- 翻译请求不发送手机号、邮箱、LinkedIn、GitHub、个人网站或照片；这些精确字段在浏览器本地复制到译本。`POST /api/resume/translate` 要求登录、复用 AI 限流、严格校验 JSON 和数组 / bullet 数量，并确定性保留日期、GPA 与 current 标记。
- 已通过 `npx tsc --noEmit`、lint、build、smoke、diff check。首轮 TypeScript 只有 `.next/types/* 2.ts` 重复缓存，严格删除后通过。Build 产出 `/api/resume/translate`；本地和生产未登录 POST 均为预期 401。确定性探针覆盖中英文识别、6 / 2 模板、隐私载荷和独立译本。
- 本地浏览器验证桌面语言模板隔离与 390×844 移动弹窗，移动无横向溢出。生产 `/resume` HTTP 200，客户端资源含新建语言选择、双向翻译和英文模板文案；线上点击自动化因连接超时未完成。功能提交 `f212d51d518105196837cb791639149dbafbfc77`，更新日志提交 `dc71b9c41ff89a2183e5ad1b276a312a98c2d99c`；最终部署 `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM` / `https://job-bottle-9rxffgsyi-raywang6688-7050s-projects.vercel.app` READY。真实登录态 MiMo 翻译质量、专有名词与最终 A4 尚未验证。没有 migration、hosted DDL 或 Supabase 写入；`.codex-artifacts/` 和五份 PRD 未修改。

## 2026-07-15 Production Addendum — Resume File Import

> PDF / DOCX / TXT → 本地规则读取 → AI 结构复核 → 用户确认生成拾星简历的完整链路已提交、推送并部署。所有面向用户的模型表述统一为“AI 复核”；底层模型配置不变。当前生产为 `3acc952` / `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`。

- `/resume` 新增“导入简历”和确认弹窗。文件限制 8 MB；PDF 最多 12 页，DOCX 用 mammoth，TXT 用浏览器原生读取。原文件留在浏览器，只把最多 24,000 字符的提取文字、本地候选和文件名送到受保护 API。扫描型 PDF 文字不足时明确中止，首版没有 OCR。
- 确定性规则先识别联系方式、链接、明确求职意向、日期与教育 / 工作 / 项目 / 技能 / 校园 / 奖项 / 证书 / 语言硬区块。AI 只复核这些内容并返回严格 JSON，不得虚构、不润色、不跨区块；本地明确识别的联系方式不会被覆盖。
- `POST /api/resume/import` 要求真实登录、复用现有 AI 限流，JSON mode / 4,500 tokens / 22 秒 / temperature 0；不接收原文件或 multipart。结果经 Zod 严格验证，失败或超时不会创建简历。
- UI 先显示程序识别信号和 warnings，复核成功后才允许用户点击“生成拾星简历”。生成结果沿用当前模板和既有本地 / 云端同步，不自动覆盖现有版本，埋点只记录简历 ID 与各区块数量，不记录正文。
- 新增 `pdfjs-dist@6.1.200`、`mammoth@1.12.0`；production build 已正确产出 PDF worker。Smoke 确定性探针验证合成简历的姓名、联系方式、求职意向、三类经历硬区块与平台结构转换。
- TypeScript、lint、build、smoke、diff check 全部通过。改动提交为 `3acc95279032a7325299e3ae4b171046cdf68f64` 并同步 `origin/main`；部署 `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5` 为 READY。生产 `/resume` HTTP 200，线上客户端 chunk 含导入与 AI 复核全套文案；未登录导入 API 返回预期 401。尚未验证真实登录态文件选择、MiMo 请求和生成后的 A4 视觉。本轮没有 migration、hosted DDL 或 Supabase 写入，用户未跟踪文件未修改。

## 2026-07-15 Production Addendum — Flat Profile Layout and Feedback Route

> `/profile` 的开放式重排与 `/feedback` 一级入口已提交、推送并部署。当前生产基线为 `3acc952` / `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`。

- 移除个人中心旧侧栏导航、双栏投递资产、三栏资料布局和大星瓶占位；改为全宽软分隔线下的统一 `ProfileSection`，桌面每段为 190px 模块说明列加内容列，移动端自然纵向平铺。
- 新顺序为基本资料、求职偏好、简历与匹配、投递进展、账号。统一保存动作放在页头；统计改为横向信息带；简历 / 岗位使用开放列表；投递数据使用事实带；个人中心只保留账号信息和退出登录。
- 反馈已拆成独立 `/feedback` 一级页面。桌面顶部与个人中心并列；移动顶部也并列显示反馈和个人中心 / 登录，底部六项导航不变。副标题为“告诉我们您的建议与反馈，这对我们非常重要”；页面以开放分区展示类型、内容、邮件发送确认与隐私说明，不自动发送简历或投递数据。
- 没有新增卡片、阴影、发光或滚动动效。Smoke 禁止恢复“个人中心分区”侧栏、个人中心反馈表单、`profile-assets`、个人中心大星瓶和 `BottleFact`，并锁定新模块顺序与反馈路由。
- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；首轮 TypeScript 仅有允许清理的 `.next/dev/types/* 2.ts` 缓存。Smoke 只读 225 条 hosted 岗位，无 migration、hosted DDL 或数据写入。
- 本地浏览器已验证 `/feedback` 在 1280px 桌面和 390px 移动宽度无横向溢出，桌面八项导航单行完整，移动顶部反馈与登录 / 个人中心同时可见。生产 `/feedback`、`/profile` 均为 HTTP 200，反馈最终副标题、问题类型、发送动作和一级导航已在 HTML 中确认；已登录 `/profile` 仍待登录态视觉验收。提交、部署与上节相同；用户未跟踪的 `.codex-artifacts/` 和五份 PRD 未修改。

## 2026-07-15 Production Addendum — Extension Hero Visual Refresh

> 本节记录已提交、推送并部署的 `/extension` 首屏精修。当前本地 `main` / `origin/main` 均为 `2cc9af1`（`fix: sharpen extension product visual`）；生产 deployment 为 `dpl_4N5VRgA7depzUu2FNNbPfYSwnuKZ`，状态 `READY`。

- 用户提供的两张真实 popup 截图已用确定性像素拼接替换此前低分辨率图。正式 popup 资产为 760×1596 RGBA，SHA-256 `bc78c768524e4c047b6e0c747b9621451530fafe460831a524afc73296d9bbb9`；手机成品为 760×1536 RGBA，SHA-256 `6f0a29fdb695d66135d4b6bacb2e401272918176c9e29336f6f24f7a5b400deb`。手机透明外框保留，灵动岛已改为纯黑，不再含白色圆环。
- imagegen 曾按用户要求尝试合图，但输出把透明区烘焙为棋盘格，故未采用、未写入网站资产。最终成品只使用用户原始像素、现有手机框和确定性图像处理，避免界面文字被 AI 重绘。
- 首屏标题显式拆成“一份简历，”和“投向更多可能”两行；说明文案改为“将拾星简历同步到浏览器，调用拾星网申工具填写常用字段。你只需检查后提交。” Smoke 已锁定新文案并禁止旧合并标题与旧说明回归。
- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；首轮 TypeScript 只命中允许清理的 `.next/dev/types/* 2.ts` 缓存。Smoke 只读 hosted Supabase 225 条开放岗位，没有 migration、hosted DDL 或数据写入。
- 本地 production 页面在 1440×1000 与 390×844 下通过浏览器检查；移动端 `scrollWidth === clientWidth === 390`，产品图自然尺寸 760×1536、实际宽度 350px，标题稳定分两行且无横向溢出。
- 仅四个任务文件被暂存并提交为 `2cc9af1`，完整提交 `2cc9af1e6136290e68304747a7d60907eaecfe67`，已推送 `origin/main`；`.codex-artifacts/` 与五份未跟踪 PRD 未暂存、未修改。
- `npx vercel --prod --yes` 完成部署：`dpl_4N5VRgA7depzUu2FNNbPfYSwnuKZ` / `https://job-bottle-2fyr1ebv7-raywang6688-7050s-projects.vercel.app`，状态 `READY`，别名 `https://job-bottle-xi.vercel.app`。
- 生产 `/extension`、`/extension/guide` 均为 HTTP 200，新标题、新说明和正确百度链接均在 HTML 中。线上 phone / popup PNG 分别为 412,971 / 318,068 bytes、760×1536 / 760×1596，SHA-256 与本地一致；0.1.7 ZIP 为 HTTP 200 / `application/zip` / 111,586 bytes，SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。未登录扩展资料接口返回预期 401。
- 生产 390×844 DOM 检查无横向溢出并确认两个标题 span、新文案及产品图加载。该部署一并包含此前 0.1.7 popup 宽度修复和最终百度链接；没有 migration、hosted DDL 或 Supabase 数据写入。百度网盘内实际文件内容仍未读取。

## 2026-07-15 Pushed Pending Deployment Addendum — Popup Width Fix 0.1.7

> 当前仓库 `main` / `origin/main` 已为 `e110bde`（`fix: correct extension download link`）；popup 修复提交为其父提交 `ee1d83e`。最近已确认的生产部署仍是此前 `aa6ddc8` 对应的 `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`；本轮未执行 Vercel 部署，生产页面仍是 0.1.6 和此前下载链接。

- Chrome 工具栏 popup 被压成约 50px 竖条的根因是 `body { width: min(380px, 100vw) }` 让 popup 的内容固有宽度与 `vw` 视口宽度形成循环收缩。0.1.7 在 `html` 上固定 380px 工具栏视口，`body` 占满该视口并禁止横向溢出；填写逻辑、权限、来源限制和单层开放工作面均未改变。
- `/extension`、`/extension/guide` 和 smoke 契约现统一使用用户最终确认的百度网盘地址 `https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS`；前一条 `11xaueV0f0D_pFt_czk_MHw` 是误链并已加入禁止回归项。正确链接 HEAD 返回 302 至 `/share/init?surl=0QoSAiNpFOch881oCniEjA&pwd=SXZS`。该页面改动尚未部署，生产仍显示此前地址。
- `scripts/smoke_check.mjs` 已加入固定 popup 宽度契约并禁止恢复旧 `min(..., 100vw)` 写法。`npm run build:extension` 与 `npm run build:extension:dev` 已生成 `public/downloads/starjob-resume-assistant-v0.1.7.zip`、`dist/拾星网申助手-v0.1.7.zip` 和 `dist/starjob-resume-assistant-local/`。
- 两份 0.1.7 正式 ZIP 均为 111,586 bytes，SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`，字节一致。隔离的 Chrome for Testing 已真实加载未打包扩展：manifest 为 0.1.7，`html` / `body` / `.shell` 计算宽度均为 380px，popup 无竖条或横向裁切。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；首次 TypeScript 只命中允许清理的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。Smoke 只读 hosted Supabase 225 条开放岗位，没有 migration、hosted DDL 或数据写入。
- popup 修复的 9 个任务文件已提交为 `ee1d83e`；正确链接的 3 个文件随后提交为 `e110bde` 并推送 `origin/main`。本地与远端完整提交均为 `e110bde5844a32180ae6a2e66cef1e41cf0a285a`。推送后只读 `npx vercel ls --yes` 没有发现新的自动部署；未执行 `npx vercel --prod --yes`，也未核验新百度网盘分享内的实际文件内容。

## 2026-07-15 Authoritative Production Addendum — Read Before Older Sections

> 当前生产基线为 `main` / `origin/main` 提交 `aa6ddc8`，生产 deployment 为 `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`。以下网申助手实现已于 2026-07-15 提交、推送并部署；若与旧章节冲突，以 `PROJECT_CONTEXT_FINAL.md`、本节、当前代码和用户最新指令为准。

- 新增 Manifest V3 **拾星网申助手**：源码在 `browser-extension/starjob-resume-assistant/`，最小权限为 `activeTab` / `scripting` / `storage`。仅在用户点击“填写当前页面”后访问当前标签页；无 Cookie、浏览历史、全站常驻权限或自动提交。
- 填写器覆盖基础信息、教育、工作、项目、技能、校园、奖项、证书、语言等常见字段，默认保留已有内容并支持显式覆盖；证件号、银行卡、密码、验证码、政治/残障/退伍军人等敏感声明、文件上传和最终提交均留给用户手动完成。
- 新增 `/api/resume/extension-profile`，仅用当前 cookie session 的 `auth.getUser()` 读取该用户最多 20 份简历，并移除照片；无 service role、无账号凭据导出。网站 `/extension` 负责 ZIP 下载和本地同步，`/extension/guide` 提供解压安装与使用教程；`/resume` 只增加入口，不改变三栏制作布局。桌面顶部主导航已把“网申助手”提升为与“简历制作”“星瓶”同级的一级入口，并在文字上方显示斜体银蓝渐变 `BETA`；移动底部六项导航保持不变。
- `0.1.6` 视觉版 popup 改用拾星现有文字字标和单层开放工作面，结果与进度由分隔线组织，不再卡片套卡片。`/extension` 首屏文案为“一份简历，投向更多可能”，右侧使用银色 iPhone 17 Pro Max 正面设备框和灵动岛，设备内合成真实 popup 截图，移除厚重蓝框。
- 当前扩展版本升级为 `0.1.6`。`npm run build:extension` 生成 `public/downloads/starjob-resume-assistant-v0.1.6.zip` 与 `dist/拾星网申助手-v0.1.6.zip`；两份文件均为 111,630 bytes，SHA-256 均为 `0a38ba39e159d588d5903acd4a34fcced580f3475d6ff836103a638868e896f9`，内容一致且解压 manifest、文字字标、权限和生产来源已复核，旧 `0.1.5` ZIP 已移除。
- 下载页与教程页的“获取安装包”现统一打开百度网盘 `https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS`，并显示提取码 `SXZS`；本地 ZIP 保留作构建产物与回退包。外链实测返回 302 至 `/share/init?surl=WhabI64zCSOXyn4zIAKMsw&pwd=SXZS`。
- 新增 `npm run build:extension:dev`，只在忽略目录 `dist/starjob-resume-assistant-local/` 生成本地测试版，允许 `localhost:3000` / `127.0.0.1:3000` 并把扩展同步入口指向本地；正式扩展源码和两个发布 ZIP 均不包含 localhost 权限。全套验证及正式/开发来源隔离 Smoke 已通过。
- `0.1.2` 针对后续真实截图继续修正：没有 `for` 的邻近“学校”标签可识别，短通用 `name` 不再命中 `schoolName` / `companyName`，`type=tel` 不再作为独立手机号依据；教育与工作区块的“经历描述”分别映射，不再先消耗并错位后续工作记录；证书标题 / 成绩结构化填写，发证日期保持人工处理。Chromium 20 字段 fixture 覆盖两段工作、教育描述、证书 `tel` 字段、保留手填值和敏感字段跳过并通过。
- `0.1.3` 将重复经历从“每种字段独立计数”改为“整段记录共享索引”：优先读取字段路径中的数组下标和“实习经历-1”等标题，缺少显式下标时按公司 / 学校 / 项目名 / 证书名锚点划分。因此第一段描述缺失或前面多出一个描述控件时，后续经历不再整体前移。新增干扰描述控件后的 Chromium fixture 共标记 21 项并通过，两段真实工作描述仍各自对应正确简历记录。
- MiMo 长期显示“页面字段格式无法识别”的根因已确认：客户端发送了仅供本地过滤的 `sensitive` 属性，服务端 strict schema 将其作为未知字段返回 400。客户端现只发送白名单元数据，服务端对旧扩展的额外属性执行剔除兼容；携带旧属性的真实本地请求返回 200 / 发证日期 `null`。
- `0.1.4` 补齐四段记录的 1/0 基转换和重复自动补全输入去重：同一区块原始编号先归一化到 0..N-1，“实习经历-1”等卡片标题优先，连续重复公司锚点不再推进记录。四段 fixture 同时放入 1 起始编号、干扰描述和重复公司搜索框，32 项正确，第 1–4 段公司 / 职位 / 日期 / 描述逐段一致，第四段不再回用第一段。
- `0.1.5` 修复项目 / 获奖跨区块乱填和日期选择器：已有明确 label / aria / placeholder 的控件不再吸收同卡片其他标签；教育、工作、项目、校园、获奖、证书、语言成为客户端与 MiMo 的硬区块边界。最近的完整经历卡片统一决定记录索引，包住多段“经历-N”的外层容器被排除，因此项目名称、角色、描述与日期不会再因字段 name/id 中的错误下标拆散；获奖只映射 `awards.title` / `awards.description`，无简历值的获奖时间留空。
- “起止时间 / 日期范围 / 任职时间 / 项目时间”等双日期控件按 DOM 从上到下、从左到右读取：第一个固定为开始、第二个固定为结束。Ant Design、Element、Arco、Semi、iView 及常见 date-picker 包装器会优先打开面板，只点击属性可精确确认的目标日期，并对 Ant / Element 常见年月导航进行安全操作；无法确认时不盲点，回退原生事件并留待人工复核。
- 扩展改为本地确定性规则立即填写，MiMo 仅在之后补最多 6 个本地未识别空项；AI 不再位于填写关键路径。智能匹配启用 JSON response format 与 800 token 上限，8 / 9 秒服务端 / 客户端截止；6 字段真实探针约 2.0 秒返回 200。
- `/resume` AI 润色启用 JSON response format、2,200 token 上限、18 / 22 秒服务端 / 客户端截止、精简 prompt 和 10 分钟进程内结果缓存，并移除第二次上游 JSON 修复。四条假经历真实探针约 6.3 秒返回有效 JSON，最小探针约 1.1 秒；本地配置已是非 Pro V2.5 基础模型，未修改环境变量。缓存不是多实例全局缓存。
- 最新 Chromium fixture 为 `STARJOB_EXTENSION_TEST_PASS`、42 个填入项：四段工作逐段对应；两个项目即使描述字段下标被故意互换仍保持整卡对应；获奖不会吸收实习内容；两组无 start/end 标签的日期范围按左开始、右结束填写；模拟 Ant 日期面板确认经过打开面板和精确点选。无法连接用户当前 Chrome 会话读取真实企业页面 DOM；0.1.6 的真实表单验收仍待用户重新加载后复测。本轮没有 migration、hosted DDL 或 Supabase 数据写入。
- 新增牛客式四阶段进度：页面字段提取、智能分析匹配、逐项填写、未填项整理。`/api/resume/extension-match` 通过短期 HMAC 令牌调用现有 MiMo，只接收标签、属性、控件类型和区块等字段元数据，不接收输入值或简历正文；结果受标准字段键白名单、置信度和敏感字段规则约束，超时 / 不可用自动回退本地规则。无效令牌实测 401；6 个假字段的真实 MiMo 调用实测 200，教育 / 工作描述、学校、公司、证书成绩正确，发证日期返回 `null`。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；首次 TypeScript 仅命中允许清理的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。正式 / 本地构建来源隔离和 0.1.6 ZIP 权限已复核；`/extension` 在 1440×900 与 390×844 下通过浏览器检查，移动端无横向溢出。最新 production build 的 0.1.6 ZIP 返回 HTTP 200 / `application/zip` / 111,630 bytes。智能匹配当前为每用户 10 分钟 8 次内存限流和 8 秒超时；多实例强一致限流仍是上线后可扩展项。
- 本轮没有 migration、hosted DDL 或 Supabase 数据写入。代码已提交为 `aa6ddc8`、推送 `origin/main` 并部署为 Vercel `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`；`www.starjob.space/extension`、教程页、产品图和 0.1.6 ZIP 均通过生产检查。Smoke 仍只读到 214 条岗位；用户未跟踪的 `.codex-artifacts/` 和五份 PRD 未修改。

## 2026-07-14 Final Authoritative Handoff — Read This Section First

> 本节取代下方所有较早的 2026-07-14、2026-07-13 及历史描述。若与后续历史章节冲突，以本节、`PROJECT_CONTEXT_FINAL.md`、当前代码和用户最新指令为准。运行品牌统一为 **拾星 StarJob**。

### Current production baseline

- 工作目录：`/Users/wangrui/Documents/Web`；分支：`main`；当前已推送提交：`2c52198`（`feat: move shortcuts to guide and sanitize job links`）；远端：`origin/main`。
- 生产站点：`https://www.starjob.space/`。2026-07-14 已通过 `npx vercel --prod --yes` 部署；Vercel 当前生产部署为 `https://job-bottle-mkulnj4nz-raywang6688-7050s-projects.vercel.app`，别名为 `https://job-bottle-xi.vercel.app`。
- 本轮生产域名已核验首页的 `<link rel="icon">`、Apple 图标及 manifest；线上 `/favicon.ico`、`/icon.png`、`/apple-icon.png` 与本地构建产物 SHA-256 一致。搜索引擎结果仍需等待自行重新抓取。

### 2026-07-14 delivered changes

- 投递星图：投递雷达核心与同心轨道圆心对齐；轨道面按容器尺寸响应缩放，岗位星沿实际圆轨道运行；当前阶段轨道采用金色强调；深空背景复用星瓶场景的图层。星体点击区域已扩大，仍可打开对应投递记录。
- 星瓶：不同投递状态改用可区分的星色与光晕（浏览、已投递、笔试、面试、Offer 等），Offer 使用金色；仍使用既有 Canvas、瓶腔几何与碰撞判定，不引入物理引擎。
- 简历可靠性与性能：本地草稿按游客/账号隔离；登录时安全认领游客简历；云端保存使用队列、最多三次指数退避重试，并在网络恢复或页面重新可见时继续；登录失效、关联岗位失效、模板约束和暂时网络失败会给出可行动提示且保留本地副本。字体改为常用字优先、完整字集按需加载，预览与 PDF 共享字体 profile；PDF 模板切换已修复。
- 投递链接：所有统一投递入口会移除 `cid`、`click_id`、`clickid` 参数，同时保留其他查询参数与锚点。
- 指南中心：原“求职社区”已改为 **拾星指南**，页面路径暂保留 `/forum`；内容分类为“公告 / 教程 / 分享”，只展示管理员发布内容。普通用户发帖、评论、点赞等互动入口已下线；管理员可发布、编辑、删除及同时重点展示多篇内容。所有当前业务 Drawer、首次访问弹窗和简历 AI 润色弹窗均链接至“去拾星指南查看使用教程”。
- 数据与安全修复：新增 `20260714120000_production_debug_repairs.sql`，补齐资料/简历同步、管理员与数据一致性相关保护；AI 润色服务端补充超时和结构化错误日志，客户端不暴露服务端配置。
- 品牌图标：采用雾白色 Apple 风格“星瓶 + 居中金星”标识，新增 `src/app/icon.png`、`src/app/apple-icon.png`、`src/app/favicon.ico` 和 `src/app/manifest.ts`，并保留 `public/brand/starjob-mark.png` 作为品牌源图。
- `2c52198`：个人中心的四个“常用入口”已完整迁移到 `/forum` 拾星指南的文章分类与列表之前，个人中心仅保留“账号与反馈”。批量 CSV / Excel 导入原本已清理 `cid` / `click_id` / `clickid`；手动新增或编辑岗位现在也在统一 `toJobPayload` 层清理同类参数（大小写不敏感），其余查询参数和锚点不变。已推送并部署。

### Verification and external-state boundary

- 已通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。本地还以真实浏览器检查 `/forum` 桌面、768px 平板和 390×844：常用入口均在文章区之前，桌面/平板双列、移动端单列。生产 `/forum` 已返回 HTTP 200，实际 HTML 含四个入口文案。hosted Supabase 以 server-only 审计实际读取 214 条岗位，0 条含 `cid` / `click_id` / `clickid`；没有执行数据写入。生产域名已验证图标链接、manifest 内容、图标资源 HTTP 返回及哈希一致性。
- 必须区分三件事：migration 文件已提交、应用/API 已部署、hosted Supabase DDL 已执行。`supabase/migrations/20260713193000_forum_admin_pinning.sql` 与 `20260714200000_forum_to_guide_center.sql` 均在仓库中；除非通过 Supabase SQL Editor、CLI 或直连查询再次确认，不得把文件存在写成 hosted DDL 已确认执行。

### Mandatory documentation-sync rule

> 从本次起，任何代码、迁移、Supabase 数据、环境变量、Vercel 部署、生产验证或已知风险的变化，都必须在同一工作会话结束前同步更新 `/Users/wangrui/Downloads/PROJECT_CONTEXT_FINAL.md`；影响当前基线或审计结论时，也必须更新本文件和 `PROJECT_CONTEXT_AUDIT.md` 顶部的权威区。更新必须写明：日期、提交（如有）、改变内容、验证命令/证据、已确认的外部状态与尚未确认的外部状态。不得把未验证的 hosted Supabase 状态写成已完成。

## 2026-07-14 Current Authoritative Handoff — Use This Section First

> 本节覆盖此前 2026-07-13 基线之后的最新实现。若本节与下方历史记录冲突，以本节、当前仓库代码和用户最新指令为准。

- 当前仓库：`/Users/wangrui/Documents/Web`，分支 `main`，`origin/main` 与本地均为提交 `2736f94`；生产站点为 `https://www.starjob.space/`。
- 最近已推送并部署的连续改动：
  - `cbcfec9`：北京全国地图标注向右上外移，避免与吉林区域重合。
  - `10c9032`：论坛作者可编辑自己发布的帖子；展开帖子后可修改标题、分类、正文和标签，保存后列表即时更新，不改变 `created_at`、评论、点赞或置顶状态。`src/lib/forum.ts:updatePost` 使用 `id + user_id` 约束并要求返回单行，应用层和既有 owner-only RLS 双重保护。
  - `ac69f07`：增加多帖子置顶回归契约。`PATCH /api/admin/forum/pin` 只更新指定帖子，排序仍为 `is_pinned desc, created_at desc`；不存在“置顶一个就取消其他置顶”的逻辑，也不存在唯一置顶索引。管理员可以同时置顶多个帖子。注意：`supabase/migrations/20260713193000_forum_admin_pinning.sql` 是否已在 hosted Supabase 执行仍未由本机证明，不能把 migration 文件存在写成 DDL 已上线。
  - `2736f94`：新增 `src/components/ui/CommunityHelpLink.tsx`，已接入所有当前业务弹窗/抽屉：公共 `Drawer`、`WelcomeNotice`、`ResumePolishDialog`。入口文案为“去求职社区了解如何使用「拾星」”，点击后关闭当前弹层并进入 `/forum`。
- 全国岗位地图继续保持省级选择逻辑；北京、上海、天津、重庆、香港、澳门等小区域通过折线外引名称，名称和地图区域都可点击。地区名称不要写成“北京省级”等不准确表达。
- 投递星图行星已修复为可点击，并可打开对应投递记录；未改变列表、看板、星图三种视图和 `ProgressDrawer` 的数据流。
- 最近一次弹窗帮助入口上线验证：Vercel Production deployment `dpl_5dk2Y4T4ycQqcfyN5DC5phkH69Hg` 为 `READY`，自定义域名 `/forum` 返回 HTTP 200，线上 JavaScript 资源已确认包含“去求职社区了解如何使用”文案。
- 本轮代码验证全部通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。已做桌面与 390×844 首次访问弹窗截图检查；弹窗帮助入口可见，未造成按钮遮挡或横向溢出。
- 工作区中的 `.codex-artifacts/` 和 `docs/prd/job-bottle-prd-v3.md`、`v4-bottle-system.md`、`redesign-prd.md`、`style-prd-v5.md`、`tech-spec.md` 仍是用户未跟踪文件；不要删除、修改、提交或在输出中复制其中的账号密码。

## 2026-07-13 Forum Seed Date Correction

- 21 个已导入种子帖子的 `created_at` 已随机分布在 2026-07-08 至 2026-07-13 的上海时区白天（09:00–19:30），六天均有数据；84 条对应评论已调整为晚于所属帖子。
- 批量更新时间时，数据库 `set_updated_at` trigger 会把全部 `updated_at` 写成操作时刻，曾导致论坛右侧统一显示 `7.13 20:40`。提交 `6f839e5` 已修复：`PostCard` 只展示 `created_at` 的“发布于”时间，右侧仅保留评论/点赞，新鲜度与信号强度也基于 `created_at`。
- `6f839e5` 已推送 `origin/main` 并部署生产；`https://www.starjob.space/forum` 返回 200。不要再次用 `updated_at` 作为论坛发帖日期展示。

## 2026-07-13 Production Handoff — Historical Baseline

> 本节记录截至 2026-07-13 的历史生产状态；当前状态请以文档最前面的 `2026-07-14 Current Authoritative Handoff` 为准。

### Resume download authentication and draft preservation

- 未登录用户不能再直接下载简历。`ResumePdfExportButton.tsx` 在生成 PDF 前先调用 `GET /api/resume/download-auth`，由服务端通过 Supabase `auth.getUser()` 验证真实 session，不能只信任浏览器本地状态。
- 点击下载前会先把当前简历写入浏览器存储；未登录时跳转到 `/login?next=/resume...&mode=register&reason=resume-download`，注册或登录完成后安全返回原简历页面。`ResumeBuilderClient` 会合并本地与云端版本，避免用户注册回来后草稿消失。
- 浏览器存储失败时会阻止跳转/下载并给出可见提示；已登录且验证通过后才调用现有矢量 A4 PDF 导出。

### Analytics, runtime hardening, and onboarding

- 根布局已启用 `@vercel/analytics` 的 `<Analytics />`，覆盖全站页面访问统计。
- 新增 `src/app/error.tsx` 与 `src/app/global-error.tsx`。岗位、社区、星图、简历、管理端和身份读取等高风险异步路径补充错误处理，避免静默失败或无限加载；`npm run smoke` 已把这些恢复路径写入契约。
- 根布局挂载 `WelcomeNotice.tsx`。未登录访客首次看到“认识一下拾星”与数据安全说明；注册后第一次登录看到“欢迎来到拾星”与三项核心用途。访客状态保存在 localStorage；登录用户同时使用 user-scoped localStorage 和 Auth metadata `welcome_notice_seen_at`，避免跨设备反复出现。
- 隐私文案明确 Vercel 用于托管、Supabase 用于认证与数据存储；不承诺管理员在技术上绝对不可见，而是按故障排查、安全响应和必要最小权限处理。

### 2026-07-13 interface and interaction refinement

- 高频工作页继续使用“林深星渡”深空色板，但交互层改为更接近 macOS 的克制圆角、开放集合和轻量透明层。新增 `SegmentedControl.tsx` 统一滑块式筛选；避免多层边框和卡片套卡片。
- 地区/行业/职能/我的投递主筛选收敛为一层；岗位侧栏筛选控件统一圆角和透明滑块语言。这里的“liquid glass”指带透光、边缘高光和层次的透明表面，不应退化成大面积高模糊毛玻璃。
- 简历列表、编辑区和筛选容器弱化卡片存在感；全站常用圆角已按 macOS 控件尺度收敛，不能重新放大为夸张胶囊或多层框。
- `NebulaGateway.tsx` 的岗位结果区域已修复独立滚动：星云选择后的岗位列表在固定高度内使用自己的纵向滚动，不再因父层 overflow/高度约束而无法看到全部岗位。

### Forum administration, privacy, and seed data

- 管理员可对帖子执行“置顶帖子 / 取消置顶”。`PATCH /api/admin/forum/pin` 会从当前 session 重新读取 profile role；普通用户不能看到置顶操作。列表始终按 `is_pinned desc, created_at desc` 排序。
- 置顶帖子使用醒目的暖杏色 `全站置顶` 标记和左侧强调，不依赖侧滑抽屉。帖子恢复为列表内原位展开，展开正文和评论时不会创建 Drawer/Dialog。
- 除管理员外，论坛作者名统一显示为 Unicode 前三字符加且仅加三个星号，例如 `415***`；管理员名称完整显示。由于 `profiles` 不公开读取，客户端通过 `POST /api/forum/authors` 获取服务端已经脱敏的昵称和角色。该 route 使用 server-only service-role client，最多接受 100 个合法 UUID，不返回邮箱、Auth metadata 或完整普通用户名。
- 登录页现在接受“账号或邮箱”。5 位数字账号会映射为内部 `${username}@preset.starjob.space` 邮箱；注册仍必须使用真实有效邮箱。
- `/Users/wangrui/Downloads/accounts.csv` 已验证并实际创建 100 个 Supabase Auth 预设账户，全部 email-confirmed、无重复，并为每个账户 upsert `profiles`。密码和 CSV 未进入 Git，也不得写入交接文档。
- `/Users/wangrui/Downloads/forum_seed.sql` 的文件头声称 20 帖/80 评论，但正文实际为 21 帖/84 评论。已按正文完整导入并核验：21 个帖子、84 条评论、涉及 63 个预设账户。固定 UUID + upsert 使 `scripts/import_forum_seed.mjs` 可幂等重跑。
- 可复现脚本：`scripts/provision_preset_accounts.mjs`（外部 CSV -> Auth + profiles）和 `scripts/import_forum_seed.mjs`（外部 SQL -> forum tables）。二者都要求 server-only `SUPABASE_SERVICE_ROLE_KEY`，不会内嵌密码或密钥。

### Deployment and verified state

- `SUPABASE_SERVICE_ROLE_KEY` 已存在于本地 `.env.local`，并已作为 Vercel Production 的 Sensitive 环境变量配置；禁止添加 `NEXT_PUBLIC_` 前缀、禁止输出到日志、禁止提交。
- 本轮生产提交：`da3ff63`（简历下载登录门槛）、`c923dfc`（Analytics）、`522c226`（运行时加固）、`3a08684`（欢迎/隐私说明）、`e122be9` / `9de9f53` / `55a608c`（Apple 风格、圆角、筛选和星云滚动）、`055e4af`（管理员置顶）、`f1b0926`（预设账号与论坛隐私）、`8d990bc`（论坛种子和脱敏作者 API）。
- 2026-07-13 最终验证通过：TypeScript、ESLint、production build、`npm run smoke`、`git diff --check`；线上 `/forum` 返回 200，`POST /api/forum/authors` 对真实种子作者返回 `415***` / `role=user`。
- `supabase/migrations/20260713193000_forum_admin_pinning.sql` 已进入仓库，负责索引和数据库层保护。当前会话没有通过 Supabase CLI/直连数据库证明该 migration 已在线执行；不要把“文件已提交”写成“DDL 已确认上线”。应用层置顶 API 已上线，但仍建议在 Supabase migration 状态可访问时核验并补跑数据库层 trigger。

## 2026-07-12 Nebula Alpha Cutouts

- 新生成星云原图的黑底在实际浏览器合成中仍可见，因此地图不再依赖 `mix-blend-screen`。14 张正在使用的生成素材现在保留原图，并在 `public/assets/nebula/cutouts/` 生成 RGBA 副本：纯黑背景透明、低亮度边缘平滑过渡、亮色星云保持可见。
- `nebula-groups.ts` 的地区、行业和职能映射全部切换到这些透明副本；同一分组内素材唯一的规则不变。处理逻辑由 `scripts/create_nebula_cutouts.mjs` 可复现，避免手工图像编辑造成不一致。

## 2026-07-12 Nebula Blend And Unique-Mapping Correction

- 岗位地图的新生成星云 PNG 保留深空黑底，展示层统一使用 `mix-blend-screen`，黑色会与深空底色融合，不再形成遮住标签或轨道的矩形底板；图像仍为非交互装饰层，文字与按钮保持在其上方。
- 每一个单独的地图维度都分配不重复的星云 URL：当前职能 15 个分组使用 15 张不同素材，地区与行业的当前可见分组也分别保持 URL 唯一。不同维度之间可以复用同一资产，避免为同一页面填充重复图，又不无谓增加依赖。
- 桌面地图仍采用 3/4/5 列响应式网格保证可扫描和无横向溢出，但每个节点仅作小幅纵向位移，形成克制的散布感，不使用会挤压标签或使节点重叠的横向随机定位。1440px 职能视图已核验 15 节点无相交。

## 2026-07-12 AI Polish Reliability And Nebula Asset Expansion

- 项目经历 AI 润色不可用的根因是 MiMo 会把 `changes` 返回为字符串数组，而 route 的严格结果 schema 原先只接受 `{ type, description }` 对象数组，导致正常 `200` 响应被误判为格式失败。`/api/resume/ai-polish` 现在会保守归一化字符串 change 为 `wording` 类型对象，并强制使用原始 `title` / `subtitle`，只接受经过既有 bullet、长度与非空校验的结果；不放宽事实约束，也不自动覆盖原文。
- 本地 MiMo 配置存在且直接探测返回 `200`。探测中的项目经历结果使用字符串 `changes`，与上述修复一致；真实登录态端到端调用仍受 Supabase session 限制，发布后应以已登录账户完成一次实际项目经历生成与应用确认。
- 岗位地图职能视图不再复用有限绝对坐标。`NebulaDistributionMap` 以 `minmax(0, 1fr)` 的 3/4/5 列响应式网格布置分组，保留数量面积编码，防止 15 个职能节点互相覆盖或撑开页面。桌面 1440px 下 15 个节点无相交且无横向溢出；移动 390px 下保持双列和无溢出。
- 新增 14 张项目内星云资产：6 张职能星云、4 张地区星云、4 张行业星云，均由 image generation 生成并压缩至约 230–342KB。`nebula-groups.ts` 按地区、行业和职能 slug/索引稳定映射；同一地区视图 9 个分组和当前行业视图 7 个分组均使用不同图片 URL，不再以默认图片重复填充。
- 本轮没有改动岗位分类、筛选、Supabase、迁移或简历 PDF。Smoke 已覆盖 AI 响应兼容契约、无重叠网格和新增资产存在性。

## 2026-07-12 Job Map And List Integration

- `/explore` 原“按行业探索 + 四个等权星系入口”已改为真正参与岗位发现的“岗位地图”。地图默认显示行业密度，并可直接切换 `地区 / 行业 / 职能 / 我的投递`，不再要求先进入一层装饰性 gateway。
- `NebulaDistributionMap.tsx` 以星系面积编码岗位数量，使用稳定位置而非随机散点；桌面显示带轻量路径关系的密度图，移动端使用双列可点击布局。点选分组后仍复用 `NebulaCompanyField` 下钻到公司节点。
- 地图与线性岗位清单共享 `HomeClient` 中的 `baseVisibleJobs -> NebulaSelection.jobIds -> filteredJobs` 数据流。地图会继承关键词、地点、行业、批次和已投/未投筛选；点选星系后清单标题、行数和内容同步更新，并提供“查看全部/清除选区”。点公司节点继续定位到清单中的真实岗位行。
- 地图已移动到筛选栏与清单之前，用于先建立岗位分布认知；清单继续承担岗位比较、查看详情和投递操作。加载期间保留 390px 地图高度并显示“正在绘制岗位分布”，不会短暂误报空数据。
- 本轮没有修改 Supabase、岗位类型、服务、API 或 migration，也没有引入地图、图表、Canvas 或 3D 依赖。桌面 1440px 选择科技星云后清单准确同步为 104 行；移动端 390px 无横向溢出，四个维度和六项底栏完整可见。

## 2026-07-12 Motion System Refactor

- 全站动效继续单独使用已安装的 `motion`，没有引入 GSAP、Three.js、View Transition polyfill 或外部动画资源。`src/lib/motion.ts` 统一定义 instant / fast / normal / slow / immersive 时长、enter / exit / emphasized / planetApproach 缓动、页面与列表 variants；`src/styles/tokens.css` 同步提供 CSS token。
- `UserShell` 的 Navbar 保持常驻，页面内容由 `RouteContentTransition` 按 pathname 执行短距离 transform + opacity 进入退出；reduced-motion 下退化为 120ms 淡入淡出，不改变页面层级或数据加载流程。
- 首页移除了与点击目标无关的中央圆形放大遮罩。`FloatingPlanet` 在点击时读取真实 `DOMRect`，`SpaceHome` 先 `router.prefetch`，再由 fixed `PlanetTransitionOverlay` 从该位置移动、放大并在视觉接管阶段导航；进入时停止持续轨道并取消高成本退场 blur。移动端使用现有较短导航等待，reduced-motion 仅保留必要淡出。
- Navbar 当前项使用共享 layout indicator；岗位筛选结果和投递列表使用稳定 key + layout animation，投递列表/看板/星图使用短横向 crossfade，简历模板选择反馈复用统一节奏。Drawer 新增 ESC、焦点圈定、打开后聚焦关闭按钮和关闭后返回触发元素。
- 本轮只调整动画与交互反馈，没有修改页面内容层级、文案、Supabase 数据流、API、类型或 migration。完整的“子页面主视觉凝聚为行星并逆向回到首页原位置”仍未实现；浏览器返回当前使用普通页面/首页进入反馈，后续若做需建立跨路由持久 PlanetTransitionProvider，并单独验证 Safari。

> Generated: 2026-07-08; updated through 2026-07-14
> Source: Live code, targeted repository verification, production deployment checks, and Supabase import results for /Users/wangrui/Documents/Web
> Purpose: Single source of truth for onboarding future Codex agents and developers

---

## 2026-07-12 Navigation Recovery And Resume AI Polish

- The handwritten `AI-Powered` resume-title signature includes horizontal glyph padding because `Snell Roundhand` swashes overhang the nominal text box; retain the `inline-block px-2` drawing allowance so the initial flourish and final `d` are not clipped by gradient text painting.
- Resume PDF/preview font loading resolves `NEXT_PUBLIC_RESUME_FONT_REGULAR_URL` and `NEXT_PUBLIC_RESUME_FONT_BOLD_URL` first, then falls back independently to the same-origin `/fonts/...` files if a configured remote source fails. Remote failure falls through after one request so a broken CORS rule cannot hold the UI for repeated 15-second timeouts; the local source keeps bounded retries. `TypeError`/Safari `Load failed` is normalized to a Chinese network message. Rejected font and PDF measurement promise caches are cleared, and `ResumePreview` clears both before `重新生成`. A production-build fault injection with both remote URLs unreachable still produced an `A4 · 1 页` preview. After deploying commit `1647226`, the signed-in production Safari page also rendered `A4 · 1 页` and reported `PDF 已开始下载`. The Vercel variables are set for Production and Preview, but COS CORS remains desirable so mainland users normally use the Guangzhou source rather than the Vercel fallback.
- Tencent Cloud COS bucket `starjob-resume-fonts-1451789998` is in `ap-guangzhou` with single-AZ storage and a private bucket ACL. Its narrowly scoped bucket policy grants anonymous `GetObject` only for root objects `NotoSerifSC-Regular.ttf` and `NotoSerifSC-Bold.ttf`; direct HTTPS reads returned `200` with 14,780,348 and 14,779,260 bytes respectively. A `fonts/` prefix exists but is empty. CORS is not yet configured; do not claim browser font loading works until the CORS preflight and deployed preview are checked. Do not delete this bucket as part of ordinary cleanup.
- `/explore` location filtering is hierarchical rather than a flat raw-value list. `src/lib/locations.ts` normalizes current location tokens into `不限 / 全国 / 省级 / 市级`; province filters include known cities, city mode uses a province-then-city flow, nationwide matches only 全国/全球 markers, overseas is separate, and legacy plain-text filter values remain compatible. No schema or data migration was needed.
- Resume AI affordances are deliberately prominent without changing the editor flow: every per-entry `AI 润色` action uses a rounded Prussian-blue-to-silver gradient with visible focus treatment, and the `简历制作` H1 carries a small handwritten `AI-Powered` signature at its lower-right. These marks are editor UI only and never enter the A4 preview or exported PDF.
- Resume AI system instructions now explicitly prohibit upgrading participation/support language into ownership or leadership, inventing quantitative impact, forcing unsupported results, or changing identity fields. Ambiguous or conflicting source material must be handled conservatively and reported through `warnings`. User-facing copy says only `AI 润色`; provider naming is kept as a server implementation detail. The resume page ends with `请谨慎审核 AI 输出的简历信息`.
- `/` always renders the orbiting galaxy homepage for signed-in and signed-out users. Authentication only changes the profile/login planet and admin visibility; it no longer replaces the branded home with a task dashboard.
- User-facing module names are standardized as `岗位坐标 / 投递管理 / 简历制作 / 求职社区 / 星瓶 / 个人中心`. Desktop navigation exposes all six. Mobile uses a fixed six-item bottom bar, while the wordmark remains a direct link back to `/`.
- The former signed-in home workspace was removed. Current-stage guidance and weekly actions now live directly in `/my` alongside materials, list/board/star-map views, and progress editing, avoiding a second competing application dashboard.
- Login uses the scene background with a restrained Prussian-blue liquid-glass surface and shorter punctuation-free helper copy. The default resume sample uses an `欧莱雅 Brandstorm 商业创新挑战赛` project instead of describing Job Bottle itself.
- `src/app/api/resume/ai-polish/route.ts` adds authenticated, POST-only MiMo polishing for one resume entry at a time. It validates size and schema, uses a 35-second timeout, classifies upstream failures, performs at most one controlled JSON repair, and applies a six-requests-per-ten-minutes in-memory user limit. This rate limit is best-effort per Vercel instance, not globally durable.
- MiMo configuration is server-only: `MIMO_API_KEY`, `MIMO_BASE_URL`, and `MIMO_MODEL`. They are empty placeholders in `.env.local.example`; no `NEXT_PUBLIC_` variables or client-side provider calls exist. The official Base URL and enabled model must be copied from the user's MiMo console rather than guessed.
- `ResumeEditor` exposes `AI 润色` on each work, project, campus, award, and custom entry; education limits AI to courses/honors. The dialog supports one bullet or all bullets, five polish goals, Chinese/English mode, source/result comparison, suggestions/warnings, explicit apply/cancel/regenerate, and one-step undo. Applying reuses the existing local save and 700ms cloud sync path and preserves IDs, dates, ordering, company/school/role facts, and other cards.
- Browser acceptance at 390 × 844 confirmed six mobile items without horizontal overflow, the A4 preview at 358 × 506.30 (`0.707084`), visible per-entry AI controls, non-destructive unauthenticated error handling, and the revised login layout. Real MiMo output remains unverified until all three server variables are configured.

## 2026-07-11 A4 Fidelity, Task Workflow, And Admin Users

- Resume preview remains a responsive A4 SVG driven by the same jsPDF operation list as export. Text operations now carry jsPDF-measured widths and render with SVG `textLength` / `spacingAndGlyphs`, preventing browser font metrics from changing line geometry. Preview and PDF photos use the same frame scaling rule, and the paper caps at `210mm` while preserving the `595.28 × 841.89 pt` viewBox.
- Acceptance evidence includes desktop and 390 × 844 browser measurements, standard `210:297` ratios without horizontal overflow, and real one-page and long two-page exports. `pdfinfo` reported every page as `595.28 × 841.89 pt (A4)`; preview and export page counts matched.
- `20260711120000_application_workflow_details.sql` separates candidate intent from application progress and adds priority, saved time, channel/account/contact, next action/time, linked resume, custom stage, and review notes. The CTA now advances through 加入星瓶 -> 保留候选 -> 开始准备 -> 记录投递 -> 更新进度.
- `/my` defaults to a linear list and retains board and constellation views. Its priority queue uses real deadlines, next-action times, stale saved candidates, stale applications, and interview follow-up signals. The detail drawer exposes status history and structured application fields.
- Superseded on 2026-07-12: the task workspace no longer replaces `/`. All users retain the galaxy home, while current-stage and weekly-action content lives in `/my`; mobile navigation now exposes all six primary modules.
- `20260711130000_job_decision_fields.sql` adds optional responsibilities, must-have requirements, preferred qualifications, and keywords. Job detail shows source-backed sections and honest empty states; admin job editing can maintain them.
- `/admin/users` and `/api/admin/users` add account visibility and identity management. The API rechecks the authenticated profile role, uses `SUPABASE_SERVICE_ROLE_KEY` only in a server-only client, prevents self-demotion/self-disable, and supports display name, role, disable, and restore. As of 2026-07-13 the key is configured locally and in Vercel Production as Sensitive; Preview still requires separate configuration if this route is tested there.
- Canonical live URL is `https://www.starjob.space/`; `https://starjob.space/` redirects there. The star-bottle share QR and visible host label use the canonical domain.

---

## 2026-07-11 A4 Resume Parity And Product Audit

- `ResumePreview.tsx` no longer maintains an independent HTML resume layout. `resumePdf.ts` now exposes a shared A4 coordinate layout made from the same jsPDF font metrics, wrapping, template density selection, section rules, photo policy, and page-break decisions used by export. The browser renders those operations as responsive A4 SVG pages, so paper, typography, spacing, and rules scale together at desktop and mobile widths.
- Continuation pages now use `addPage("a4", "portrait")`; the previous Letter continuation-page call was removed. `ResumeBuilderClient` also initializes local resumes with a zero-delay timer instead of `requestAnimationFrame`, preventing a background tab from remaining on “正在读取简历”.
- Browser acceptance at 1440 × 900 and 390 × 844 confirmed the A4 preview, the `A4 · 1 页` page count, no mobile horizontal overflow, and successful export feedback (`PDF 已开始下载`) without console errors. The in-app browser does not expose the Blob created by `jsPDF.save()` as a downloadable event, so release evidence is based on the shared A4 code path plus UI export completion rather than an external MediaBox parse.
- `docs/product-audit-2026-07-11.md` records the current positioning, actual flow, P0/P1/P2 issues, task-driven information architecture, target user flows, data gaps, and phased boundary. It explicitly distinguishes real fields from proposed priority, channel, contact, reminder, and structured-JD data.
- The global navigation is now task-oriented: 找岗位, 投递管理, 简历, 求职交流, 我的. 星瓶 remains a branded visualization reachable from the homepage and profile assets rather than a competing high-frequency top-level item.
- Job detail now links to `/resume` with the real job id, company, and role context. The resume builder opens an existing linked version or creates a new immutable copy, binds `linkedJobId`, keeps the full role list as the version note, and synchronizes the primary role into both historical target-role fields so the A4 header updates correctly. No Supabase migration was added.

---

## 2026-07-10 Product Workspace Updates

### Interface And Resume Expansion

- High-frequency routes now use the quieter `SpaceShell` work surface. `/explore`, `/my`, `/resume`, `/profile`, `/forum`, `/login`, and job details no longer carry the full star-field treatment; the scene variant is reserved for `/`, `/galaxy`, and `/bottle` where the visual has product meaning.
- `Navbar.tsx` is a standard sticky toolbar with an underline active state, small-radius actions, and a plain mobile menu. It no longer nests a navigation pill and account pills inside a large floating rounded container.
- The user-facing copy was tightened across the job pool, applications, profile, resume, forum, login, and job detail actions. High-frequency titles do not repeat generic eyebrow text; job detail uses the direct term “收录”, while the star/bottle vocabulary stays in the galaxy and bottle views.
- `/profile` is an open, divider-led asset page rather than nested panels. Its matching-jobs area is preference-based, and the common-entry section links to the new `/guide` route. `JobSearchGuide.tsx` provides five expandable, concrete steps: 筛岗位、建记录、配简历、记节点、做复盘.
- Resume editing and the paper preview share a desktop two-column workspace from `xl` upward. `resumePdf.ts` is now the single layout engine; `ResumePreview.tsx` renders its measured operations, so the preview and vector PDF share header alignment, photo policy, accent color, wrapping, section rules, density selection, and pagination.
- Resume templates are now compact, classic, modern, consulting, technical, academic, English Classic, and English Modern. The three new Chinese templates are role-oriented visual layouts only: consulting/finance uses a centered strong-rule header, technical uses a left-aligned teal-accent header, and academic/research uses a centered subtle-rule header. Existing form fields, local storage, account sync, and PDF export behavior were retained.
- Added `supabase/migrations/20260710150000_resume_template_expansion.sql`. It adds the three template IDs while retaining `minimal` and `executive`. `resume-sync.ts` keeps the actual ID in `content_json` and falls back to `compact` when an older deployed constraint rejects a newer template, so saving does not block before the migration is applied.
- `scripts/smoke_check.mjs` now checks the eight template IDs, the new migration, the shared work-surface CSS, and the removal of the obsolete AI-placeholder editor copy.
- Homepage planet names remain 岗位池, 投递, 简历, 经验库, and 星瓶 because they label branded modules. The high-frequency global navigation uses task labels: 找岗位, 投递管理, 简历, 求职交流, 我的. Contextual terms such as 岗位星图 and 投递星图 are reserved for visual views.
- The mobile homepage uses the compact `CorePlanet` sizing of `min(20vw, 78px)` for the center star and `min(20vw, 82px)` for its wordmark, with a smaller top gap. This was visually checked at 390 × 844; retain the compact variant when changing homepage geometry.
- `AdminShell` follows the same work-surface rule: a compact divider-led toolbar with horizontal navigation and no star field or nested rounded floating shell. Admin data tools should remain operational pages rather than a second visual language.
- 2026-07-11 visual refresh: the user-supplied “林深星渡” reference is now the global color source. `tokens.css` anchors the system to 极夜 `#000001`, 普鲁士蓝 `#12294E`, 茄紫 `#564A71`, 暮山紫 `#7F5568`, and 星尘紫 `#7E7CB5`; work surfaces use lighter alpha layers rather than opaque glass. Tailwind aliases, galaxy/orbit materials, BottleStage, and the exported share card use the same set. Resume paper templates intentionally retain their document-specific colors.

### Workspace Flow

- `/my` is now the primary authenticated workspace: its default is a four-column application pipeline with a concise action queue, material-readiness summary, filters, and an optional constellation/orbit review view. The action queue is derived only from `user_applications.status`, `progress_note`, and `updated_at`; it does not claim persistent reminders or priorities that are not stored in the database.
- `src/lib/career-workspace.ts` centralizes task labels, pipeline grouping, resume readiness (`resumes.linked_job_id`), optional `jobs.closes_at` deadline display, and profile-preference fit labels. Reuse this layer rather than duplicating state-to-copy logic in UI components.
- `/explore` is a job pool first: the linear job list and filters precede the star-nebula experience. Nebula browsing remains available under “按行业探索”. Job rows show verified `closes_at` information when present, profile-preference fit labels, current application status, and linked-resume readiness.
- Global navigation naming is now 找岗位, 投递管理, 简历, 求职交流, 我的. `/profile` is the personal career-asset center and includes the star-bottle entry; `/forum` remains the experience and discussion surface.
- The workspace flow consumes existing fields introduced by prior migrations: `jobs.closes_at`, `user_applications.progress_note`, profile preferences, and `resumes.linked_job_id`. The current template expansion also adds `20260710150000_resume_template_expansion.sql` as documented above.
- `npm run lint` and `npm run build` passed after the change. The Codex in-app browser could not reach the local Next dev port, so no current-run visual screenshot audit was claimed; use a reachable browser environment for desktop/mobile visual acceptance before a visual-sensitive release.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Core User Flow](#2-core-user-flow)
3. [Feature Map](#3-feature-map)
4. [File-by-File Index](#4-file-by-file-index)
5. [Architecture Summary](#5-architecture-summary)
6. [Data Flow](#6-data-flow)
7. [Database / Backend / API Notes](#7-database--backend--api-notes)
8. [UI / Design System Notes](#8-ui--design-system-notes)
9. [Known Issues / Technical Debt](#9-known-issues--technical-debt)
10. [Recommended Reading Order for Future Codex Sessions](#10-recommended-reading-order-for-future-codex-sessions)
11. [Development Guidelines for Future Agents](#11-development-guidelines-for-future-agents)
12. [Open Questions](#12-open-questions)

---

## 1. Product Overview

### What is this app?

秋招星瓶 (Job Bottle) is a **Chinese-language web application for managing the 2027 campus recruitment (秋招) season**. It helps university students track job openings, manage application progress, and visualize their job-hunting journey through a space/galaxy metaphor.

### Who uses it?

- **Primary users**: Chinese university students (2027 graduates) applying to companies during the autumn recruitment season
- **Secondary users**: A single admin (the project owner) who maintains the job database

### What problem does it solve?

- Consolidates 206 currently verified active job openings from multiple sources into one searchable database (live count can change)
- Tracks application progress through stages (opened → applied → written test → interview rounds → offer)
- Provides a visual "star bottle" metaphor where each application is a star that falls into a glass bottle
- Offers a galaxy-themed navigation system where jobs are organized by region and industry
- Includes a resume builder with PDF export
- Has a discussion forum for sharing experiences

### Brand & naming

- **App name**: 拾星 (Shi Xing) — "Picking Stars"
- **Runtime brand**: 拾星. "秋招星瓶" still appears as descriptive/project wording in some contexts; **do NOT reintroduce "未来星瓶"**.
- **Logo**: `/brand/shi-xing-wordmark.png`
- **Deployment**: Vercel is the active target/live host; there is no `vercel.json` in the repo, so deployment behavior is mostly Vercel defaults + dashboard settings.
- **Live URL**: `https://www.starjob.space/` (`https://starjob.space/` redirects here; `job-bottle.vercel.app` remains a Vercel fallback)

### Tech stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| Language | TypeScript | 5.x (strict mode) |
| React | React / React DOM | 19.2.4 |
| Styling | Tailwind CSS | 4.x (PostCSS plugin) |
| Animation | Motion for React | 12.42.2 |
| Backend | Supabase (Postgres + Auth + Storage) | @supabase/ssr 0.12.0 |
| Supabase Client | @supabase/supabase-js | 2.110.0 |
| Forms | React Hook Form + Zod | 7.80.0 / 4.4.3 |
| CSV | PapaParse | 5.5.4 |
| Excel import | read-excel-file | 9.2.0 |
| Icons | Lucide React | 1.23.0 |
| PDF | jsPDF vector export for resumes; html2canvas + jsPDF still used for visual/share-card style exports | 4.2.1 / 1.4.1 |
| QR | qrcode | 1.5.4 |

---

## 2. Core User Flow

### Flow 1: First-time visitor
1. Land on `/` → Full-screen galaxy homepage with orbiting planets
2. See center core planet with 拾星 logo + wordmark
3. See 5-6 orbiting planets: 岗位池, 投递, 星瓶, 简历, 经验库, (admin if logged in as admin)
4. Click a planet → PlanetTransitionOverlay zoom animation → navigate to that page
5. No login required to browse jobs (`/explore`)

### Flow 2: Browse and apply to jobs
1. `/explore` → Job list with filter sidebar (keyword, industry, batch, location, categories, sort)
2. The job distribution map directly switches among 地区 / 行业 / 职能 / 我的投递 and shares its selection with the linear list
3. Select a group → see its company field and a separately scrollable matching-job result area
4. Click a job row or company star → `handleApply()`:
   - If not logged in → redirect to `/login?next=/explore`
   - Upsert application record (status: "opened")
   - Open official company URL in new tab
   - Queue bottle drop animation via localStorage
5. When user returns to tab → ApplyReturnConfirm bar: "已投递" / "还没有" / "不投了"
6. If confirmed "已投递" → status moves to "applied"

### Flow 3: Track applications
1. `/my` → MyApplicationsClient with action queue, material readiness, keyword/status filters, and a default application pipeline
2. Pipeline groups records into 待确认(opened), 已投递(applied), 笔试与面试, and 结果归档(offer/rejected/withdrawn)
3. Each record exposes the next action, linked-resume readiness, and last update; opening it shows ProgressDrawer
4. Users can switch to ApplicationOrbitSystem for a brand-level constellation/orbit review without making it the default operational view
5. ProgressDrawer: status orbit nodes, note textarea, delete option
6. Status change → optimistic update → async DB write → rollback on failure

### Flow 4: View star bottle
1. `/bottle` → MyBottleClient → ApplicationBottle
2. Transparent PNG bottle foreground over Canvas star layer
3. Stars positioned inside bottle cavity using geometric collision detection
4. New applications trigger falling animation from bottle neck
5. Stats panel: 捕获/投递/面试/Offer counts
6. Pointer/touch movement gently shakes stars inside the bottle canvas
7. "分享我的星瓶" → generates a 3:4 PNG + PDF poster with logo, a complete glass-bottle visual, public-safe company names (first five plus ellipsis), Offer/applied/interview counts, and a clear QR code; it does not expose profile preferences, email, internal IDs, or resume metadata

### Flow 5: Personal center
1. `/profile` → ProfileClient in UserShell
2. Logged-in users see a branded personal job-search card/cockpit rather than an admin sidebar: identity, profile completeness, star-bottle status, preferences, resumes, recommendations, guide links, account/privacy, and feedback
3. Basic info includes username, phone, city, school, major, and graduation year, all editable inline
4. Preferences include preferred regions and target roles as multi-select chips; recommendations match active jobs against those fields
5. Feedback opens `mailto:raywang6688@outlook.com` with subject `拾星问题反馈`; account/privacy copy notes that share posters do not expose email or internal IDs
6. `/my` remains the original application orbit/star-map page; profile and star map are intentionally separate

### Flow 6: Admin operations
1. `/admin` → AdminShell with separate navigation
2. `/admin/jobs` → AdminJobsClient: CRUD jobs, toggle active/inactive
3. `/admin/import` → CsvImportPanel: upload CSV/Excel, preview, bulk import; duplicate job fingerprints are skipped in preview and against the database before insert
4. `/admin/jobs` → "筛选重复岗位" groups historical duplicates by business fingerprint so an admin can inspect and edit/delete one record at a time; the optional admin RPC migration remains available only after its SQL has been applied live
4. Logo upload to Supabase Storage `company-logos` bucket

---

## 3. Feature Map

### Implemented features ✅

| Feature | Status | Key files |
|---------|--------|-----------|
| Galaxy homepage with orbiting planets | ✅ | SpaceHome.tsx, FloatingPlanet.tsx, CorePlanet.tsx |
| Planet transition animation | ✅ | PlanetTransitionOverlay.tsx |
| Job listing with filters | ✅ | HomeClient.tsx, JobFilterBar.tsx, JobCard.tsx |
| Job categories (15 types) | ✅ | categories.ts, migration 20260704040000 |
| Nebula gateway (region/industry/category/captured) | ✅ | NebulaGateway.tsx, NebulaNode.tsx |
| Company star field with stable layout | ✅ | star-layout.ts, NebulaCompanyField.tsx |
| Job detail page with related jobs | ✅ | /jobs/[id]/page.tsx |
| Application tracking (9 statuses) | ✅ | applications.ts, ProgressDrawer.tsx |
| Concentric orbit visualization | ✅ | ApplicationOrbitSystem.tsx, ApplicationOrbitConfig.ts |
| Star bottle with glass effect + pointer shake | ✅ | ApplicationBottle.tsx, BottleStage.tsx, bottleGeometry.ts |
| Falling star animation | ✅ | bottle-drop.ts, BottleStage.tsx |
| Share card generation (PNG + PDF poster) | ✅ | shareBottleCard.ts — editorial 3:4 star-bottle poster with a complete bottle layer, public-safe company names, Offer/applied/interview counts, and QR |
| Resume builder with eight formal templates | ✅ | ResumeBuilderClient.tsx, ResumeTemplatePicker.tsx, ResumeEditor.tsx, ResumePreview.tsx — compact, classic, modern, consulting, technical, academic, English Classic, and English Modern share one structured data model |
| Resume PDF export | ✅ | ResumePdfExportButton.tsx + resumePdf.ts — exports A4 vector text PDF, embeds Noto Serif SC TTF for Chinese, supports compact/classic/modern/English Classic/English Modern layouts, aligns preview typography with PDF, avoids screenshots, and hides photos in English templates |
| Resume cloud sync | ✅ | resume-sync.ts, migrations 20260708090000 + 20260710120000 + 20260710130000 + 20260710140000; resume document IDs are UUIDs so browser-created resumes can sync to Supabase. New template IDs are retained in content_json, so a hosted database with an older check constraint retries safely with `compact` rather than blocking cloud saving; applying 20260710140000 keeps template_id fully queryable. |
| Discussion forum (posts, comments, likes, inline expansion, author editing, multi-post admin pinning, masked authors) | ✅ | ForumClient.tsx, PostCard.tsx, NewPostForm.tsx, forum.ts, `/api/admin/forum/pin`, `/api/forum/authors` |
| Signal strength indicator | ✅ | signal-score.ts, SignalStrengthTicks.tsx |
| Email/password auth + five-digit preset-account login | ✅ | LoginForm.tsx, auth.ts, scripts/provision_preset_accounts.mjs |
| Admin job CRUD | ✅ | AdminJobsClient.tsx, AdminJobForm.tsx |
| CSV/Excel bulk import with job fingerprint duplicate skipping | ✅ | CsvImportPanel.tsx, csv.ts, job-dedupe.ts |
| Admin duplicate job inspection | ✅ | AdminJobsClient.tsx, AdminJobTable.tsx, job-dedupe.ts; duplicate-only filtering works without requiring the optional merge RPC |
| User profile/job-search card page | ✅ | /profile, ProfileClient.tsx, profile.ts, migrations 20260709090000 + 20260709100000 |
| Company logo upload | ✅ | storage.ts |
| RLS security policies | ✅ | policies.sql, migrations |
| Analytics events tracking | ✅ | track.ts, migration 20260704020000 |
| Status history logging | ✅ | migration 20260704010000 |
| Post reporting backend table/RLS | ⚠️ Backend-only | migration 20260704010000 (reports table); no UI/data-layer reporting flow found |
| Apply return confirmation | ✅ | ApplyReturnConfirm.tsx |
| Capture animation | ✅ | CaptureAnimation component |

### Not implemented / Planned

| Feature | Status | Notes |
|---------|--------|-------|
| Deadline tracking | ❌ Removed | Amendment 1: data not available, feature offline |
| Push notifications | ❌ | No notification system |
| Search history | ❌ | Not implemented |
| Reply-to-comment | ❌ | Only flat comments |
| Job-list pagination | ❌ | All active jobs loaded at once; forum fetches first 50 posts but has no UI pagination |
| AI resume optimization | ✅ | Authenticated `/api/resume/ai-polish` with conservative schema validation, compare/apply flow, timeout and best-effort per-instance rate limit |

### Product Design Notes

- The strongest product loop is now: explore jobs → capture/open application → manage status in `/my` → tailor a resume version in `/resume` → collect/share progress through `/bottle`.
- Resume templates intentionally stay inside the current vector PDF renderer rather than adding a LaTeX compiler. GitHub references such as RenderCV, Awesome-CV, Deedy-Resume, and billryan/resume are useful for layout patterns, but a full TeX toolchain would be heavier and less Vercel-friendly for the current architecture.
- Current template positioning: `compact` is a dense Chinese one-page layout for finance/consulting/business students; `classic` is a LaTeX-inspired business resume with stronger section rules; `modern` is a lighter single-column layout for product, data, and internet roles. The former `minimal` and `executive` values normalize to modern and classic to avoid near-duplicate choices. `english_classic` and `english_modern` are English-heading, no-photo templates for overseas applications. `ResumeTemplatePicker` shows only the essential visual choices, without explanatory header copy.
- Product UI direction after the full-path design audit: deep-space imagery stays reserved for the homepage, star bottle, orbit and galaxy scenes. High-frequency workflow pages use smaller page titles, an open filter rail, linear collection surfaces and one explicit action per row rather than repeated rounded cards. The job list separates “view details” from “start application” so browsing does not accidentally open an external application site. Personal center removes repeated English eyebrow labels, while galaxy entrance cards use actual nebula assets.

---

## 4. File-by-File Index

### Root config files

| File | Purpose | Dependencies | Risk |
|------|---------|-------------|------|
| `package.json` | Project config, scripts, deps | — | Low |
| `next.config.ts` | Empty Next.js config | — | Low |
| `tsconfig.json` | TypeScript config, `@/*` path alias | — | Low |
| `tailwind.config.ts` | Custom colors (void, nebula, aurum, star, ink), animations | — | Medium — color changes affect entire UI |
| `postcss.config.mjs` | PostCSS with @tailwindcss/postcss | — | Low |
| `eslint.config.mjs` | ESLint with next core-web-vitals + typescript | — | Low |
| `README.md` | Project overview, setup instructions | — | Low |

### App pages (`src/app/`)

| File | Route | Component | Notes |
|------|-------|-----------|-------|
| `layout.tsx` | (root) | RootLayout | Geist fonts, zh-CN lang, metadata "拾星" |
| `page.tsx` | `/` | GalaxyHome | Full-screen galaxy, no Navbar |
| `globals.css` | — | — | CSS vars, glass-panel, space-bg, capture animations |
| `login/page.tsx` | `/login` | LoginForm in PageShell | Suspense boundary |
| `jobs/page.tsx` | `/jobs` | permanentRedirect → /explore | Legacy redirect |
| `jobs/[id]/page.tsx` | `/jobs/:id` | Job detail (Server Component) | generateMetadata, fetchJobById, RelatedJobs |
| `my-bottle/page.tsx` | `/my-bottle` | permanentRedirect → /bottle | Legacy redirect |
| `my-applications/page.tsx` | `/my-applications` | permanentRedirect → /my | Legacy redirect |
| `bottle/page.tsx` | `/bottle` | MyBottleClient in PageShell | Star bottle page |
| `forum/page.tsx` | `/forum` | ForumClient in PageShell | Discussion forum |
| `galaxy/page.tsx` | `/galaxy` | GalaxyGateway in PageShell | Galaxy entry point |
| `galaxy/industry/page.tsx` | `/galaxy/industry` | IndustryGalaxyMap | Industry nebula map |
| `galaxy/industry/[name]/page.tsx` | `/galaxy/industry/:name` | GalaxyJobsClient | Industry detail |
| `galaxy/region/page.tsx` | `/galaxy/region` | RegionGalaxyMap | Region nebula map |
| `galaxy/region/[region]/page.tsx` | `/galaxy/region/:region` | GalaxyJobsClient | Region detail |
| `explore/page.tsx` | `/explore` | HomeClient in PageShell (Suspense) | Main job list |
| `profile/page.tsx` | `/profile` | ProfileClient in UserShell | User management center: settings, basic info, preferences, resumes, recommendations, feedback, guide |
| `resume/page.tsx` | `/resume` | ResumeBuilderClient in UserShell | Resume builder |
| `my/page.tsx` | `/my` | MyApplicationsClient in PageShell | Application tracking |
| `admin/page.tsx` | `/admin` | Admin dashboard cards | AdminShell |
| `admin/jobs/page.tsx` | `/admin/jobs` | AdminJobsClient in AdminShell | Job CRUD |
| `admin/import/page.tsx` | `/admin/import` | CsvImportPanel in AdminShell | Bulk import |
| `admin/users/page.tsx` | `/admin/users` | AdminUsersClient in AdminShell | Auth account visibility, role and disable/restore management |
| `api/admin/users/route.ts` | `/api/admin/users` | GET/PATCH route handler | Rechecks admin session, then uses server-only service role |
| `api/admin/forum/pin/route.ts` | `/api/admin/forum/pin` | PATCH route handler | Admin-only forum pin/unpin |
| `api/forum/authors/route.ts` | `/api/forum/authors` | POST route handler | Returns only masked public author names and roles |
| `api/resume/ai-polish/route.ts` | `/api/resume/ai-polish` | POST route handler | Authenticated MiMo resume-entry polish |
| `api/resume/download-auth/route.ts` | `/api/resume/download-auth` | GET route handler | Server-verifies download session |

### Lib files (`src/lib/`)

| File | Exports | Purpose | Who imports |
|------|---------|---------|-------------|
| `types.ts` | Profile, Job, UserApplication, ForumPost, ResumeRow, Database, etc. | All TypeScript types + Supabase Database type | Everything |
| `constants.ts` | APPLICATION_STATUS, PROFILE_ROLES, EMPTY_JOB_FILTERS, JOB_FIELD_LABELS | Status labels, filter defaults, site name | Most components |
| `auth.ts` | ensureProfile, getCurrentUser, getCurrentUserOrNull, getMyProfile, translateAuthError | Auth helpers with timeout protection | Navbar, all client components |
| `profile.ts` | updateMyProfilePreferences, parsePreferenceInput, formatPreferenceInput | Profile basic info + preference data helpers | ProfileClient, LoginForm |
| `profile-options.ts` | PROFILE_REGION_OPTIONS, PROFILE_ROLE_OPTIONS, toggleProfileOption | Shared multi-select options for registration and profile preferences | LoginForm, ProfileClient |
| `jobs.ts` | fetchActiveJobs, fetchJobById, fetchRelatedJobs, filterJobs, getJobFacetOptions, toJobPayload | Job data layer | HomeClient, AdminJobsClient, GalaxyJobsClient |
| `job-dedupe.ts` | getJobMergeFingerprint, findDuplicateJobGroups, mergeDuplicateJobs | Business-level duplicate detection/merge wrapper for jobs | csv.ts, CsvImportPanel, AdminJobsClient |
| `applications.ts` | fetchMyApplications, upsertApplication, updateApplication, deleteApplication | Application CRUD | HomeClient, MyBottleClient, ProgressDrawer |
| `forum.ts` | fetchPosts, fetchPost, createPost, updatePost, deletePost, createComment, deleteComment, toggleLike, setPostPinned | Forum CRUD; author metadata comes from the masked `/api/forum/authors` route | ForumClient, PostCard |
| `resume.ts` | ResumeDocument, RESUME_TEMPLATES, createEmptyResume, createSampleResume, loadLocalResumes, saveLocalResumes | Resume data model + localStorage + template metadata | ResumeBuilderClient, ResumeEditor, ResumePreview |
| `resume-sync.ts` | fetchMyResumes, upsertMyResume, deleteMyResume, isMissingResumeTableError | Supabase resume sync | ResumeBuilderClient |
| `bottle-drop.ts` | queueBottleDrop, peekBottleDrop, dismissBottleDrop | localStorage queue for falling star animation | HomeClient, ApplicationBottle |
| `bottleShape.ts` | BOTTLE_INNER_PATH, BOTTLE_MAIN_CAVITY_PATH, isBottleCircleInsideMainCavity, getBottleSafeRadius | Bottle cavity geometry for star positioning | BottleStage, bottleGeometry |
| `categories.ts` | JOB_CATEGORIES (15 types), normalizeJobCategories, jobMatchesSelectedCategories | Job category normalization | csv.ts, jobs.ts, JobFilterBar |
| `company-labels.ts` | COMPANY_SHORT_LABELS (167 entries) | Manual company short name mappings | utils.ts |
| `csv.ts` | parseJobsImportFile, parseJobsCsv, getJobImportFingerprint | CSV/Excel parsing + job fingerprint duplicate preview | CsvImportPanel |
| `dates.ts` | formatShanghaiDateTime, formatShanghaiDate, daysUntilShanghai | Shanghai timezone date formatting | jobs/[id], JobCard |
| `galaxy-routes.ts` | Re-exports from planet-routes.ts | — | — |
| `galaxy-taxonomy.ts` | REGION_GROUPS, INDUSTRY_GROUPS, classifyJob, filterJobsByGalaxy, buildGalaxyStats | Galaxy classification system | GalaxyMapClient, NebulaGateway |
| `nebula-groups.ts` | buildNebulaGateways, buildNebulaCategories, NebulaCategory, NebulaSelection | Nebula grouping logic | NebulaGateway |
| `planet-routes.ts` | PLANET_ROUTES (6 planets with orbit params) | Homepage planet definitions | SpaceHome |
| `signal-score.ts` | signalScore, freshnessTier, isFadingSignal | Forum post activity scoring | PostCard |
| `star-layout.ts` | buildClusterLayout, getStableHash, getShortLabel | Stable grid layout for company stars | NebulaCompanyField |
| `storage.ts` | uploadCompanyLogo, validateLogoFile | Supabase Storage logo upload | AdminJobForm |
| `track.ts` | track() | Analytics event insertion | MyBottleClient |
| `application-orbit.ts` | momentumTier, daysSince | Application momentum calculation | ApplicationOrbitStar |
| `utils.ts` | cn, getCompanyShortLabel, getCompactCompanyLabelStyle, isValidHttpUrl, splitToTags, safeOpenUrl | General utilities | Everything |
| `supabase/client.ts` | createClient (browser singleton), isSupabaseConfigured | Browser Supabase client | All client components |
| `supabase/server.ts` | createClient (server, cookie-based) | Server Supabase client | Server Components and authenticated route handlers |
| `supabase/admin.ts` | createAdminClient | Server-only service-role Supabase client | Admin users and masked forum-author routes |

### Component files (`src/components/`)

#### Layout (`components/layout/`)

| File | Purpose | Notes |
|------|---------|-------|
| `Navbar.tsx` | Sticky nav with auth state, mobile menu | Client component, listens to auth changes |
| `PageShell.tsx` | Delegates to UserShell | Simple wrapper |
| `AdminShell.tsx` | Admin layout with sidebar nav, role check | Separate from user layout |
| `UserShell.tsx` | SpaceShell + Navbar + main content area | User-facing layout |
| `SpaceShell.tsx` | space-root + SpaceBackground + space-content | Background wrapper |
| `SpaceBackground.tsx` | Multi-layer space background (image, vignette, stars, noise, meteor) | Used by SpaceShell |

#### Auth (`components/auth/`)

| File | Purpose |
|------|---------|
| `LoginForm.tsx` | Login/register toggle with react-hook-form + zod and Supabase Auth; login accepts email or 5-digit preset account, while registration requires email and collects profile/preferences |

#### Onboarding (`components/onboarding/`)

| File | Purpose |
|------|---------|
| `WelcomeNotice.tsx` | Accessible first-visit guest introduction and first-login user welcome/privacy notice with local and Auth-metadata dismissal state |

#### Profile (`components/profile/`)

| File | Purpose |
|------|---------|
| `ProfileClient.tsx` | Branded personal job-search card/cockpit with inline basic info, preferences, star-bottle status, resumes, recommendations, guide links, account/privacy, and feedback mailto |

#### Jobs (`components/jobs/`)

| File | Purpose |
|------|---------|
| `HomeClient.tsx` | Main explore page: data loading, filtering, nebula gateway, apply flow, ProgressDrawer |
| `JobCard.tsx` | Compact job row with company name, status pill, apply button |
| `JobDetailActions.tsx` | Sticky capture bar on job detail page with ApplyReturnConfirm |
| `JobFilterBar.tsx` | Filter sidebar: keyword, industry, batch, location, categories, sort |
| `ApplyReturnConfirm.tsx` | "投递完成了吗?" confirmation bar |
| `CompanyBadge.tsx` | Circular company avatar (logo or initials) |

#### Applications (`components/applications/`)

| File | Purpose |
|------|---------|
| `MyBottleClient.tsx` | Bottle page client: loads signed-in application records and renders ApplicationBottle |
| `MyApplicationsClient.tsx` | Application list with orbit visualization, search, status filter |
| `ApplicationBottle.tsx` | Bottle visualization: stats, BottleStage, ProgressDrawer, and public-safe share poster generation |
| `BottleStage.tsx` | Canvas-based star rendering with falling animation and lightweight pointer/touch shake |
| `StackedStar.tsx` | SVG star component with motion animations |
| `CompanyStar.tsx` | Company badge star with status-based glow |
| `StatusPill.tsx` | Status badge component |
| `StatusSelect.tsx` | Legacy/unused status dropdown component; current progress editing uses `ProgressDrawer` nodes |
| `ProgressDrawer.tsx` | Side drawer for editing application progress |
| `useBottleStack.ts` | Hook wrapping calculateBottleStack |
| `bottleGeometry.ts` | Star positioning algorithm with collision detection |
| `shareBottleCard.ts` | Canvas-based 3:4 poster share card generation (PNG + PDF) with logo, complete bottle visual, public-safe company names, Offer/applied/interview counts, and QR |
| `ApplicationOrbitConfig.ts` | Orbit band configuration (4 bands, 7 statuses) |
| `ApplicationOrbitDetail.tsx` | Right panel detail for selected application |
| `ApplicationOrbitLegend.tsx` | Orbit legend component |
| `ApplicationOrbitRing.tsx` | Single orbit ring with animated stars |
| `ApplicationOrbitStar.tsx` | Individual star on orbit with OrbMaterial |
| `ApplicationOrbitSystem.tsx` | Complete orbit visualization system |

#### Forum (`components/forum/`)

| File | Purpose |
|------|---------|
| `ForumClient.tsx` | Forum page: category tabs, post list, new post toggle |
| `NewPostForm.tsx` | Post creation form with react-hook-form + zod |
| `PostCard.tsx` | Inline-expandable post with comments, likes, author-only edit/delete, prominent pinned state, and admin pin controls; no side Drawer for post content |
| `SignalStrengthTicks.tsx` | Activity strength indicator (5 bars) |

#### Galaxy (`components/galaxy/`)

| File | Purpose |
|------|---------|
| `GalaxyHome.tsx` | Wrapper that renders SpaceHome |
| `SpaceHome.tsx` | Main galaxy homepage: desktop/mobile layouts, planet orbiting, auth |
| `SpaceBackground.tsx` | Galaxy-specific space background (entering animation) |
| `CorePlanet.tsx` | Center planet with OrbMaterial + wordmark |
| `FloatingPlanet.tsx` | Orbiting planet with counter-rotation for label readability |
| `GalaxyChoice.tsx` | Galaxy entry card component |
| `GalaxyGateway.tsx` | Galaxy entry page: region/industry choice |
| `GalaxyJobsClient.tsx` | Galaxy detail page: starfield + signal list |
| `GalaxyMapClient.tsx` | Galaxy map with nebula nodes |
| `IndustryGalaxyMap.tsx` | Industry galaxy wrapper |
| `RegionGalaxyMap.tsx` | Region galaxy wrapper |
| `MobilePlanetList.tsx` | Mobile planet list fallback |
| `NebulaCompanyField.tsx` | Company star field within a nebula |
| `NebulaDetailWindow.tsx` | Job detail panel for nebula view |
| `NebulaGateway.tsx` | Nebula entry → category → company star drill-down |
| `NebulaNode.tsx` | Single nebula node with image |
| `NebulaTransition.tsx` | Nebula transition animation |
| `OrbitLines.tsx` | Concentric orbit lines for homepage |
| `planet-visuals.ts` | Planet visual helpers |
| `PlanetLabel.tsx` | Planet label component |
| `PlanetTransitionOverlay.tsx` | Full-screen zoom transition when entering a planet |

#### Opportunity (`components/opportunity/`)

| File | Purpose |
|------|---------|
| `OpportunityCluster.tsx` | Job cluster visualization |
| `OpportunityDetailPanel.tsx` | Job detail panel |
| `OpportunitySignalList.tsx` | Job list with signal indicators |
| `OpportunityStar.tsx` | Individual opportunity star |
| `OpportunityStarfield.tsx` | Star field layout for galaxy job views |

#### Resume (`components/resume/`)

| File | Purpose |
|------|---------|
| `ResumeBuilderClient.tsx` | Main resume page: list, editor, preview, sync |
| `ResumeEditor.tsx` | Resume form editor (basic, education, work, projects, skills, other, target) |
| `ResumePreview.tsx` | A4 formal preview aligned with the vector PDF export font, sizing and optional-field rules |
| `ResumePdfExportButton.tsx` | PDF export trigger; calls `exportResumeToPdf()` and surfaces failures inline |
| `resumePdf.ts` | Vector PDF layout engine using jsPDF; embeds Noto Serif SC TTF, draws A4 resume text/lines/photos directly, avoids screenshot blur, reserves heading-to-content clearance, and skips empty optional header fields |

#### Admin (`components/admin/`)

| File | Purpose |
|------|---------|
| `AdminJobForm.tsx` | Job create/edit form with logo upload |
| `AdminJobsClient.tsx` | Admin job management page |
| `AdminJobTable.tsx` | Admin job table with edit/delete/toggle |
| `CsvImportPanel.tsx` | CSV/Excel import with preview and exact duplicate skipping |

#### UI primitives (`components/ui/`)

| File | Purpose |
|------|---------|
| `Badge.tsx` | Badge component |
| `Button.tsx` | Button with primary/secondary/danger variants |
| `Card.tsx` | Card component |
| `DiamondDot.tsx` | Decorative diamond dot |
| `Drawer.tsx` | Side drawer with liquid glass effect and shared community-help link |
| `CommunityHelpLink.tsx` | Accessible `/forum` link shown in every current business dialog/drawer: “去求职社区了解如何使用「拾星」” |
| `FiligreeDivider.tsx` | Decorative divider with diamond dots |
| `Input.tsx` | Input field |
| `Select.tsx` | Select dropdown |
| `SegmentedControl.tsx` | Shared single-layer liquid-glass selection rail with a sliding active indicator |
| `Textarea.tsx` | Textarea field |

#### Visual (`components/visual/` and `components/visuals/`)

| File | Purpose |
|------|---------|
| `OrbMaterial.tsx` | Unified planet material with glow budget |
| `EmptyConstellation.tsx` | Empty state SVG constellation |
| `HeroConstellation.tsx` | Hero SVG constellation (legacy, may be unused) |
| `StarFieldBackground.tsx` | Subtle background dots (used by AdminShell) |

### Database files (`supabase/`)

| File | Purpose | Order |
|------|---------|-------|
| `schema.sql` | Core tables: profiles, jobs, user_applications + triggers + indexes | 1st |
| `policies.sql` | RLS policies for all tables + storage | 2nd |
| `seed.sql` | 167 job entries from Excel source | 3rd |
| `forum.sql` | Forum tables: forum_posts, forum_comments, forum_likes + RLS + triggers | After schema.sql |
| `fix_forum_rls.sql` | Forum RLS fix: allow anon read for forum + profiles | After forum.sql |
| `migrations/20260704010000_phase0_security_hardening.sql` | Role escalation prevention, status_history, reports, search indexes | After initial setup |
| `migrations/20260704020000_events_tracking.sql` | events table for analytics | After phase0 |
| `migrations/20260704030000_security_audit_followup.sql` | is_admin hardening, forum RLS fix, user_applications unique constraint | After events |
| `migrations/20260704040000_job_categories.sql` | job_categories array field + GIN index + data backfill | After audit |
| `migrations/20260708090000_resumes.sql` | resumes table with RLS | After categories |
| `migrations/20260709090000_profile_preferences_and_resume_template.sql` | profile preference arrays + compact resume template constraint | After resumes |
| `migrations/20260710120000_profile_resume_cloud_repair.sql` | idempotent live repair for profile fields, cloud-resume table/policies, and template constraint | Apply to hosted projects that show profile/resume cloud-sync errors |
| `migrations/20260711120000_application_workflow_details.sql` | candidate stage, priority, saved time, channel/account/contact, next action, resume binding and review fields | After resume/profile migrations |
| `migrations/20260711130000_job_decision_fields.sql` | optional structured job responsibilities, requirements and keywords | After workflow details |
| `migrations/20260713193000_forum_admin_pinning.sql` | pinned ordering index and DB-level protection against non-admin pin changes | Tracked; live application still needs explicit migration verification |

### Other files

| File | Purpose |
|------|---------|
| `scripts/smoke_check.mjs` | Comprehensive smoke test: Supabase check, page fetch, source code invariants |
| `scripts/provision_preset_accounts.mjs` | Idempotently creates/updates externally supplied preset Auth accounts and profiles using a server-only service-role key |
| `scripts/import_forum_seed.mjs` | Parses the supplied forum SQL, resolves preset usernames to Auth UUIDs, upserts fixed-ID posts/comments, and verifies counts |
| `src/styles/tokens.css` | CSS custom properties: colors, surfaces, typography, animations |
| `public/fonts/NotoSerifSC-Regular.ttf` | Embedded Chinese serif font for resume preview/PDF |
| `public/fonts/NotoSerifSC-Bold.ttf` | Embedded Chinese serif bold font for resume preview/PDF |
| `data/source/27秋招信息整理.xlsx` | Original Excel source data |
| `data/processed/27_jobs_import.csv` | Processed CSV from Excel |
| `docs/handoff/PROJECT_BRIEF.md` | Complete project brief for redesign |
| `docs/handoff/NEXT_AGENT_BRIEF.md` | Agent handoff instructions |
| `docs/handoff/IMPLEMENTATION_STATUS.md` | Current implementation status |
| `docs/prd/job-bottle-authoritative-prd-v6.md` | Authoritative PRD with amendments |

---

## 5. Architecture Summary

### Framework & routing

- **Next.js 16 App Router** with TypeScript strict mode
- **Server Components** for: `/jobs/[id]` (SSR with generateMetadata), root layout
- **Client Components** for: all interactive pages (marked `"use client"`)
- **Route groups**:
  - User pages: `/explore`, `/my`, `/bottle`, `/resume`, `/forum`, `/galaxy/*`
  - Admin pages: `/admin`, `/admin/jobs`, `/admin/import`
  - Legacy redirects: `/jobs` → `/explore`, `/my-bottle` → `/bottle`, `/my-applications` → `/my`

### State management

- **No global state manager** (no Redux, Zustand, etc.)
- Each page component manages its own state with `useState` + `useEffect`
- Data fetching: client-side via Supabase client (not SWR/React Query)
- Auth state: `getCurrentUserOrNull()` with 1800ms timeout + localStorage session check
- Shared state between views via callback props (onChanged, onDeleted)

### Styling

- **Tailwind CSS 4** with PostCSS plugin
- Custom design tokens in `tailwind.config.ts` (void, nebula, aurum, star, ink colors)
- CSS custom properties in `tokens.css` (night, dusk, arcane, surface, text colors)
- Global styles in `globals.css` (glass-panel, liquid-panel, space-bg, capture animations)
- **No CSS modules** — all utility classes

### Backend

- **Supabase** as BaaS (Postgres + Auth + Storage)
- Browser client: singleton pattern in `supabase/client.ts`
- Server client: cookie-based in `supabase/server.ts`
- Route handlers now exist for admin user management, admin forum pinning, masked forum authors, resume AI polish, and resume download authentication. Ordinary application/job/forum mutations still mostly use the browser Supabase client under RLS, while privileged identity/profile reads use server-only clients.
- Row Level Security (RLS) on all tables

### Auth

- Supabase Auth with email/password
- `ensureProfile()` creates profile on first login
- DB trigger `handle_new_user()` auto-creates profile on auth.users insert
- Admin check: `profiles.role = 'admin'` via `is_admin()` SQL function
- Role escalation prevention via trigger

### Animations

- **Motion for React** (framer-motion successor) for: planet orbiting, transitions, hover effects
- **Canvas 2D** for: bottle star rendering, falling animation, share card generation
- **CSS keyframes** for: meteor, capture star/ring, twinkle, pulse
- `prefers-reduced-motion` respected in: SpaceHome, BottleStage, ApplicationOrbitSystem

---

## 6. Data Flow

### Job browsing flow
```
Supabase (jobs table) 
  → fetchActiveJobs() [lib/jobs.ts]
  → HomeClient state [components/jobs/HomeClient.tsx]
  → filterJobs() client-side filtering
  → JobCard render
  → handleApply() → upsertApplication() → Supabase (user_applications)
  → queueBottleDrop() → localStorage
```

### Application tracking flow
```
Supabase (user_applications + jobs join)
  → fetchMyApplications() [lib/applications.ts]
  → MyApplicationsClient state
  → ApplicationOrbitSystem render
  → ProgressDrawer → updateApplication() → Supabase
  → optimistic update → rollback on failure
```

### Bottle visualization flow
```
Supabase (user_applications + jobs)
  → MyBottleClient → ApplicationBottle
  → useBottleStack() → calculateBottleStack() [bottleGeometry.ts]
  → BottleStage (Canvas rendering)
  → peekBottleDrop() → falling animation → dismissBottleDrop()
```

### Forum flow
```
Supabase (forum_posts)
  → fetchPosts() [lib/forum.ts]
  → POST /api/forum/authors — service role reads profiles and returns only masked names/roles
  → ForumClient state
  → PostCard inline expansion → fetchPost() for comments
  → toggleLike(), createComment()
  → admin only: PATCH /api/admin/forum/pin
```

### Resume flow
```
localStorage (job_bottle_resumes_v1)
  → loadLocalResumes() [lib/resume.ts]
  → ResumeBuilderClient state
  → ResumeEditor → updateResume → saveLocalResumes()
  → (if logged in) upsertMyResume() → Supabase (resumes)
```

---

## 7. Database / Backend / API Notes

### Tables

> The schemas below describe the expected final shape after applying `schema.sql` plus migrations. Several columns (`opens_at`, `closes_at`, `search_text`, `job_categories`, application `note`/`interview_round`, etc.) are added by migrations, not by the base `schema.sql` alone.

#### `profiles`
```sql
id uuid PK → auth.users
display_name text
phone text
city text
school text
major text
graduation_year text
preferred_regions text[]
target_roles text[]
role text (user/admin)
created_at timestamptz
updated_at timestamptz
```

#### `jobs`
```sql
id uuid PK
company_name text NOT NULL
start_date text (e.g., "7.2")
industry text
batch_type text
job_titles text
job_categories text[] (GIN indexed)
locations text
apply_url text NOT NULL
notes text
logo_url text
tags text[] (GIN indexed)
is_active boolean DEFAULT true
opens_at timestamptz
closes_at timestamptz
search_text text (generated, trigram indexed)
created_at timestamptz
updated_at timestamptz
```

#### `user_applications`
```sql
id uuid PK
user_id uuid FK → auth.users
job_id uuid FK → jobs
status text (opened/applied/written_test/first_round/second_round/final_round/offer/rejected/withdrawn)
interview_round int
note text (max 2000 chars)
progress_note text
applied_at timestamptz
updated_at timestamptz
UNIQUE(user_id, job_id)
```

#### `status_history`
```sql
id uuid PK
application_id uuid FK → user_applications
user_id uuid FK → auth.users
from_status text
to_status text
changed_at timestamptz
```

#### `forum_posts`
```sql
id uuid PK
user_id uuid FK → auth.users
title text NOT NULL
content text NOT NULL (max 5000 chars)
category text (讨论/经验/求助/分享)
tags text[]
like_count int DEFAULT 0
comment_count int DEFAULT 0
is_pinned boolean DEFAULT false
created_at timestamptz
updated_at timestamptz
```

#### `forum_comments`
```sql
id uuid PK
post_id uuid FK → forum_posts
user_id uuid FK → auth.users
content text NOT NULL (max 5000 chars)
like_count int DEFAULT 0
created_at timestamptz
updated_at timestamptz
```

#### `forum_likes`
```sql
user_id uuid FK → auth.users
post_id uuid FK → forum_posts (nullable)
comment_id uuid FK → forum_comments (nullable)
created_at timestamptz
UNIQUE(user_id, post_id)
UNIQUE(user_id, comment_id)
CHECK: exactly one of post_id/comment_id is not null
```

#### `resumes`
```sql
id uuid PK
user_id uuid FK → auth.users
title text DEFAULT '未命名简历'
target_role text
job_target text
linked_job_id uuid FK → jobs (nullable)
template_id text (compact, classic, modern, english_classic, english_modern; legacy minimal/executive values normalize to modern/classic in the app)
content_json jsonb
created_at timestamptz
updated_at timestamptz
```

#### `reports`
```sql
id uuid PK
post_id uuid FK → forum_posts
reporter_id uuid FK → auth.users
reason text (max 500 chars)
created_at timestamptz
resolved boolean DEFAULT false
```

#### `events`
```sql
id uuid PK
user_id uuid FK → auth.users (nullable)
event text (max 80 chars)
props jsonb
created_at timestamptz
```

### RLS policies summary

| Table | Read | Write |
|-------|------|-------|
| profiles | own + admin all; ordinary forum visitors do not need direct profile access because `/api/forum/authors` returns only masked names/roles | own insert (role='user'), own update (role locked) |
| jobs | anon + auth (active only), admin all | admin only |
| user_applications | own only | own only |
| forum_posts | public (anon + auth) | own insert/update/delete, admin delete |
| forum_comments | public | own insert/update/delete, admin delete |
| forum_likes | public | own insert/delete |
| resumes | own only | own only |
| reports | own insert, admin select/update | — |
| events | own insert, admin select | — |
| status_history | own + admin all | — |
| storage (company-logos) | public read | admin only write |

### Key SQL functions

- `is_admin()` — SECURITY DEFINER, checks profiles.role = 'admin'
- `handle_new_user()` — trigger on auth.users insert, creates profile
- `set_updated_at()` — trigger for auto-updating updated_at
- `prevent_profile_role_escalation()` — prevents non-admin role changes
- `log_user_application_status_history()` — logs status changes to status_history

### Critical RLS issue

`forum_posts.user_id` references `auth.users(id)`, NOT `profiles(id)`. PostgREST cannot infer a foreign-key relationship to `profiles`, and public profile reads would expose more data than the forum needs. The current code sends bounded UUID batches to `/api/forum/authors`; the server-only route reads profiles with the service role and returns only masked display names plus roles.

---

## 8. UI / Design System Notes

### Color palette

**林深星渡深空主题** — 极夜黑打底，普鲁士蓝承载阅读层，茄紫、暮山紫与星尘紫用于星体和状态层；透明面保持轻薄，不用金色作为全局主强调。

| Token | Value | Usage |
|-------|-------|-------|
| `--night-0` | #000001 | 极夜底色 |
| `--night-1` | #12294E | 普鲁士蓝阅读层 |
| `--night-3` | #564A71 | 茄紫深层 |
| `--dusk` | #7F5568 | 暮山紫语义暖调 |
| `--arcane` | #7E7CB5 | 星尘紫交互和激活态 |
| `--text-primary` | rgba(241,239,255,0.94) | 主文字 |
| `--text-secondary` | rgba(201,197,228,0.74) | 次级文字 |
| `--text-muted` | rgba(145,140,174,0.70) | 弱化文字 |

### Typography

- **Primary font**: Geist Sans (Google Fonts) with fallback chain: Mona Sans, MiSans VF, HarmonyOS Sans SC, PingFang SC, Noto Sans SC
- **Mono font**: Geist Mono
- **Display**: Same as primary, used for headings with letter-spacing: 0

### Surface styles

- **glass-panel**: `rgba(18,41,78,0.46)` background with a restrained inset highlight
- **liquid-panel**: `rgba(18,41,78,0.60)` background; work surfaces keep translucent depth without a frosted-card wall
- **night-card**: Similar to glass-panel
- **status-pill**: Gradient background, no border

### Button styles

- **gold-button**: Legacy class name; now a flat 星尘紫 primary action with cool-white text
- **muted-button**: Transparent, secondary text color
- **primary**: Defined in Button.tsx (uses CSS vars)
- **secondary**: Defined in Button.tsx
- **danger**: Red-tinted variant

### Layout patterns

- **UserShell**: SpaceShell (background) + Navbar + main (max-w-1440px)
- **AdminShell**: Separate layout with sidebar nav
- **Galaxy homepage**: Full viewport, no Navbar, no max-width
- **observatory-page**: Standard page wrapper with padding-bottom
- **page-hero**: Grid layout for page title + subtitle + optional stats

### Animation patterns

- **Orbiting planets**: Motion for React with counter-rotation for label readability
- **Falling stars**: Canvas-based with physics-like bounce
- **Status transitions**: CSS transitions with ease-snap timing
- **Reduced motion**: Checked via `useReducedMotion()` in key components

---

## 9. Known Issues / Technical Debt

### Critical issues

1. **Forum pinning migration still needs live DDL verification**: application-level pinning and the production API are deployed, but this handoff has not proven that `20260713193000_forum_admin_pinning.sql` ran on hosted Supabase. Verify the database trigger/index before treating direct-database pin protection as complete.
2. **Latest profile/resume migrations must be applied live**: `20260709090000_profile_preferences_and_resume_template.sql`, `20260709100000_profile_basic_info.sql`, and the idempotent `20260710120000_profile_resume_cloud_repair.sql` are required when the hosted project reports cloud profile or resume-sync errors.
3. **No job-list pagination**: all active jobs load at once (currently around 167-200 depending on DB state); forum fetches the first 50 posts but has no UI pagination.
4. **Forum author names are deliberately server-mediated**: do not restore public profile reads or expose full ordinary display names; keep the bounded `/api/forum/authors` response contract.

### Technical debt

1. **No global state**: Each page fetches independently, no shared cache
2. **Error boundaries are now present**: `error.tsx` and `global-error.tsx` cover render failures, but route-specific async failures still require local recovery states.
3. **Loading treatment remains lightweight**: several pages still use concise status text rather than full skeleton systems.
4. **Duplicate code**: `withTimeout()` defined in both auth.ts and jobs.ts
5. **Mixed data-access architecture**: five App Router API routes now protect privileged or server-verified operations, while most ordinary mutations still use the browser Supabase client plus RLS. New privileged functionality should follow the server-route pattern.
6. **Seed data issues**: Some tags contain fragments like "市场类（包含商分" and "战略）" due to comma splitting inside parenthetical text
7. **No offline support**: No service worker or offline fallback
8. **Rate limiting is partial**: resume AI polish has a best-effort per-instance limit; forum authors are request-size bounded but do not use a durable global limiter.
9. **Canvas performance**: BottleStage redraws on resize, falling animation, and pointer/touch shake decay; still worth profiling if application counts grow substantially.
10. **localStorage dependency**: Multiple features depend on localStorage (bottle drops, resume storage, application count)

### Style debt

1. **Two background systems**: SpaceBackground (layout) and SpaceBackground (galaxy) are different components
2. **visual vs visuals directory**: Inconsistent naming (`components/visual/` and `components/visuals/`)
3. **Legacy components**: HeroConstellation may be unused
4. **Mixed animation libraries**: Both Motion for React and CSS keyframes used

---

## 10. Recommended Reading Order for Future Codex Sessions

### Phase 1: Understand the product (30 min)

1. `README.md` — Project overview
2. `docs/handoff/NEXT_AGENT_BRIEF.md` — Critical handoff instructions
3. `docs/handoff/IMPLEMENTATION_STATUS.md` — Current state
4. This file (PROJECT_CONTEXT.md)

### Phase 2: Understand the data model (20 min)

5. `src/lib/types.ts` — All TypeScript types
6. `src/lib/constants.ts` — Status labels, filter defaults
7. `supabase/schema.sql` — Database schema
8. `supabase/policies.sql` — RLS policies
9. `supabase/forum.sql` — Forum schema

### Phase 3: Understand the architecture (30 min)

10. `src/app/layout.tsx` — Root layout
11. `src/components/layout/UserShell.tsx` — User layout
12. `src/components/layout/AdminShell.tsx` — Admin layout
13. `src/components/layout/SpaceShell.tsx` — Background wrapper
14. `src/lib/supabase/client.ts` — Browser Supabase client
15. `src/lib/supabase/server.ts` — Server Supabase client
16. `src/lib/auth.ts` — Auth helpers

### Phase 4: Understand the core features (60 min)

17. `src/components/galaxy/SpaceHome.tsx` — Homepage galaxy
18. `src/components/jobs/HomeClient.tsx` — Job listing (largest component)
19. `src/components/applications/MyApplicationsClient.tsx` — Application tracking
20. `src/components/applications/ApplicationBottle.tsx` — Star bottle
21. `src/components/applications/ProgressDrawer.tsx` — Progress editing
22. `src/components/forum/ForumClient.tsx` — Forum
23. `src/components/resume/ResumeBuilderClient.tsx` — Resume builder
24. `src/components/profile/ProfileClient.tsx` — Personal center job-search card/cockpit and recommendations
25. `src/components/admin/CsvImportPanel.tsx` + `src/lib/csv.ts` — Import and exact duplicate skipping

### Phase 5: Understand the visual system (30 min)

26. `src/styles/tokens.css` — Design tokens
27. `src/app/globals.css` — Global styles
28. `tailwind.config.ts` — Tailwind customization
29. `src/components/visual/OrbMaterial.tsx` — Planet material
30. `src/components/applications/BottleStage.tsx` — Canvas bottle rendering and shake interaction
31. `src/components/applications/shareBottleCard.ts` — Poster share card layout

### Phase 6: Understand the data layer (30 min)

32. `src/lib/jobs.ts` — Job data operations
33. `src/lib/applications.ts` — Application CRUD
34. `src/lib/forum.ts` — Forum operations
35. `src/lib/profile.ts` — Profile basic info and preference persistence helpers
36. `src/lib/galaxy-taxonomy.ts` — Galaxy classification
37. `src/lib/nebula-groups.ts` — Nebula grouping
38. `src/lib/bottleShape.ts` — Bottle geometry
39. `src/lib/bottleGeometry.ts` (in components) — Star positioning

---

## 11. Development Guidelines for Future Agents

### Before making changes

1. **Read NEXT_AGENT_BRIEF.md** — Contains critical implementation details and constraints
2. **Run the smoke test**: `npm run smoke` — Checks Supabase connection, page content, and source code invariants
3. **Check existing patterns**: Look at how similar features are implemented before adding new code

### Code style

- **Language**: All user-facing text in Chinese (zh-CN)
- **TypeScript**: Strict mode, explicit types for function parameters
- **Components**: Client components marked with `"use client"` at top
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Imports**: Use `@/` path alias for src directory

### State management patterns

- Fetch data in `useEffect` with cleanup
- Use `useState` for local state
- Pass callbacks (onChanged, onDeleted) for parent-child communication
- Use `useMemo` for expensive computations (filtering, layout)
- Use `useCallback` for event handlers passed to children

### Error handling

- Wrap Supabase calls in try/catch
- Show user-friendly Chinese error messages
- Use `setMessage()` pattern for displaying errors
- Never block product actions on analytics (track.ts catches all errors)

### Animation guidelines

- Check `useReducedMotion()` before adding animations
- Use Motion for React for complex animations
- Use CSS transitions for simple hover/focus states
- Prefer `requestAnimationFrame` for Canvas operations
- Clean up animation frames in useEffect cleanup

### Database guidelines

- All new tables need RLS policies
- Use `is_admin()` for admin-only operations
- Add `updated_at` trigger for tables with mutable data
- Add indexes for frequently queried columns
- Use `text[]` arrays with GIN indexes for multi-value fields

### Testing

- Run `npm run lint` before committing
- Run `npx tsc --noEmit` to check types
- Run `npm run build` to verify build
- Run `npm run smoke` for comprehensive checks
- The smoke script checks source code invariants — don't break them

### What NOT to do

- ❌ Don't change the current visual language unless the user explicitly asks for a redesign
- ❌ Don't use "未来星瓶" — use "拾星" or "秋招星瓶"
- ❌ Don't add borders to containers (无界液态 design language)
- ❌ Don't put text inside planet spheres
- ❌ Don't use `Math.random()` for positioning (use deterministic hashing)
- ❌ Don't use `router.refresh()` or `window.location.reload()` for state updates
- ❌ Don't expose `SUPABASE_SERVICE_ROLE_KEY` to the browser, logs, Git, or any `NEXT_PUBLIC_*` variable
- ❌ Don't make `profiles` publicly readable just to render forum names; use the masked `/api/forum/authors` contract

---

## 12. Open Questions

### Technical questions

1. **Scaling strategy**: What happens when job count exceeds 1000? Need pagination implementation.
2. **Real-time updates**: Should applications use Supabase Realtime for live updates?
3. **Error boundaries**: Where should React error boundaries be placed?
4. **Caching strategy**: Should we add React Query/SWR for data fetching?
5. **Testing**: Should we add unit tests (Vitest) or E2E tests (Playwright)?

### Product questions

1. **Deadline feature**: Will job deadline data become available? Feature is offline but DB column preserved.
2. **AI resume optimization**: The conservative compare/apply flow is implemented; remaining questions are durable rate limiting, product usage limits, and production-quality monitoring.
3. **Notification system**: Should users be notified of status changes or new jobs?
4. **Admin governance**: Multiple profiles can hold the admin role, but governance/audit expectations for more than one operator remain undefined.
5. **Data source**: Will the Excel source be updated? How often?

### Design questions

1. **Mobile optimization**: Galaxy homepage now has a dedicated mobile orbit layout, but it is visually sensitive and should be re-checked after orbit/label changes.
2. **Bottle physics**: Current star positioning is grid-based — should we add physics simulation?
3. **Orbit visualization**: Should the orbit system be more interactive (drag, zoom)?
4. **Share cards**: Should share cards be customizable (themes, layouts)?

### Infrastructure questions

1. **Deployment**: Vercel is the current live target, but no `vercel.json` is tracked; confirm dashboard settings before changing build/deploy behavior.
2. **Environment variables**: `SUPABASE_SERVICE_ROLE_KEY` is now consumed by server-only admin/forum routes and import scripts and is configured in Vercel Production as Sensitive. Keep only a blank documented placeholder in `.env.local.example`; never add a public-prefixed copy.
3. **CI/CD**: No CI pipeline — should we add GitHub Actions?
4. **Monitoring**: No error tracking (Sentry?) or analytics (beyond custom events table)

---

## Appendix A: Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=  # Supabase anon/publishable key
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Legacy alias (code falls back to PUBLISHABLE_KEY)
SUPABASE_SERVICE_ROLE_KEY=         # Required by server-only admin/forum routes and import scripts; never expose or commit a value
```

## Appendix B: Database Initialization Order

1. `supabase/schema.sql` — Core tables
2. `supabase/policies.sql` — RLS policies
3. `supabase/seed.sql` — 167 job entries
4. `supabase/forum.sql` — Forum tables
5. `supabase/fix_forum_rls.sql` — Forum RLS fix (CRITICAL)
6. `supabase/migrations/20260704010000_phase0_security_hardening.sql`
7. `supabase/migrations/20260704020000_events_tracking.sql`
8. `supabase/migrations/20260704030000_security_audit_followup.sql`
9. `supabase/migrations/20260704040000_job_categories.sql`
10. `supabase/migrations/20260708090000_resumes.sql`
11. Apply all later dated migrations in order through `20260713193000_forum_admin_pinning.sql`; verify hosted migration state instead of assuming tracked files ran automatically.

## Appendix C: Route Map

```
/                           → GalaxyHome (full-screen, no Navbar)
/explore                    → HomeClient (job list with filters)
/explore?cats=软件研发类     → Job list with category filter
/jobs                       → permanentRedirect → /explore
/jobs/:id                   → Job detail (Server Component)
/my                         → MyApplicationsClient (orbit + list)
/my-applications            → permanentRedirect → /my
/bottle                     → MyBottleClient (star bottle)
/my-bottle                  → permanentRedirect → /bottle
/resume                     → ResumeBuilderClient
/forum                      → ForumClient
/galaxy                     → GalaxyGateway
/galaxy/industry            → IndustryGalaxyMap
/galaxy/industry/:name      → GalaxyJobsClient
/galaxy/region              → RegionGalaxyMap
/galaxy/region/:region      → GalaxyJobsClient
/login                      → LoginForm
/admin                      → Admin dashboard
/admin/jobs                 → AdminJobsClient
/admin/import               → CsvImportPanel
/admin/users                → AdminUsersClient
/api/admin/users            → Admin-only Auth account management
/api/admin/forum/pin        → Admin-only pin/unpin
/api/forum/authors          → Public bounded request, server-masked author response
/api/resume/ai-polish       → Authenticated resume-entry polish
/api/resume/download-auth   → Server-verified resume download session
```

## Appendix D: Application Status Flow

```
opened → applied → written_test → first_round → second_round → final_round → offer
  ↓                                                                                ↓
  └──────────────────────────── rejected / withdrawn ←─────────────────────────────┘
```

- **opened**: User clicked "去官网投递" but hasn't confirmed
- **applied**: User confirmed they applied
- **written_test**: Online test /笔试
- **first_round**: First interview /一面
- **second_round**: Second interview /二面
- **final_round**: Final interview /终面
- **offer**: Received offer
- **rejected**: Application rejected (terminal)
- **withdrawn**: User withdrew application (terminal)

## Appendix E: Key Smoke Test Invariants

The smoke test (`npm run smoke`) checks these source code invariants:

1. Auth timeout protection exists (1800ms)
2. Bottle uses canvas rendering, not physics engine
3. Bottle cavity uses geometric path validation
4. Homepage uses SpaceHome, not canvas starfield
5. Orbit lines preserved (max 4)
6. Planet material uses unified OrbMaterial
7. Nebula gateway exists with drill-down
8. Categories normalization handles edge cases
9. Resume builder has local + cloud sync
10. ProgressDrawer uses optimistic updates, no page refresh
11. All Chinese copy follows approved vocabulary
12. No "未来星瓶" brand remnants
13. Deep space background uses image assets
14. Security migrations exist with required functions
15. RLS policies cover all tables

---

*End of PROJECT_CONTEXT.md*

## 2026-09-01 路由刷新、品牌锁定与工作页控件细化（本地未上线）

- 本轮目标是让页面刷新后保留当前页面、统一中英文品牌标识的关系，并参考 SwufeHub 的克制边框、间距、筛选和分段控件处理工作页视觉；不复制其代码或资源。
- 当前代码包含 `/explore`、`/my`、`/resume`、`/forum`、`/profile` 等独立 App Router 页面；未发现会把任意页面统一重定向到 `/` 的 catch-all 逻辑。`/jobs`、`/my-applications`、`/my-bottle` 是明确的历史别名跳转，退出登录和删除账号回首页是有意行为。
- 当前本地硬刷新核验中，`/explore`、`/resume` 保留原页面标识；此前线上直达探针中 `/explore`、`/my`、`/resume`、`/forum`、`/profile` 均返回对应页面。若用户仍遇到刷新回首页，应保留完整 URL、浏览器、是否 PWA/旧标签页和发生时间，继续区分客户端缓存、旧部署态与实际路由问题。
- 本轮仅修改登录页、页脚和管理员标识的布局 CSS，使中文 logo 与双色 StarJob 英文 logo 并排且底部对齐；同时细化工作页输入框、筛选折叠标题、岗位类别 chip 和桌面筛选栏分隔线，保留既有筛选逻辑与 reduced-motion 兼容。
- 本轮前安全备份位于 `backups/starjob-before-route-and-control-polish-20260901/`，包含本轮相关组件、样式和配置快照；未修改数据库。
- 验证：`npm run typecheck` 通过；`npm run lint` 通过但保留既有 `scripts/seed_official_referral_sources.mjs:44` 未使用变量 warning；`npm test` 通过，149/149；`npm run build -- --webpack` 通过；构建后的 `next start` 对 `/explore`、`/my`、`/resume`、`/forum`、`/profile` 均返回 200，逐页硬刷新后页面标识保持。`npm run smoke` 未通过既有 token 约束，提示 `src/styles/tokens.css` 缺少 `--night-3: #564A71`，本轮没有修改该文件。默认 Turbopack 构建在临时工作树因 `node_modules` 符号链接指向工作区外而失败，属于环境边界，Webpack 构建已完成生产复核。
- 当前状态：本轮仅在独立工作树本地完成，尚未提交、推送或发布；线上仍为此前已确认的版本。

## 2026-09-01 本地开发登录 CSP 修复（未上线）

- 问题原因：开发环境的 CSP `script-src` 缺少 Webpack HMR 所需的 `unsafe-eval`，Next 前端刷新脚本报错，React 没有接管登录表单，浏览器退回原生 GET 提交。
- 安全影响：原生 GET 会把输入字段拼进本地 URL；本轮诊断时已观察到该现象。不要继续使用已经暴露过的密码，并在真实账号侧立即修改该密码；本记录不保存具体凭据。
- 修复方式：`next.config.ts` 只在 `NODE_ENV=development` 时追加 `unsafe-eval`，生产环境 CSP 仍不允许该指令。
- 验证：使用无效测试账号提交后 URL 保持 `/login` 且无查询参数；前端 error/warning 日志为空；`npm run typecheck` 通过；`npm run lint` 通过但保留既有 `seed_official_referral_sources.mjs:44` warning；`npm run build -- --webpack` 通过。
- 修复前快照位于 `backups/starjob-before-dev-csp-auth-fix-20260901/next.config.ts`。
- 当前状态：修复已在独立工作树本地完成，尚未推送或上线。

## 2026-09-02 输入控件留白与登录标语机械翻牌（本地未上线）

- 用户目标：逐个排查输入框、选择框和搜索框中文字或图形贴边的问题，减轻选中与聚焦提示；将登录页动态标语从逐字上移改为类似书页或机场航班牌的机械翻牌过渡。
- 根因与决策：共享 `Input`、`Select`、`Textarea` 的水平留白分别为 `px-3.5`、`pr-10` 和较紧的文本区内边距；六处搜索控件的图标和文字偏移不一致，其中岗位投递和管理员岗位搜索图标使用 `left-0`、`pl-7`，会贴住外边缘；全局焦点环与字段自身 3px 阴影叠加，选中态又混用实心蓝、厚阴影和强边缘。登录 `KineticWord` 原来按字符使用 `translateY`，视觉上更像上下替换。本轮保留信息架构和控件行为，只统一空间规则和状态层级，标语改为整词 `rotateX` 翻牌。
- 实际改动：`src/components/ui/Input.tsx`、`Select.tsx`、`Textarea.tsx` 统一水平和垂直内边距，并为下拉箭头保留独立安全区；`src/components/jobs/JobFilterBar.tsx`、`src/components/applications/MyApplicationsClient.tsx`、`src/components/admin/AdminJobsClient.tsx`、`AdminUsersClient.tsx`、`AdminReferralsClient.tsx`、`AdminFeedbackClient.tsx` 和 `src/components/referrals/ReferralCodeHub.tsx` 逐个对齐搜索图标与文字；`src/components/resume/ResumeEditor.tsx` 同步长文本框留白；`src/app/globals.css` 减轻全局及工作区字段焦点环、错误环、chip、分段选择、简历版本和登录方式的选中态；`src/components/auth/LoginForm.tsx`、`src/components/profile/ProfileClient.tsx`、`src/components/applications/MyApplicationsClient.tsx`、`src/components/admin/AdminAnalyticsClient.tsx` 和 `AdminBillingClient.tsx` 收轻实心激活态；`src/components/ui/KineticWord.tsx` 与全局 CSS 改用 420ms 的整词 3D 翻牌，继续按 2 秒切换并遵守 `useReducedMotion`。
- 兼容边界：未改变页面路由、字段名、表单提交、认证、数据库、API、管理员权限、筛选逻辑、依赖或外部数据；动效只使用 CSS transform、opacity 和已有组件机制，减弱动态效果下仍显示首个标语。更新 `scripts/smoke_check.mjs` 和 `scripts/tests/motion-performance.test.mjs` 仅用于同步源码门禁与翻牌回归断言。
- 备份：本轮编辑前快照位于 `backups/starjob-before-fields-and-kinetic-rework-20260902/RESTORE.md`，包含共享控件、登录翻牌、全局样式和本轮逐个修正的页面组件；不包含账号、密码、Cookie、数据库数据或外部服务凭据。
- 验证：`npm run typecheck` 通过；`npm run lint` 0 错误，仅保留 `scripts/seed_official_referral_sources.mjs:44` 原有未使用变量 warning；`npm test` 149/149；`node --test scripts/tests/motion-performance.test.mjs` 4/4；`npm run build -- --webpack` 成功生成 62 个路由；本地浏览器 `http://127.0.0.1:3102/login` 登录页视觉加载正常，翻牌采样捕获到 `matrix3d` 过渡状态；`/explore` 页面壳可加载。本轮未执行真实登录态、真实管理员数据和设备 FPS 验收。
- 冒烟边界：`npm run smoke` 在既有 `src/styles/tokens.css` 约束处停止，提示缺少历史断言 `--night-3: #564A71`；本轮没有修改主题 token，也没有把该结果计为控件改动失败。
- 当前状态：改动仍位于独立工作树 `/private/tmp/starjob-official-source`，本地开发服务器保持运行，尚未提交、推送或部署；主工作区原有未提交内容未覆盖、未删除。

## 2026-09-02 中英文品牌组合 logo 光学对齐（已上线）

- 用户目标：解决中文“拾星”和双色 StarJob 英文标识可见底部不齐、视觉间距偏大的问题；组合关系保持横向并排，不改变中文主标识本身。
- 根因与决策：原始中文 PNG 的 alpha 可见范围为 `(80, 56)–(1136, 486)`，英文 PNG 的 alpha 可见范围为 `(24, 24)–(2080, 303)`；透明留白导致 flex 只对齐图片盒子而不是实际笔画。原始资产保留不动，新增按可见 alpha 范围紧裁剪的 lockup 资产，避免在不同尺寸下依赖脆弱的负偏移。
- 实际改动：登录页、SiteFooter 和 AdminShell 使用 `shi-xing-wordmark-lockup.png`；StarJobWordmark 使用 `starjob-wordmark-lockup.png`；三处组合均以 flex-end 对齐，并将间距收紧到 0.30/0.28/0.25rem。其他单独使用拾星中文标识的首页、导航、星系和分享卡片保持原资产。
- 兼容边界：未改变登录、路由、管理员权限、数据库、API、筛选、业务数据或原始品牌图片；新增资产仅用于三处中英文组合。编辑前快照位于 `backups/starjob-before-logo-lockup-alignment-20260902/RESTORE.md`。
- 验证：`npm run typecheck`、`npm test`（149/149）、`npm run build -- --webpack` 和 `git diff --check` 通过；`npm run lint` 0 错误，仅保留 `scripts/seed_official_referral_sources.mjs:44` 的既有 warning；本地登录页和两个新增 PNG 均返回 200。
- 发布：本轮提交已推送 `origin/main`，Vercel 正式部署完成；生产登录页与新增 logo 资源已核验。主工作区原有未提交内容未覆盖、未删除。

## 2026-09-02 SwufeHub 式逐字翻页与网申助手页面重排（本地未上线）

- 用户目标：移除网申助手主页面和安装教程页的大号“获取安装包”按钮，放大安装教程中的真实扩展截图并重新排版；登录页动态标语改为参考 SwufeHub 顶部轮播的逐字机械翻页效果。
- 动效拆解与决策：SwufeHub 使用独立字符裁剪盒、字符约 20ms 错峰、进入时 `translateY(110%)` 向上归位、离开时 `translateY(-120%)`，单轮约 300ms，约 2 秒后切换；拾星 `KineticWord` 已从整词 `rotateX` 改为同类逐字 CSS transform，保留 `prefers-reduced-motion` 和屏幕阅读器文本同步，避免持续 JS 动画循环。
- 实际改动：`src/components/ui/KineticWord.tsx` 与 `src/app/globals.css` 重写标语切换结构和裁剪样式；`src/components/extension/ExtensionHubClient.tsx` 移除主页面下载按钮并保留安装教程入口；`src/components/extension/ExtensionGuide.tsx` 将大号下载按钮改为轻量文字下载入口，并把实际扩展面板预览调整为更大的右侧视觉区；`scripts/smoke_check.mjs` 和 `scripts/tests/motion-performance.test.mjs` 同步更新为新契约。
- 兼容边界：未改变下载包内容、扩展逻辑、登录鉴权、数据库、API、筛选逻辑或业务数据；安装教程页面保留轻量文字下载入口，主页面改为“查看安装教程”引导。SwufeHub 仅作为公开动效参考，未复制其代码、品牌或资源。
- 验证：`npm run typecheck`、`npm run lint`（0 错误，保留既有 1 个 warning）、`npm test`（149/149）、动效专项测试（4/4）、`npm run build -- --webpack`（62 个路由）和 `git diff --check` 均通过；`npm run smoke` 已确认本轮资源与扩展/动效相关检查可走通，但仍在历史 `--night-3: #564A71` 主题断言处停止。浏览器复核确认主入口与教程页均无精确文本“获取安装包”，教程页有 1 个“下载 0.2.7 安装包”文字入口，纸飞机/扩展截图均加载；登录页约 2 秒后切换为“投递进展”，三个页面均无 error/warning 日志。
- 当前状态：上述改动仍在 `/private/tmp/starjob-official-source` 独立工作树，本地服务器保持运行，尚未提交、推送或部署；主工作区原有未提交内容未覆盖、未删除。

## 2026-09-02 网申助手安装说明与截图首屏重排（已上线）

- 用户目标：将用户提供的版本、下载和字段策略说明放到“安装拾星网申助手”标题下；移除首屏重复副标题和截图旁的说明文字，为真实扩展面板截图留出更完整的展示空间。
- 实际改动：`src/components/extension/ExtensionGuide.tsx` 将三段说明改为标题下的单列信息组，保留轻量“下载 0.2.7 安装包”链接；截图区域改为单列大图，使用实际 `starjob-resume-assistant-popup-v026.png`，并保留屏幕阅读器说明。`src/app/globals.css` 将截图最大宽度提升到 38rem，移除原 42rem 高度上限，避免纵向截图被强行缩小。
- 链接处理：用户示例中的本地地址在页面中使用同源相对路径 `/downloads/starjob-resume-assistant-v0.2.7.zip`，开发和生产均指向当前站点，不把 `127.0.0.1:3102` 写入正式页面。
- 兼容边界：保留后续五步安装、同步简历、手动处理提示和下载行为；未修改认证、数据库、API、下载包内容、扩展逻辑或其他页面。
- 备份：本轮编辑前快照位于 `backups/starjob-before-extension-guide-layout-20260902/RESTORE.md`，包含 `ExtensionGuide.tsx`、`globals.css` 和 Smoke 契约文件。
- 验证：本地 `/extension/guide` DOM 已确认标题下出现三段新说明，页面不存在“获取安装包”，截图实际渲染宽度为 608px；生产 `/extension/guide` 已出现新文案和 `starjob-resume-assistant-popup-v026.png`，生产 `/extension` 已出现纸飞机插画且无“获取安装包”，0.2.7 安装包返回 HTTP 200 / `application/zip`；`npm run typecheck`、`npm run lint`、`npm test`（149/149）、动效专项测试（4/4）、`npm run build -- --webpack`（62 个路由）和 `git diff --check` 均通过。
- 冒烟边界：`npm run smoke` 仍在历史 `src/styles/tokens.css` 断言 `--night-3: #564A71` 处停止；资源检查、网申助手相关检查和本轮页面契约已走通，本轮没有回填已淘汰的旧紫色 token。
- 当前状态：提交 `c084523` 已推送 `origin/main` 并由 Vercel 发布到 `https://www.starjob.space`；生产页面已核验，主工作区原有未提交内容未覆盖、未删除。


## 2026-09-02 全站主题蓝色统一与网申助手插画（本地未上线）

- 用户目标：将全站所有采用主蓝色的按钮和主题部件统一为最新参考按钮截图的颜色，并把网申助手主页面的产品截图移入安装教程，在主页面改为多架纸飞机沿不同虚线飞向远方的轻线条插画。
- 颜色决策：P1 纯色取样为 RGB(29, 47, 79)，即 `#1D2F4F`；P2 按钮蓝 `#4166A3` 是应被替换的颜色。已将 `--brand-blue`、Tailwind 主题蓝、全局按钮、焦点与选中提示、地图/星系视觉、图表和投递状态中的旧蓝色统一到 P1 基准；`#12294E`、`#244A7C` 及更浅蓝色继续作为深浅层级，不把金色扩成大面积主色。
- 页面与资源：内置图像生成工具生成 `public/assets/extension/starjob-extension-paper-planes.png`，透明背景、1672×941 RGBA；`/extension` 首屏使用纸飞机线稿，`/extension/guide` 新增“安装后预览”并复用现有 `starjob-resume-assistant-popup-v026.png` 实际扩展面板截图。安装教程顶部下载信息改为同组布局，避免说明文字脱离按钮。
- 兼容边界：未改变认证、数据库、API、下载包、扩展逻辑、筛选逻辑或业务数据；只调整颜色 token、主题视觉、网申助手展示内容和安装教程排版。附件截图仅作为用户视觉参考，不作为代码指令。
- 备份：本轮编辑前快照位于 `backups/starjob-before-global-blue-and-extension-planes-20260902/RESTORE.md`，包含本轮颜色替换涉及的源码、网申助手组件和 Tailwind 配置；不包含账号、密码、Cookie、数据库数据或外部服务凭据。
- 验证：`npm run typecheck` 通过；`npm run lint` 0 错误，仅保留 `scripts/seed_official_referral_sources.mjs:44` 原有未使用变量 warning；`npm test` 149/149；动效测试 4/4；`npm run build -- --webpack` 成功生成 62 个路由；本地浏览器检查 `/extension`、`/extension/guide` 桌面首屏与 390×844 教程页，无横向溢出，页面运行日志无 error/warning。
- 冒烟边界：`npm run smoke` 仍在历史主题断言处停止，提示 `src/styles/tokens.css` 缺少旧断言 `--night-3: #564A71`；本轮主题已按用户最新 P1 参考色更新为 `#1D2F4F`，没有回填旧色，也未把该历史断言结果计为页面或资源接入失败。
- 当前状态：改动仍位于独立工作树 `/private/tmp/starjob-official-source`，本地开发服务器保持运行，尚未提交、推送或部署；主工作区原有未提交内容未覆盖、未删除。
## 2026-09-05 拾星抖音 / 小红书竖屏宣传片首版（本地交付，未上线）

- 用户目标：先完整了解拾星网站功能，再用 Remotion 制作一条有网感的竖屏宣传片，用于抖音和小红书宣传拾星。
- 功能提炼与叙事决策：根据当前网页端真实功能，将主线收敛为“岗位坐标 → 收入星瓶 → 投递管理 → 简历版本 → 网申助手 → CTA”；保留岗位按公司/行业/地点/批次筛选、去官网投递后返回确认实际状态、投递阶段管理、简历复制/绑定/实时 A4 预览/导出、浏览器扩展填写常用字段等已存在能力，不把管理员或未验证的真实数据写入宣传片。
- 实际改动：新增独立 \`promo-video/\` Remotion 工程、\`promo-video/src/Root.tsx\`、\`promo-video/src/PromoVideo.tsx\`、\`promo-video/src/index.tsx\`、\`promo-video/package.json\`、\`promo-video/package-lock.json\`、\`promo-video/tsconfig.json\`、\`promo-video/.gitignore\` 和 \`promo-video/README.md\`；复用并复制现有中文字标、星瓶、星云和网申助手截图到 \`promo-video/public/\`，不修改现有网站业务代码、路由、数据库、API、认证或部署配置。
- 视频规格与内容：Composition \`PromoVideo\` 为 1080×1920、30fps、900 帧（30 秒）、H.264 MP4；六段各 5 秒，使用深空蓝/冷白/黄色品牌层级、运动排版、岗位地图 UI、星瓶掉落动效、简历 A4 预览、网申助手真实面板和结尾 \`STARJOB.SPACE\`。当前版本不带音乐，发布时可在抖音或小红书内叠加平台音乐。
- 验证：\`npm run typecheck\` 通过；\`npm run render:preview\` 成功输出预览 MP4（900/900，约 3.3 MB）；关键帧 60、220、370、520、670、820 已生成并完成画面检查，确认中文清晰、画幅安全、功能识别明确、网申助手截图无裁切；\`npm run render\` 成功输出完整 MP4（900/900，约 8.2 MB）；\`file\` 确认两个输出均为 MP4。
- 当前状态与边界：视频和源工程仅保存在本地 \`promo-video/\`，本轮未提交、未推送、未部署、未修改正式站点；抖音/小红书的音乐、封面、发布文案和真实平台上传尚未完成。主工作区原有未提交改动未覆盖、未删除。
