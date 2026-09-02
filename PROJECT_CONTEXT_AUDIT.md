# PROJECT_CONTEXT_AUDIT

## 三文档不可绕过死命令（2026-08-09 起）

**死命令：任何代码、组件、样式、路由、API、类型、脚本、migration / RLS / DDL、数据库或外部数据写入、数据源或导入规则、环境变量、自动化、依赖、产品或视觉决策、测试、Git、部署、回滚、风险边界或验证证据只要发生变化，都必须在同一工作会话内同时、等量更新 `PROJECT_CONTEXT_FINAL.md`、`PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md`。三份任一漏写、内容不一致或缺少证据时，禁止暂存、提交、推送、部署、宣称完成或交接。后续代理无权跳过、弱化、延期、改成单文档记录，也不得用聊天记录、代码注释、提交信息或其他文档替代。**

每次三文档记录至少写明：日期、用户目标、根因/决策、实际改动文件与行为、兼容边界、验证命令和结果、提交与部署证据（如有）、已确认和未确认的外部状态。若本次只完成诊断而没有修改，也必须在三份文档中同步写清“零修改/零部署”及诊断证据。

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

## 2026-08-09 Audit — English Resume Name Priority and Restricted Pinyin

### Behavior and safety evidence

- The English PDF already preferred `basics.englishName`, but the translated document still retained the Chinese value in `basics.name`. That produced a real data inconsistency between preview, editor and downstream extension sync. The fix moves the rule into translation-plan application and translated-document construction rather than patching display only.
- For target `en-US`, a non-empty user-authored `englishName` deterministically becomes both `name` and `englishName` and is not sent as a model entry. If it is empty and the source name contains CJK characters, the plan emits exactly one `person_name_pinyin` leaf. The prompt requires Hanyu Pinyin, family name first, capitalized components and no invented English name. An already-Latin source name is preserved and copied to both fields. Target `zh-CN` never guesses a Chinese name from English.
- `parseChunkResult` applies `^[A-Za-z][A-Za-z .'-]*$` to the pinyin leaf in addition to the existing exact-key, uniqueness, count and maximum-length checks. CJK, digits or unrelated prose rejects the chunk; no unsafe fallback bypasses atomic merge. The browser copy constructor also prefers returned `englishName` when creating an English document, providing compatibility with earlier server response shapes.

### Verification and release boundary

- Deterministic Smoke coverage now proves two paths: explicit `Stella Wang` never becomes a model leaf and overwrites both translated name fields; with `englishName=""`, `王小星` produces one `person_name_pinyin` leaf whose accepted `Wang Xiaoxing` populates both fields. Existing privacy, date/GPA preservation, chunk limits, atomic merge and independent-copy assertions remain active.
- A live configured-provider synthetic request returned HTTP 200 and `Wang Xiaoxing` in 1,339 ms, with zero reasoning content and a passing Latin-name check. Targeted ESLint, clean TypeScript, full Smoke, 55-route production build and diff check passed.
- Commit `417dce8` contains exactly four task files: translation route, translation plan, translated-document constructor and Smoke. User `package.json`, `.codex-artifacts/` and five untracked PRDs were not staged. Patrick deployment `FtKvhEDjwWuKK9cPQDTnAwPGJWu9` completed successfully; formal `/resume` returned 200 and all three anonymous translation probes remained 401.
- No migration, hosted DDL, database write, environment-variable change, extension package or mini-program client release occurred. The provider probe uses synthetic data and is not a formal-domain authenticated resume translation; no production login was available for that E2E.

## 2026-08-09 Audit — Chunked Resume Translation and Real Progress

### Root cause and strategy evidence

- The preceding timeout fix removed thinking and correctly exposed body-read aborts, but the route still asked one model call to reproduce the entire resume schema. Output size therefore grew with every field plus unchanged structural value; a 4.8k-character synthetic full resume exceeded 75 seconds, and any malformed field invalidated the whole response. Local resume parsing and service credentials were separately healthy.
- The replacement plan enumerates only non-empty translatable leaves as sequential `t0...` keys, caps a chunk at 24 entries and approximately 1,800 source characters, and runs two workers concurrently. A request keeps one authentication decision, one rate-slot acquisition, one 150-second batch deadline and the existing 180-second function ceiling. Each chunk has a 60-second guard; empty, invalid-JSON and invalid-key results can retry once.
- A live provider probe used the exact structured mode and two concurrent 16-entry synthetic chunks. They completed in 23,048 ms and 21,246 ms, with 16/16 entries and unique keys in each response, HTTP 200, finish reason `stop`, zero warnings and zero reasoning content. Total wall time was 23,048 ms, demonstrating actual overlap without using user resume data.

### Integrity, compatibility and UX evidence

- `resume-translation-plan.ts` never emits a user-authored `basics.englishName`, any `startDate`/`endDate`/free `date`, GPA or current flag. It emits `basics.name` only for target English when the English-name field is empty and the source contains CJK characters, under the restricted pinyin validation described above. Contact details, links and photos remain excluded. `applyTranslationValues` requires the exact leaf count, rejects missing/unknown/over-length keys and writes only server-generated paths into `structuredClone(source)`.
- Chunk responses are independently Zod-validated and collected without mutating the resume. Only after all workers succeed does the route merge values, parse the complete result schema and recheck education/work/project/skill/custom-section and bullet cardinality. Failure aborts peer work and returns an error; the browser creates no translated document until the final result arrives.
- The web client opts into `application/x-ndjson` with `progressMode=ndjson`, parses incremental start/progress/result/error records, and updates a fixed bottom status region from completed chunks rather than elapsed-time estimates. It exposes `role=progressbar`, ARIA min/max/current/text, percent and completed/total copy, keeps cancellation, and removes movement when reduced motion is requested. Desktop and 390×844 viewport inspection found no horizontal overflow; the fixed region avoids shifting the editor layout.
- Compatibility is explicit: request `progressMode` is optional. Callers that omit it receive the pre-existing final JSON response. `/api/miniprogram/resume/translate` still re-exports the web implementation and `/api/miniprogram/resumes/[id]/translate` still invokes it without progress mode, so both old mini-program contracts, route paths and 180-second allowances remain intact. No schema, persistence or rate-limit migration was introduced.

### Verification and release boundary

- Commit `c7bfebfc3b81df710621b98f52f15ce0b57a1991` contains exactly five task files: the route, new translation-plan helper, browser translation helper, Resume Builder progress UI and Smoke checks. User-owned `package.json`, `.codex-artifacts/` and five untracked PRDs were left unstaged and uncommitted.
- Passed targeted ESLint, `npx tsc --noEmit`, complete `npm run smoke`, 55-route `npm run build` and `git diff --check`. Smoke executes deterministic probes for short-key continuity, 24-entry/1,800-character chunk limits, exclusion of name/date/GPA/current paths, atomic application, privacy payload and independent translated-copy creation. Three numeric-suffix `.next/types` files regenerated by Next were SHA-256-identical to their canonical ignored cache files and were removed before the final clean TypeScript pass.
- `main`, `origin/main` and the production commit resolve to `c7bfebfc3b81df710621b98f52f15ce0b57a1991`. Patrick Vercel deployment `po5SRvex5n5TnNgoLMs2UdTQTJ4E` returned `success / Deployment has completed`. Formal `/resume` returned 200; its 16 client scripts contain `application/x-ndjson`, `progressMode`, the progressbar label, chunk count, source-protection copy and cancel behavior. Anonymous POSTs to the web route, mini-program compatibility route and existing per-resume mini-program route all returned 401.
- No migration, hosted DDL, Supabase write, environment-variable change, extension-package release or mini-program client release occurred. The live provider probe is not an authenticated formal-domain user journey. No reusable production login was available, so real-resume translation, progress streaming through the formal domain and translated-copy persistence remain an explicit authenticated E2E boundary rather than being inferred from deployment or anonymous probes.

## 2026-08-09 Audit — Resume Translation Empty-Response and Timeout Fix

### Root-cause evidence

- The exact user-facing “AI 未返回译文” branch is reached only after `message.content` is empty. A live request using the old route shape reproduced HTTP 200 headers followed by a body-read abort at the exact 32-second controller boundary; the old `response.json().catch(() => null)` converted that abort to a null payload, so the timeout mapper never saw `AbortError` and the request was mislabeled as an empty model response.
- A minimal strict-JSON probe with thinking enabled took about 10.1 seconds and 199 completion tokens, including 192 reasoning tokens. The same probe with thinking disabled took about 2.2 seconds and 6 completion tokens with zero reasoning. A representative structured resume with thinking disabled returned a complete result in 22.3 seconds; a larger synthetic resume exceeded the former 32/38-second windows and also demonstrated why 60 seconds is not a safe worst-case boundary.

### Implementation and compatibility evidence

- `/api/resume/translate` now declares `maxDuration=180`, aborts upstream at 150 seconds, and sends `chat_template_kwargs.enable_thinking=false`. The browser waits 165 seconds, leaving time for the server to map a 150-second upstream timeout before the platform ceiling.
- Response JSON parsing no longer catches all errors as null. Abort propagates to a 504 timeout; malformed JSON is classified as `invalid_json`; actual empty content remains a separate 502. Safe diagnostics record only status/kind, elapsed time, finish reason and reasoning length. Resume text, raw response content and credentials are never logged.
- `/api/miniprogram/resume/translate` and `/api/miniprogram/resumes/[id]/translate` retain their existing paths and response contracts while adopting the same 180-second function allowance. Web and old mini-program clients therefore continue to use the same server implementation; no request schema, resume schema, rate-limit function or persistence contract changed.
- Strict result validation is unchanged: education/work/project/skill/custom-section cardinality and bullet cardinality must match, deterministic dates/GPA/current fields remain source-controlled, and failure never mutates the source resume. The independent translated resume still preserves phone, email, birth date, links, website and photo from the source document.

### Verification and release boundary

- Commit `ac6cf54` contains exactly five tracked files: the main translation route, two mini-program compatibility routes, the browser translation client helper and Smoke invariants. User-owned `package.json`, `.codex-artifacts/` and five untracked PRDs were not staged or committed.
- Correction commit `6ee31a7` removes the ineffective Node `preferredRegion` declarations from the three routes and updates only their Smoke expectations; it does not alter the translation timeout, model mode, validation, API contract or user data behavior.
- Passed targeted ESLint, `npx tsc --noEmit`, full `npm run smoke`, 55-route `npm run build`, and `git diff --check`. Two numeric-suffix `.next/types` files initially blocked TypeScript; each was SHA-256-identical to its canonical generated file and was moved out of `.next` before rerunning. The production build regenerated clean types without duplicates.
- Live upstream synthetic translation: HTTP 200 in 22.3 seconds, finish reason `stop`, 2,481 content characters, 608 completion tokens, zero reasoning tokens, and exact education/work/project/skill plus bullet counts. This proves the configured structured response path, not an authenticated production user journey.
- The first formal-domain probes reported `x-vercel-id` with `iad1`, proving the Node function remained in the project-level region. Current Vercel documentation limits App Router `preferredRegion` to Edge runtime, so the ineffective declaration was removed instead of being presented as a latency improvement. Moving the whole Node project region could affect Supabase and unrelated APIs and was intentionally outside this translation hotfix.
- `main`, `origin/main` and local HEAD all resolve to `6ee31a7c3428c8326f6355999a0f80cf01af42bc`. Vercel status for deployment `EnG6YdBxiSyoBRo9j1dgE4qBA5ZK` is `success / Deployment has completed`. Formal `/resume` returned 200; anonymous POSTs to the web translation route, mini-program compatibility route and existing per-resume mini-program route all returned the expected 401 without exposing service configuration. The production resume chunk contains `165e3`, timeout copy, in-progress copy and cancel behavior.
- No migration, hosted DDL, Supabase data write, environment-variable change, extension package change or mini-program client release occurred. An authenticated formal-domain real-resume translation remains unverified because no reusable logged-in account was available; deployment, anonymous auth probes and bundle markers are not reported as that E2E.

## 2026-08-05 Audit — Tencent 27-Autumn Job Sync and Import Guards

### Implementation and safety evidence

- `scripts/sync_27_autumn_jobs.mjs` locks the public source URL and resolved anonymous data endpoint to document `DY0VXc3BFTFJUbUhw`, tab `t3r1vl`, view `vdHovb`. A changed host/path/document/tab/view, missing schema, empty payload, abnormal row count or decompression/JSON error terminates the run before database writes.
- `scripts/lib/job-sync-utils.mjs` requires all nine expected columns. Rows are accepted only when `batch_type` begins with `27秋招`; any populated non-27 batch is collected as wrong-season evidence and aborts the whole run with zero writes. Missing company/link/batch and malformed links are isolated as invalid rows and never inserted.
- Duplicate protection has three independent paths: stable version-5-format UUID from Tencent record ID, normalized full fingerprint across company/clean URL/titles/locations/batch, and legacy identity across company+URL+batch or company+start-date+batch. Tracking query keys and HTML-escaped separators are normalized; database reads paginate rather than assuming the first 1,000 records.
- Browser-side manual import no longer trusts the first workbook sheet. `src/lib/csv.ts` names `27秋招正式批+提前批`, scans for required headers and rejects missing/non-27 batch values. `src/lib/job-dedupe.ts` uses the same stronger normalization so Excel and live-source representations match.
- Automation `27` is ACTIVE in the local Web project and schedules Beijing daytime checks at 09:00/12:00/15:00/18:00/21:00. Its prompt runs the 8 safety tests before apply and stops on failure; only failed runs notify. The matching GitHub Actions workflow is committed and pushed with the same schedule; both required repository secret names are present, and their values were never printed. Hosted run `31013563683` completed successfully against `f27af05`.
- Retention audit on 2026-08-09: the automation prompt now requires a real `set_thread_archived` tool call after the final run report, rather than emitting a textual archive directive. All 18 listed idle threads whose title and preview identified automation ID `27` were archived successfully through exact thread IDs. A subsequent recent-thread listing contained no `27秋招岗位同步` task; unrelated Codex and ChatGPT threads remained present. Schedule, ACTIVE status and notification policy were preserved.
- Archive-order audit on 2026-08-14: recurrence showed that “after the final summary” was not executable because the final response terminates the task. The automation prompt was corrected to call `set_thread_archived` before its final summary and only then return the result. Sixteen exact threads titled `27秋招岗位同步` with automation ID `27` evidence were archived successfully, including the lingering active entry; the subsequent 30-thread listing had zero matching tasks. No unrelated task was archived, and automation schedule/status/notifications were preserved.
- Heartbeat conversion audit on 2026-08-17: a third recurrence demonstrated that prompt-level self-archiving was not a reliable control for standalone cron thread creation. Automation `27` now has `kind = "heartbeat"`, `status = "ACTIVE"`, unchanged five daytime hours and `target_thread_id = "019fd078-91bd-7d61-8af2-638f91b1b470"`. Thirteen exact automation-ID-27 threads, including one prior system-error entry, were archived successfully. A subsequent recent-thread listing showed zero `27秋招岗位同步` entries and preserved unrelated threads. This changes only conversation routing; job-source validation, database commands and notification policy are unchanged.

### Live data and verification evidence

- Source snapshot on 2026-08-05: maxRows/sourceRecords 397; valid 27-autumn jobs 393; wrong-season rows 0; invalid rows 4. Invalid evidence was one slogan row without batch/link and three 27-autumn companies whose source link values were not valid HTTP(S), so they were skipped rather than weakened through validation.
- Pre-write dry-run against hosted Supabase: existing 372; insert plan 39; update 0; previous-import skips 354; source duplicates 0. Apply wrote exactly 39. Immediate post-write dry-run: existing 411; inserts 0; updates 0; unchanged 39; previous-import skips 354; written 0. This is direct hosted-data and replay evidence for idempotency, not merely a unit-test assertion.
- Supplied Excel verification: exact target sheet 389 rows, header row 2, 386 populated batch cells, 0 non-27 values. The workbook's first two sheets are 26-autumn material, demonstrating why exact sheet selection is required.
- Passed: `node --test scripts/tests/sync_27_autumn_jobs.test.mjs` (8/8), both sync script syntax checks, targeted ESLint, `npx tsc --noEmit`, and `npm run build` with 55 routes. Three `.next/types/* 2.ts` files were SHA-256-identical generated-cache duplicates under `/.next/`; only those ignored copies were removed before TypeScript verification and the production build regenerated normal types.
- Full `npm run smoke` passed and read 411 open hosted jobs. GitHub run `31013414780` was a useful negative deployment probe: tests passed, then Supabase client initialization on Node 20 failed for missing native WebSocket before any query/write. Workflow commit `f27af05` changed the job runtime to Node 24. Retry run `31013563683` completed all steps in 52 seconds and reported source 397, valid 393, invalid 4, wrong-season 0, existing 411, inserts 0, updates 0, unchanged 39, prior-import skips 354 and written 0.

### Remaining boundary

- The hosted data write, local schedule, GitHub schedule and hosted runner replay are complete. Feature commit `1aa669c` plus runner fix `f27af05` are on `main` / `origin/main`; Vercel deployment `6CcfYxzv1kxpAJ5eRJuyF6Vjm96W` returned `success / Deployment has completed`. The three handoff documents live in `/Users/wangrui/Downloads` outside the Git repository, so they are synchronized on disk but are not part of those commits. Three malformed-link source jobs remain intentionally skipped until the upstream document provides valid HTTP(S) links.

## 2026-08-03 Production Audit — Extension AI Autofill 0.2.2

> 当前 Git / production 基线为 `main` / `origin/main` / `af0fe57`；功能提交为 `55bd498`，用户界面供应商去标识提交为 `af0fe57`。Patrick Vercel deployment `DwUUCDgVzjdU592ZYjegBrqsKNXc` 已为 `success / Deployment has completed`，正式下载页与安装教程已指向 0.2.2。

### Implementation and security evidence

- 长键修复：真实 50 字段请求体平均原 `fieldKey` 为企业表单量级，0.2.1 在 4,500 output token 下返回截断/非法 JSON。0.2.2 仅把页面键替换为顺序短键 `f0...` 后发送，`parseResult` 先校验短键已知且唯一，再恢复原始键；不接受模型自造或重复键。
- 空映射兼容：实际服务会对 `value:null` 项返回 `confidence:null`。Zod 只对该字段兼容 nullable，进入映射时归一为 0；因此不能通过 `MIN_CONFIDENCE=0.82`，不会形成填写值。非空值的事实、派生、option 和置信度安全门均未放宽。
- 自我描述：`isSelfSummaryField` 是窄字段语义白名单；`collectResumeSummaryFacts` 排除姓名、联系方式和 birthDate，只使用目标、教育、工作、项目、技能、校园、奖项、证书、语言和自定义经历。`isSafeResumeSummary` 要求命中简历事实、禁止新数字、未证实评价/性格/愿望，并用教育结束月份阻止在读生被写成已毕业。
- 出生日期：`ResumeBasics.birthDate` 默认为空；编辑页原生 date input 由用户显式写入。`sanitizeResumeForAi(resume, fields)` 仅在页面字段语义命中出生日期时携带日期。`fill.js` 在本地值为空时仍把出生日期字段记为 sensitive；年龄/出生地继续独立排除。不得推断的规则同时存在于客户端过滤、服务端 prompt 和数据导入规则。
- 日期控件：Ant / Element / Arco / Semi 等既有 picker 识别保持，年份导航上限由 12 改为 150。夹具动态模拟 Ant header 与 `data-date`，从 2026 年经 26 次上一年到 2000 年后点击精确日格；只读输入最终值为 `2000-02-03`。
- 向后兼容：旧简历 normalize 以 empty resume fallback 注入空 birthDate；小程序 schema 为 optional/default；翻译副本原样保留 birthDate；import 只有原文明确 birth label 才提取。无 DDL、migration 或 hosted 数据写入。旧扩展协议、普通 merge/overwrite、0.1.7–0.2.1 ZIP 均保留。
- 用户展示：正式组件、扩展 popup、README 和 privacy 中供应商/模型名称扫描为 0；正式系统只展示“AI 智能填写 / AI 分析”。内部 route 的 server-only 配置名称未改，不进入用户文案。

### Verification evidence

- 真实本地 AI 50 长字段：HTTP 200 / 10.4 秒 / 3 个接受映射；自我描述、`2000-02-03`、姓名通过，47 个无依据字段保持 null。最终三字段回归 HTTP 200 / 2.9 秒，输出“本科在读”而非“毕业于”。先前同规模长键请求约 51 秒后 502，故改进直接对应复现故障。
- 浏览器夹具：`STARJOB_AI_AUTOFILL_TEST_PASS`；filled=5、preserved=1、derived=3，身份证和隐私 checkbox 未改。定向 ESLint、TypeScript、完整 smoke、55-route production build、diff check 与扩展构建均通过。
- 正式 ZIP：135,555 bytes / SHA-256 `2d05bd7aaf2e59f2c966950e45992187c84021328471d6bed84d05e9525eaca3`；线上下载与本地一致，manifest=0.2.2，ZIP 用户文案供应商名称为 0。正式 `/extension`、`/extension/guide` 均命中“最新版本 0.2.2”，HTML 用户可见供应商名称为 0；0.1.7、0.1.8、0.1.9、0.2.0、0.2.1、0.2.2 六个包均 HTTP 200；匿名 autofill 为 401。
- 发布证据：`55bd498` 与 `af0fe57` 已推送 `origin/main`；GitHub Vercel status 明确返回 deployment `DwUUCDgVzjdU592ZYjegBrqsKNXc` success。当前工作区仅剩用户原有 `package.json` 修改、`.codex-artifacts/` 与五份未跟踪 PRD，不属于本次发布。

### Remaining boundary

- 尚未使用用户真实携程简历完成 0.2.2 安装、重新同步、真实整页填写与人工字段对照。重型第三方 ATS、跨域 iframe、closed shadow root、非标准 combobox 仍需按具体页面验收；无自动提交、无验证码/附件处理。生产已验证页面、包、部署和匿名鉴权，但本次没有把合成授权请求写成正式域名已登录端到端，因为浏览器读取授权页在完成前超时。

## 2026-08-03 Production Audit — Extension Full-Form AI Autofill 0.2.1

> 本节为 0.2.1 历史审计，当前状态以上方 0.2.2 节为准。功能提交为 `e6f075c71a07ee57b625026683df142961402940`；Patrick Vercel deployment `5zKM1joDnUs3zda61s7VmmDiGbeS` 已为 `success / Deployment has completed`。

### Implementation and security evidence

- UI：`popup.html` 存在第三个 `fillMode=ai`；CSS 使用 `repeat(3, minmax(0, 1fr))` 保持原有下划线选择器；Popup Chrome 截图确认 380px 宽度下三项完整显示且无横向溢出。
- 全表单语义：服务端 prompt 强制按字段数组顺序从上到下处理，所有能由简历明确回答的安全字段都应返回值，不能只处理派生项；简历无依据必须返回 null。原生 select 和 radio 仅能返回 options 中已有 value/text。
- 数据最小化：`sanitizeResumeForAi` 只保留简历标题/目标、基础文字、教育/工作/项目/技能及自定义经历文字，排除照片、简历 ID、记录 ID、linkedJobId、createdAt/updatedAt。页面上报仅含非敏感 fieldKey、label、attributes、context、inputType、确定性提示和最多 40 个 select/radio 选项，不含当前 value。
- 服务端：`extension-autofill` 使用现有 HMAC match token，不创建新登录或密钥链；MiMo 地址、模型和密钥只从服务端环境变量读取。请求同时做 Content-Length 快速拒绝和实际 UTF-8 128 KB 校验，限流为每用户 10 分钟 5 次，上游超时 50 秒，函数 `maxDuration=60`，响应 no-store。
- 输出约束：严格 schema 只接受已上报 fieldKey、非空 3000 字以内 value、`resume|derived` basis 和 `confidence >= 0.82`；未知或重复键整单拒绝，模型省略项由服务端按原顺序补 null。`basis=resume` 必须由净化简历事实构成；安全派生只允许事实等价格式、明确拼音/姓名拆分或服务端可确定的教育状态。
- 长表单：扩展把最多 100 个字段按原顺序切为每批 50 个，每批独立 60 秒客户端超时；全部批次返回成功后才设置 `aiValueMappings` 并注入 `fill.js`，任一批失败都不会部分改动页面。该设计保持 Vercel 单次函数在 60 秒内，同时允许整页流程总时长超过 60 秒。
- 模型纠错：诊断中曾得到 2027-06 毕业却选择“否”的真实 MiMo 错误。`deriveGraduationValue` 现根据当前月份与教育结束年月，为“在读/已毕业/是否毕业/未来应届”匹配原生选项并覆盖模型值；已毕业后的“是否应届”因定义存在歧义继续留空。
- 行为边界：AI 模式仅填空白项；直接事实绿色、派生值琥珀色；身份证、护照、出生/年龄、性别、婚姻、民族、国籍、户籍、政治/宗教、残疾/退伍、薪资、家庭、安全问题、验证码、密码、同意/协议/声明 checkbox、文件和 submit 均不会自动处理。
- 原 `extension-match` 路由未改变数据契约，仍不接收 `resume.content`。新值生成和旧字段分类使用独立 storage key，避免 AI 第三模式改变普通 merge/overwrite 行为。

### Verification evidence

- `node --check popup.js` / `fill.js`：通过。
- 定向 ESLint：通过；`npx tsc --noEmit`：通过。开发前曾清理确认的 `.next/types/* 2.ts` 生成缓存，最终构建后没有数字后缀类型副本。
- `npm run smoke`：通过，新增 route、popup、CSS、privacy 和 AI fixture 静态安全契约。
- `npm run build`：Next.js 16.2.11 production build 通过，共 55 个静态/动态页面，路由表包含 `ƒ /api/resume/extension-autofill`。
- `npm run build:extension`：通过，正式生成 0.2.1 ZIP；包内 manifest 为 0.2.1 / Manifest V3，权限仍只有 `activeTab`、`scripting`、`storage` 和原生产域名 host permissions。
- Playwright 使用本机 Chrome 执行旧表单夹具和新 AI 夹具：分别得到 `STARJOB_EXTENSION_TEST_PASS` 与 `STARJOB_AI_AUTOFILL_TEST_PASS`。AI 实际结果为拼音 `Wang Xiaoxing`、学历 `本科`、在读 radio=true、已有邮箱保持、身份证空、隐私同意 false、filled=3、preserved=1、derived=2。
- 真实 MiMo 时延：12 字段 11.4 秒 / HTTP 200，60 字段 31.6 秒 / HTTP 200 / 44 个接受值（36 直接、8 派生、敏感/主观返回 0），最终 4 字段事实纠错回归 4.0 秒 / HTTP 200。正式域名授权合成请求 7.7 秒 / HTTP 200，返回姓名、`Wang Xiaoxing` 与 2027 毕业对应“是”，身份证缺席。
- `git diff --check`：通过。0.2.1 ZIP 为 133,778 bytes，SHA-256 `5bfb31a349810f7c8f56821d6559d5bf9d0974cb4ce1a878ed55b2fab5b20ecd`；正式下载后的大小与哈希完全一致。

### Production and remaining boundary

- `https://www.starjob.space/extension` 与 `/extension/guide` 均检出 0.2.1 官网 ZIP 和旧版兼容文案；0.1.7、0.1.8、0.1.9、0.2.0 四个旧 ZIP 均为 HTTP 200。0.1.7–0.1.9 继续同步并使用两个原模式，0.2.0 AI 继续可用但客户端仍为 22 秒；只有新装 0.2.1 才获得分批与单批 60 秒。
- 正式 `extension-autofill`、原 `extension-match`、`extension-profile` 匿名探针均返回 401，证明新路由没有放宽旧鉴权。授权合成请求使用测试 subject 和合成简历，不包含用户真实资料、不写数据库。
- 尚未在用户真实安永表单上完成一次“0.2.1 安装 → 重新同步 → AI 填写 → 人工核对”的最终验收。安永重型页由 Chrome 控制做只读 DOM 扫描时两次超时；用户截图已证明 0.2.0 请求发出并在客户端 22 秒处中止，但不能替代 0.2.1 企业 ATS 端到端。
- 自定义 React/Vue combobox、跨域 iframe、closed shadow DOM 仍没有全量企业站证据；当前选择证据覆盖原生 select、原生 radio 和既有日期控件。扩展不自动提交，因此没有企业申请被创建或发送。
- 用户已有 `package.json`、`.codex-artifacts/`、五份未跟踪 PRD 保持用户所有，未暂存、未提交、未删除。

## 2026-08-01 Production Audit — StarInterview DeepSeek Completion Split

> 当前 Git / production 基线为 `main` / `origin/main` / `128f3dc488b6068c8f763f6a03c9114d85affdbf`。正式 `https://www.starjob.space/api/star-interview/health` 已返回新版双服务状态。

### Implementation and production evidence

- `src/lib/star-interview-server.ts` 将 completion 与 ASR 拆为 `getStarInterviewLLMConfiguration` 和 `getStarInterviewASRConfiguration`。前者只读取 DeepSeek 三项变量并默认 `https://api.deepseek.com` / `deepseek-v4-flash`，后者只读取 MiMo ASR 三项变量并默认 `mimo-v2.5-asr`。
- Completion 非流式与 SSE 请求都使用服务端 `config.model`、`thinking disabled`、`max_tokens` 和 `json_object`；请求 schema 同时接受 Build 37 的旧标记与 Build 38 的新标记。ASR 输入音频格式、`asr_options`、15 秒上游超时与 MiMo 模型保持不变。
- Health 只有在两套配置同时存在时才返回 200，并单独暴露 `completion` / `asr` 的 ready 状态，不返回地址、密钥或其他敏感值。正式响应为 `{"service":"诘星 StarInterview","status":"ready","completion":"ready","asr":"ready"}`。
- 未登录 production completion 与 ASR 请求都返回 401，说明正式鉴权边界仍在。macOS Build 38 已安装并冷启动，版本、严格签名和 Release 可执行文件哈希一致；Spotlight 与 LaunchServices 只发现 `/Applications/StarInterview.app`。

### Verification and boundary

- Web 验证：tsc、lint、54-page production build、Smoke、diff check、9 项 StarInterview 流式/路由测试通过；微信支付 4 项测试在其要求的 `react-server` 条件下通过。
- macOS 验证：完整 204 项测试通过，0 failed / 0 skipped；Release build 与 `codesign --verify --strict` 通过。测试网络配置新增可注入短超时，修复原 actor 隔离测试每项等待 180 秒的问题；生产默认 120/180 秒与 waits-for-connectivity 行为未改。
- Vercel CLI 当前连接 Ray 的同名项目，变量列表中没有 DeepSeek 配置；未向该项目执行部署。生产发布证据来自 Patrick `main` 推送与正式域名切换后的新版 health，而不是 CLI 身份推断。
- macOS 可见账户状态为未登录，机器随后锁屏；没有真实登录态 completion / SSE / 扣费 / ASR 请求。因此可以确认代码、构建、配置可见性、鉴权门和安装链路，不能确认真实 DeepSeek 或 MiMo 上游本次已成功返回业务结果。
- 本轮无 migration、hosted DDL、Supabase 写入或小程序发布；用户已有 `package.json`、PRD 与 `.codex-artifacts/` 未暂存、未提交。

## 2026-07-27 Production Audit — Resume AI Detail Verification

> 当前 Git / production 基线为 `main` / `origin/main` / `6f6604899b9e2c2e8b80b1d8874e5a9986dff1cf`。GitHub Production deployment `5624719350` 已返回 `success / Deployment has completed`，环境 URL 为 `https://job-bottle-elsdkw9j1-job-bottle.vercel.app`。

### Implementation and production evidence

- `src/app/api/resume/ai-polish/route.ts` 的严格结果 schema 新增 `verificationItems[{ detail, reason }]`。系统提示先区分已确认事实、可安全推导、待确认信息与禁止写入内容；候选细节只有逐项进入核实清单后才能出现在建议稿中。
- 数字、成果、客户、组织、技能、职责等级和因果关系继续禁止推测；没有结果时不强补结果，数字、结果和证据缺口只进入 suggestions。
- `ResumePolishDialog` 为推断细节提供独立警示、逐项说明和确认复选框；存在核实项时应用按钮保持禁用，确认后才允许应用。客户端结果校验同步要求 `verificationItems` 为合法数组。
- 正式 `https://www.starjob.space/resume` 返回 HTTP 200，生产客户端资源检出“AI 补充的细节，采用前请核实”“我已逐项核实，以上细节真实且可以解释”和“核实后应用”；匿名 `POST /api/resume/ai-polish` 返回 401。

### Verification and boundary

- `npx tsc --noEmit`、lint、51-route build、Smoke、`git diff --check` 和 production dependency audit 全部通过，依赖审计结果为 0 vulnerabilities。
- 本地未登录浏览器已确认 `/resume` 编辑器、经历页签和润色弹窗能够打开；没有真实登录测试账号，故未把真实 AI 返回后的警示呈现、复选框解锁、应用和云端保存写为生产 E2E 已通过。
- deployment `5624719350` 成功；独立环境 URL 受 Vercel SSO 保护返回 302，正式域名 `/resume` 为 200。线上 chunk 与匿名鉴权探针已通过。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布。受保护的 `package.json`、小程序改稿、PRD 和 `.codex-artifacts/` 未纳入提交。

## 2026-07-27 Production Audit — Final StarInterview Teaser Visuals

> 当前 Git / production 基线为 `main` / `origin/main` / `835d9465049e9a1c2f1186d7da6f8b302febc36a`。GitHub Production deployment `5617472637` 已返回 `success / Deployment has completed`，环境 URL 为 `https://job-bottle-bnqbhav4e-job-bottle.vercel.app`。

### Implementation and production evidence

- 星核基准尺寸由 24px 改为 96px，滚动缩放输出最大为 1，避免低分辨率图形放大模糊；opacity 动画已移除，CSS 固定 `opacity: 1`。实看确认首屏结束前保持完整，之后仅随 sticky 容器自然移出。
- 章节标题使用语义行组，问题示例同步拆分；桥接句“你的经历，留在拾星。”提高层级并增加线性引导。
- 新实机资源为 `public/brand/star-interview/product-live-coach.png`，2458×1594，SHA-256 `f55b32166bc9811918c1856fa2efd78d8a4770eb79fd21f5c141807490b4954d`。组件显式使用同一宽高，旧资源删除，Smoke 资源路径更新。
- 正式 `/interview` 返回 200，HTML 检出新路径且不含旧路径；正式新 PNG 返回 200，下载后的尺寸与 SHA-256 均和用户上传原图一致。

### Verification and boundary

- 本地浏览器覆盖 1280×720 与 390×844 的星核末端、语义换行、桥接强调和实机图，未发现横向溢出。
- `npx tsc --noEmit`、lint、51-route build、Smoke 与 `git diff --check` 全部通过。`npm audit --omit=dev --audit-level=high` 因 registry TLS 握手前断开而失败，不能声明本轮依赖审计通过；依赖清单与 lockfile 未变。
- commit、main 推送、Vercel 成功状态、正式 HTML 和正式图片哈希已分别核验。正式浏览器导航本轮超时，因此没有把生产视觉浏览器 E2E 写为通过。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 写入或小程序发布。受保护的 `package.json`、小程序改稿、在途 completion streaming 文件、PRD 与 `.codex-artifacts/` 未纳入提交。

## 2026-07-27 Production Audit — StarInterview Story Copy Refinement

> 当前 Git / production 基线为 `main` / `origin/main` / `b620dc9bfa8b2dea534e4cc5507fc562c01bc4af`。GitHub Production deployment `5616062680` 已返回 `success / Deployment has completed`，环境 URL 为 `https://job-bottle-562406m94-job-bottle.vercel.app`。

### Implementation and production evidence

- RECALL 标题已改为“协助你结构化表达你曾经做过的事。”；“校园咨询项目”、两周调研案例及对应装饰结构已从 JSX/CSS 删除，章节使用单栏开放布局。
- RESPOND 标题已改为“陪你把话表达清楚。”；`scripts/smoke_check.mjs` 的 `/interview` 文案契约已更新。
- 正式 `https://www.starjob.space/interview` 返回 HTTP 200，HTML 检出两句新标题；“不是临场编造”“先给你一条路”“校园咨询项目”“在两周内重新梳理”均未检出。

### Verification and boundary

- `npx tsc --noEmit`、lint、52-route build、Smoke 与 `git diff --check` 全部通过。Smoke 还校正了同期已正式启用的按量计费源码契约，从旧 `metered_not_enforced` 预留口改为检查现行 `metered`、`chargeStarInterviewUsage` 与 `consumeStarInterviewUsage`；没有修改计费实现。
- `npm audit --omit=dev --audit-level=high` 多次因 registry TLS 握手前断开而失败，不能声明本轮审计通过。本次提交没有依赖清单或 lockfile 变化，上一未变依赖基线审计为 0 vulnerabilities。
- commit、main 推送、GitHub/Vercel 成功状态和正式 HTML 探针已分别核验。本次页面精修提交没有 migration、hosted DDL、环境变量、Supabase 写入或小程序发布。
- 没有执行新的最终视觉浏览器 E2E；本轮生产证据覆盖代码、构建、Smoke、部署状态和正式 HTML。`package.json`、小程序改稿、PRD 与 `.codex-artifacts/` 未纳入提交。

## 2026-07-27 Production Audit — StarInterview Teaser

> 当前 Git / production 基线为 `main` / `origin/main` / `593c348da5b91631407795be3e1928521a9e826b`。GitHub Production deployment `5612347537` 已返回 `success`，环境 URL 为 `https://job-bottle-mgf407bmx-job-bottle.vercel.app`。

### Implementation and production evidence

- `/interview` 是新的公开静态预告路由；顶部 Dock 彩色十字星入口已在 `/explore` 的生产 HTML 中检出，包含 `/interview` 链接、可访问名称和提示文案。
- 页面实现透视文字汇聚、清晰四角星核、居中的官方诘星图标与文字 Logo、slogan“谛听察意，应答成章”、实机图和三个开放式能力章节；没有卡片墙。
- 正式 `/interview` 返回 200，并检出最终 slogan 与核心介绍文案。`app-icon.png`、`wordmark.png`、`product-home.png` 均返回 200 / `image/png`。
- 图标和文字 Logo 的 SHA-256 与 `/Users/wangrui/Documents/ASS/Resources/Brand/` 原文件一致；ASS 未修改。

### Verification and boundary

- `npx tsc --noEmit`、lint、47-route build、Smoke、diff check、production dependency audit 全部通过，0 vulnerabilities；Smoke 已覆盖 `/interview` 最终文案和三份品牌资源。
- 上一版在 1440×900、390×844 浏览器完成长页实看和横向溢出检查；最终星核、品牌居中缩小、文字 Logo 和 slogan 调整后，自动浏览器被本地 URL 安全策略阻止，未绕过，因此最终局部视觉不声明浏览器 E2E。
- 本轮没有数据库 migration、hosted DDL、环境变量、Supabase 数据写入、认证语义变化或小程序发布。受保护的 `package.json`、小程序改稿、PRD 和 `.codex-artifacts/` 均未提交。

## 2026-07-26 Production Audit — System Copy Refinement

> 当前 Git / production 基线为 `main` / `origin/main` / `597c17b3f653138fbb2560ccdace21b77dc1835b`；Vercel deployment `dpl_DAgQBniJ9gN8sZowogHSuB6BQeKK` 已核验 `READY`。

### Implementation and production evidence

- 网页端系统文案按最终优化稿覆盖全局、登录、首页、岗位、投递、星瓶、简历、个人中心、反馈、网申助手、StarInterview 连接和管理后台；明确排除通知与教程。
- 普通用户界面已不再暴露数据库环境变量、SQL Editor 或 migration 文件名。技术错误记录与用户提示分离，业务行为与数据语义未改。
- 正式 `/`、`/login`、`/explore`、`/feedback`、`/extension` 均为 200；HTML/资源检出新版 SEO、品牌句、反馈标题和网申助手标题。桌面与 390×844 浏览器检查未发现横向溢出。

### Verification and boundary

- `npx tsc --noEmit`、lint、46-route build、Smoke、diff check 与 production dependency audit 均通过，0 vulnerabilities。Smoke 中依赖旧文案的契约同步更新为最终文案。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布。小程序主页改稿、`MINIPROGRAM_PROGRESS.md`、`package.json`、PRD 与 `.codex-artifacts/` 未纳入提交。
- 本轮浏览器验收覆盖公开页面与未登录状态；没有真实账户下的投递、简历保存、管理员写入或 StarInterview 授权操作，因此不将这些流程声明为新的生产 E2E。

## 2026-07-26 Production Audit — Refined User Management and StarInterview Access

> 当前 Git 基线为 `main` / `origin/main` / `288cbc62952a3b1e487acd487cb0f931800ce1b0`；Patrick Vercel deployment `Cq1bopiabm3yvxHGfCdH5Txkh3jx` 已返回 `success / Deployment has completed`。

### Security and data evidence

- StarInterview 无限访问使用 Auth `app_metadata.star_interview_unlimited_access`，普通客户端不能直接写入；PATCH 仍先验证 Supabase 用户及 profile admin 角色，再精确比对主管理员邮箱。
- 非主管理员对 StarInterview 权限动作返回 403 的服务端分支已纳入 Smoke 契约；匿名生产 GET/PATCH `/api/admin/users` 均返回 401。
- 未显式设置时只按当前角色提供初始值。普通账户/身份更新会固化修改前权限，避免角色变更间接改变访问级别。
- 只读 hosted 审计：212 个 Auth 用户、1 个管理员、管理员无限访问 1、非管理员无限访问 0、主管理员账户及角色存在。没有写入 Auth metadata 或用户业务表。

### Release, verification and boundary

- commit `288cbc6` 只包含用户管理页面、管理 API、客户端数据契约和 Smoke；受保护 StarInterview 开发文件、`package.json`、`src/lib/types.ts`、PRD 与 `.codex-artifacts/` 未纳入提交。
- `npx tsc --noEmit`、lint、45-route build、Smoke、`git diff --check`、高危依赖审计、小程序 check 通过。
- 正式 `/admin/users` 为 200，实际生产 chunks 检出“多个条件会同时生效”“StarInterview 无限访问”“只有主管理员可以调整此权限”。
- 本轮没有 migration 文件或 hosted DDL，也没有小程序预览、上传、审核或发布变化。
- 没有可用管理员浏览器登录态，故真实后台列表读取、筛选、展开、开关二次确认、Auth metadata 写入后的刷新结果仍未作为生产 E2E 通过。

## 2026-07-26 Production Audit — Secure WeChat Web Login and Mini Program 0.2.1

> 当前 Git 基线为 `main` / `origin/main` / `95bc865`（交接同步），功能提交为 `30b503e`，服务端主体提交 `5144713`、Cookie 修复 `17c9aa2`；Patrick Vercel production 已返回 `success / Deployment has completed`。

### Security, migration and production evidence

- `wechat_web_login_codes` 每个用户只保留一个服务端记录；`reserve_wechat_web_login_code` 原子执行 30 秒生成间隔和微信身份门禁，`consume_wechat_web_login_code` 原子标记单次使用与 5 分钟有效期。
- `wechat_web_login_attempts` 只保存 HMAC 指纹，`take_wechat_web_login_attempt_slot` 持久限制 10 分钟 10 次。生产 RPC 定向探针确认前 10 次通过、第 11 次拒绝、无效码返回空且无微信身份不能预留，探针记录已精确清理。
- migration 文件 `20260724183000_wechat_web_login_codes.sql` 存在；hosted DDL 已执行；远端 migration history 已确认 `20260724183000` applied。这三个状态分别核验。
- 网页接口强制可信 Origin、8 位数字输入和 no-store，不记录验证码或身份凭证。最终 `NextResponse` 显式接收 Supabase SSR `Set-Cookie`；真实无痕 Chrome `/profile` 已确认 Cookie Session。
- 后台账号识别按真实邮箱与 `wechat_identities` 组合区分仅邮箱、仅微信、已绑定；内部技术邮箱不展示、不参与邮箱未确认筛选或确认动作。

### Release, verification and boundary

- 网页 tsc、lint、40-route build、Smoke、diff check、生产依赖高危审计通过；小程序 `npm run check` 通过，9 个页面且无客户端密钥标识。生产匿名探测：岗位 200、资料 401、生成码 401、无 Origin 消费 403、可信 Origin 下格式错误 400。
- 真实 E2E：小程序真实微信登录态生成码 → 全新无痕 Chrome 登录 → `/profile` 显示微信用户工作台；同一码重放明确拒绝。测试无痕窗口已关闭，原管理员会话未覆盖。
- 小程序 `0.2.1` 已预览并上传，包体 455,243 bytes。未提交审核、未审核通过、未正式发布；用户已提交审核的 `0.2.0` 未覆盖，其实时审核状态未在微信后台独立复核。
- 未覆盖 iPhone/Android 真机、微信审核与发布结果，以及完整的网页写入→小程序读取、小程序写入→网页读取投递/简历交叉测试。

## 2026-07-26 Production Audit — Flexible Web Resume Editing

> 当前 Git / production 基线为 `main` / `origin/main` / `74254922b1959a50bab8e236656b0d47f73b50e2`；GitHub 对应 Vercel deployment `dpl_3AGPjS2ez3fjNSGbzin2KTrirK6v` 已返回 `success / Deployment has completed`。

### Implementation and production evidence

- `ResumeEditor` 将教育、工作和项目经历的描述 bullet 从单行输入改为默认 4 行、最小高度 7rem、允许纵向调整的 textarea；技能短项继续保留单行输入。三类经历的开始/结束时间标签均标明可选。
- `resumePdf` 过滤整条空的教育、工作和项目经历，未填写的时间和字段不渲染占位词。中文区块只有检测到非空且明确归类为兴趣/爱好的技能组时才显示“技能/兴趣”，否则显示“技能”。
- 正式 `https://www.starjob.space/resume` 返回 200；其生产客户端资源检出一次新的长描述提示，并检出 3 组“开始时间（可选）”和“结束时间（可选）”，证明正式域名已提供本次构建。

### Verification and boundary

- `npx tsc --noEmit`、lint、40-route build、Smoke、diff check 与 `npm audit --omit=dev --audit-level=high` 均通过，生产依赖高危审计为 0 vulnerabilities。
- 代码提交、main 推送、Vercel 成功状态和正式域名资源已分别核验。本轮没有 migration 文件、hosted DDL、Vercel 环境变量变化或 Supabase 数据写入；没有修改或发布小程序。
- 由于没有真实登录账号，本轮未在正式环境人工完成简历编辑、保存、预览和 PDF 导出全流程。工作区其他在途小程序/登录改动以及用户排除的未跟踪文件均未纳入提交。

## 2026-07-23 Production Audit — Extension Download Link Update

> 当前 Git / production 基线为 `main` / `origin/main` / `104aa05766585d511a66190a7cb34c7ae75be96d`；Vercel deployment `dpl_4XGUsyKGa63PLNKNpuYJY1hJimkt` / `https://job-bottle-nezz4xjph-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and production evidence

- `ExtensionHubClient` 与 `ExtensionGuide` 的下载地址统一更新为 `https://pan.baidu.com/s/1q9gVenToSLL5x5tXZzYLig?pwd=SXZS`；Smoke 同时要求新地址存在、上一地址 `13sk2UUdep9S1zoJdEk_sSA` 不得回归。
- 正式 `/extension` 与 `/extension/guide` 均返回 200；生产 HTML 各检出新地址一次、旧地址零次。新百度链接上线前已确认返回 200 并跳转到对应分享提取页。

### Verification and boundary

- `npx tsc --noEmit`、lint、40-route build、Smoke、diff check 和 `npm audit --omit=dev --audit-level=high` 均通过。两个 `.next/types` 数字后缀生成副本按约束精确删除后，TypeScript 重跑通过。
- 代码提交、main 推送、Vercel READY 与正式域名页面结果已分别核验。没有修改扩展 ZIP、0.1.7 兼容协议、migration、hosted DDL、环境变量或 Supabase 数据；真实企业 ATS E2E 仍未执行。用户排除的未跟踪文件未修改或提交。

## 2026-07-23 Production Audit — 0.1.9 Project Description Follow-up

> 当前 Git / production 基线为 `main` / `origin/main` / `8c5ba4e3af6dee705bd1690e0ca9c76e1530374c`，下载链接提交为 `afcdc62`；Vercel deployment `dpl_2bfLbdFXAvFp15RZss4URALeTmjq` / `https://job-bottle-e80irarow-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and package evidence

- `project.description` 别名补充项目职责、项目成果、项目业绩、项目详情、项目介绍、主要内容、个人贡献、职责描述、通用描述及英文 responsibility / duties / achievements / contribution / description。
- `detectSectionFromText` 新增项目经历、项目描述、项目内容和 `projectexperience` 等项目区线索；通用描述仍由 `sectionHint` 硬边界约束，不会在未确认项目区时直接填写。
- `/extension` 与 `/extension/guide` 使用新百度地址 `https://pan.baidu.com/s/13sk2UUdep9S1zoJdEk_sSA?pwd=SXZS`，生产 HTML 未残留上一地址。生产 ZIP 为 118,766 bytes，SHA-256 `8caa29d511e89ef7fab78cc5f8467882c2fbf902082ae1569821444b32b8109e`；下载后直接读取包内 `fill.js` 已检出上述规则。

### Verification, deployment and boundary

- 扩展语法、正式/开发包构建、ZIP 完整性、tsc、lint、40-route build、Smoke、diff check、production dependency audit 全通过。生产两个助手页面与 ZIP 均为 200。
- 直接压缩上传多次受间歇性网络影响，Git-source deployment `dpl_BmxDrVq6rGqmBHtTKhK78LA2cPN3` 又因 Vercel GitHub 授权无法拉取而 Error，均未替换现网；最终普通 source deployment `dpl_2bfLbdFXAvFp15RZss4URALeTmjq` 构建成功并 READY。
- 浏览器临时夹具被浏览器 URL 安全策略拒绝，未通过其他浏览器或间接方式绕过。因此源码、Smoke、构建包和生产资源已验证，但真实企业 ATS 上的项目描述填写仍未端到端验收。
- 本轮没有 migration、hosted DDL、Vercel 环境变量修改或 Supabase 写入。用户排除的未跟踪文件未修改或提交。

## 2026-07-23 Production Audit — Extension 0.1.9 Description Matching

> 当前 Git / production 基线为 `main` / `origin/main` / `4f79d82bf2f1b89e14c9a78d268c8e48101d212d`；Vercel deployment `dpl_7XxZsN7AotZuww8VE9V6YDw2uYtJ` / `https://job-bottle-nn2tp1abt-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and compatibility evidence

- `manifest.json` 为 0.1.9。工作/实习描述别名覆盖通用描述、职责、内容、业绩、成果及英文责任/职责表达；通用“描述”必须与已识别的经历区段一致，避免污染其他表单区。
- 重复经历先使用页面明确记录序号，再使用最近的经历容器，最后使用同一别名族出现顺序；不同文案会规范到相同可重复字段键。合并模式不覆盖用户已有内容，覆盖模式仍需用户主动选择；敏感字段排除规则未放宽。
- 受控浏览器夹具实测三段“描述”、三段“职责描述”和工作内容 1/2/3 均按序填入；另验证合并保留、覆盖替换、区外“描述”不填和身份证不填。该证据验证识别与分配算法，不冒充真实企业 ATS 验收。
- 网站仍接受 0.1.7 的 READY / PONG / SYNC_RESUMES / SYNC_COMPLETE 协议，无版本拒绝分支。0.1.7 可继续使用旧能力；页面只建议需要描述识别修复的用户升级 0.1.9。

### Package, deployment and remaining boundary

- 新下载地址为 `https://pan.baidu.com/s/1jl_OHVc_HxXbUrI1-IS56g?pwd=SXZS`。生产 `/downloads/starjob-resume-assistant-v0.1.9.zip` 返回 200 / 118,110 bytes，SHA-256 为 `6ce6cab2c1c9ced80c61b77a5cec2374df6d9fbc530dbd1d3f71d7d29d25876f`；包内版本和 ZIP 完整性已核验。
- 扩展语法、正式/开发包构建、tsc、lint、40-route build、Smoke、diff check 全通过；Next.js 16.2.11、DOMPurify 3.4.12、Sharp 0.35.3 下 production dependency audit 为 0 vulnerabilities。
- 正式 `/`、`/extension`、`/extension/guide` 均为 200，生产 HTML 检出 0.1.9、新百度链接和 0.1.7 兼容说明。代码提交、Vercel READY、正式域名和线上 ZIP 已分别核验。
- 本轮没有 migration 文件、hosted DDL、Vercel 环境变量变化或 Supabase 写入。尚无真实登录账号配合真实安装的 0.1.9 在企业网申页完成同步—填写—人工提交 E2E，也未用真实安装的 0.1.7 / 0.1.8 做浏览器回归。用户排除的未跟踪文件未修改或提交。

## 2026-07-23 Production Audit — Extension 0.1.8 and Legacy Compatibility

> 当前 Git / production 基线为 `main` / `origin/main` / `2c7948b`，主体功能提交为 `d5e7d92`；Vercel deployment `dpl_BVsLVS3qwArWXPJJtTYm3gMDH3M5` / `https://job-bottle-qj06utx47-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and compatibility evidence

- `manifest.json` 为 0.1.8；弹窗保持 380px，视觉改为单一暖白工作面、开放式结果区和编号进度清单。覆盖模式与本地数据清除均需二次确认，待人工字段可展开，智能复核上限为 12。
- 网站和 0.1.7 的通信通道、来源校验及 READY / PONG / SYNC_RESUMES / SYNC_COMPLETE 消息未改变。页面接收 0.1.7 后继续进入可同步状态，不存在版本号拒绝分支；Smoke 明确禁止“请升级到 0.1.8”和版本不等即阻止的逻辑。
- `/extension` 与 `/extension/guide` 使用新百度网盘地址 `https://pan.baidu.com/s/1z815NaU8NRArpswkEAiU3w?pwd=SXZS`，且同时说明 0.1.7 无需重复安装。新链接的 HTTP 跳转已在上线前核验。

### Verification, deployment and remaining boundary

- `npm run build:extension`、`npx tsc --noEmit`、lint、40-route build、Smoke、diff check 全通过。Smoke 只读 273 条开放岗位；`.next/dev/types` 的三个数字后缀重复缓存按约束精确删除后重跑通过。
- 正式 `/`、`/extension`、`/extension/guide` 均返回 200；生产 HTML 检出新网盘链接及两处 0.1.7 兼容提示。`/downloads/starjob-resume-assistant-v0.1.8.zip` 返回 200 / application/zip / 116,782 bytes，SHA-256 为 `81d6fa44f7acdaf874f066ec19feb397a0da6492def6a9150638fbcbcc09024a`。
- 代码提交存在、Vercel deployment READY 与正式域名验证已分别确认；本轮没有 migration 文件、hosted DDL、环境变量或 Supabase 写入。
- 尚无真实安装的 0.1.7 / 0.1.8 扩展与登录用户浏览器验收，未在真实企业网申页完成同步、填写和提交；协议兼容有源码与 Smoke 证据，但不能替代该人工端到端边界。用户排除的未跟踪文件未修改或提交。

## 2026-07-22 Production Audit — Recent Job Metric and Resume AI Allowance

> 当前 Git / production 基线为 `main` / `origin/main` / `9adbbb0`，岗位统计功能提交为 `62799ed`；Vercel deployment `dpl_5pGfqLqmifLb2XbpjpXCsjcjopn2` / `https://job-bottle-chz1lubvk-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and database evidence

- `HomeClient` 从与现有“近 7 天新上”快捷范围相同的 `recentJobs` 集合计算第四项事实数字，最终标签为“近 7 天新发现”。口径使用开放岗位 `created_at` 的滚动七天窗口；统计不硬编码，桌面 `sm:grid-cols-4`、窄屏 `grid-cols-2`。
- 导入、润色和翻译三个 route 继续调用同一个 server-side `take_resume_ai_rate_slot()` RPC。新 migration 只 `create or replace` 此函数，把拒绝阈值从 6 调为 15，保留按 `auth.uid()` 隔离、10 分钟窗口、事务 advisory lock、authenticated-only execute 和底层 rate event 表权限。
- `20260722120000_raise_resume_ai_rate_limit.sql` 不只是代码文件：linked production 已执行 `supabase db push`，远端 migration list 同时显示 local / remote `20260722120000`。此前 hosted schema 已存在但 migration history 缺失，旧 17 个 migration 只通过 repair 标记 applied；dry-run 随后确认只会推送本次新 migration，旧 DDL 没有重跑。

### Verification and remaining boundary

- `npx tsc --noEmit`、lint、40-route build、Smoke、diff check 全通过。首次及 build 后的 TypeScript 数字后缀重复缓存均仅精确删除 `.next/types` / `.next/dev/types` 生成副本。Smoke 只读 261 条开放岗位并锁定 10 分钟 / 15 次 / authenticated-only 限流契约。
- 正式 `/explore` 返回 200，生产客户端构建包含“近 7 天新发现”；匿名 `POST /api/resume/import` 返回 401。最终 deployment READY。
- 没有环境变量变化、没有 Supabase 用户业务数据写入。迁移文件存在、hosted DDL executed、Vercel deployed 与 production route verified 已分别核验，没有混写。
- 无真实登录账号，因此未付费连续调用 AI 15 次，不能声明第 15 次必然成功、第 16 次必然 429，也未完成真实完整简历导入后逐区块润色的浏览器 E2E。用户排除的 `.codex-artifacts/` 与五份 PRD 未修改或提交。

## 2026-07-20 Production Audit — Application Drawer Scrolling

> 当前 Git / production 基线为 `main` / `origin/main` / `077a451`；Vercel deployment `dpl_HUbnLdDvrmUiqnjvGZP3yrX7SWYW` / `https://job-bottle-g9wcmvg7m-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and verification evidence

- `Drawer.tsx` 的 motion aside 只负责固定视口边界与进出场动画，使用 flex column 和 overflow hidden；新增 `data-drawer-scroll` 内层承担纵向滚动，具有 `min-h-0`、`flex-1`、`overflow-y-auto`、`touch-pan-y`、`overscroll-contain` 与 WebKit momentum scrolling。
- 桌面侧滑层明确为 `calc(100svh - 2rem)`，移动 sheet 保持 `max-h: 88svh`。标题/关闭按钮与滚动内容分离，避免表单内容被动画容器裁切。ProgressDrawer 的字段状态、保存、备注自动保存、删除和焦点圈定均未改变。
- `npx tsc --noEmit`、lint、40-route build、Smoke、diff check 全部通过；首次 tsc 只删除 4 个允许的数字后缀 `.next` 类型缓存。Smoke 对独立滚动区和触控规则建立源码回归约束。
- 提交 `077a451` 已推送 main。生产 `/`、`/bottle`、`/my` 均 200，`/bottle` 与 `/my` 加载的客户端代码含新滚动标记和规则；deployment 为 READY。
- 没有 migration、hosted DDL、环境变量或 Supabase 数据写入。无真实登录浏览器态，未完成生产真实长表单的滚轮、触控板和移动端手势滑到底验收；该边界必须保留。排除的用户未跟踪内容未修改或提交。

## 2026-07-19 Production Audit — Search Indexing and Signup Privacy

> 当前 Git / production 基线为 `main` / `origin/main` / `862f4b4`；Vercel deployment `dpl_8A4FMMZx6YtrQ64HswTEeRp7Fy6M` / `https://job-bottle-68s71ri1y-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and search-safety evidence

- Next metadata routes 生成 `/robots.txt` 与 `/sitemap.xml`；robots 只阻止 API 并声明正式 sitemap，私密 HTML 页面由可抓取的 `noindex, nofollow` 控制。sitemap 使用匿名只读 Supabase client 汇总 `is_active` 且未超过有效截止时间的岗位。
- 岗位详情 metadata 含正式 canonical、描述和分享信息；`buildJobPosting` 只为仍有效的单岗位页面输出 JSON-LD，包含 title、description、identifier、datePosted、可用的 validThrough、hiringOrganization、地点与详情 URL。过期岗位无结构化数据并 noindex，列表页无批量 JobPosting。
- 公开核心页 canonical 已覆盖首页、探索、指南中心、求职指南、插件介绍和插件教程。后台、登录、个人资料、投递、简历、星瓶与反馈页明确 noindex。
- 注册和个人中心隐私提示已去除用户本人学校、专业和城市示例；求职方向扩展且保留原值兼容。7 篇指南仅作为审核草稿提交，没有公开路由或 sitemap 条目。

### Verification, deployment and remaining boundary

- `npx tsc --noEmit`、lint、40-route build、Smoke、diff check 与 high-level production dependency audit 全部通过。首次 tsc 只删除 4 个允许的数字后缀 `.next` 类型缓存。Smoke 只读 250 条岗位并实际请求 robots、sitemap、登录页和抽样岗位页。
- Git 提交 `862f4b4` 已推送 `main`。第一次 Vercel deployment `dpl_4ThqEXEZD26jm8pnaimhVzRKWoJv` 因 Production 缺少 Supabase public 环境变量构建失败，状态 ERROR，未替换生产。恢复 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`MIMO_API_KEY`、`MIMO_BASE_URL`、`MIMO_MODEL` 后，第二次 deployment `dpl_8A4FMMZx6YtrQ64HswTEeRp7Fy6M` READY；变量值未写入日志或文档。
- 正式域名 `/`、`/robots.txt`、`/sitemap.xml`、`/login`、`/admin/users`、`/forum` 均 200。生产 sitemap 含 250 个岗位、无后台 URL；抽样岗位 200 且含 canonical / JobPosting；登录与后台 HTML 含 noindex。
- 本轮没有 migration、hosted DDL 或 Supabase 写入。Google Search Console 仅确认 Chrome 登录态可进入新增站点欢迎页，尚未添加域名、完成 DNS 验证或提交 sitemap；百度尚未完成账号/站点验证。指南未发布，搜索引擎是否收录和带来流量需要上线后的长期观测，不能写成已改善排名。用户未跟踪排除项未触碰。

## 2026-07-19 Production Audit — Admin Email Confirmation

> 当前 Git / production 基线为 `main` / `origin/main` / `3ada808`；Vercel deployment `dpl_J4e7xBPJgdmEuKfQcsKzGMb9c73r` / `https://job-bottle-i88tfvucj-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and safety evidence

- 管理员用户页只在 `emailConfirmedAt` 为空时渲染“设为已确认”。操作采用二次点击确认，明确提示绕过验证邮件；成功后更新行状态，在 `unconfirmed` 筛选中同步移除该行并调整结果数和分页。
- API 通过 `action = confirm_email` 与既有角色/停用 PATCH 分离，避免确认邮箱时意外保存未提交的显示名或角色草稿。route 先执行 `requireAdmin()`，再由 server-only admin client 调用 Supabase Auth `email_confirm: true`；匿名请求 401，客户端无 service-role key。
- 操作不修改 profile、role、ban、投递、简历或其他用户数据。若 Auth 用户已经确认则直接返回当前摘要；若仍被停用，界面不会把邮箱确认误报为恢复登录。

### Verification and remaining boundary

- `npx tsc --noEmit`、`npm run lint`、`npm run build`（38 routes）、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high` 全通过；Smoke 只读 248 条 hosted 开放岗位并锁定 `email_confirm: true`、按钮文案和权限边界。
- 本地 production 匿名 PATCH 探针返回 401。提交 `3ada8081663363e32e6c373482729701e205dbf4` 已推送；Vercel inspect 确认 deployment READY。
- 正式 `/`、`/admin/users`、`/forum` 均 200；生产 chunks 检出 `confirm_email`、“设为已确认”“确认邮箱”“邮箱状态已正常”；正式域名匿名 PATCH 返回 401。
- 无 migration 文件、hosted DDL、环境变量变化或真实生产用户状态写入。由于没有真实管理员浏览器登录态，没有把登录后按钮视觉和实际确认某个未验证账号写成端到端通过。排除的 `.codex-artifacts/` 与五份 PRD 未修改或提交。

## 2026-07-18 Production Audit — Login Announcement Delivery and Admin User Operations

> 当前 Git / production 基线为 `main` / `origin/main` / `69e8ff9`；Vercel deployment `dpl_Bd66Y3725uHvkCqiiSjorRHEAR89` / `https://job-bottle-94y0b1ddx-raywang6688-7050s-projects.vercel.app` 已核验 READY。

### Implementation and safety evidence

- 公告没有复制一套后台：`GET /api/announcements/latest` 只从 `forum_posts` 读取 `category = 公告` 候选，再用 server-only profiles 查询确认作者 role 为 admin。route 先 `auth.getUser()`，匿名 401，响应 `private, no-store`；客户端不接触 service role。账号创建晚于/等于公告、metadata 已记录同 ID、没有管理员公告时均返回 null。
- `WelcomeNotice` 将 guest welcome、首次用户 welcome、登录公告统一在同一个 dialog 状态机中；首次欢迎优先，避免叠层。公告正文使用 React 文本节点和 `whitespace-pre-wrap`，无 `dangerouslySetInnerHTML`。关闭先写 user-scoped localStorage，再更新 Auth metadata；远端失败时本机仍不会重复打扰。`SIGNED_IN` 会重新检查，`SIGNED_OUT` 清空当前公告状态。
- 管理员用户 GET 先分页读取全部 Auth 用户，再读取最小 profile 字段，计算 `last_sign_in_at` 的 24h / 3 日指标并执行全局查询、角色/状态/活跃筛选和排序，最后才分页。应用/简历计数只针对当前页 ID，并以稳定 `id` 顺序按 1000 行分页，避免旧实现当前页搜索与单次 PostgREST 行数上限造成漏人/少算。
- 管理页面以开放事实带而非卡片墙展示四个核心值，事实项可直接筛选；筛选栏组合搜索、活跃、身份、状态、排序，分页 25/50/100。异步筛选期间旧列表降透明但行内输入和权限动作被禁用，避免刷新响应覆盖账户修改；PATCH 仍禁止当前管理员停用或降级自己，失败会保留原设置。

### Verification and remaining boundary

- server-only hosted 只读探针实际遍历 Auth：135 total / 9 active24h / 19 active3d / 109 never / 0 disabled；找到最新 admin 公告，时间 `2026-07-16T11:58:30.597876+00:00`。探针未输出用户邮箱、ID、姓名或 metadata，且没有写入。以上数字为 2026-07-18 动态快照。
- `npx tsc --noEmit`、`npm run lint`、`npm run build`（38 routes）、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high` 全通过。Smoke 只读 242 条 hosted 岗位并通过匿名权限探针；新增接口、指标、筛选和一次性已读契约通过。构建生成的数字后缀 `.next/types` 重复缓存按既有规则精确清理后 tsc 重跑通过。
- 本地 production 浏览器在 1440×900 验证 admin 匿名保护页，页面 `scrollWidth = innerWidth = 1440`；390px 首页 `scrollWidth = innerWidth = 390`。没有真实管理员/老用户 session，因此未把登录后全量用户页视觉、公告弹层实际出现、关闭后的 metadata 远端写回声明为端到端通过；这些仍是明确验收边界。
- 生产 `/`、`/admin/users`、`/forum` 均 200；线上 chunks 检出“最近 24h 活跃”“最近 3 日活跃”、公告 API 和指南入口。匿名 `/api/announcements/latest` 与 `/api/admin/users?...activity=24h` 均返回预期 401。扩展 ZIP 为 200 / application/zip / 111,586 bytes / SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。
- 无 migration、hosted DDL、环境变量变更或本轮数据写入；功能运行时只有用户主动确认公告会更新其自己的 Auth metadata。排除文件未修改或提交。

## 2026-07-16 Production Audit — UX Reliability and Hidden Bug Remediation

> 当前 Git 基线为 `main` / `origin/main` / `8d143d1`。生产 deployment `dpl_AnAnXbUMPpgxkqfRaEd3cUboGytt` 为 READY。

### Risk and implementation evidence

- 用户截图中的中心十字来自 `drawApplicationStar` 在五角星 fill / stroke 后额外执行的两条 `moveTo / lineTo` spark stroke，并非背景图或瓶身 PNG。该绘制块及九个不再使用的 palette `spark` 值已删除；Smoke 明确禁止中心十字坐标与 `palette.spark` 回归。分享海报的 `drawShareStar` 原本只有五角星 fill / stroke，没有同步修改需要。
- 首次收录原来写入 `evaluating` 后立即 return，用户必须再执行“保留候选”和“开始准备”才能打开官网。现岗位清单与详情页都以 `preparing` 首次 upsert，并在成功后直接导航官网、arm 返回确认。窗口在点击事件同步预开，避免 Supabase await 后触发 popup blocker；无效链接在写入前停止，保存失败会关闭未导航窗口。Smoke 禁止旧“先评估岗位”路径回归，并锁定两个入口的 `preparing`、官网导航和确认条契约。
- `resumePdf.ts` 的左对齐页眉此前按文字结束位置 `y + 4` 画线，现代单栏的短页眉会让横线早于 58×72pt 照片底部。现显式计算 `photoBottom = photoY + photoHeight` 与 `headerContentBottom = Math.max(y, photoBottom)`，横线和后续 `state.y` 都从该边界继续。Smoke 锁定此坐标契约；`academic` 仍保留在模板类型、模板列表、样式、PDF options、同步兼容和数据库约束中。
- `ProgressDrawer` 原 effect 依赖完整 application 对象，父级保存响应可在抽屉仍打开时重置局部表单；现只按 `applicationId + open` 初始化，并在 saving 时阻止状态、备注和终态并发提交。`applications.ts` 的 select / insert / update / history / delete 全部经 12 秒 AbortSignal 包装。
- `HomeClient` 与 `MyApplicationsClient` 使用递增 request ID，只有最新请求可落状态。简历 builder 的删除流程等待既有 cloud worker，先删云端再删本地，失败不丢本地；deleted ID tombstone 阻止 worker 复活已删记录，`deleteMyResume` 也复用 retry。
- 导入、润色、翻译客户端均把外部 AbortSignal 传入请求。导入弹窗提供取消、关闭、直接导入程序结果和 43 秒截止，等待期间给出分阶段反馈；任何失败路径不清除 `localResult`。来源简历和原段落不会被 AI 请求覆盖。
- `BottleStage` 缓存 canvas metrics，逐帧 draw 不再调用 resize 或重置 canvas；`SpaceBackground` 与 `FloatingPlanet` 移除需要昂贵重绘的 filter 动画。岗位列表按用户反馈恢复为直接 `filteredJobs.map`，不再存在 `visibleJobCount`、`displayedJobs`、分页按钮或 IntersectionObserver sentinel。
- `isRecentlyListedJob` 只读取 `job.created_at`，使用滚动 7×24 小时窗口并拒绝无效 / 未来异常时间。`jobMatchesProfilePreferences` 对已填写的地区与岗位维度分别求 any-match、维度之间求 AND；全国 / 全球岗位通过地区偏好。`HomeClient` 先应用快捷范围，再与关键词、行业、批次、地点、类别和投递视图取交集，地图与清单共用结果。

### Verification and remaining boundary

- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 均通过。tsc 只出现 `.next/dev/types` 与 `.next/types` 的数字后缀重复缓存；构建后曾重新生成 `cache-life.d 2.ts`、`routes.d 2.ts`、`validator 2.ts`，均严格只删除生成缓存后重跑通过。Build 完成 38 条路由；最终 Smoke 读取 hosted 231 条岗位、匿名提权 / logo 上传 / 跨用户投递读取均被拒绝。
- 本地 production 浏览器：1440×900 与 390×844 的岗位页面无横向溢出。hosted 数据测试期间由 225 增至 231；默认清单 DOM 一次显示全部 231 行。快捷下拉显示“近 7 天新上 · 50”，切换后清单为 50 行；未登录时“近 7 天 · 符合偏好”禁用，且提供登录 / 填写求职偏好的说明。数量为 2026-07-16 动态快照，不是代码常量。
- Git / deployment：当前提交 `d878c59` 已推送到 `main` / `origin/main`。Vercel production URL `https://job-bottle-kqbgs6102-raywang6688-7050s-projects.vercel.app`，deployment `dpl_2J7FnUF37kTnt4bboy2R2pgW77TU` 为 READY。正式域名 `/explore` 与 `/resume` 返回 200；`/explore` chunk 明确包含直接打开官网成功文案、无效链接防护与 `preparing`。本次 tsc、lint、38-route build、smoke、diff check 全通过。
- 没有真实登录凭据，因此未验证 hosted 投递编辑、云端简历删除 / worker 竞态和真实 MiMo 请求取消。没有 migration、hosted DDL、环境变量或 Supabase 写入。排除的 `.codex-artifacts/` 与五份 PRD 未修改。

## 2026-07-15 Production Audit — User-Controlled Resume Import and Timeout Mitigation

> 当前 `main` / `origin/main` 为 `fd73dcd`；production deployment `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL` 已独立 inspect 为 Ready。

- UI 证据：`ResumeImportDialog` 在 `localResult` 存在时始终渲染“直接导入解析结果”和“交给 AI 复核”；`review` 存在时再渲染“导入 AI 复核结果”。错误只更新 error state，不清除 localResult；AI 请求 finally 回到 idle，失败后可直接导入。
- 数据证据：Builder 用 `ResumeImportMode` 标记 program / ai，二者都调用同一个 `createResumeFromImport` 生成新简历，不覆盖现有简历；埋点新增 `review_mode`，其余只保留 ID、语言与区块数量。
- 性能证据：route 使用 `REQUEST_TIMEOUT_MS = 38_000`、`maxDuration = 45`；prompt 由完整 localDraft 改为 `buildLocalReviewHints`，work / project / custom bullets 只发送 count，skills 只发送 count。安全日志加入 elapsed 与结构数量，未加入正文或联系方式。
- 验证证据：tsc、lint、build、smoke、diff check 全通过；首次 tsc 仅命中并删除允许的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。本地 production `/resume` 200、未登录 API 401、客户端 chunks 含新文案。
- Git / deployment：5 个任务文件提交 `fd73dcdc3c2d349f4df30a8ce2213fa87ed4138c`，已推送。Vercel `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL` / `https://job-bottle-b3i6vmypq-raywang6688-7050s-projects.vercel.app` 为 Ready；正式域名 `/resume` 200，chunks 检出直接导入、AI 结果导入、失败保留结果和 `review_mode`。未登录导入 API 401；ZIP 为 111,586 bytes 且 SHA-256 一致。
- 边界：无真实登录态，未在生产用真实文件完成 program / AI success / AI timeout 三条路径，也未验证生成 A4。没有 migration、hosted DDL 或 Supabase 写入；排除项未触碰。

## 2026-07-15 Diagnostic Audit — Resume Import Timeout

> 只读代码、Vercel 元数据与不含用户信息的 MiMo 合成探针；没有代码或生产状态变化。

- 代码证据：`REQUEST_TIMEOUT_MS = 22_000`，最大原文 24,000 字，完整 `localDraft` 与原文一起进入 prompt；上游为 `stream: false`、`max_tokens: 4_500`、JSON response format。AbortError 唯一映射到用户报告的 504 文案。
- 探针证据：低复杂度请求的 1,356 / 7,910 / 22,000 字分别为 6,501 / 6,786 / 5,064 ms、HTTP 200；复杂探针包含 8 work、8 projects、各 6 bullets，sourceText 4,348 字、user message 12,313 字，35,009 ms 后 AbortError。探针未包含用户姓名、联系方式或真实简历内容。
- 部署证据：最终 production deployment 的 Lambda 为 `iad1`，本地配置只读确认 MiMo host 是中国区；跨区网络是合理的额外波动来源。Vercel `logs --environment production --since 7d` 没有返回可用请求行，故没有生产分位延迟或真实失败比例证据。
- 可观测性缺口：当前 `logServerError` 仅记录 code / name / status，不含 elapsedMs、inputChars、work/project/bullet counts、deployment / request ID。不能从现有日志区分模型排队、跨区网络或生成阶段耗时。
- 审计结论：直接根因是复杂整份结构化重建超过 22 秒硬截止；重复发送原文与完整草稿、完整非流式输出、跨区链路共同放大问题。此次未修改代码、Git、Vercel、migration、hosted DDL 或 Supabase 数据。

## 2026-07-15 Production Audit — Bilingual Resume Creation and Independent AI Translation

> 本节实现已提交、推送并部署。功能提交为 `f212d51`，当前 `main` / `origin/main` 为更新日志提交 `dc71b9c`；最终 production deployment 为 `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM`，状态 READY。

### Implementation and safety evidence

- `resume.ts` 用现有 8 个 template ID 派生 `zh-CN` / `en-US`，并提供同语言默认模板、过滤列表与目标语言等价模板。`ResumeCreateDialog` 必须先选语言；`ResumeTemplatePicker` 只渲染对应语言模板。
- `resume-import.ts` 先按 CJK / Latin 叙述字符确定语言，导入 API 的 Zod schema 与 JSON prompt 均强制返回语言；`createResumeFromImport` 会拒绝跨语言模板并选择同语言默认模板。
- `resume-translation.ts` 构造 AI 载荷时剥离所有 ID、phone、email、LinkedIn、GitHub、website 和 photo；译本转换在客户端创建新简历 / 新段落 ID，精确联系方式与照片只在本地回填，`linkedJobId` 固定为 null。
- `/api/resume/translate` 先 `auth.getUser()`，不使用 service role；请求正文受 80 KB 限制并复用 `take_resume_ai_rate_slot`。严格 schema 与 `hasMatchingStructure` 要求各区块、技能和 bullet 数量一致；确定性逻辑覆盖回日期、GPA 与 current。Prompt 禁止增删、重排、润色或夸大。
- Builder 对空白简历执行本地 guard；失败、超时、401 或结构不一致只更新提示，不修改来源简历。成功时新增独立副本并切换选择。

### Verification and remaining boundary

- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；首次 TypeScript 仅出现 `.next/types/cache-life.d 2.ts`、`routes.d 2.ts`、`validator 2.ts`，按约束只删除这些重复缓存后重跑通过。
- Production build 列出 `ƒ /api/resume/translate`。本地与正式域名未登录 POST 均返回 401 / “请先登录，再使用 AI 翻译”。Smoke 的运行探针确认中文 / 英文识别、6 / 2 模板隔离、敏感联系字段不进入翻译载荷、译本 ID 与模板切换、解除岗位绑定以及本地精确字段保留。
- 浏览器证据：桌面新建弹窗中文显示 6 套模板，切换 English Resume 后只显示 `English Classic` / `English Modern`；390×844 下 `scrollWidth=clientWidth=390`，弹窗宽 390px、无横向溢出，底部主要按钮 44px。
- 生产 `/resume` HTTP 200；抓取其初始脚本及客户端 chunks 后确认存在 `English Resume`、`AI 转英文`、`AI 转中文`、`English templates` 和“使用此模板创建”。生产浏览器自动化连接超时，未完成线上点击截图，故交互视觉仍以本地证据为准。
- `f212d51d518105196837cb791639149dbafbfc77` 包含 11 个功能 / Smoke / 更新日志文件；`dc71b9c41ff89a2183e5ad1b276a312a98c2d99c` 更新上线记录，二者均已推送。最终部署 `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM` / `https://job-bottle-9rxffgsyi-raywang6688-7050s-projects.vercel.app` 经 CLI inspect 为 Ready。生产 0.1.7 ZIP 仍为 111,586 bytes，SHA-256 与本地一致。
- 没有可用登录态，未调用真实 MiMo 翻译，未人工对照专有名词、长简历 token 边界或译本 A4 最终视觉。没有 migration、hosted DDL 或 Supabase 写入；未跟踪排除项未触碰。

## 2026-07-15 Production Audit — Resume File Import

> 本节审计已提交、推送和部署的已有简历导入。生产为 `3acc952` / `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`，状态 READY。

### Pipeline and safety evidence

- `resume-file-reader.ts` 只使用浏览器 `File` / ArrayBuffer、本地 `pdfjs-dist` 和 `mammoth`；源码无 `fetch`、`FormData` 或 data URL 上传。支持 PDF / DOCX / TXT、8 MB 上限，PDF 最多 12 页并使用 `hasEOL` 保留行结构；扫描件文字不足时停止，不把空内容送给 AI。
- `resume-import.ts` 先执行本地正则和章节解析。教育、工作、项目、校园、奖项、证书、语言分别存放；只有 `createResumeFromImport` 在用户确认后生成平台 UUID 与段落 ID。
- `/api/resume/import` 在解析正文前使用 `auth.getUser()`；不使用 admin / service-role client。请求 schema 只允许 `fileName`、`sourceText`、`localDraft`，文本最大 24,000 字符；复用 hosted `take_resume_ai_rate_slot`。MiMo 使用严格 JSON，结果数组数量、字段长度和布尔值均由 Zod 限制。
- Prompt 禁止虚构或润色，要求无法确认字段为空、跨区块映射禁止。服务端将确定性识别的姓名、电话、邮箱、LinkedIn、GitHub、网站覆盖回 AI 结果，避免 AI 改写精确联系方式。服务端错误日志只输出 code / name / status，不输出简历正文。
- `ResumeImportDialog` 明示原文件不上传和不会自动生成；所有面向用户的模型表述统一为“AI 复核”，流程只有“选文件 → 程序读取结果 → AI 复核 → 生成拾星简历”。合法 AI 草稿之前不显示生成按钮；生成后新增独立简历，现有版本不被覆盖。

### Verification and remaining boundary

- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过。首次 TypeScript 只命中 `.next/types` / `.next/dev/types` 数字后缀重复缓存，严格只删除 ` 2.ts` / ` 3.ts` 后通过。
- Smoke 新增六项源码约束和运行探针；合成文本正确识别王小星、邮箱、手机号、产品经理意向、一段教育 / 工作 / 项目，并成功生成带 ID 的拾星结构。Production build 含 `/api/resume/import` 与本地 PDF worker；未登录 POST 返回 401。
- 提交为 `3acc95279032a7325299e3ae4b171046cdf68f64`，本地 / 远端一致；部署 `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`、URL `https://job-bottle-2b18mde3w-raywang6688-7050s-projects.vercel.app`，`vercel inspect` 为 Ready。专属 URL 匿名访问受 Vercel SSO 保护，正式域名公开正常。
- 生产 `/resume` HTTP 200，相关客户端 chunk 含“导入简历”“AI 复核”“生成拾星简历”；未登录 API 为 401。未配置 smoke 登录账号，因此没有验证真实 PDF / DOCX 文件选择、真实登录态 MiMo 上游结果、字段级人工对照或最终 A4 视觉。以上保留为待验收项。没有 migration、hosted DDL 或 Supabase 数据写入，用户未跟踪文件未触碰。

## 2026-07-15 Production Audit — Flat Profile Layout and Feedback Route

> 本节审计已提交、推送和部署的 `/profile` 重排与 `/feedback` 一级入口。当前线上为 `3acc952` / `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`。

### Implementation evidence

- `ProfileClient.tsx` 不再包含“个人中心分区”侧栏、`profile-assets`、个人中心对 `star-bottle-image2.png` 的引用或 `BottleFact`。所有功能内容由统一 `ProfileSection` 组织，外层只使用分隔线、留白和响应式网格。
- 模块 DOM 顺序为基本资料、求职偏好、简历与匹配、投递进展、账号。基本资料最多三列；偏好两列；简历与岗位两列；所有结构在小视口退回单列，不依赖固定宽度容器。个人中心源码不再含 `FEEDBACK_TYPES`、反馈文本框或 mailto。
- 新增 `src/app/feedback/page.tsx` 与 `FeedbackClient.tsx`。副标题锁定为“告诉我们您的建议与反馈，这对我们非常重要”；反馈仍以 mailto 交由用户邮件应用确认发送，支持五类问题；页面明确不自动发送简历正文、投递记录或其他个人资料。桌面导航新增 `/feedback`；移动顶部新增反馈入口但 `mobileNavItems` 与 `grid-cols-6` 保持不变。
- 旧重复的“保存偏好”按钮被移除，统一保存动作位于页头；大星瓶装饰被移除，投递信息改为文字说明、三个数值和三个直接入口。业务读取、资料保存、退出、简历 / 岗位 / 投递数据逻辑均未改变。

### Verification and boundary

- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过。首轮 TypeScript 仅命中 `.next/dev/types/cache-life.d 2.ts`、`routes.d 2.ts`、`validator 2.ts`，严格只删除这些缓存后重跑通过。
- Smoke 新增源码契约并通过；本轮只读 hosted Supabase 225 条开放岗位和匿名安全探针，没有 migration、hosted DDL、Supabase 数据写入或 API 变化。
- 本地浏览器证据：1280px 下桌面八个导航入口坐标均在视口内且无 overflow；390×844 下桌面导航隐藏、移动六项底栏显示，顶部反馈与登录 / 个人中心可见，五个反馈类型按钮均为 358×44px，页面 `scrollWidth === clientWidth === 390`。生产 `/feedback` 与 `/profile` 为 HTTP 200；反馈最终副标题、问题类型、发送动作及 `/feedback` 导航均已从 HTML 确认。已登录 `/profile` 未做登录态生产视觉验收。提交 / 部署与本审计上一节一致；用户未跟踪文件未触碰。

## 2026-07-15 Production Audit — Extension Hero Visual Refresh

> 本节审计已提交、推送与部署的 `/extension` 首屏资产和文案。本地 `main` / `origin/main` 均为 `2cc9af1`；当前生产为 `dpl_4N5VRgA7depzUu2FNNbPfYSwnuKZ`，状态 `READY`。

### Asset and implementation evidence

- 两张用户原始 popup 图按共同 760px 宽度对齐并纵向拼接，没有 OCR 重排或生成式重绘。首次 imagegen 结果因把透明区烘焙为棋盘格而被审计拒绝，未接入仓库资产。
- `starjob-resume-assistant-popup.png` 为 760×1596 RGBA，SHA-256 `bc78c768524e4c047b6e0c747b9621451530fafe460831a524afc73296d9bbb9`；`starjob-resume-assistant-iphone17pm.png` 为 760×1536 RGBA，SHA-256 `6f0a29fdb695d66135d4b6bacb2e401272918176c9e29336f6f24f7a5b400deb`。后者保留 alpha 通道与银色手机框，灵动岛区域为纯黑圆角胶囊。
- `ExtensionHubClient.tsx` 以两个 block span 固定标题断行，并使用用户指定的新说明文案。Smoke 同时检查两个标题片段、新说明和正确百度链接，并禁止旧合并标题、旧说明及错误链接回归。

### Verification evidence

- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过。首轮 TypeScript 只出现 `.next/dev/types/cache-life.d 2.ts`、`routes.d 2.ts`、`validator 2.ts` 重复缓存；严格只删除这些允许项后重跑通过。
- 本地 production 渲染在 1440×1000 与 390×844 下完成截图和 DOM 几何检查。移动端 `scrollWidth=390`、`clientWidth=390`；两个标题 span 分处不同 top 坐标；手机图 `naturalWidth=760`、`naturalHeight=1536`、渲染宽度 350px。视觉检查确认灵动岛纯黑、真实 popup 全长进入手机框、无横向溢出。
- Smoke 只读 hosted Supabase 225 条开放岗位并完成匿名权限探针；没有 migration、hosted DDL、Supabase 数据写入或扩展权限变化。四个任务文件已精确提交为 `2cc9af1` 并推送，完整本地 / 远端哈希均为 `2cc9af1e6136290e68304747a7d60907eaecfe67`；用户未跟踪的 `.codex-artifacts/` 和五份 PRD 未暂存、未修改。

### Deployment and production evidence

- `npx vercel --prod --yes` 返回 Ready；deployment `dpl_4N5VRgA7depzUu2FNNbPfYSwnuKZ`，URL `https://job-bottle-2fyr1ebv7-raywang6688-7050s-projects.vercel.app`，别名 `https://job-bottle-xi.vercel.app`。`vercel inspect` 独立复核状态为 `Ready`。
- 自定义域名 `/extension` 与 `/extension/guide` 返回 HTTP 200；两页均检出正确百度分享 ID，下载页检出两个标题片段和新说明。phone PNG 为 412,971 bytes / 760×1536 / SHA-256 `6f0a29fdb695d66135d4b6bacb2e401272918176c9e29336f6f24f7a5b400deb`；popup PNG 为 318,068 bytes / 760×1596 / SHA-256 `bc78c768524e4c047b6e0c747b9621451530fafe460831a524afc73296d9bbb9`，均与本地一致。
- 生产 0.1.7 ZIP 返回 HTTP 200 / `application/zip` / 111,586 bytes，SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`；未登录 `/api/resume/extension-profile` 返回预期 401。生产移动端 DOM 为 `scrollWidth=clientWidth=390`，两个标题 span、新说明和自然尺寸 760×1536 的产品图均已加载。
- 本部署也把此前 `ee1d83e` / `e110bde` 的 popup 0.1.7 与最终百度链接正式带入生产；下方“待部署”核验是部署前历史。百度网盘链接只验证可跳转，未读取其分享内容；本轮没有 migration、hosted DDL 或 Supabase 数据写入。

## 2026-07-15 Push Verification Addendum — Popup Width Fix 0.1.7

> 本节核验已推送、待部署的修复。仓库 `main` / `origin/main` 已为 `e110bde`；popup 修复提交为 `ee1d83e`。最近已确认的应用生产部署仍为此前 `aa6ddc8` 对应的 `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`。本轮没有执行 Vercel 部署，生产页面仍是 0.1.6 和此前下载链接。

### Root cause and implementation evidence

- 截图中的 popup 只剩约 50px 竖条，不是 popup 内容或脚本未加载，而是扩展窗口固有宽度计算失败。`body { width: min(380px, 100vw) }` 在普通网页预览中成立，但 Chrome popup 的 viewport 需由内容反推，`100vw` 参与后造成循环收缩。
- 0.1.7 将 `html` 固定为 380px，`body` 设为 `width: 100%` / `min-width: 0` / `overflow-x: hidden`；移除旧的 379px media fallback。此改动只影响 popup 布局，不改变 Manifest V3 权限、host permissions、同步桥、填写规则、MiMo 元数据边界或敏感字段策略。
- Smoke 明确要求固定根宽度并禁止 `width: min(380px, 100vw)`，避免普通页面截图通过但真实工具栏 popup 再次收缩。
- `/extension`、`/extension/guide` 与 smoke 已统一使用用户最终确认的地址 `https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS`；提取码仍为 `SXZS`。前一条 `11xaueV0f0D_pFt_czk_MHw` 是误链，现已加入 smoke 禁止回归。正确链接 HEAD 实测返回 302 至 `/share/init?surl=0QoSAiNpFOch881oCniEjA&pwd=SXZS`。此改动尚未部署，不能写成生产已切换。

### Build and verification evidence

- manifest 已升为 0.1.7；本地测试目录为 `dist/starjob-resume-assistant-local/`。正式回退包 `public/downloads/starjob-resume-assistant-v0.1.7.zip` 与百度网盘待上传包 `dist/拾星网申助手-v0.1.7.zip` 均为 111,586 bytes，SHA-256 均为 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`，字节一致。
- 隔离的 Chrome for Testing 真实加载 `dist/starjob-resume-assistant-local/` 后，扩展页面运行时 manifest 为 0.1.7，`html`、`body`、`.shell` 计算宽度均为 380px；截图确认品牌头、同步空状态和底部操作完整展开。另以 380×800 预览已同步、填写结果和四阶段进度状态，均无横向裁切。
- `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；首轮 TypeScript 只出现允许删除的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。Smoke 读取 hosted Supabase 225 条开放岗位并完成匿名安全探针；未执行 migration、hosted DDL 或数据写入。
- 精确暂存 9 个任务文件后提交为 `ee1d83e`（`fix: stabilize extension popup layout`）并成功推送 `origin/main`；本地与远端完整提交均为 `ee1d83ecfe923f765d111918554b0592cfe0fddb`。`.codex-artifacts/` 和五份 PRD 未暂存、未提交。
- 正确链接修订仅暂存 `ExtensionHubClient.tsx`、`ExtensionGuide.tsx` 和 `scripts/smoke_check.mjs`，提交为 `e110bde`（`fix: correct extension download link`）并推送 `origin/main`；本地与远端完整提交均为 `e110bde5844a32180ae6a2e66cef1e41cf0a285a`。
- 推送后的只读 `npx vercel ls --yes` 未出现新 deployment，最新 Production 仍为 `job-bottle-h5afxqaua...` / `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`。未执行 `npx vercel --prod --yes`，未做生产页面新链接或 0.1.7 ZIP 验收；用户提供的新网盘链接仅确认 HEAD 302，分享内容未读取。

## 2026-07-15 Extension Production Verification Addendum — Read This Section First

> 当前应用生产基线为 `/Users/wangrui/Documents/Web` 的 `main` / `origin/main` 提交 `aa6ddc8`，生产部署为 `dpl_7accugoddq4UzCChkUjCv9Q1eJg7`。本节审计已提交、推送和部署的拾星网申助手。

### Verified implementation and production

- Manifest V3 权限固定为 `activeTab`、`scripting`、`storage`，没有 `cookies`、`tabs` 或 `<all_urls>` 权限。popup 虽使用受限的 `chrome.tabs.query/create` 方法，但无需申请 `tabs` 权限；当前页注入由用户点击触发的 `activeTab` 授权完成。
- 同步桥只接受 `https://www.starjob.space` 与 apex 域来源，限制最多 20 份、约 4.5 MB，并保存到 `chrome.storage.local`。服务端 `/api/resume/extension-profile` 使用当前用户 cookie session，查询带 `user_id` 约束且剔除 `photoDataUrl`；未使用 service role。
- 填写器不调用 submit，不读取 Cookie，不处理密码、验证码、身份证/护照、银行卡、敏感声明或文件上传。默认 merge 模式保留已有值，overwrite 必须由用户显式选择。
- popup 使用现有拾星文字字标 `browser-extension/starjob-resume-assistant/assets/wordmark.png`，页面展示图由真实 popup HTML 截取；`/extension` 再将该截图合成到银色 iPhone 17 Pro Max 正面设备框与灵动岛内，没有让生成模型重绘文字或产品 UI，也没有复用牛客名称、代码、商标或资产。
- 当前 `0.1.6` 网站包与百度网盘替换上传包均为 111,630 bytes，SHA-256 均为 `0a38ba39e159d588d5903acd4a34fcced580f3475d6ff836103a638868e896f9`，两份文件字节一致；解压后的 manifest 为 0.1.6，运行权限仍为 `activeTab` / `scripting` / `storage`，host permissions 仅含拾星生产域名，且包含文字字标。旧 `0.1.5` ZIP 已移除。
- 桌面顶部主导航存在独立 `/extension` 一级入口，显示“网申助手”和斜体银蓝渐变 `BETA`；首屏标题为“一份简历，投向更多可能”。popup 使用单层开放工作面和分隔线结果区，未恢复卡片套卡片。
- `/extension` 与 `/extension/guide` 的获取按钮已改为同一百度网盘分享地址 `https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS`，显式显示提取码 `SXZS`。外链 HEAD 返回 302 到 `/share/init?surl=WhabI64zCSOXyn4zIAKMsw&pwd=SXZS`；没有把网盘页面或文件内容写入仓库。
- 本地同步问题根因为正式 manifest 和同步桥只接受生产域名。新增开发构建脚本在 `dist/starjob-resume-assistant-local/` 生成独立副本：只在副本中加入 localhost / 127.0.0.1 并改写 popup 的同步首页。Smoke 同时断言正式 manifest / bridge 不得含 localhost，开发脚本不得写入 `public/downloads` 或正式百度网盘 ZIP。
- 后续截图暴露三个额外根因：没有 `for` 的可见“学校”标签未被读取；教育“经历描述”错误映射为工作描述并提前消耗重复序号；证书页面使用 `type=tel` 导致手机号成为强候选。`0.1.2` 增加邻近表单项标签、短属性别名抑制、最近区块优先、教育描述独立键和“类型只增强已有语义”的约束。Chromium fixture 扩展到 20 个填入字段：学校正确、教育描述只含课程 / 荣誉、两段工作描述不偏移、证书成绩为证书详情、发证日期和证件号为空。
- 真实页面继续出现第一段描述缺失、后续描述前移，根因是每个标准键使用独立 occurrence 计数，无法表达同一经历容器。`0.1.3` 增加显式数组下标 / 数字标题解析和记录锚点分组；公司、职位、日期和描述共享记录索引。回归 fixture 在第一段公司之前加入会匹配 `work.description` 的干扰控件，干扰项与第一段都取记录 0，第二段仍取记录 1，返回 `STARJOB_EXTENSION_TEST_PASS` 并标记 21 项。
- MiMo 400 根因经源码和真实请求确认：分析数组元素包含 schema 未声明的 `sensitive` 布尔值。客户端 `toAnalysisField` 现在显式只输出七个允许属性；服务端 field schema 从拒绝未知属性改为安全 strip，以兼容尚未重新加载的旧扩展。带 `sensitive:false` 的认证本地请求实测返回 200，证明不再进入“页面字段格式无法识别”回退。
- 四段真实用户反馈进一步证明原始下标可能为 1..4 且公司自动补全可能生成重复输入。`0.1.4` 对同区块所有原始编号排序归一化为 0..N-1，卡片标题优先于 name/id，并合并连续重复公司锚点。新 fixture 同时包含四段 1 起始记录、第一段前干扰描述和重复公司搜索框，`STARJOB_EXTENSION_TEST_PASS`、32 项；第四段断言包含自身描述且不含第一段描述。
- 项目角色收到项目名称、获奖时间收到获奖名称的直接根因是字段已有自己的 label / aria / placeholder 时，旧逻辑仍把同一表单项或卡片内的相邻 label 全部加入可见信号，多个候选同分后由定义顺序错误胜出。`0.1.5` 改为自有标签绝对优先，只有完全没有自有信号时才取一个最近标签；客户端和 MiMo prompt 同时执行 section hard lock，任何 AI 结果也不能从工作跨到项目或获奖。
- 项目描述错位的另一根因是字段级 name/id 下标不可信、外层容器可能同时包住多段记录。现在从字段向上寻找最近、字段组成完整且不含多个“经历-N”标题的卡片容器，同一卡片全部字段使用容器的 DOM 顺序索引；故意把两个项目 description 的 `[1]` / `[2]` 下标互换后，fixture 仍保持各自项目描述。获奖名称 / 描述已拆为 `awards.title` / `awards.description`，获奖时间因简历模型无值不填。
- 日期适配审计采用两层规则：先在“起止时间 / 日期范围”等恰有两个日期控件的局部容器中按 DOM 顺序确定 start / end，再对识别到的 Ant Design、Element、Arco、Semi、iView 或通用 date-picker 包装器打开面板。选择器仅点击 `title` / `data-date` / `aria-label` 等属性精确匹配目标年月日的选项，并仅使用语义明确的前后年 / 前后月按钮导航；没有精确目标就不按日号猜测，回退原生 input/change 事件。
- 性能审计：扩展先执行本地 fill，再只把最多 6 个 deterministicKey 为空 / 置信度低于 0.74 的字段交给 MiMo，并以 `aiOnly` 第二次注入只补空项。MiMo JSON mode + 800 token 后，6 字段探针约 1,999ms / HTTP 200；此前同一类请求在无限制输出下约 8,048ms / 504。即使 AI 失败，本地结果已先写入。
- 站内 AI 润色新增 JSON mode、2,200 token、18 秒服务端超时、22 秒客户端超时、2,400 字符岗位信息 prompt 上限和 10 分钟用户 + 请求哈希缓存；移除第二次 MiMo JSON repair。无用户数据四 bullet 探针约 6,251ms 返回合法 JSON，最小探针约 1,064ms。缓存只在当前进程内保存有效结果，冷启动 / 多实例不共享，仍使用 hosted RPC 限流保护首次请求。
- 新增四阶段流程审计：第一次注入只提取字段元数据并生成稳定 fieldKey；MiMo 服务端只接收 label、attributes、context、inputType、本地候选和置信度，不含输入框值或简历内容；第二次注入只接受白名单键且置信度至少 0.78。匹配令牌为 server-only HMAC、12 小时有效，正式扩展仅可访问拾星生产域；无效令牌实测 401。6 个假字段元数据的真实 MiMo 调用实测 200，学校、教育描述、公司、工作描述和证书成绩正确，发证日期返回 `null`。

### Command and browser evidence

- 最终通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。首次 TypeScript 重跑只命中 `.next/types` / `.next/dev/types` 的数字后缀重复缓存，严格只删除 ` 2.ts` / ` 3.ts` 后重跑通过。
- Chromium DOM fixture 返回 `STARJOB_EXTENSION_TEST_PASS`，共标记填写 42 项；四段工作公司 / 职位 / 描述逐段对应，已有手机号和第二段手填公司保持不变；两个项目在 description 字段下标故意互换时仍保持名称 / 角色 / 日期 / 描述整卡对应；获奖名称 / 描述正确且获奖时间为空；两组通用日期范围按左开始、右结束填写。模拟 Ant picker 通过 `data-picker-used=true` 证明扩展实际打开面板并精确点击 `2024-09-01`，不是只改只读输入框文本。
- 本地 production server 已构建出 `/api/resume/extension-match`；当前 JSON mode / 800 token 探针约 2 秒返回 200，服务端 8 秒、扩展 9 秒截止。当前每用户 10 分钟 8 次限流和 AI 润色缓存保存在进程内；多实例 / 冷启动下并非全局强一致，后续高用量需持久化机制。
- 当前会话没有直接读取用户真实企业页面 DOM；本地 fixture 不能替代真实页面验收。必须让用户在 `chrome://extensions` 确认 0.1.6、重新加载、刷新空白表单后复测，若仍错位应取得实际 DOM 元数据而不是继续猜测。
- 下载页在 1440×900 和 390×844 下完成浏览器检查；移动端 `scrollWidth === innerWidth === 390`，新首屏文案、设备图、下载按钮均可见且无横向溢出。popup 另在 380 / 360 宽度检查，无横向溢出，分段填写控件可切换，结果与进度区无嵌套背景、边框或圆角。
- Smoke 读取 hosted Supabase 214 条岗位并完成匿名权限探针；没有 migration、hosted DDL 或数据修复写入。`aa6ddc8` 已推送 `origin/main`，Vercel deployment `dpl_7accugoddq4UzCChkUjCv9Q1eJg7` 为 `READY`。生产 `/extension`、`/extension/guide`、iPhone 产品图与 0.1.6 ZIP 均返回 HTTP 200；两页包含最新百度网盘地址，生产 ZIP 为 111,630 bytes、SHA-256 `0a38ba39e159d588d5903acd4a34fcced580f3475d6ff836103a638868e896f9`，与本地正式包一致。未登录同步接口返回预期 401。

### Remaining acceptance boundary

- 企业网申系统的 DOM 和自定义组件差异很大。首版提供通用标签、`name`、`autocomplete`、分区上下文和重复条目匹配，但仍需以后用真实 ATS 页面样本扩展适配；不得宣传为所有网站 100% 自动填写。
- 文件上传、验证码、敏感合规声明和最终提交是有意保留的人工边界，不是待绕过的缺陷。

## 2026-07-14 Final Verification Addendum — Read This Section First

> 本节覆盖下方旧审计的基线和措辞。当前应用基线为 `/Users/wangrui/Documents/Web` 的 `main` / `origin/main` 提交 `2c52198`；生产域名为 `https://www.starjob.space/`。

### Verified today

- `5ed86c5`：投递轨道改为容器尺寸驱动的同心圆；中心雷达、状态文字和轨道星均以同一圆心定位；激活轨道使用金色强调；星瓶的 Canvas 星体按状态着色，深空背景图层复用到投递星图。
- `16d4f4f`、`2132c3c`、`1b56c0d`：简历的字体 profile、PDF 模板切换、账号隔离本地草稿、云端同步队列与自动重试均已更新；同步异常保留本地副本。统一投递链接会清理 `cid` / `click_id` / `clickid`。
- `6094a33`、`7ff7651`：`/forum` 的用户可见名称和内容模型已转为“拾星指南”；分类为公告、教程、分享；客户端只展示管理员内容，普通用户互动写入被移除。管理员维护走受保护 API，支持多篇重点内容。
- `0f23544`：新的雾白 Apple 风格站点图标已加入 favicon、512px icon、Apple icon 与 manifest。生产域名页面实际返回这三类图标链接，线上文件 SHA-256 与本地文件一致。
- `2c52198`：`/forum` 拾星指南在文章分类和列表前加入四个常用入口，`/profile` 移除该区块并保留账号与反馈。`toJobPayload` 已接入链接清洗器，补齐手动岗位新增/编辑的 `cid` / `click_id` / `clickid` 自动移除；CSV / Excel 上传路径此前已覆盖。已提交、推送并部署生产。

### Command and production evidence

- 最新代码已执行并通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。本地 `/forum` 已在桌面、768px 平板和 390×844 视口做真实检查，快捷入口位于文章区域前且响应式布局正常。
- Vercel 通过 `npx vercel --prod --yes` 返回 Ready；当前生产 URL 为 `https://job-bottle-mkulnj4nz-raywang6688-7050s-projects.vercel.app`，部署 ID `dpl_CKXuwrF5GZ7LFjHwBGgmEc5AUr5v`，别名为 `https://job-bottle-xi.vercel.app`。`https://www.starjob.space/forum` 返回 HTTP 200，HTML 已实际检出四个快捷入口文案。
- 使用受保护 service-role 审计读取 hosted Supabase 的全部 214 条 `jobs.apply_url`：0 条含 `cid` / `click_id` / `clickid`（大小写不敏感）；因无残留，未执行数据库写入。

### Still unverified externally

- 不能仅由迁移文件存在推断 hosted Supabase DDL 已执行。`20260713193000_forum_admin_pinning.sql` 和 `20260714200000_forum_to_guide_center.sql` 的 hosted 执行状态应在可访问 Supabase SQL Editor、CLI 或数据库连接时单独查询并记录。
- 搜索引擎 favicon 更新依赖其重新抓取，生产资源已正确上线不等于搜索结果即时更新。

### Required continuing audit rule

> 后续每次代码、数据库、迁移、环境变量、部署、生产验证或风险状态发生变化时，必须在同一会话内更新 `/Users/wangrui/Downloads/PROJECT_CONTEXT_FINAL.md`；如影响当前基线或核验证据，同时更新本审计文件与 `PROJECT_CONTEXT.md` 顶部权威区。每条记录必须区分“文件已存在 / 应用已部署 / hosted 外部状态已验证”，不得以推测替代证据。

## 2026-07-14 Current Verification Addendum — Latest Production State

> 本节是当前最高优先级核验，覆盖旧审计中以 `8d990bc` 为基线的结论。当前仓库 `/Users/wangrui/Documents/Web` 的 `main` / `origin/main` 均为 `2736f94`，生产域名为 `https://www.starjob.space/`。

### Newly verified implementation

- 全国岗位地图北京标注已在 `src/components/jobs/ChinaJobMap.tsx` 向右上移动，避免与吉林地图区域重合；小区域北京、上海、天津、重庆、香港、澳门使用折线外引名称，名称可直接选择，不显示“北京省级”等不准确标签。
- 投递星图行星点击已修复，仍沿用原有投递记录、列表/看板/星图切换和进度 Drawer 数据流。
- `src/components/forum/PostCard.tsx` 为作者增加“编辑帖子”入口，支持标题、分类、正文、标签；`src/lib/forum.ts:updatePost` 使用 `post.id + user.id` 更新并通过 `.select("id").single()` 检查确实更新到作者自己的记录。列表通过 `ForumClient` 回调即时同步；发布时间仍来自 `created_at`。
- 论坛置顶支持多个帖子同时存在。`src/app/api/admin/forum/pin/route.ts` 只更新请求中的 `postId`，没有批量取消其他置顶；`20260713193000_forum_admin_pinning.sql` 使用普通排序索引而非 unique index。`ac69f07` 将“不批量取消、不建立 unique index”的约束加入 smoke。应用 API 已上线，但 hosted Supabase 是否执行该 migration 的 trigger 仍未由当前会话证明。
- 新增 `src/components/ui/CommunityHelpLink.tsx`，接入公共 `Drawer`、`WelcomeNotice` 和 `ResumePolishDialog`。所有当前业务弹窗都会展示“去求职社区了解如何使用「拾星」”，点击时先关闭弹层再导航 `/forum`；链接具备键盘 focus ring。

### Production evidence

- 最新部署 `dpl_5dk2Y4T4ycQqcfyN5DC5phkH69Hg` 状态为 `READY`，别名为 `https://job-bottle-xi.vercel.app`，自定义域名 `https://www.starjob.space/forum` 返回 HTTP 200。
- 从自定义域名页面引用的线上 JavaScript 资源中已检出“去求职社区了解如何使用”文案，证明弹窗帮助入口已进入生产资源，而非只存在于本地源码。
- 最新改动完成 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；本地生产页面在桌面和 390×844 下检查首次访问弹窗，入口可见且无横向溢出。

### Handoff cautions

- 不要把论坛多帖置顶的应用层支持写成 hosted Supabase trigger 已确认执行；migration 文件存在、Vercel route 上线、数据库 DDL 已执行是三件不同的事。
- 不要把“所有弹窗”扩大解释为 tooltip 或 hover 浮层；当前统一帮助入口覆盖所有已识别的业务 `Dialog` / `Drawer` / 首次访问弹窗：`Drawer.tsx`、`WelcomeNotice.tsx`、`ResumePolishDialog.tsx`。
- 不要回退全国地图的小区域折线标注、投递星图行星点击修复或论坛作者编辑功能；这些是当前用户可见验收点。

## 2026-07-13 Addendum — Seed Date Display Verification

- 论坛种子日期调整后，数据库实测 21 帖均位于 2026-07-08 至 2026-07-13 的上海白天时段，分布为 `5 / 2 / 2 / 4 / 3 / 5`；84 条评论均晚于对应帖子。
- 页面显示统一为 `7.13 20:40` 的根因不是 `created_at` 写入失败，而是 `PostCard` 右侧展示了被 `set_updated_at` trigger 统一覆盖的 `updated_at`。
- `6f839e5` 将可见日期、freshness 和 signal score 改为使用 `created_at`，并移除右侧重复更新时间。Lint、TypeScript、smoke、Vercel production build 和线上 `/forum` 200 均已验证。

## 2026-07-13 Final Conversation Audit — Production, Auth, Forum, and UI

> 本节是对 2026-07-13 整段实施对话的历史核验；当前最高优先级状态见文档最前面的 `2026-07-14 Current Verification Addendum`。本节原始核验基线为 `/Users/wangrui/Documents/Web` 的 `8d990bc`。

### Audit verdict

- 本轮用户要求的简历下载登录门槛、草稿保留、Vercel Analytics、全站错误恢复、首次访问/首次登录说明、Apple/macOS 圆角与透明筛选、星云结果独立滚动、管理员论坛置顶、论坛原位展开、普通作者脱敏、预设账号和论坛种子导入均已在代码或线上数据中实现。
- 相关提交已全部推送到 `origin/main` 并部署生产：`da3ff63`, `c923dfc`, `522c226`, `3a08684`, `e122be9`, `9de9f53`, `55a608c`, `055e4af`, `f1b0926`, `8d990bc`。
- 最终验证证据：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 均通过；Vercel production build 为 READY；线上 `/forum` 与 `/login` 返回 200；线上 `/api/forum/authors` 对真实种子作者返回 `415***` 和 `role=user`。
- 工作区仍有用户自有的未跟踪 PRD 草稿和 `.codex-artifacts/`。本轮没有修改、删除或提交这些文件。

### Resume authentication and preservation verification

- `ResumePdfExportButton.tsx` 不再仅检查客户端 session。它调用 `GET /api/resume/download-auth`，route 使用 cookie-based server Supabase client 和 `auth.getUser()`；401 时不生成 PDF。
- 未登录下载前先调用 `preserveDraft()`。成功保存后跳转 `/login`，携带安全 `next`、`mode=register` 和 `reason=resume-download`；登录/注册成功后返回来源页面。`ResumeBuilderClient` 的本地/云端合并保证浏览器草稿不会被空云数据覆盖。
- 浏览器配额失败会显示明确提示并停止流程。该实现修复了“未登录仍能下载”和“注册回来简历丢失”两个用户可见问题。

### Analytics, runtime, and first-use verification

- 根布局已挂载 `@vercel/analytics/react` 的 `<Analytics />`，解决 Vercel Analytics 页面长期停留在 Get Started 的代码侧缺口；部署后仍需真实访问与内容拦截器状态才能产生统计。
- `src/app/error.tsx` 与 `src/app/global-error.tsx` 已存在。`522c226` 同时加固论坛点赞/评论、星图加载、简历 AI、导出、管理员 API、登录状态和浏览器存储错误路径。旧审计中的“No error boundaries”已经失效。
- `WelcomeNotice.tsx` 已在根布局全站挂载。访客和首次登录用户分别使用两套文案；支持 ESC、焦点圈定、关闭按钮、移动端 sheet、localStorage 失败降级。用户首次登录的已读状态同时写入 Auth metadata `welcome_notice_seen_at`。
- 隐私文案采用可兑现表述：普通用户数据不会向其他用户公开、出售或用于广告；开发者在故障排查、安全响应或依法配合时可能按必要最小权限处理。它没有重复用户原稿中“管理员绝对不可见”这一技术上不可兑现的承诺。

### UI and interaction verification

- `e122be9` 引入统一 `SegmentedControl.tsx` 和更轻的深空 Apple 界面，`9de9f53` 将常用容器/按钮/输入/星图节点圆角收敛到 macOS 风格尺度，`55a608c` 进一步减少地区/行业/职能筛选的多层框和简历卡片存在感。
- 当前视觉约束不是无差别“毛玻璃”：透明滑块应保留背景透光、边缘折射感和轻高光，避免依赖大 blur 形成灰蒙蒙的独立卡片墙。
- `NebulaGateway.tsx` 已修复星云岗位结果框不能单独滚动的问题；结果列表获得受控高度、`min-height: 0`/overflow 链路和独立纵向滚动。该 bug 与视觉筛选调整在同一提交 `55a608c` 完成并上线。
- 社区帖子内容由侧边 Drawer 恢复为列表内原位展开。桌面验证中展开后首行高度增长、DOM dialog 数为 0；390 × 844 下无横向溢出。

### Forum authorization, privacy, and data verification

- `PATCH /api/admin/forum/pin` 先读取当前 Auth user，再查询 `profiles.role`。未登录返回 401，非管理员返回 403；客户端只有管理员看得到置顶按钮。
- 置顶帖子按 `is_pinned` 优先排序，使用暖杏色 `全站置顶` badge、填充 Pin 图标和左侧强调，已避免与普通状态标签混淆。
- 直接从匿名 Supabase client 读取 `profiles` 的实测结果为空，证明旧“公开 profile 供论坛查名”的设计不可靠且不利于隐私。当前 `POST /api/forum/authors` 由 server-only service-role client 查询，只返回普通用户前三字符加 `***` 或完整管理员名，以及 role；输入限制为最多 100 个 UUID。生产实测 `415***`，没有公开邮箱、密码、完整普通用户名或 metadata。
- `SUPABASE_SERVICE_ROLE_KEY` 已配置在本地 `.env.local`，并通过 Vercel CLI 添加为 Production / Sensitive。它现在是服务端 admin/forum API 和一次性导入脚本的真实依赖；旧审计中“本地缺失”“当前 app source 不消费”均已失效。密钥值未进入 Git、输出或本文档。
- `/Users/wangrui/Downloads/accounts.csv` 已校验为 100 行、100 个唯一 5 位账号、密码长度有效；实际 Auth 导入返回 `created=100, updated=0`，随后补齐兼容 metadata 返回 `updated=100`。每个账户均 email-confirmed，并 upsert profile，CSV/密码未复制到仓库。
- `/Users/wangrui/Downloads/forum_seed.sql` 实际含 21 个 post insert 和 84 个 comment insert，全部引用账号都在 CSV 中。导入核验返回 `{posts:21, comments:84, users:63}`；首帖固定 UUID 可公开读取且有 4 条评论。文件头的“20/80”是种子注释错误，不是导入遗漏。
- `scripts/provision_preset_accounts.mjs` 与 `scripts/import_forum_seed.mjs` 都是幂等工具：前者按内部邮箱更新/创建 Auth 与 profiles，后者按固定 UUID upsert，并在写入前检查完整解析、账号映射和写入后计数。

### Remaining risk / unverified external state

- `supabase/migrations/20260713193000_forum_admin_pinning.sql` 已提交，但当前会话没有 Supabase CLI access token 或直接数据库连接，未证明该 DDL 已在 hosted Supabase 执行。应用 route 已上线且置顶 UI/排序可工作；数据库 trigger 对绕过应用层的保护仍需单独核验。
- Vercel Production 已配置 service role；Preview/Development 没有通过 CLI配置该密钥。若 Preview 需要 `/api/forum/authors` 或 `/api/admin/users`，应单独添加 Sensitive 变量，不能复制成 `NEXT_PUBLIC_*`。
- 论坛目前无 UI 分页；导入 21 帖后仍在当前首批读取范围，但数据继续增长时需实现游标或分页。
- MiMo 本地变量已存在并曾通过直接探针；本轮没有重新证明 Vercel Production 的 MiMo 配置和真实登录端到端响应。不能把本地可用写成当前生产必然可用。

### Documentation corrections applied

- `PROJECT_CONTEXT.md` 已增加同日 authoritative handoff，并修正：无 API route、AI 简历未实现、五模板、service role 不被消费、profiles 公共读、无 error boundary、论坛侧滑展开、普通昵称未脱敏、预设账号未导入等过时表述。
- 下方历史审计仍保留作为演进记录；凡是出现“无 route handler”“缺 service role”“AI 是 placeholder”“公开 profiles 是论坛查名必要条件”等结论，均视为被本节取代。

## 2026-07-12 Verification: Nebula Alpha Cutouts

- 截图复核表明 CSS `mix-blend-screen` 不能稳定消除部分生成 PNG 的黑色矩形底板，因此该方案被替换为真实 alpha 通道。14 张新资产的透明版本已由亮度蒙版生成；抽样文件透明像素覆盖 55%–74%，同时仍保留 9%–14% 不透明亮部。
- 在 `#091326` 深空背景上的合成预览显示星云四周连续融入页面，没有黑色方块；原始 RGB 文件保留未覆盖，出现视觉回归时可重新调整阈值并生成副本。

## 2026-07-12 Verification: Nebula Blend, Scattering, And Unique Assets

- 新生成 PNG 的不透明黑底不是源图加载失败，而是图像自身的深空底色；`NebulaDistributionMap` 现通过 `mix-blend-screen` 进行合成，黑色不再覆盖文字、星轨或节点外部区域，标签仍位于可点击节点的独立前景层。
- 最终桌面浏览器测量（1440px 职能）确认 15 个节点、15 个不同图片 URL、0 对 DOMRect 相交，`scrollWidth/clientWidth` 均为 1440，Console 无新增报错。行业当前可见 7 个分组为 7 个不同 URL。
- 为保持可读性，散布只使用受控纵向偏移；避免横向偏移跨列后造成星云、标签或触控目标相交。移动端继续走双列布局，最终提交前应与 lint/build/smoke 一并复跑。

## 2026-07-12 Verification: AI Polish And Nebula De-duplication

- 使用配置的 MiMo endpoint 对不含用户数据的项目经历探针返回 HTTP 200 和有效 `choices[0].message.content`，但该内容中 `changes` 为 `string[]` 而不是既有 schema 所要求的对象数组。这解释了项目经历按钮能发起请求却最终显示格式失败。route 现在仅兼容该结构偏差，转换为 `{ type: "wording", description }`，并对 title/subtitle 以源输入回填，仍由 `resultSchema` 复核 revised bullets、suggestions 和 warnings。
- 动态浏览器测量验证职能模式：15 个可见分组节点、0 对 DOMRect 相交、13 个不同图片 URL、1440px scrollWidth/clientWidth 均为 1440。修复前固定点位重复导致 clientWidth 曾扩展至 3346；现在采用 minmax grid，根本消除该布局风险。
- 地区模式实测 9 节点对应 9 个不同图片 URL，行业模式实测 7 节点对应 7 个不同图片 URL；390 × 844 职能视图显示 15 节点且 scrollWidth/clientWidth 均为 390，Console 无新增 warning/error。新生成资产使用黑底深空图，作为现有深空工作区内的局部数据可视化素材，不改变高频页面的整体配色或交互层级。
- `scripts/smoke_check.mjs` 增加新资产存在性、地区/行业/职能映射和无重叠网格契约。`npm run lint`、`npm run build`、`npm run smoke` 需要在最终提交前再次全量运行。

## 2026-07-12 Verification: Job Map And List Integration

- 审计确认旧 `NebulaGateway` 虽已通过 `NebulaSelection.jobIds` 过滤 `filteredJobs`，但它位于线性清单之后，并存在“地区/行业/岗位/已捕获 gateway -> 分类 -> 公司”的额外层级，因此用户难以理解星图是可视化筛选器。本轮删除 gateway UI 层，保留既有分类、公司节点和岗位操作数据流。
- 新 `NebulaDistributionMap` 使用 `sqrt(count / maxCount)` 映射星系面积，类别位置来自固定坐标，不使用 `Math.random`；职能岗位允许按现有 `job_categories` 进入多个职能分组，但选中后的岗位 ID 集合会在清单中去重显示真实岗位行。
- `/explore` 现在按“岗位概览 -> 岗位地图 -> 筛选与岗位清单”呈现。地图直接切换地区、行业、职能和我的投递，选区与清单标题、数量、行内容同步；原有 URL 类别参数、Supabase 读取、候选阶段、捕获动画、官网投递确认和 ProgressDrawer 未改动。
- 本地生产浏览器在 1440 × 900 验证：206 个岗位、7 个行业分组，点击科技星云后标题与 DOM 岗位行均为 104，scrollWidth 等于 clientWidth 1440。390 × 844 验证四个地图维度、双列密度节点和六项底栏完整，scrollWidth 等于 clientWidth 390；浏览器 Console 无新增 warning/error。
- Smoke 契约已从“默认进入星云入口”更新为“密度图 + 地图/清单共享选区”，并覆盖稳定坐标、面积编码、移动端布局、加载占位及移除“按行业探索”旧标题。本轮不需要数据库 migration。

## 2026-07-12 Verification: Motion System Refactor

- 动画依赖审计确认项目已有 `motion@12.42.2`，本轮无需新增 Motion、GSAP、React Spring、Three.js 或 View Transition API。现有卡顿主因是首页转场从屏幕中央生成独立圆形，同时对环境执行 blur/scale/opacity 并维持轨道动画；这些高成本叠加已移除。
- 新增 `src/lib/motion.ts` 和 `RouteContentTransition.tsx`，统一页面、列表与 layout transition；Navbar 位于过渡层之外，因此路由切换不会重新执行整条导航动画。普通工作页不使用大面积 blur、整页 scale 或长 stagger。
- 首页转场已核对为真实点击坐标链路：button `getBoundingClientRect()` -> `SpaceHome` 保存 transition -> `router.prefetch()` -> fixed overlay translate/scale -> `router.push()`。旧 `scale: 28` 中央圆形和中心径向遮罩已删除，reduced-motion 有短淡出降级。
- 岗位、投递、简历模板和 Drawer 只增加状态连续性，不改变数据过滤、乐观更新、编辑内容或 PDF 逻辑。Drawer 的 ESC、焦点圈定和关闭后焦点恢复补足了原有可访问性缺口。
- Smoke 契约覆盖 motion tokens、真实行星坐标、路由预取、禁止首页退场 blur、Navbar shared indicator、RouteContentTransition 和 Drawer 焦点行为。最终 lint、build、smoke 与桌面/移动端浏览器结果应以本节后续验证记录为准。
- 本地生产构建浏览器验收覆盖 1440 × 900 与 390 × 844：首页行星中间帧从实际点击位置扩展，`/explore` 在 1440px 下 scrollWidth 与 clientWidth 均为 1440，Navbar 高度稳定为 40px；移动首页和 `/resume` 均为 scrollWidth 390，六项移动导航与八款模板保持可见，Console 无新增 warning/error。当前浏览器能力不能模拟系统 reduced-motion 偏好，因此该项仅通过源码、Motion 分支和全局 media query 契约验证，未声称真实设备动态验收。

## 2026-07-12 Verification: Navigation And Resume AI Polish

- The `AI-Powered` title signature now reserves horizontal painting space with `inline-block px-2`; this prevents the overhanging `Snell Roundhand` opening flourish and final `d` from being cropped by the gradient text box. The smoke contract records that allowance.
- Resume font resilience was verified in source, a fault-injected local production build, and the signed-in production Safari page: `resumePdf.ts` tries configured public URLs first and then the same-origin `/fonts/...` files independently, normalizes Safari `Load failed`/network `TypeError` to Chinese, keeps bounded requests, and releases rejected `fontCache` and `previewMeasurementPdfCache` promises. With both configured remote URLs pointed at an unreachable origin, the local browser still rendered `A4 · 1 页`. After commit `1647226` deployed, production also rendered `A4 · 1 页` and the export action reported `PDF 已开始下载`. `ResumePreview` explicitly resets both caches before retry.
- External rollout is partially verified: COS bucket `starjob-resume-fonts-1451789998` in Guangzhou (`ap-guangzhou`) has a private bucket ACL and a least-privilege anonymous `GetObject` policy for only `NotoSerifSC-Regular.ttf` and `NotoSerifSC-Bold.ttf`. Direct HTTPS reads returned `200` and exact local file sizes. `NEXT_PUBLIC_RESUME_FONT_REGULAR_URL` and `NEXT_PUBLIC_RESUME_FONT_BOLD_URL` are present in the Vercel project for Production and Preview. CORS is still absent (`OPTIONS` from `https://www.starjob.space` returned `403`), so the deployed app must retain the same-origin fallback until a COS CORS rule is saved and verified.
- Location facets were checked against all 198 active jobs and 111 distinct raw location strings before redesign. Browser acceptance showed 全国 37, 四川省级 18, and 成都市级 17 matches; switching from 四川 to city mode retained the province. The 390px filter rail had no horizontal overflow. Smoke probes cover nationwide exclusivity, province-to-city matching, multi-location rows, and `宿迁等` normalization.
- The resume AI visual affordance now has an explicit smoke contract for its blue-silver pill gradient, focus ring, and handwritten `AI-Powered` H1 signature. The implementation does not touch resume content or PDF layout operations.
- The resume-polish prompt was strengthened against responsibility inflation and fabricated outcomes. Smoke checks now require the conservative rewrite rules, strict JSON, provider-neutral user copy, and the visible AI-output review reminder.
- Corrected the 2026-07-11 statement that signed-in `/` should show a task workspace. Current product requirement and code now preserve the orbiting galaxy homepage for every user; application actions are consolidated in `/my`.
- Corrected old labels such as `岗位池`, `找岗位`, `经验库`, `求职交流`, `简历`, and `我的` where they represented primary modules. Current visible module contract is `岗位坐标 / 投递管理 / 简历制作 / 求职社区 / 星瓶 / 个人中心`.
- Verified `SpaceHome.tsx`, `Navbar.tsx`, `MyApplicationsClient.tsx`, `LoginForm.tsx`, `ResumeBuilderClient.tsx`, `ResumeEditor.tsx`, `resume.ts`, `resume-sync.ts`, the existing server Supabase client, and the current admin API before implementation. No database migration was required.
- Verified no OpenAI SDK is installed and native `fetch` is sufficient. No existing generic Dialog/Toast/Diff component was present; the implementation adds a resume-specific accessible comparison dialog and reuses existing Button/Input/Select styles.
- Superseded on 2026-07-13: local `.env.local` now contains MiMo variable names and a prior direct probe returned 200. Production MiMo configuration was not reverified in the final forum/account rollout, so keep the production claim scoped.
- Runtime probes: unauthenticated POST returns 401 with `请先登录，再使用 AI 润色`; GET returns 405; source scan finds MiMo names only in the server route and empty `.env.local.example` placeholders. The key cannot be present in the client bundle under this design.
- Remaining external acceptance: configure `MIMO_API_KEY`, `MIMO_BASE_URL`, and `MIMO_MODEL`, redeploy, then test a real authenticated Chinese and English response. The in-memory user rate limit is per warm server instance and should move to durable shared storage if abuse volume warrants it.

## 2026-07-11 Resume Fidelity, Workflow, And Admin Verification

- The resume parity path was re-audited against current code and real output. Browser measurements at desktop and 390 × 844 showed A4 ratios and no horizontal overflow. A normal export and a deliberately long two-page resume were inspected with `pdfinfo`; both used `595.28 × 841.89 pt` A4 pages, and preview/export page counts matched.
- A remaining near-parity risk was corrected: browser SVG text uses the exact width measured by jsPDF, and preview images use the same frame behavior as PDF images. Smoke checks require these contracts.
- Product-audit recommendations implemented in that 2026-07-11 worktree included staged candidate intent, dynamic primary actions, priority, application metadata, linked resume, next action, status timeline, review notes, list/board/map views, real reminder logic, a signed-in homepage workspace, and four-item mobile navigation. The homepage workspace and four-item navigation were superseded on 2026-07-12 as documented above.
- Optional structured JD fields and honest empty states were added via `20260711130000_job_decision_fields.sql`; no automatic or fabricated JD analysis is shown for old rows.
- Admin account management has a dedicated page and server route. Authorization is checked from the signed-in session before a server-only service-role client can list auth users or change role/ban state. The current admin cannot demote or disable itself, and disabling retains user data.
- Superseded on 2026-07-13: local and Vercel Production now have a server-only `SUPABASE_SERVICE_ROLE_KEY`, and the account/forum import succeeded. The later forum-pinning migration still lacks hosted DDL verification.
- Canonical deployment is `https://www.starjob.space/`, with apex redirect and valid TLS. The old Vercel hostname is no longer the share QR destination.

---

## 1. Audit Verdict

### 2026-07-11 A4 Resume Parity And Task-Flow Verification

- `ResumePreview.tsx` and `resumePdf.ts` were traced together. Preview text, lines, images, wrapping, dynamic density selection, and page breaks now come from one jsPDF-measured A4 operation list; the old fixed 794 × 1123 HTML renderer was removed.
- The continuation-page defect was fixed from Letter to A4. Smoke checks now require `format: "a4"`, `PAGE_WIDTH = 595.28`, `PAGE_HEIGHT = 841.89`, `addPage("a4", "portrait")`, the shared preview operation type, and the 210:297 responsive preview ratio; they reject Letter pagination and the old fixed-pixel paper.
- Browser verification covered desktop 1440 × 900 and mobile 390 × 844. The mobile A4 paper was fully visible without horizontal overflow, the preview reported one A4 page, the export action reached `PDF 已开始下载`, and no browser console errors were reported. The in-app browser did not expose the jsPDF Blob through its download-event API, so an external PDF MediaBox inspection was not claimed.
- The job-detail-to-resume flow was exercised with a real Supabase job. `/jobs/[id]` carries job id/company/role into `/resume`; creating a job version produced a second resume, selected the real linked-job option even while signed out, shortened the title to the primary role, retained the complete role list as the version note, and updated the A4 header to that primary role.
- `docs/product-audit-2026-07-11.md` is the current evidence-based product audit. It identifies the primary P0 as the semantic overload of `opened` for browse/save/prepare, not a mismatch between frontend and database enums. Proposed priority, channel, account, contact, next-action date, resume-use reference, and structured JD fields remain explicitly unimplemented pending a compatible migration.
- Global navigation was reduced to 找岗位, 投递管理, 简历, 求职交流, 我的. The homepage may retain branded planet labels, and 星瓶 remains reachable from the homepage and `/profile`; it is no longer a competing high-frequency toolbar item.

### 2026-07-09 Update

本轮已修正 `PROJECT_CONTEXT.md` 中与最新代码不一致的内容：

### 2026-07-10 Interface And Resume Expansion Verification

### 2026-07-11 林深星渡 Palette Verification

- The user supplied a five-color reference image. `src/styles/tokens.css` and `tailwind.config.ts` were checked together and now use 极夜 `#000001`, 普鲁士蓝 `#12294E`, 茄紫 `#564A71`, 暮山紫 `#7F5568`, and 星尘紫 `#7E7CB5`; old electric-blue, coral, warm-gold, and bright-cyan theme values were removed from application UI surfaces.
- `globals.css`, `Navbar.tsx`, `AdminShell.tsx`, the galaxy material files, application-orbit components, `BottleStage.tsx`, and `shareBottleCard.ts` were jointly checked. Readable containers now use lower-alpha Prussian-blue layers, while stars retain contrast through lavender/plum highlights instead of opaque colored blocks.
- Visual acceptance was captured against the supplied reference: `/explore` at desktop shows a Prussian-blue-to-night work surface with restrained translucent controls; `/` at 390 × 844 retains the mobile orbit geometry and renders lavender/plum planets against the deep-space field. No data model, service, API, or Supabase migration changed.
- `scripts/smoke_check.mjs` now asserts the exact core tokens and the share-card palette so later UI work cannot reintroduce the prior primary colors unnoticed. `npm run lint`, `npm run build`, and `npm run smoke` are still required after this final documentation update.

- `SpaceShell` and `SpaceBackground` now distinguish `work` and `scene` variants. User work routes use the quiet work surface; `/galaxy` and `/bottle` explicitly request `scene`. This keeps deep-space visuals tied to the product moments where they carry meaning.
- Canonical user-facing module names are 岗位池, 投递, 简历, 资料, 经验库, and 星瓶. `planet-routes.ts`, the homepage auth entry, quick links, error messages, and the two navigation surfaces were aligned to this set; 岗位星图 and 投递星图 remain names for specific visual modes only. The smoke script now prevents the homepage planet labels from returning to older names.
- The mobile compact core changed to a 78px maximum-equivalent star and 82px wordmark with a reduced gap. The current homepage was captured at 390 × 844 and desktop 1440 × 900 after this change; the center no longer dominates the mobile orbit layout.
- `AdminShell` was also aligned with the work-surface system: it now uses a divider-led toolbar and horizontal admin navigation, without `StarFieldBackground`, a 28px floating shell, or text pills.
- `Navbar.tsx` was inspected after the supplied reference-image review. Its former nested rounded containers are replaced by a sticky toolbar, underline navigation, divider-separated account actions, and a plain mobile menu. The profile page likewise uses open sections and dividers rather than card-within-card composition.
- `src/components/guide/JobSearchGuide.tsx` and `src/app/guide/page.tsx` add an expandable five-step autumn-recruiting guide. `/profile` links to it under common entries; no new backend data, API, or schema is required.
- `ResumeBuilderClient.tsx` now places `ResumeEditor` and `ResumePreview` side by side from the `xl` breakpoint. `getResumeTemplateStyle` is consumed by `ResumePreview.tsx` and `resumePdf.ts`; a parity check corrected the technical template's PDF divider color and left-aligned header order to use the shared style.
- `consulting`, `technical`, and `academic` were added alongside the previous five resume templates. `src/lib/types.ts`, `src/lib/resume.ts`, `src/lib/resume-sync.ts`, `ResumeTemplatePicker.tsx`, `ResumePreview.tsx`, and `resumePdf.ts` were checked together. The new `20260710150000_resume_template_expansion.sql` extends the database check constraint while preserving legacy IDs; old deployed constraints still use the existing `compact` retry path.
- `npm run lint`, `npm run build`, and `npm run smoke` must be rerun after the final local changes before this section is treated as release evidence. The Codex in-app browser still could not reach the local Next server in this environment, so current visual acceptance remains a browser-side follow-up rather than a claimed screenshot audit.

### Earlier Workspace Updates

- 2026-07-10 工作台改版：`/my` 不再以投递轨道作为默认入口，而是以“今日待办 + 材料准备 + 阶段看板”为主，星图/轨道保留为可切换回顾视图。待办和材料状态均由已存在的 `status`、`progress_note`、`updated_at`、`resumes.linked_job_id` 推导，没有虚构提醒、优先级或材料表。
- `src/lib/career-workspace.ts` 是本轮新增的派生逻辑边界，集中处理看板列、下一步文案、简历绑定状态、可选 `closes_at` 截止提示和 profile 偏好匹配。未来改动应核对它与 `MyApplicationsClient` / `HomeClient` 的消费关系。
- `/explore` 的线性岗位池和筛选现在位于星云浏览之前；星云已明确为“按行业探索”。`JobCard` 是共享组件，`OpportunitySignalList` 也会调用它，因此新增字段保持 optional 以避免旧星图列表回归。
- 全局导航已按实际任务改名为岗位池、投递、简历、资料、经验库、星瓶。`/profile` 从叙事型个人名片收束为开放式资料页，`/forum` 文案降级为经验库。
- 本轮没有 Supabase migration。字段来源已经在迁移中存在：`20260704010000_phase0_security_hardening.sql` 添加 `jobs.closes_at`，`20260708090000_resumes.sql` 定义 `resumes.linked_job_id`，`progress_note` 在基线 schema/投递表中存在。
- 已运行并通过 `npm run lint`、`npm run build`。本机 Next server 已能在终端启动，但 Codex in-app browser 无法连接本机端口，故没有把当前运行截图当作视觉审计证据；上线前仍需在可达浏览器中检查桌面与移动端。

- `/profile` 资料页支持用户名、意向地区、意向岗位和基于偏好的岗位匹配；注册页也会收集这些偏好。
- `/profile` 已进一步重构为独立资料页：资料完整度、投递资产、求职偏好、简历版本、匹配岗位、秋招流程、账号与反馈按开放分区呈现；`/my` 承载投递看板，并可切换至星图回顾。
- 首页“资料”入口和导航“资料”入口指向 `/profile`，不再指向 `/my`。
- Profile 新增可选基本信息字段：phone、city、school、major、graduation_year，对应迁移 `20260709100000_profile_basic_info.sql`。
- 简历模块现支持 compact/classic/modern/consulting/technical/academic/english_classic/english_modern 八个模板。`minimal` 与 `executive` 因与现有中文模板过近而收敛为 modern/classic；旧数据仍可读取。两款英文模板使用英文栏目标题并隐藏照片，三款新增中文模板使用不同的标题对齐、照片策略和分节规则。顶层选择器保留视觉缩略图与名称，不再提供多余的说明文案。
- 新增 `20260710140000_resume_template_consolidation.sql`，在保留旧 minimal/executive 数据行的前提下加入英文模板 ID。同步层会在 content_json 保留真实模板 ID，并在旧约束拒绝英文模板时以 `compact` 重试，因此未执行迁移也不会阻断云端保存；迁移仍建议在 SQL Editor 执行，以便 template_id 本身可查询。当前 CLI 未链接线上项目，无法由本机直接推送 DDL。
- 全站设计审计后，核心求职路径已减少统一圆角卡片与解释性眉题：`/explore`、`/my` 和 `/forum` 的数据列表使用开放集合；`/explore` 不再把行点击直接等同于外链投递；`/galaxy` 使用已有星云资产作为入口图；`/profile` 移除重复英文标签。没有改动现有 Supabase 数据模型、鉴权或业务 API。
- 简历头部的求职方向、LinkedIn、GitHub、个人网站按可选字段处理：填写才在预览和 PDF 中显示，空值不会占位。
- 注册页和资料页的意向地区/意向岗位已从自由文本调整为共享选项 chip 多选，数据仍落到 profiles.preferred_regions / profiles.target_roles 数组。
- 分享星瓶已升级为 3:4 海报式 PNG/PDF，始终叠加完整玻璃瓶层，展示 Offer / 已投递 / 已进面、前五家投递企业和二维码；不展示偏好、简历数量、邮箱、手机号、user_id 或内部记录 ID。
- Admin CSV/Excel 导入已从“完全一致数据”升级为业务岗位指纹去重：按公司、投递链接、岗位、地点和批次识别重复；文件内部重复会在预览中跳过，导入前也会跳过数据库里已存在的重复岗位。
- 管理员重复岗位功能已改为可靠的本地重复筛选：`/admin/jobs` 能按业务指纹只展示全部疑似重复记录并按组核验；`20260709110000_merge_duplicate_jobs.sql` 的 RPC 只在上线数据库已应用迁移时作为可选后台能力，不再是 UI 的单点依赖。
- Product Design 方向已明确：当前更适合吸收成熟 LaTeX 简历模板的排版结构，而不是在 Vercel 前端项目里直接引入 TeX 编译链；多模板先在现有 jsPDF 矢量渲染器中落地。
- BottleStage 仍是轻量 Canvas 方案，新增 pointer/touch shake 衰减互动；没有引入 Three.js / R3F / 物理引擎。
- 新增幂等修复迁移 `20260710120000_profile_resume_cloud_repair.sql`；线上 Supabase 出现个人资料或简历云端同步不可用时，应在 SQL Editor 执行该迁移文件，补齐 profile 字段、resumes 表/RLS 与模板约束。

结论：`PROJECT_CONTEXT.md` 经过本次小幅修正后，可以作为新 Codex 对话的项目交接材料使用，但不能当作唯一事实来源。新对话仍应优先核对当前代码、迁移和 smoke 脚本。

总体判断：

- 可以交给新 Codex 使用：可以，但建议附带本审计文件一起交接。
- 是否存在严重错误：原文存在几处会误导开发方向的错误，主要集中在论坛举报、API/数据访问描述、环境变量、废弃组件和部分技术债状态。本次已对小范围明确错误直接修正。
- 是否需要 Hermes 返工：不需要整体返工。文档结构完整，覆盖了产品逻辑、路由、组件、数据流、数据库、样式和技术债；但 Hermes 应按本审计的 Required Fixes 做二次校正。
- 可靠章节：Product Overview、Core User Flow、Feature Map、File-by-File Index、Data Flow、UI / Design System Notes、Recommended Reading Order 大体可靠。
- 需要谨慎使用章节：Database / Backend / API Notes、Known Issues / Technical Debt、Open Questions。原因是这些章节更容易受迁移状态、线上 Supabase 状态和近期重构影响。

本次已直接修正 `PROJECT_CONTEXT.md` 中的小错误，包括：运行品牌说明、Vercel 部署说明、技术栈遗漏、论坛举报实现状态、分页表述、`StatusSelect.tsx` 状态、API route 表述、RLS/论坛风险、`.env.local.example`、BottleStage RAF、移动端主页和“风格冻结”旧表述。

## 2. Confirmed Accurate Sections

### Product Overview / Core User Flow

- 文档说法：这是面向 2027 秋招的中文 Web 应用，包含岗位浏览、投递进度、星瓶、星图导航、简历和经验库。
- 核验路径：`/Users/wangrui/Documents/Web/src/app/page.tsx`、`/Users/wangrui/Documents/Web/src/app/explore/page.tsx`、`/Users/wangrui/Documents/Web/src/app/my/page.tsx`、`/Users/wangrui/Documents/Web/src/app/bottle/page.tsx`、`/Users/wangrui/Documents/Web/src/app/resume/page.tsx`、`/Users/wangrui/Documents/Web/src/app/forum/page.tsx`
- 为什么准确：真实路由与产品模块一致，核心页面均存在，且对应组件实现了文档描述的主流程。

### Route Map

- 文档说法：主要页面包括 `/`、`/explore`、`/jobs`、`/jobs/[id]`、`/my`、`/bottle`、`/resume`、`/forum`、`/admin` 等。
- 核验路径：`/Users/wangrui/Documents/Web/src/app`
- 为什么准确：真实 App Router 文件包括 `admin/import/page.tsx`、`admin/jobs/page.tsx`、`bottle/page.tsx`、`explore/page.tsx`、`forum/page.tsx`、`galaxy/*/page.tsx`、`jobs/[id]/page.tsx`、`login/page.tsx`、`my/page.tsx`、`my-applications/page.tsx`、`my-bottle/page.tsx`、`resume/page.tsx` 和首页 `page.tsx`。没有发现文档把完全不存在的主路由写成主流程。

### Browse and Apply Flow

- 文档说法：`/explore` 浏览岗位，点击官网投递会 upsert application、打开官网、写入本地星瓶下落队列，返回后可确认已投递。
- 核验路径：`/Users/wangrui/Documents/Web/src/components/jobs/HomeClient.tsx`、`/Users/wangrui/Documents/Web/src/lib/applications.ts`、`/Users/wangrui/Documents/Web/src/lib/bottle-drop.ts`、`/Users/wangrui/Documents/Web/src/components/jobs/ApplyReturnConfirm.tsx`
- 为什么准确：`HomeClient` 中的 `handleApply` 使用 `upsertApplication` 写入 opened 状态，调用 `queueBottleDrop`，再打开 `apply_url`；返回确认后通过 `updateApplication` 写入 `applied` / `withdrawn`。

### Application Tracking / Progress Drawer

- 文档说法：投递页使用轨道可视化，点击记录进入进度面板，状态变更采用乐观更新，失败回滚。
- 核验路径：`/Users/wangrui/Documents/Web/src/components/applications/MyApplicationsClient.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/ApplicationOrbitSystem.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/ProgressDrawer.tsx`、`/Users/wangrui/Documents/Web/src/lib/applications.ts`
- 为什么准确：`ProgressDrawer` 的 `saveProgress` 先构造 `optimisticApplication` 并调用 `onChanged`，随后异步 `updateApplication`，失败时恢复 previous state 并提示保存失败。该路径没有 `router.refresh()` 或 `window.location.reload()`。

### Star Bottle / Share Card

- 文档说法：星瓶由 Canvas 星层和瓶子视觉层组成，星星位置受几何遮罩和碰撞约束，分享功能导出 PNG/PDF 并带二维码。
- 核验路径：`/Users/wangrui/Documents/Web/src/components/applications/ApplicationBottle.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/BottleStage.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/bottleGeometry.ts`、`/Users/wangrui/Documents/Web/src/components/applications/shareBottleCard.ts`
- 为什么准确：`BottleStage` 使用 Canvas 绘制星星和下落动画；`bottleGeometry.ts` 包含瓶腔路径、采样和星间碰撞逻辑；`shareBottleCard.ts` 使用 canvas 绘制分享图，调用 `qrcode` 生成指向 `https://www.starjob.space/` 的二维码，并下载 PNG/PDF。

### Resume Builder

- 文档说法：简历支持编辑、预览、照片、PDF 导出和 Supabase 同步。
- 核验路径：`/Users/wangrui/Documents/Web/src/components/resume/ResumeBuilderClient.tsx`、`/Users/wangrui/Documents/Web/src/components/resume/ResumeEditor.tsx`、`/Users/wangrui/Documents/Web/src/components/resume/ResumePreview.tsx`、`/Users/wangrui/Documents/Web/src/components/resume/ResumePdfExportButton.tsx`、`/Users/wangrui/Documents/Web/src/lib/resume-sync.ts`、`/Users/wangrui/Documents/Web/supabase/migrations/20260708090000_resumes.sql`
- 为什么准确：页面与组件真实存在，`resume-sync.ts` 对 `resumes` 表执行加载和保存；PDF 导出由 `jspdf` 矢量排版器和内嵌 Noto Serif SC 字体完成，网页预览复用同一排版操作，不依赖 `html2canvas`。

### CSV / Excel Import

- 文档说法：Admin import 支持 CSV/Excel 预览和导入，岗位类别归一化共用逻辑。
- 核验路径：`/Users/wangrui/Documents/Web/src/components/admin/CsvImportPanel.tsx`、`/Users/wangrui/Documents/Web/src/lib/csv.ts`、`/Users/wangrui/Documents/Web/src/lib/categories.ts`
- 为什么准确：`src/lib/csv.ts` 同时引入 `papaparse` 和 `read-excel-file/browser`，并调用 `normalizeJobCategories`；`CsvImportPanel` 提供文件选择、预览、导入和错误提示。

### UI / Design System Notes

- 文档说法：项目使用 token、全局 CSS、liquid/no-frame 风格、星空背景、球体材质组件。
- 核验路径：`/Users/wangrui/Documents/Web/src/styles/tokens.css`、`/Users/wangrui/Documents/Web/src/app/globals.css`、`/Users/wangrui/Documents/Web/tailwind.config.ts`、`/Users/wangrui/Documents/Web/src/components/visual/OrbMaterial.tsx`
- 为什么准确：tokens 和全局样式定义了颜色、文字、液态容器、控件形态、背景和动画；`OrbMaterial.tsx` 提供统一球体材质、光晕预算和轨道线数量常量。

### Smoke Script Importance

- 文档说法：`scripts/smoke_check.mjs` 是开发前后必须关注的自动检查。
- 核验路径：`/Users/wangrui/Documents/Web/scripts/smoke_check.mjs`
- 为什么准确：该脚本覆盖安全字符串、PRD 残留、论坛约束、投递轨道、星瓶几何、岗位类别归一化、环境变量、构建产物等多类静态/轻量运行检查。

## 3. Inaccuracies / Hallucinations

### 论坛举报被写成已实现完整功能

- 文档原说法：`Post reporting system` 已实现。
- 实际代码情况：数据库迁移中存在 `reports` 表和 RLS，但没有发现论坛 UI 或 `src/lib/forum.ts` 中的举报函数；`PostCard` / `ForumClient` 也没有举报入口。
- 涉及文件路径：`/Users/wangrui/Documents/Web/supabase/migrations/20260704010000_phase0_security_hardening.sql`、`/Users/wangrui/Documents/Web/src/lib/forum.ts`、`/Users/wangrui/Documents/Web/src/components/forum/PostCard.tsx`
- 应该如何修改：改为“Post reporting backend table/RLS exists; UI/data-layer reporting flow not implemented”。本次已修正。

### `StatusSelect.tsx` 被当成当前主流程组件

- 文档原说法：`StatusSelect.tsx` 是 admin/status dropdown。
- 实际代码情况：`StatusSelect.tsx` 文件存在，但未被当前主流程导入；投递进度修改入口是 `ProgressDrawer` 内的状态轨道节点。
- 涉及文件路径：`/Users/wangrui/Documents/Web/src/components/applications/StatusSelect.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/ProgressDrawer.tsx`
- 应该如何修改：标记为 legacy/unused，不应让新 Codex 基于它修改当前投递状态交互。本次已修正。

### Historical correction: “No API routes / all data access from client components”

- 文档原说法：没有 API routes，所有 Supabase 调用都来自 client components。
- 实际代码情况：确实没有发现 `src/app/**/route.ts`，但 `/jobs/[id]` 使用 `src/lib/supabase/server.ts` 在服务端读取岗位详情。多数写入通过浏览器 Supabase client + RLS 完成。
- 涉及文件路径：`/Users/wangrui/Documents/Web/src/app/jobs/[id]/page.tsx`、`/Users/wangrui/Documents/Web/src/lib/supabase/server.ts`、`/Users/wangrui/Documents/Web/src/lib/supabase/client.ts`
- 2026-07-09 当时应该改成“多数 mutation 走浏览器 Supabase client + RLS；部分页面使用 server Supabase client”。截至 2026-07-13 已新增五个 App Router route handlers，当前事实见顶部审计。

### `.env.local.example` 状态写错

- 文档原说法：没有 `.env.local.example` 或需要确认是否存在。
- 实际代码情况：`.env.local.example` 存在，包含 public Supabase URL/key、anon key 和空的 `SUPABASE_SERVICE_ROLE_KEY`。
- 涉及文件路径：`/Users/wangrui/Documents/Web/.env.local.example`
- 应该如何修改：明确该文件存在；同时强调 service role 只能保持 server-only/空占位，不能进入浏览器代码。本次已修正。

### BottleStage “持续 requestAnimationFrame” 说法过时

- 文档原说法：BottleStage 即使静态也持续 RAF。
- 实际代码情况：当前 `BottleStage` 会在 resize 和 falling animation 阶段绘制；静态性能风险仍可关注，但“持续 RAF”不是准确描述。
- 涉及文件路径：`/Users/wangrui/Documents/Web/src/components/applications/BottleStage.tsx`
- 应该如何修改：改为“resize / falling animation 时重绘，高数量仍建议 profile”。本次已修正。

### 移动端主页“丢失视觉效果”说法过时

- 文档原说法：移动端主页可能丢失全部视觉效果。
- 实际代码情况：当前存在移动端轨道布局和响应式逻辑；它仍是视觉敏感区域，但不是简单降级为无视觉效果。
- 涉及文件路径：`/Users/wangrui/Documents/Web/src/components/galaxy/SpaceHome.tsx`、`/Users/wangrui/Documents/Web/src/components/galaxy/OrbitLines.tsx`
- 应该如何修改：改为“移动端主页有专门布局，但 orbit/label 对齐非常敏感，修改后需要截图验收”。本次已修正。

### 旧 PRD “风格冻结”被写成仍然有效

- 文档原说法：不要改视觉风格，PRD 冻结。
- 实际代码情况：近期需求已经多次要求整体视觉重构，当前项目已采用新的拾星视觉方向。继续写“风格冻结”会误导新对话拒绝合理的视觉修复。
- 涉及文件路径：`/Users/wangrui/Documents/Web/docs/prd/job-bottle-authoritative-prd-v6.md`、`/Users/wangrui/Documents/Web/src/styles/tokens.css`
- 应该如何修改：改为“除非用户明确要求，不要随意偏离当前视觉语言”。本次已修正。

### Forum RLS 线上状态不可从代码完全确认

- 文档原说法：必须手动运行 `fix_forum_rls.sql`。
- 实际代码情况：repo 中同时存在 `fix_forum_rls.sql` 和 `20260704030000_security_audit_followup.sql`，但本地代码无法证明线上 Supabase 当前到底运行了哪些 SQL。
- 涉及文件路径：`/Users/wangrui/Documents/Web/supabase/fix_forum_rls.sql`、`/Users/wangrui/Documents/Web/supabase/migrations/20260704030000_security_audit_followup.sql`
- 应该如何修改：改为“live Supabase must match migrations/fix SQL; verify when forum author display/read issues appear”。本次已修正。

### “Former names deprecated” 过于绝对

- 文档原说法：`秋招星瓶` 和 `未来星瓶` 都是 former/deprecated names。
- 实际代码情况：运行品牌是 `拾星`，但 `秋招星瓶` 仍作为项目/描述性文案出现；`未来星瓶` 不应再引入。
- 涉及文件路径：`/Users/wangrui/Documents/Web/src/components/galaxy/SpaceHome.tsx`、`/Users/wangrui/Documents/Web/src/components/layout/Navbar.tsx`、`/Users/wangrui/Documents/Web/public/brand/shi-xing-wordmark.png`
- 应该如何修改：保留“运行品牌：拾星；秋招星瓶可作为描述/历史语境；不要重新引入未来星瓶”。本次已修正。

## 4. Missing Important Context

### Auth refresh exceptions

文档强调投递状态更新不应 `router.refresh()` 是对的，但应补充：登录成功、登出、AdminShell 登出路径仍使用 `router.refresh()`，这属于 auth/session 刷新场景，不等同于投递状态交互 bug。

涉及路径：

- `/Users/wangrui/Documents/Web/src/components/auth/LoginForm.tsx`
- `/Users/wangrui/Documents/Web/src/components/layout/Navbar.tsx`
- `/Users/wangrui/Documents/Web/src/components/layout/AdminShell.tsx`

### Legacy / unused components

文档已经列出很多文件，但还应更明确区分“当前主流程”和“遗留组件”。否则新 Codex 容易改错文件。

建议标为 legacy/unused 或谨慎核验：

- `/Users/wangrui/Documents/Web/src/components/capture/CaptureOrbit.tsx`
- `/Users/wangrui/Documents/Web/src/components/applications/StatusSelect.tsx`
- `/Users/wangrui/Documents/Web/src/components/galaxy/MobilePlanetList.tsx`
- `/Users/wangrui/Documents/Web/src/components/galaxy/HeroConstellation.tsx`
- `/Users/wangrui/Documents/Web/src/components/applications/CompanyStar.tsx`
- `/Users/wangrui/Documents/Web/src/components/applications/StackedStar.tsx`

### Schema file is not the final schema by itself

`supabase/schema.sql` 不是单独的最终事实来源，最终数据库形态来自 `schema.sql` + `policies.sql` + `supabase/migrations/*`。例如 `job_categories`、security hardening、events/status history、resumes 都来自迁移。

涉及路径：

- `/Users/wangrui/Documents/Web/supabase/schema.sql`
- `/Users/wangrui/Documents/Web/supabase/policies.sql`
- `/Users/wangrui/Documents/Web/supabase/migrations/20260704010000_phase0_security_hardening.sql`
- `/Users/wangrui/Documents/Web/supabase/migrations/20260704040000_job_categories.sql`
- `/Users/wangrui/Documents/Web/supabase/migrations/20260708090000_resumes.sql`

### `reports` is backend-only

`reports` 表和 RLS 存在，但没有完整 UI 和 data-layer 函数。新对话如果接手论坛安全功能，应该从 `src/lib/forum.ts` 和 `PostCard` 增补，而不是以为已有流程。

### Excel import is already implemented

用户后续想通过 Excel 上传新数据。文档应更明确：当前 import pipeline 已支持 `.xlsx`/`.xls` 的浏览器解析，核心入口是 `src/lib/csv.ts` 的 `parseJobFile` 和 admin import 面板。

### Copy inventory exists

文案盘点文件存在，新对话做文案/视觉调整时应参考它。

涉及路径：

- `/Users/wangrui/Documents/Web/docs/copy-inventory.md`

### Authoritative PRD and local old PRDs

当前 tracked PRD 中 `docs/prd/job-bottle-authoritative-prd-v6.md` 是重要上下文；同时工作区存在多个 untracked old PRD draft。新对话不应把旧草稿当作最新需求，也不应擅自删除。

本次观察到的 untracked PRD drafts：

- `/Users/wangrui/Documents/Web/docs/prd/job-bottle-prd-v3.md`
- `/Users/wangrui/Documents/Web/docs/prd/job-bottle-prd-v4-bottle-system.md`
- `/Users/wangrui/Documents/Web/docs/prd/job-bottle-redesign-prd.md`
- `/Users/wangrui/Documents/Web/docs/prd/job-bottle-style-prd-v5.md`
- `/Users/wangrui/Documents/Web/docs/prd/job-bottle-tech-spec.md`

### Filter UX detail

岗位筛选使用 URL 参数和 `window.history.replaceState`，不是每次都完整导航刷新。后续改筛选时要保持这个体验。

涉及路径：

- `/Users/wangrui/Documents/Web/src/components/jobs/HomeClient.tsx`
- `/Users/wangrui/Documents/Web/src/lib/jobs.ts`

### Live deployment assumptions

分享二维码和用户使用都指向 Vercel live host，但 repo 没有 `vercel.json`。部署设置和环境变量主要在 Vercel dashboard/CLI 侧，文档应提醒新对话不要仅凭 repo 判断线上行为。

涉及路径：

- `/Users/wangrui/Documents/Web/src/components/applications/shareBottleCard.ts`
- `/Users/wangrui/Documents/Web/.env.local.example`

## 5. Risk Assessment

### High Risk

- 如果新 Codex 相信“论坛举报已完整实现”，会基于不存在的 UI/API 做错误假设，或者遗漏真正需要补的论坛安全入口。
- 如果新 Codex 只读取 `supabase/schema.sql` 而忽略 migrations，会误判数据库字段和 RLS，尤其是 `job_categories`、`reports`、`status_history`、`resumes`。
- 如果新 Codex 将 `SUPABASE_SERVICE_ROLE_KEY` 放入前端、日志、Git 或公开环境变量，会造成严重安全风险。当前仅允许 `server-only` client、route handlers 和本地管理脚本消费它。
- 如果新 Codex 把旧 PRD drafts 当作当前唯一需求，会与现有产品方向冲突。

### Medium Risk

- 论坛普通作者名不再依赖公开 profile RLS；它依赖 Vercel Production 的 server-only service role 和 `/api/forum/authors`。该线上链路已实测，Preview 环境变量仍需按需配置。
- 岗位列表仍缺少真正分页；数据量继续增长会影响体验和性能。
- 多数 mutation 依赖浏览器 Supabase client + RLS，没有服务端 action/API 聚合层；后续 admin 或安全功能必须特别谨慎。
- 首页轨道、投递轨道、星瓶 Canvas 都是视觉敏感区域，CSS/数学参数改动后必须实际截图检查桌面和移动端。
- `router.refresh()` 在 auth 场景仍存在，不能机械全局删除；但投递状态更新路径禁止整页刷新。

### Low Risk

- `withTimeout()` 等小工具存在重复实现，会增加维护成本但不阻断主流程。
- 部分旧组件仍在仓库里，容易造成阅读噪音。
- loading/error 状态比较轻量，没有完整 skeleton/error boundary。
- `.env.local.example` 中同时列出 publishable 和 anon key，概念上容易混淆，但当前 client/server helper 会优先使用 publishable key。

## 6. Required Fixes to PROJECT_CONTEXT.md

### 已直接修正

- 修改位置：Product Overview / Brand & naming
- 问题：把 `秋招星瓶` 和 `未来星瓶` 都写成 deprecated former names 过于绝对。
- 建议改法：运行品牌写 `拾星`；`秋招星瓶` 作为描述/历史语境仍可出现；不要重新引入 `未来星瓶`。
- 涉及代码路径：`/Users/wangrui/Documents/Web/src/components/galaxy/SpaceHome.tsx`、`/Users/wangrui/Documents/Web/public/brand/shi-xing-wordmark.png`

- 修改位置：Product Overview / Deployment
- 问题：部署状态写成 assumed，不够准确。
- 建议改法：写明 Vercel 是当前 live target，repo 无 `vercel.json`，需要核对 Vercel dashboard 设置。
- 涉及代码路径：`/Users/wangrui/Documents/Web/src/components/applications/shareBottleCard.ts`

- 修改位置：Tech stack
- 问题：遗漏 `@supabase/supabase-js` 和 `read-excel-file`。
- 建议改法：补充 Supabase Client 和 Excel import 依赖。
- 涉及代码路径：`/Users/wangrui/Documents/Web/package.json`、`/Users/wangrui/Documents/Web/src/lib/csv.ts`

- 修改位置：Feature Map / Forum
- 问题：把举报系统写成已完整实现。
- 建议改法：改成 backend-only reports table/RLS。
- 涉及代码路径：`/Users/wangrui/Documents/Web/supabase/migrations/20260704010000_phase0_security_hardening.sql`、`/Users/wangrui/Documents/Web/src/lib/forum.ts`

- 修改位置：File-by-File Index / applications
- 问题：`StatusSelect.tsx` 被描述为当前使用组件。
- 建议改法：标记为 legacy/unused，当前状态修改在 `ProgressDrawer`。
- 涉及代码路径：`/Users/wangrui/Documents/Web/src/components/applications/StatusSelect.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/ProgressDrawer.tsx`

- 修改位置：Architecture Summary / Technical Debt
- 问题：写成“所有 Supabase 调用都来自客户端”。
- 建议改法（已再次更新）：列出当前五个 route handlers；普通 mutation 仍多走 browser client + RLS，特权/鉴权操作走服务端 route。
- 涉及代码路径：`/Users/wangrui/Documents/Web/src/app/jobs/[id]/page.tsx`、`/Users/wangrui/Documents/Web/src/lib/supabase/server.ts`

- 修改位置：Known Issues / Open Questions
- 问题：`.env.local.example`、BottleStage RAF、移动端主页、风格冻结、forum RLS 等描述过时或过度确定。
- 建议改法：按当前代码和可验证状态改为更精确表达。
- 涉及代码路径：`/Users/wangrui/Documents/Web/.env.local.example`、`/Users/wangrui/Documents/Web/src/components/applications/BottleStage.tsx`、`/Users/wangrui/Documents/Web/src/components/galaxy/SpaceHome.tsx`

### 仍建议 Hermes 后续补充

- 修改位置：File-by-File Index
- 问题：没有足够明确地区分 active components 和 legacy components。
- 建议改法：增加 “Legacy / verify before editing” 小节。
- 涉及代码路径：`/Users/wangrui/Documents/Web/src/components/capture/CaptureOrbit.tsx`、`/Users/wangrui/Documents/Web/src/components/galaxy/MobilePlanetList.tsx`、`/Users/wangrui/Documents/Web/src/components/applications/CompanyStar.tsx`

- 修改位置：Database / Backend / API Notes
- 问题：数据库最终形态容易被理解为 `schema.sql` 单文件决定。
- 建议改法：明确最终 schema = `schema.sql` + `policies.sql` + all migrations。
- 涉及代码路径：`/Users/wangrui/Documents/Web/supabase/schema.sql`、`/Users/wangrui/Documents/Web/supabase/migrations`

- 修改位置：Development Guidelines
- 问题：还可以更明确地提醒不要把 service role key 暴露给浏览器。
- 建议改法（已再次更新）：把 `SUPABASE_SERVICE_ROLE_KEY` 标为 server-only；`supabase/admin.ts`、admin/forum routes 和导入脚本会消费它，但客户端不得访问。
- 涉及代码路径：`/Users/wangrui/Documents/Web/.env.local.example`、`/Users/wangrui/Documents/Web/src/lib/supabase/client.ts`

## 7. Recommended Final Context for New Codex

这是一个 Next.js App Router + Supabase 项目，产品名当前以“拾星”为主，是面向 2027 秋招的中文求职管理工具。核心链路是：用户在 `/explore` 或 `/jobs/[id]` 浏览岗位，点击官网投递后创建/更新 `user_applications`，打开公司官网，并把记录同步到投递星图和星瓶；用户可在 `/my` 更新状态，在 `/bottle` 生成分享 PNG/PDF，在 `/resume` 编辑简历。简历下载必须经服务端确认登录，未登录草稿会保存在浏览器并在注册后恢复。论坛帖子原位展开，普通用户名称脱敏，管理员可全站置顶。

新对话应先读：

1. `/Users/wangrui/Documents/Web/src/app/page.tsx`
2. `/Users/wangrui/Documents/Web/src/components/galaxy/SpaceHome.tsx`
3. `/Users/wangrui/Documents/Web/src/components/jobs/HomeClient.tsx`
4. `/Users/wangrui/Documents/Web/src/lib/jobs.ts`
5. `/Users/wangrui/Documents/Web/src/lib/applications.ts`
6. `/Users/wangrui/Documents/Web/src/components/applications/MyApplicationsClient.tsx`
7. `/Users/wangrui/Documents/Web/src/components/applications/ProgressDrawer.tsx`
8. `/Users/wangrui/Documents/Web/src/components/applications/ApplicationBottle.tsx`
9. `/Users/wangrui/Documents/Web/src/components/applications/BottleStage.tsx`
10. `/Users/wangrui/Documents/Web/src/components/applications/shareBottleCard.ts`
11. `/Users/wangrui/Documents/Web/src/styles/tokens.css`
12. `/Users/wangrui/Documents/Web/src/app/globals.css`
13. `/Users/wangrui/Documents/Web/supabase/schema.sql`
14. `/Users/wangrui/Documents/Web/supabase/policies.sql`
15. `/Users/wangrui/Documents/Web/supabase/migrations/*`
16. `/Users/wangrui/Documents/Web/scripts/smoke_check.mjs`
17. `/Users/wangrui/Documents/Web/src/components/onboarding/WelcomeNotice.tsx`
18. `/Users/wangrui/Documents/Web/src/components/auth/LoginForm.tsx`
19. `/Users/wangrui/Documents/Web/src/components/resume/ResumePdfExportButton.tsx`
20. `/Users/wangrui/Documents/Web/src/app/api/resume/download-auth/route.ts`
21. `/Users/wangrui/Documents/Web/src/components/forum/ForumClient.tsx`
22. `/Users/wangrui/Documents/Web/src/components/forum/PostCard.tsx`
23. `/Users/wangrui/Documents/Web/src/app/api/forum/authors/route.ts`
24. `/Users/wangrui/Documents/Web/src/app/api/admin/forum/pin/route.ts`

最大风险：

- 不要把旧 PRD drafts 当成当前唯一需求；以用户最新指令和真实代码为准。
- 不要把 `reports` 当成已完成的论坛举报功能；目前主要是 DB/RLS。
- 不要只看 `schema.sql` 判断数据库，必须连同 migrations 一起看。
- 不要把 `SUPABASE_SERVICE_ROLE_KEY` 用进前端或 `NEXT_PUBLIC_*`。
- 不要为论坛昵称重新开放 `profiles` 公共读取；沿用服务端脱敏作者接口。
- 不要把已提交的 `20260713193000_forum_admin_pinning.sql` 误写成已确认在线执行；迁移状态需单独核验。
- 不要在投递状态更新路径使用整页刷新；`ProgressDrawer` 已是乐观更新模式。
- 不要随便改首页轨道、投递轨道和星瓶几何参数，改后必须桌面和移动端截图验收。

当前代码有五个受保护或受约束的 route handlers：`/api/admin/users`、`/api/admin/forum/pin`、`/api/forum/authors`、`/api/resume/ai-polish`、`/api/resume/download-auth`。大多数普通用户写入仍通过浏览器 Supabase client 和 RLS 完成，`/jobs/[id]` 使用 server Supabase client 读取。部署目标是 Vercel live URL `https://www.starjob.space/`，repo 无 `vercel.json`；Production 已配置 Sensitive service-role key，但 Preview 未配置。开发后至少运行类型检查、lint、build 和 `scripts/smoke_check.mjs`。

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
