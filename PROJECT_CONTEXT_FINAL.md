# 拾星 StarJob — 最终完整确认版交接文档

## 三文档不可绕过死命令（2026-08-09 起）

**死命令：任何代码、组件、样式、路由、API、类型、脚本、migration / RLS / DDL、数据库或外部数据写入、数据源或导入规则、环境变量、自动化、依赖、产品或视觉决策、测试、Git、部署、回滚、风险边界或验证证据只要发生变化，都必须在同一工作会话内同时、等量更新 `PROJECT_CONTEXT_FINAL.md`、`PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md`。三份任一漏写、内容不一致或缺少证据时，禁止暂存、提交、推送、部署、宣称完成或交接。后续代理无权跳过、弱化、延期、改成单文档记录，也不得用聊天记录、代码注释、提交信息或其他文档替代。**

每次三文档记录至少写明：日期、用户目标、根因/决策、实际改动文件与行为、兼容边界、验证命令和结果、提交与部署证据（如有）、已确认和未确认的外部状态。若本次只完成诊断而没有修改，也必须在三份文档中同步写清“零修改/零部署”及诊断证据。
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

## 2026-08-09 已上线补丁：英文译本姓名优先级与受限拼音

> 当前 `main` / `origin/main` / production 基线为 `417dce8`（`fix: prefer English names in translated resumes`）。Patrick Vercel deployment `FtKvhEDjwWuKK9cPQDTnAwPGJWu9` 已返回 `success / Deployment has completed`。

- 上一版把姓名完全排除模型虽然避免了乱改，但保护过度：英文 PDF 会优先显示 `englishName`，译本数据里的 `name` 仍可能保留中文，导致编辑页及后续网申同步与预览不一致。
- 新规则只在转英文时生效：用户已填写 `englishName` 时，它确定性覆盖英文译本的 `name` 与 `englishName`，不交给模型；英文名为空且 `name` 含中文时，才新增一个 `person_name_pinyin` 短键，要求汉语拼音姓在前、名在后、首字母大写，不得创造英文名。原姓名已是拉丁字符时直接保留并同步到两个姓名字段。转中文时不根据英文名反向猜测中文姓名。
- 拼音返回还必须通过服务端拉丁姓名字符白名单，只允许英文字母、空格、点、撇号和连字符；包含汉字、数字或其他内容时拒绝该区块，完整译本仍保持原子失败。客户端创建英文副本时也再次以已返回的 `englishName` 统一姓名，兼容先前服务端结果。
- Smoke 同时覆盖“已填 `Stella Wang` 确定性优先”和“英文名为空时 `王小星` → `Wang Xiaoxing`”两条路径。真实服务配置的合成姓名探针 1.34 秒返回 HTTP 200 / `Wang Xiaoxing`，reasoning 为 0，并通过拉丁字符安全门；TypeScript、定向 ESLint、完整 Smoke、55-route build 和 diff check 通过。
- 正式 `/resume` 为 200，网页及两个小程序翻译入口匿名 POST 继续为 401；路由、分块/进度、限流、原子合并、旧 JSON、小程序兼容和原简历保护均未改变。没有正式登录账号，因此未把合成姓名探针声明为 production authenticated E2E。

## 2026-08-09 已上线：简历翻译短键分块、原子合并与真实进度

> 当前 `main` / `origin/main` / production 基线为 `c7bfebfc3b81df710621b98f52f15ce0b57a1991`（`fix: translate resumes in resilient chunks`）。Patrick Vercel deployment `po5SRvex5n5TnNgoLMs2UdTQTJ4E` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- 前一版虽然已修复 thinking 空转和 32 秒误报，但仍把整份简历及完整返回结构压在一次严格 JSON 生成中。长简历需要模型一次生成所有字段、数组和原样字段，输出越长，等待和任一字段结构失败的概率越高；合成大简历曾超过 75 秒。这是用户继续遇到慢和失败的主因，不是简历无法被本地读取，也不是密钥失效。
- 新实现先在服务端把非空、确需翻译的文字叶子转换为 `t0`、`t1` 等短键，每块最多 24 项且源文字约 1,800 字，两块并行。每个小块最多等待 60 秒，整份仍保留 150 秒总窗口；一次用户请求只做一次登录校验和一次限流扣槽，不因分块重复计数。空响应、非法 JSON 或键结构异常的小块可重试一次。
- 用户填写的英文名、所有日期、GPA 和 `current` 不进入模型区块；仅在转英文且英文名为空时，中文姓名可以一个受拉丁字符校验的 `person_name_pinyin` 短键生成拼音。联系方式、照片和链接继续只在客户端创建副本时从原简历保留。每块必须完整返回已知且唯一的短键，全部区块成功后才在服务端按受控路径写入克隆结构并执行最终 Zod/数组/bullet 校验；任何一块失败都不会产生半份译本，也不会改动原简历。
- 网页端显式使用 NDJSON 进度流，只有真实区块完成才更新百分比，并在页面底部持续显示当前区块、已完成数量和“原简历不会改动”；保留取消操作、`progressbar` 无障碍属性及系统减弱动态效果。旧网页调用方和两个小程序入口不传 `progressMode` 时继续收到原来的最终 JSON，路径、请求/响应结构、180 秒函数上限和独立译本行为均保持兼容。
- 真实服务配置的双区块并行探针各含 16 项，分别约 23.0 秒和 21.2 秒，总耗时约 23.0 秒；32/32 短键完整、finish reason 为 `stop`、reasoning 长度为 0。TypeScript、定向 ESLint、完整 Smoke、55-route production build、`git diff --check` 均通过；Smoke 额外覆盖长简历分块上限、短键连续性、确定性字段不入模型、原子合并和独立译本。
- 桌面与 390×844 手机视口实测无横向溢出，进度状态采用固定任务条而不挤动编辑布局。正式 `/resume` 返回 200，线上客户端资源检出 NDJSON、`progressMode`、翻译进度、区块计数、原简历保护和取消标记；网页、小程序兼容和旧版小程序简历三个翻译入口的匿名 POST 均继续返回 401。
- 本轮无 migration、hosted DDL、Supabase 数据写入、环境变量变更、扩展安装包或小程序客户端发布。没有可用正式登录测试账号，因此没有把部署、匿名鉴权或直接上游合成探针写成正式域名真实简历的已登录端到端通过。用户既有 `package.json`、`.codex-artifacts/` 与五份未跟踪 PRD 未暂存、未提交。

## 2026-08-09 已修复：简历中英双语翻译空响应与长简历超时

> 当前 `main` / `origin/main` 基线为 `6ee31a7`（`fix: align translation runtime config`），主体功能提交为 `ac6cf54`（`fix: make resume translation reliable`）。Patrick Vercel deployment `EnG6YdBxiSyoBRo9j1dgE4qBA5ZK` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- 用户看到“AI 未返回译文”的真实原因不是密钥失效：上游已经返回 HTTP 200 响应头，但 32 秒内正文尚未读取完成；旧代码用 `response.json().catch(() => null)` 吞掉正文读取阶段的 `AbortError`，再把空 payload 错分为“未返回”。翻译接口同时未关闭结构化请求的 thinking，进一步放大长简历耗时。
- 网页翻译已关闭 thinking，服务端上游窗口从 32 秒提高到 150 秒，浏览器窗口从 38 秒提高到 165 秒，Vercel 函数上限为 180 秒。正文读取超时现在明确返回 504；非法 JSON、真实空正文、鉴权和繁忙分别保留独立错误，不再用“AI 未返回”覆盖不同故障。
- 两个既有小程序翻译入口同步保留 180 秒函数窗口，继续复用原网页翻译实现和原数据契约；没有删除、改名或重定义任何网页、小程序、简历结构、频率保护或原文保护能力。失败仍不改动原简历，成功仍创建独立语言副本。
- 安全日志只新增耗时、结束原因和 reasoning 长度等非内容元数据，不记录简历正文、模型原始响应或密钥；严格 JSON、条目数量、bullet 数量、日期/GPA/current 原样保护和原联系方式保留均未放宽。
- 验证通过：定向 ESLint、`npx tsc --noEmit`、完整 `npm run smoke`、55-route `npm run build`、`git diff --check`。真实服务合成简历探针在 22.3 秒返回 HTTP 200，thinking/reasoning token 为 0，教育、工作、项目、技能及 bullet 数量全部通过结构校验。正式 `/resume` 为 200；网页翻译、小程序兼容翻译和旧版小程序简历翻译匿名请求均为 401；线上客户端 chunk 检出 `165e3`、翻译超时、长任务进度与取消翻译标记。正式探针显示 Node 函数仍由项目级 `iad1` 区域执行；App Router 的 `preferredRegion` 仅适用于 Edge runtime，因此没有保留无效路由配置，也没有为本次热修迁移全站函数区域。当前没有可用真实登录账号，故未把正式域名的真实简历翻译写成已登录端到端通过。

## 2026-08-05 已启用：腾讯文档 27 秋招岗位自动同步

> 当前 Git / production 基线为 `main` / `origin/main` / `f27af05`；功能提交为 `1aa669c`，GitHub runner 兼容修复为 `f27af05`。Vercel deployment `6CcfYxzv1kxpAJ5eRJuyF6Vjm96W` 已返回 `success / Deployment has completed`。GitHub Actions 手动验收 run `31013563683` 已成功，正式定时 workflow 已生效。

- 数据源严格锁定腾讯文档 `DY0VXc3BFTFJUbUhw`、表 `t3r1vl`、视图 `vdHovb`。`scripts/sync_27_autumn_jobs.mjs` 使用公开匿名页面提供的数据入口读取实时 SmartSheet，不需要登录，也不依赖导出按钮位置；来源地址、数据入口的文档/表/视图任一不一致即停止。
- 只允许批次以“27秋招”开头的记录。只要源内出现任何非 27 秋招批次，本次任务整批零写入；缺批次、缺公司、缺链接或链接无效的行只记录并跳过。2026-08-05 实时源共有 397 条记录，其中 393 条有效 27 秋招、0 条非 27、4 条无效（1 条提示语、3 条原始投递链接格式错误）。
- 去重采用三层校验：腾讯 record ID 映射为稳定 UUID；完整业务指纹匹配历史 Excel 导入；公司+清洗后链接+批次或公司+开启时间+批次匹配旧记录。读取数据库时分页取得全部岗位，链接会解码 HTML 转义并移除跟踪参数。首次执行识别并跳过历史导入 354 条，新增 39 条后网站岗位从 372 条增至 411 条；紧接着第二次 dry-run 为新增 0、更新 0、unchanged 39、历史跳过 354，已验证幂等。
- 手工 Excel 导入也改为只读取工作表 `27秋招正式批+提前批`，在前 10 行内定位必要表头，并逐行拒绝非 27 秋招；绝不再默认读取第一张 26 秋招工作表。用户样例文件该表共 389 行，表头在第 2 行，386 条带批次数据均为 27 秋招。
- 本机 Codex 自动化 ID `27` 已启用，每天北京时间 09:00、12:00、15:00、18:00、21:00 运行测试后再执行同步；正常运行静默、失败提醒。`.github/workflows/sync-27-autumn-jobs.yml` 也已推送并按相同北京时间配置 GitHub 托管 schedule，仓库 Actions secrets `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 已设置（仅核验名称和更新时间，值未输出）。首次 run `31013414780` 证明 Node 20 缺少 Supabase 当前客户端要求的原生 WebSocket，零数据库写入后失败；改为 Node 24 后，run `31013563683` 的安装、8 项测试和真实同步全部成功。
- 2026-08-09 对话收纳补充：Codex 自动化 `27` 的提示已要求每次运行完成结果报告后调用 `set_thread_archived` 归档当前自动任务；成功、无变化或安全校验失败但已形成报告时都归档，不使用文本归档指令。已精确识别并归档此前由自动化 `27` 生成的 18 个闲置任务，未处理其他项目或普通对话；自动化仍为 `ACTIVE`，执行时间和失败提醒策略不变。
- 2026-08-14 自动归档顺序修复：上一版把归档放在“最终摘要输出完成后”，而最终摘要已经结束任务，导致后续归档工具没有执行机会。自动化 `27` 现改为在发送最终摘要前先真实调用 `set_thread_archived`，工具完成后再发送摘要；本次另行精确归档 16 个由自动化 `27` 生成的任务，复查未归档列表已无同名自动任务，其他对话未处理。自动同步仍为 `ACTIVE`，时间、数据校验和失败提醒均未改变。
- 2026-08-17 对话生成机制修复：自动任务即使提示自我归档仍持续生成独立侧边栏任务，说明 cron 的“每次独立任务”机制不适合本需求。自动化 `27` 已从 `cron` 改为附着当前主项目对话 `019fd078-91bd-7d61-8af2-638f91b1b470` 的 `heartbeat`；同步命令、27 秋招安全校验、北京时间 09:00/12:00/15:00/18:00/21:00、`ACTIVE` 状态和仅失败提醒均保持。另精确归档 13 个新生成的自动化 `27` 任务，复查最近 30 个未归档任务中同名任务为 0。后续检测结果进入当前主对话，不再为每次运行创建新的侧边栏任务。
- 验证通过：Node 8 项防误导入/去重测试、脚本语法、定向 ESLint、`npx tsc --noEmit`、完整 `npm run smoke`、55-route `npm run build`；首次 apply 写入 39 条，随后的 dry-run 为零新增。GitHub 成功 run 再次读取 397 条源记录，得到 393 条有效 27、0 条非 27、现有 411、新增/更新/写入均为 0。构建前确认并清理了 `.next/types` 中 3 个内容完全相同的数字后缀生成缓存副本，它们均受 `.gitignore` 管理、可由构建重建。

## 2026-08-03 已上线：网申助手 0.2.2 自我描述、显式出生日期与安全校验修复

> 本节是当前第一权威状态。功能提交为 `55bd498`，用户界面供应商去标识提交为 `af0fe57`；`main` / `origin/main` 已同步到 `af0fe57`。Patrick Vercel deployment `DwUUCDgVzjdU592ZYjegBrqsKNXc` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- “AI 结果未通过安全校验”的真实根因已用 50 个企业表单长度字段复现：旧实现要求 AI 原样回传最长约 520 字符的 `fieldKey`，50 项输出会超过 4,500 output token 并截断 JSON。服务端现在只向 AI 发送 `f0`、`f1` 等短键，通过全部校验后再映射回原页面键；原始字段键从未放弃校验。空字段偶发返回 `confidence:null` 时仅归一为 0，任何实际填写值仍必须满足 `confidence >= 0.82`、事实来源、字段类型和选项白名单。
- 允许为“自我描述 / 自我评价 / 个人总结 / 个人优势 / 个人简介 / profile summary”生成简历事实概述；公司、学校、岗位、数字、技能和成果不得新增，未在简历出现的性格、评价或愿望词会被过滤。在读教育不得写成“毕业于”。Why company/role、求职动机、职业规划、可入职时间、测评和其他主观题继续留空。
- `ResumeBasics` 新增可选 `birthDate`，简历基础编辑页以原生日期输入让用户明确保存。出生日期只有在页面确有出生日期字段时才进入 AI 请求；没有保存就继续视为敏感字段，绝不从年龄、教育日期或证件号推断。JSONB 结构兼容旧简历，无数据库迁移；小程序旧请求缺少该键时默认空字符串。
- 扩展本地规则新增 `basics.birthDate`，支持普通输入和只读日期组件。Ant 等日期面板的年份导航上限由 12 次提升为 150 次；浏览器夹具已从 2026 年连续导航至 2000 年并精确点选 `2000-02-03`。身份证、出生地、年龄、性别、协议 checkbox、验证码、密码、附件和自动提交继续排除。
- 正式用户界面不再展示任何 AI 供应商或具体模型名称：扩展进度、超时文案、官网说明、README 和隐私说明统一只写“AI 智能填写 / AI 分析”；服务端内部配置和调用链保持不变。
- 真实本地服务 AI 探针：50 个超长字段由此前约 51 秒 / HTTP 502 改为 10.4 秒 / HTTP 200，返回自我描述、出生日期和姓名，其余 47 个无依据字段为空；最终三字段回归为 2.9 秒 / HTTP 200，自我描述正确使用“本科在读”。浏览器夹具 `STARJOB_AI_AUTOFILL_TEST_PASS` 同时验证自我描述、26 年日期导航、select、radio、已有值保留和敏感字段排除。
- 正式包为 `public/downloads/starjob-resume-assistant-v0.2.2.zip`，135,555 bytes，SHA-256 `2d05bd7aaf2e59f2c966950e45992187c84021328471d6bed84d05e9525eaca3`。线上下载包大小、哈希、manifest 0.2.2 均与本地一致；`/extension` 与 `/extension/guide` 已显示 0.2.2，用户可见页面和 ZIP 内用户文案供应商名称命中数均为 0。0.1.7–0.2.1 五个旧包与 0.2.2 均为 HTTP 200，旧同步协议和两个原有填写模式未删除。
- 验证通过：定向 ESLint、`npx tsc --noEmit`、完整 `npm run smoke`、55-route `npm run build`、`git diff --check`、扩展可复现构建、真实服务 AI 合成请求、浏览器日期夹具、GitHub Vercel deployment success、正式页面 / ZIP / 旧包兼容探针；匿名 `extension-autofill` 仍为 401。边界是尚未在用户真实携程表单完成“安装 0.2.2 → 重新同步含 birthDate 简历 → 整页 AI 填写 → 人工核对”的最终验收，不声明所有私有 combobox、跨域 iframe 或 shadow DOM 已兼容，也没有自动提交网申。`package.json`、`.codex-artifacts/` 与五份未跟踪 PRD 仍属用户既有内容，未纳入提交。

## 2026-08-03 已上线：网申助手 AI 智能填写与 0.2.1 长表单修复

> 本节是 0.2.1 历史基线，当前状态以上方 0.2.2 节为准。功能提交为 `e6f075c71a07ee57b625026683df142961402940`，长表单与事实校验补丁为 `9e4e25b`（`fix: harden AI application autofill`）；Patrick Vercel deployment `5zKM1joDnUs3zda61s7VmmDiGbeS` 已返回 `success / Deployment has completed`。

- 扩展弹窗“填写方式”已新增“AI 智能填写”，与“只填空白项”“覆盖已有内容”并列。MiMo 按页面从上到下处理全部安全字段；直接简历事实、姓名拼音、日期/电话格式、明确毕业状态、原生下拉和安全单选可以填写，简历没有依据的内容保持空白。
- AI 模式始终只填空白项，不覆盖页面已有内容。直接简历事实使用绿色边框，派生值使用琥珀色边框；身份证、人口属性、薪资、法律/隐私同意、验证码、密码、主观申请题、文件和提交继续排除，最终提交必须由用户完成。
- 大表单不再把最多 100 个字段压在一次 MiMo 请求中：0.2.1 按页面顺序每 50 个字段一批，每批客户端最多等待 60 秒、服务端上游最多等待 50 秒；所有批次成功后才统一写入页面，因此完整流程可以超过 60 秒而不会部分改页。
- 服务端新增事实校验层：`basis=resume` 的值必须由简历原文事实构成；模型省略的字段按原顺序补为 null；毕业/在读/应届选项根据简历教育结束日期和当前月份确定并覆盖模型错误选择；拼音仅允许在明确的拼音/姓名拆分字段输出拉丁字符。严格 JSON、字段键、值长度、选项、`confidence >= 0.82`、HMAC 令牌、128 KB 请求体和每用户限流继续生效。
- 正式包为 `public/downloads/starjob-resume-assistant-v0.2.1.zip`，大小 133,778 bytes，SHA-256 `5bfb31a349810f7c8f56821d6559d5bf9d0974cb4ce1a878ed55b2fab5b20ecd`。官网 `/extension` 与 `/extension/guide` 已指向 0.2.1；0.1.7、0.1.8、0.1.9、0.2.0 四个旧包仍返回 HTTP 200，旧同步协议与两个原有填写模式未删除，0.2.0 AI 仍可用但保留 22 秒限制。
- 验证通过：扩展 JS 语法、定向 ESLint、`npx tsc --noEmit`、`npm run smoke`、55-route `npm run build`、`git diff --check`。真实 MiMo 压测中 12 字段 11.4 秒、60 字段 31.6 秒；最终正式域名授权合成请求 7.7 秒返回 200，姓名、`Wang Xiaoxing` 和 2027 毕业对应“是”均正确，身份证不返回。Chrome 填表夹具得到 `STARJOB_AI_AUTOFILL_TEST_PASS`，确认文本、select、radio 写入、已有邮箱保留和敏感控件不动。
- 生产验证：0.2.1 线上 ZIP 哈希与本地一致，下载页与教程页文案命中，`extension-autofill`、原 `extension-match` 和 `extension-profile` 匿名探针均为 401。边界是尚未拿用户真实简历在安永等企业 ATS 完成一次人工核对后的整页验收，重型安永页面只读自动扫描曾超时，因此不声明所有自定义 combobox、跨域 iframe 或 shadow DOM 已兼容；没有自动提交任何网申。`package.json`、`.codex-artifacts/` 与五份未跟踪 PRD 仍属用户既有内容，未纳入提交。

## 2026-08-01 已上线：诘星回答切换 DeepSeek V4 Flash，MiMo ASR 保持独立

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `128f3dc488b6068c8f763f6a03c9114d85affdbf`（`feat(star-interview): route answers through DeepSeek V4 Flash`），正式域名为 `https://www.starjob.space/`。

- `/api/star-interview/completion` 已只读取 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL` 与 `DEEPSEEK_MODEL`，默认模型为 `deepseek-v4-flash`；上游参数使用 DeepSeek 兼容的 `thinking: { type: "disabled" }`、`max_tokens` 与 JSON Object 输出。服务端仍是实际模型选择权威。
- `/api/star-interview/asr` 继续独立读取 `MIMO_API_KEY`、`MIMO_ASR_BASE_URL` 与 `MIMO_ASR_MODEL`，默认仍为 `mimo-v2.5-asr`。回答模型和 ASR 的密钥、地址、模型配置不再共用同一对象，任一侧改动不会使另一侧被错误判定为未配置。
- Completion 请求兼容已安装 Build 37 的旧 `mimo-v2.5` 客户端标记，也接受 Build 38 的 `deepseek-v4-flash` 标记；两者都由服务端路由到当前 DeepSeek 配置，客户端不能覆盖上游模型。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、54-page production build、`npm run smoke`、`git diff --check`；诘星流式/模型边界测试 9 项通过，微信支付测试在 `react-server` 条件下 4 项通过。macOS Build 38 全套 204 项测试通过，发现并修复 actor 隔离测试沿用生产 180 秒网络等待的问题，整套测试约 8 秒完成，生产超时默认值未改。
- 生产验证：`GET /api/star-interview/health` 返回 HTTP 200 及 `{"status":"ready","completion":"ready","asr":"ready"}`；未登录 completion 与 ASR 探针均返回预期 401。macOS Release Build 38 严格验签通过并安装到 `/Applications/StarInterview.app`，LaunchServices 与 Spotlight 只登记这一份，安装可执行文件 SHA-256 为 `716d97a875079b58299e017a53f17225ac84788791d5b987225689679c00a42f`。
- 当前 Vercel CLI 身份连接的是 Ray 的同名项目且没有三项 DeepSeek 变量，因此本轮没有误执行 `vercel --prod`；代码通过 Patrick GitHub `main` 的正式集成链路切流，并以正式域名新 health 结构为生产证据。变量值从未拉取或写入本地。
- 边界：Build 38 可见界面未登录拾星，随后 Mac 锁屏；没有绕过锁屏、读取 Keychain 或代用户输入凭据，所以尚未完成真实登录态的回答生成、流式 JSON、余额扣费与真实音频 ASR 端到端。Health 证明两套生产配置可见，但不等同于已调用两家上游成功。本轮没有 migration、hosted DDL、Supabase 数据写入或小程序发布；既有 `package.json`、`.codex-artifacts/` 与五份未跟踪 PRD 未纳入提交。

## 2026-07-27 已上线：简历 AI 细节补充与强制核实

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `6f6604899b9e2c2e8b80b1d8874e5a9986dff1cf`（`feat: require verification for AI resume details`）。GitHub Production deployment `5624719350` 已为 `success`，环境 URL 为 `https://job-bottle-elsdkw9j1-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/resume`。

- 网页端分段简历润色已按 `/Users/wangrui/Downloads/resume_interview_skills/resume-experience-rewriter/SKILL.md` 的事实台账、责任边界、安全量化和可追问性规则调整。AI 优先使用已确认事实与可安全推导内容，数字、成果、客户、组织、技能、职责等级和因果关系仍禁止推测。
- 原文明显缺少方法、范围或业务背景时，AI 可以补充少量非量化候选细节，但必须把每一项写入结构化 `verificationItems`，说明建议稿中的具体新增表述及原文无法确认的原因；无法逐项列明的候选细节不得进入建议稿。
- 润色弹窗新增醒目的“AI 补充的细节，采用前请核实”区块。存在待核实项时，“核实后应用”按钮默认禁用，用户必须勾选“我已逐项核实，以上细节真实且可以解释”后才能应用；没有推断细节时仍提示对照原文检查。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、51-route production build、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。Smoke 同步锁定结构化核实字段、确认交互与按钮状态，并校正 `/interview` 语义换行后的文案探针。
- 生产验证：正式 `/resume` 返回 HTTP 200；线上客户端资源检出“AI 补充的细节，采用前请核实”“我已逐项核实，以上细节真实且可以解释”和“核实后应用”；匿名 `POST /api/resume/ai-polish` 返回 401。独立 deployment URL 受 Vercel SSO 保护而返回 302，正式域名可正常访问。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布。由于没有真实登录测试账号，未执行生产环境真实 AI 生成、逐项勾选和保存简历的登录态端到端验收；既有 `package.json`、小程序本地改稿、`.codex-artifacts/` 与五份未跟踪 PRD 均未纳入提交。

## 2026-07-27 已上线：诘星预告页最终视觉收口与新实机图

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `835d9465049e9a1c2f1186d7da6f8b302febc36a`（`polish: finalize StarInterview teaser visuals`）。GitHub Production deployment `5617472637` 已为 `success`，环境 URL 为 `https://job-bottle-bnqbhav4e-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/interview`。

- 首屏十字星改为原生 96px 图形，只从较小比例缩放至 `scale(1)`，不再放大低分辨率星形；透明度固定为 1，在首屏结束前始终保持清晰，再随 sticky 首屏被用户自然划走。
- LISTEN、RECALL、RESPOND 三个章节标题及问题示例改为按语义固定换行，不再出现“么。”或“题”等孤立单字；“你的经历，留在拾星。”提高字号、对比度并增加开放式引导线。
- 实机演示图更换为用户最终提供的实时辅导界面截图，使用新缓存路径 `public/brand/star-interview/product-live-coach.png`，真实尺寸 `2458×1594`，SHA-256 为 `f55b32166bc9811918c1856fa2efd78d8a4770eb79fd21f5c141807490b4954d`；旧 `product-home.png` 已删除，Smoke 资源契约同步更新。
- 本地浏览器已在 1280×720 与 390×844 实看星核、语义换行、强调语句和新实机图，无横向溢出。验证通过：`npx tsc --noEmit`、`npm run lint`、51-route production build、`npm run smoke`、`git diff --check`。
- `npm audit --omit=dev --audit-level=high` 仍因 npm registry 在 TLS 握手前断开而无法取得本轮结果；本次提交未修改依赖清单或锁文件。
- 生产验证：正式 `/interview` 与新 PNG 均返回 HTTP 200；正式 HTML 检出 `product-live-coach.png` 且未检出 `product-home.png`；线上 PNG 尺寸和 SHA-256 与用户上传文件一致。正式浏览器导航本轮超时，未声明生产视觉浏览器 E2E。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布；既有 `package.json`、小程序本地改稿、在途 completion streaming 文件、`.codex-artifacts/` 与五份未跟踪 PRD 均未纳入提交。

## 2026-07-27 已上线：诘星预告页叙事文案收口

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `b620dc9bfa8b2dea534e4cc5507fc562c01bc4af`（`copy: refine StarInterview product story`）。GitHub Production deployment `5616062680` 已为 `success`，对应环境 URL 为 `https://job-bottle-562406m94-job-bottle.vercel.app`，正式页面为 `https://www.starjob.space/interview`。

- 第二章节标题改为“协助你结构化表达你曾经做过的事。”；删除“校园咨询项目”及“两周内重新梳理调研路径……”整段演示案例和装饰线，章节改为开放式单栏排版。
- 第三章节标题改为“陪你把话表达清楚。”；Smoke 的 `/interview` 文案契约同步锁定两句新文案，并移除旧文案依赖。
- 同期基线已启用 StarInterview 按量计费，Smoke 中遗留的 `metered_not_enforced` / `reserveStarInterviewUsage` 旧契约同步改为检查 `metered`、`chargeStarInterviewUsage` 与 `consumeStarInterviewUsage`；这是回归契约校正，不改变计费实现。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、52-route production build、`npm run smoke`、`git diff --check`。`npm audit --omit=dev --audit-level=high` 因 npm registry 在 TLS 握手前断开而未取得本轮结果；本次提交没有修改任何依赖清单或锁文件，上一未变依赖基线审计结果为 0 vulnerabilities。
- 生产验证：正式 `/interview` 返回 HTTP 200，检出两句新文案；“不是临场编造”“先给你一条路”“校园咨询项目”和“两周内重新梳理”均未检出。
- 本次页面精修提交没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布；既有 `package.json`、小程序本地改稿、`MINIPROGRAM_PROGRESS.md`、`.codex-artifacts/` 与五份未跟踪 PRD 均未纳入提交。未执行新的最终视觉浏览器 E2E，生产确认边界为构建、Smoke、部署状态与正式 HTML。

## 2026-07-27 已上线：诘星 StarInterview 彩蛋预告页

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `593c348da5b91631407795be3e1928521a9e826b`（`feat: launch StarInterview teaser page`）。GitHub Production deployment `5612347537` 已为 `success`，对应环境 URL 为 `https://job-bottle-mgf407bmx-job-bottle.vercel.app`，正式域名仍为 `https://www.starjob.space/`。

- 桌面顶部 Dock 的拾星 Logo 左侧新增彩色十字星彩蛋入口，指向公开路由 `/interview`；预告页使用大字透视汇聚开场、清晰四角星核、居中的官方诘星应用图标与文字 Logo、品牌 slogan“谛听察意，应答成章”、macOS 实机图及“听懂问题 / 找回经历 / 组织回答”三段连续介绍。
- 页面采用开放式整屏叙事，不使用卡片墙；动效只使用 transform / opacity 并适配 `prefers-reduced-motion`。品牌图标、文字 Logo 和实机图保存在 `public/brand/star-interview/`，源自只读参考项目 `/Users/wangrui/Documents/ASS`；图标和文字 Logo 哈希与源文件一致，ASS 未修改。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、47-route production build、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。Smoke 新增三份品牌资源和 `/interview` 最终文案契约。
- 生产验证：`https://www.starjob.space/interview` 返回 200 并检出“谛听察意”“应答成章”“不是临场编造”“先给你一条路”；三份品牌 PNG 均返回 200 / `image/png`；`/explore` 返回 200 并检出 `/interview`、彩蛋可访问名称和提示文案。
- 上一版页面已在 1440×900 与 390×844 浏览器实看且无横向溢出；最终星核、居中品牌组合和 slogan 局部收口后，自动浏览器因本地 URL 安全策略未能重新截图，因此不把最终生产视觉写成浏览器 E2E 已通过。生产 HTML、资源和文案探针均已通过。
- 本轮没有 migration、hosted DDL、环境变量、Supabase 数据写入或小程序发布。既有 `package.json`、小程序主页改稿、`MINIPROGRAM_PROGRESS.md`、`.codex-artifacts/` 与五份未跟踪 PRD 均未纳入提交。

## 2026-07-26 已上线：全站系统文案精修

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `597c17b3f653138fbb2560ccdace21b77dc1835b`（`copy: refine StarJob system language`）。Vercel Production deployment `dpl_DAgQBniJ9gN8sZowogHSuB6BQeKK` 已为 `READY`，正式域名为 `https://www.starjob.space/`。

- 按 `/Users/wangrui/Downloads/StarJob_拾星系统文案优化稿.md` 精修网页端全局、登录、首页、岗位、投递、星瓶、简历、个人中心、反馈、网申助手、诘星连接与管理后台文案；通知与教程内容未纳入本轮。
- 普通用户界面不再展示“配置数据库环境变量”、Supabase SQL Editor 或 migration 文件名；技术异常统一改为用户可理解的服务状态与重试指引，内部配置缺失只写入服务端/浏览器日志。
- Smoke 文案契约同步更新，但业务枚举值、路由、数据结构、鉴权、RLS、StarInterview 权限与计费预留逻辑均未改变。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、46 页静态/动态路由 production build、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。本地浏览器已检查桌面与 390×844 的 `/login`、`/explore`、`/feedback`、`/extension`，无横向溢出或长文案遮挡。
- 正式 `/`、`/login`、`/explore`、`/feedback`、`/extension` 均返回 HTTP 200；正式资源已检出新版 SEO、品牌句“把明日的坐标，收进星瓶。”、“帮助与反馈”和“一份简历，抵达更多坐标”。
- 本轮没有 migration、hosted DDL、Supabase 数据写入、环境变量变化或小程序发布。`package.json`、小程序主页本地改稿、`MINIPROGRAM_PROGRESS.md`、`.codex-artifacts/` 与五份未跟踪 PRD 均未纳入提交；小程序主页仍按用户要求保持“先不推送上线”。

## 2026-07-26 已上线：用户管理精细化与 StarInterview 无限访问分类

> 本节为当前第一权威状态。`main` / `origin/main` 已同步到 `288cbc62952a3b1e487acd487cb0f931800ce1b0`（`feat: refine admin user access management`）。Patrick GitHub 对应 Vercel deployment `Cq1bopiabm3yvxHGfCdH5Txkh3jx` 已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- `/admin/users` 改为概览指标、组合筛选、摘要用户表与按需展开编辑；新增 StarInterview 无限访问人数、筛选条件、状态标签和主管理员专属开关。
- 权限保存在 Supabase Auth `app_metadata.star_interview_unlimited_access`。未显式设置时管理员默认无限访问、普通用户默认标准访问；普通管理员不能调整该字段，服务端只允许邮箱为 `raywang6688@outlook.com` 且 profile 角色为 admin 的主管理员写入。
- 角色修改会先固化用户修改前的隐式 StarInterview 权限，避免其他管理员通过升降角色绕过主管理员专属调整边界。
- Hosted 只读审计：212 个 Auth 账户、1 个管理员；管理员无限访问 1 人、非管理员无限访问 0 人，主管理员账户存在且角色正确。该人数是 2026-07-26 动态快照，不是代码常量。
- 本轮没有 migration 文件、hosted DDL 或小程序代码变化；没有执行或提交仍在开发中的 `20260726160000_star_interview_auth.sql`。
- 验证通过：`npx tsc --noEmit`、lint、45-route production build、Smoke、`git diff --check`、生产依赖高危审计和小程序 `npm run check`。正式 `/admin/users` 返回 200，生产客户端构建检出新筛选、无限访问入口和主管理员限制；生产匿名 GET/PATCH `/api/admin/users` 均返回 401。
- 当前没有可用管理员浏览器登录态，因此没有把正式环境中的真实筛选、展开、开关二次确认或实际权限写入声明为管理员浏览器 E2E 已通过。

## 2026-07-26 已上线：安全的微信网页登录码与小程序 0.2.1 上传

> 当前 Git 基线为 `main` / `origin/main` / `95bc865`（交接同步）；功能提交为 `30b503e`，服务端主体提交为 `5144713`，Cookie 修复为 `17c9aa2`。GitHub 对应 Patrick Vercel production 状态已返回 `success / Deployment has completed`，正式域名为 `https://www.starjob.space/`。

- 小程序“我的”现可生成 8 位网页登录码；验证码 5 分钟有效、一次使用，30 秒内不得重复生成。网页登录页增加微信登录入口，并把同一 Supabase 用户建立为浏览器 Cookie Session。
- migration `20260724183000_wechat_web_login_codes.sql` 已存在且已应用到 hosted Supabase，远端 migration history 已确认 applied。数据库 RPC 原子处理预留与消费，并按 HMAC 请求指纹持久限制 10 分钟内最多 10 次猜码；生产探针确认第 11 次被拒绝、无微信身份不能预留、无效码不产生用户。
- 网页消费接口要求可信 Origin、严格 8 位数字格式且不记录验证码、Token、OpenID 或用户信息。纯微信账号使用明确标记的内部技术邮箱换取 Supabase Session，后台不会展示为真实邮箱或进入邮箱确认；后台可区分“仅邮箱 / 仅微信 / 邮箱与微信已绑定”。
- 真实 E2E 已通过：微信开发者工具中的真实微信登录态生成生产码；全新无痕 Chrome 输入后进入网站，`/profile` 显示“微信用户”、资料完整度、保存资料与退出登录；同一码重放返回“无效或已过期”。原管理员 Chrome 会话未被覆盖。
- 小程序 `0.2.1` 已生成预览并上传，包体 455,243 bytes；未提交审核、未审核通过、未正式发布，以免影响用户已提交审核的 `0.2.0`。`0.2.0` 的审核状态来自用户说明，本轮未在微信公众平台独立复核。
- 验证通过：网页 `npx tsc --noEmit`、lint、40-route build、Smoke、`git diff --check`、生产依赖高危审计（0 vulnerabilities）；小程序 `npm run check` 通过，9 个页面且未发现客户端密钥。尚未完成 iPhone/Android 真机检查，也未覆盖完整跨端投递/简历读写。

## 2026-07-26 已上线：网页端简历编辑自由度优化

> 当前最新生产基线为 `main` / `origin/main` / `74254922b1959a50bab8e236656b0d47f73b50e2`（`feat: make resume fields more flexible`）。GitHub 对应 Vercel production deployment `dpl_3AGPjS2ez3fjNSGbzin2KTrirK6v` 已返回 `success / Deployment has completed`；正式域名为 `https://www.starjob.space/`。

- 网页端简历的教育、工作和项目经历描述输入框已由单行改为更大的多行编辑框，默认 4 行并允许用户继续向下拉高，长内容不再挤在一行中。
- 教育、工作和项目经历的开始/结束时间明确标为可选；预览和 PDF 不再为未填写的时间、学校、公司、岗位或项目名称生成占位文字，也会跳过整条完全为空的经历。
- 中文简历在没有填写兴趣/爱好分类时只显示“技能”；只有确实存在兴趣或爱好内容时才显示“技能/兴趣”。紧凑技能项仍使用单行输入，避免破坏现有编辑效率。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。正式 `/resume` 返回 HTTP 200，生产客户端资源已检出新的多行描述提示和 3 组“开始时间（可选）/结束时间（可选）”文案。
- 本轮没有 migration 文件、hosted DDL、Vercel 环境变量变化或 Supabase 数据写入；没有修改或发布小程序。当前改动属于网页端详细简历编辑器，小程序当前生产基线没有同等详细编辑器可同步。本轮没有可用真实登录账号，因此尚未在正式环境完成真实简历编辑、保存、预览和 PDF 导出的人工端到端验收。
- 工作区中其他正在进行的小程序与登录相关修改，以及 `.codex-artifacts/` 和五份用户未跟踪 PRD，均未纳入本提交、未暂存、未修改或删除。

## 2026-07-23 已上线：网申助手安装包链接更新

> 当前最新生产基线为 `main` / `origin/main` / `104aa05766585d511a66190a7cb34c7ae75be96d`（`chore: update extension download link`）。Vercel production deployment `dpl_4XGUsyKGa63PLNKNpuYJY1hJimkt` / `https://job-bottle-nezz4xjph-raywang6688-7050s-projects.vercel.app` 已独立核验为 `READY`；正式域名为 `https://www.starjob.space/`。

- 官网 `/extension` 与安装教程 `/extension/guide` 的“获取安装包”入口已统一更新为 `https://pan.baidu.com/s/1q9gVenToSLL5x5tXZzYLig?pwd=SXZS`，提取码仍为 `SXZS`。上一地址 `13sk2UUdep9S1zoJdEk_sSA` 已加入 Smoke 禁止回归项。
- 正式域名两个页面均为 HTTP 200，生产 HTML 各检出一次新地址且未检出上一地址；新百度链接本身可正常跳转至分享提取页。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。首次 TypeScript 仅出现两个数字后缀 `.next/types` 生成副本，已按约束精确删除后重跑通过。
- 本轮只修改网站下载入口、回归检查和更新日志，没有修改 0.1.9 安装包内容或 0.1.7 兼容协议；没有 migration、hosted DDL、Vercel 环境变量变化或 Supabase 数据写入。真实企业 ATS 的扩展端到端边界保持未完成；`.codex-artifacts/` 与五份用户未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-23 已上线：0.1.9 项目描述补充修复与下载链接更新

> 当前最新生产基线为 `main` / `origin/main` / `8c5ba4e3af6dee705bd1690e0ca9c76e1530374c`（`fix: recognize project experience descriptions`），下载链接提交为 `afcdc62`。Vercel production deployment `dpl_2bfLbdFXAvFp15RZss4URALeTmjq` / `https://job-bottle-e80irarow-raywang6688-7050s-projects.vercel.app` 已核验为 `READY`；正式域名为 `https://www.starjob.space/`。

- 保持扩展版本号 `0.1.9`，重新生成安装包并补齐项目经历描述识别。项目区内的“描述”“职责描述”“项目职责”“项目成果”“项目业绩”“项目详情”“主要内容”“个人贡献”及对应英文表达会读取该项目的 bullets。
- 区段判断新增“项目经历 / 项目描述 / 项目内容 / project experience”等线索，解决页面只显示“项目经历”标题、具体输入框只叫“描述”时被跳过的问题。通用“描述”仍要求先确定属于项目区，不放宽敏感字段、自动提交或覆盖已有内容边界。
- 官网 `/extension` 与 `/extension/guide` 下载按钮已改为 `https://pan.baidu.com/s/13sk2UUdep9S1zoJdEk_sSA?pwd=SXZS`；旧 `1jl_OHVc...` 地址已从生产 HTML 移除。
- 正式 0.1.9 ZIP 为 HTTP 200 / 118,766 bytes / SHA-256 `8caa29d511e89ef7fab78cc5f8467882c2fbf902082ae1569821444b32b8109e`；线上 ZIP 内 `fill.js` 已直接检出项目描述别名和项目区段规则。
- 验证通过：扩展脚本语法、正式与开发包构建、ZIP 完整性、`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`、生产依赖高危审计。正式 `/extension`、`/extension/guide` 与 ZIP 均为 200。
- 浏览器临时夹具因浏览器安全策略禁止加载，未绕过；因此尚未把真实企业 ATS 中的项目描述填写写成端到端通过。本轮没有 migration、hosted DDL、Vercel 环境变量修改或 Supabase 数据写入。`.codex-artifacts/` 与五份用户未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-23 已上线：网申助手 0.1.9 与实习描述识别修复

> 当前最新生产基线为 `main` / `origin/main` / `4f79d82bf2f1b89e14c9a78d268c8e48101d212d`（`fix: release extension 0.1.9 description matching`）。Vercel production deployment `dpl_7XxZsN7AotZuww8VE9V6YDw2uYtJ` / `https://job-bottle-nn2tp1abt-raywang6688-7050s-projects.vercel.app` 已独立核验为 `READY`；正式域名为 `https://www.starjob.space/`。

- 拾星网申助手升级为 `0.1.9`，重点修复企业网申页只把实习职责字段写成“描述”“职责描述”“工作职责”“主要工作”“工作成果”等名称时完全识别不到、因而不填写的问题；同时补充 responsibility / duties / description 等英文别名。
- 多段实习经历优先按页面明确编号和所在记录容器匹配；缺少这些线索时再按同类字段出现顺序对应。测试页中的三段“描述”、三段“职责描述”和“工作内容 1/2/3”均能依次写入各自经历，不再把同一段内容错填到多条经历。
- 通用“描述”只有在已确认属于实习/工作经历区时才会参与匹配，区外模糊描述保持不填；身份证等敏感字段仍不自动填写。合并模式会保留用户已填内容，覆盖模式才会替换。
- 官网和教程下载链接已更新为 `https://pan.baidu.com/s/1jl_OHVc_HxXbUrI1-IS56g?pwd=SXZS`，提取码 `SXZS`。正式 0.1.9 ZIP 为 HTTP 200 / 118,110 bytes / SHA-256 `6ce6cab2c1c9ced80c61b77a5cec2374df6d9fbc530dbd1d3f71d7d29d25876f`，包内 manifest 已核验为 0.1.9。
- 继续保留 0.1.7 兼容：既有 READY / PONG / SYNC_RESUMES / SYNC_COMPLETE 通信协议未被版本号拒绝；0.1.7 可以继续同步与填写，但要获得本次描述识别修复需升级 0.1.9，不强制反复下载安装。
- 全面检查时修复了生产依赖安全告警：Next.js 升至 16.2.11、DOMPurify 升至 3.4.12、Sharp 升至 0.35.3。`npm audit --omit=dev --audit-level=high` 为 0 vulnerabilities。
- 验证通过：扩展脚本语法检查、`npm run build:extension`、开发包构建、定向浏览器测试、`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`。正式域名 `/`、`/extension`、`/extension/guide` 和 0.1.9 下载包均为 HTTP 200，线上页面检出 0.1.9、新百度链接和 0.1.7 兼容说明。
- 本轮没有 migration 文件、hosted DDL、Vercel 环境变量变化或 Supabase 数据写入。定向测试使用受控网页夹具，不等于真实企业 ATS：尚未用真实登录账号和已安装的 0.1.9 在真实企业网申页完成同步—填写—人工提交端到端验收，也未用真实安装的 0.1.7 / 0.1.8 做浏览器回归。`.codex-artifacts/` 与五份用户未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-23 已上线：网申助手 0.1.8、老版本兼容与下载链接更新

> 当前最新生产基线为 `main` / `origin/main` / `2c7948b`（`fix: keep extension 0.1.7 compatible`），主体功能提交为 `d5e7d92`（`feat: refine application assistant experience`）。Vercel production deployment `dpl_BVsLVS3qwArWXPJJtTYm3gMDH3M5` / `https://job-bottle-qj06utx47-raywang6688-7050s-projects.vercel.app` 已核验为 `READY`；正式域名为 `https://www.starjob.space/`。

- 拾星网申助手升级为 `0.1.8`。弹窗移除渐变底、胶囊标签、分段控件底板和按钮重阴影，改为暖白开放式工作面、下划线切换与 01–04 编号处理清单；保留 380px 工具栏宽度。
- “覆盖已有内容”和“清除本地数据”均增加 8 秒内二次确认；填写结果可展开查看最多 8 个待人工确认字段。智能复核由单页最多 6 个低置信字段提高到 12 个，仍不发送输入框已有内容或完整简历正文；底层英文连接错误转换为可执行的中文提示。
- `/extension` 在未检测到扩展时提供“安装后刷新检测”和安装步骤；教程增加返回拾星并同步的第五步。下载地址统一更新为 `https://pan.baidu.com/s/1z815NaU8NRArpswkEAiU3w?pwd=SXZS`，提取码 `SXZS`，该链接已确认能跳转百度分享页。
- 保留 `0.1.7` 兼容：网站继续接受其既有 `READY / PONG / SYNC_RESUMES / SYNC_COMPLETE` 协议，不按扩展版本号阻止同步；检测到 0.1.7 时明确提示无需重新下载。0.1.8 是新版界面和安全增强，不是强制升级。
- 验证通过：`npm run build:extension`、`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`。Smoke 只读 273 条开放岗位；构建生成的 `.next/dev/types` 数字后缀重复缓存仅按规则精确删除。
- 正式域名 `/`、`/extension`、`/extension/guide` 均为 HTTP 200；两个页面均检出新百度网盘链接和 0.1.7 兼容提示。正式 `0.1.8` ZIP 为 HTTP 200 / `application/zip` / 116,782 bytes / SHA-256 `81d6fa44f7acdaf874f066ec19feb397a0da6492def6a9150638fbcbcc09024a`。
- 本轮没有 migration 文件、hosted DDL、环境变量变化或 Supabase 数据写入。尚未以真实已安装的 0.1.7 / 0.1.8 扩展和登录用户在企业网申页完成同步—填写—人工提交端到端验收，不能把该人工体验写成已经通过。`.codex-artifacts/` 与五份用户未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-22 已上线：岗位近七天新增统计与简历 AI 连续使用额度调整

> 当前最新生产基线为 `main` / `origin/main` / `9adbbb0`（`feat: raise resume ai rate limit`），前一功能提交为 `62799ed`（`feat: show recent job count`）。Vercel production deployment `dpl_5pGfqLqmifLb2XbpjpXCsjcjopn2` / `https://job-bottle-chz1lubvk-raywang6688-7050s-projects.vercel.app` 已核验为 `READY`；正式域名仍为 `https://www.starjob.space/`。

- `/explore` 顶部事实带由三项扩展为四项，新增“近 7 天新发现”。数字复用现有 `isRecentlyListedJob` 口径，只按当前开放岗位的 `jobs.created_at` 计算滚动 7×24 小时窗口，不是手写常量，也不受当前搜索筛选影响。桌面四项并排，窄屏使用 2×2，避免数字和标签挤压。
- 简历 AI 的导入、分段润色和整份翻译继续共用同一条持久化、按登录用户隔离的限流窗口，但额度由每 10 分钟 6 次提升为 15 次。典型完整流程为导入/复核 1 次，加教育、实习、项目等约 7–11 个段落润色，必要时再翻译或重试；15 次可以覆盖一次正常完整编辑，同时仍保留防刷上限。相同润色请求命中现有 10 分钟结果缓存时不会占用新额度。网申助手的智能字段匹配使用独立限流，本轮未修改。
- 新增 migration `20260722120000_raise_resume_ai_rate_limit.sql`，代码中存在；本轮已通过 Supabase CLI 对 linked production 执行 hosted DDL，远端 migration history 已确认 `20260722120000` applied。此前 hosted DDL 已存在但历史表未登记的旧 migration 只补记为 applied，没有重放旧 DDL、改写业务表或用户数据。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`。构建前后生成的 `.next/types` / `.next/dev/types` 数字后缀重复缓存均按规则精确删除；Smoke 只读 261 条开放岗位并新增 15 次限额迁移契约。
- 正式域名 `/explore` 为 HTTP 200，生产客户端 chunk 已检出“近 7 天新发现”；匿名 `POST /api/resume/import` 仍为 401。没有环境变量变更，也没有 Supabase 用户业务数据写入。因没有真实登录测试账号，本轮没有连续发起 15 次付费 AI 请求，也没有把第 15 次成功、第 16 次 429 或真实用户完整导入—逐段润色流程写成端到端通过；这仍是明确验证边界。
- `.codex-artifacts/` 与五份用户未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-20 已上线：星瓶投递侧滑面板恢复纵向滚动

> 当前最新生产基线为 `main` / `origin/main` / `077a451`（`fix: restore scrolling in application drawer`）。Vercel production deployment `dpl_HUbnLdDvrmUiqnjvGZP3yrX7SWYW` / `https://job-bottle-g9wcmvg7m-raywang6688-7050s-projects.vercel.app` 已核验为 `READY`。

- 修复星瓶点击岗位星后，“投递”侧滑面板内容超过视口却无法继续下滑的问题。根因是整个带位移动画的 aside 同时承担高度约束和滚动，在部分浏览器下内容被裁切但没有形成可靠滚动容器。
- `Drawer` 现改为固定高度的 flex 外壳：桌面明确使用 `100svh - 2rem`，移动端保持最高 `88svh`；标题、关闭按钮和移动端把手固定，表单内容放入独立 `min-h-0 / flex-1 / overflow-y-auto` 滚动区。滚动区同时启用纵向触控、`overscroll-contain` 和 iOS momentum scrolling。
- 这是共用 Drawer 修复，因此同时覆盖 `/bottle`、`/my` 和岗位探索中打开的投递进度面板；没有修改投递字段、保存逻辑、状态轨道、简历绑定、备注、删除或用户数据。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`。首次 tsc 只命中 4 个允许精确删除的 `.next/types` / `.next/dev/types` 数字后缀重复缓存。Smoke 新增独立滚动区、触控和桌面视口高度回归契约。
- 正式域名 `/`、`/bottle`、`/my` 均为 HTTP 200；生产 `/bottle` 与 `/my` 客户端构建已检出 `data-drawer-scroll`、`touch-pan-y` 和 `overflow-y-auto`。本轮没有可用真实登录浏览器会话，因此尚未在生产以真实投递表单实际滚轮/触控滑到底；不能把这项人工体验验收写成已经通过。
- 本轮没有 migration 文件、hosted DDL、环境变量或 Supabase 数据写入。`.codex-artifacts/` 与五份未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-19 已上线：搜索收录基础设施、岗位结构化数据与注册隐私优化

> 当前最新生产基线为 `main` / `origin/main` / `862f4b4`（`feat: improve search indexing and signup privacy`）。Vercel production deployment `dpl_8A4FMMZx6YtrQ64HswTEeRp7Fy6M` / `https://job-bottle-68s71ri1y-raywang6688-7050s-projects.vercel.app` 已核验为 `READY`；正式域名仍为 `https://www.starjob.space/`。

- 新增正式 `https://www.starjob.space/robots.txt` 和 `https://www.starjob.space/sitemap.xml`。robots 允许公开内容、阻止 `/api/` 抓取并声明 sitemap；sitemap 只列首页、岗位探索、拾星指南、求职指南、插件介绍/教程及当前有效岗位详情，不包含管理后台、登录、个人资料、投递、星瓶、简历、反馈或 API。生产 sitemap 本轮只读检出 250 个有效岗位 URL；数量是动态快照，不是代码常量。
- 首页与公开核心页面新增正式域名 canonical；全站补充 Open Graph / Twitter 分享信息。单个 `/jobs/[id]` 按公司、岗位方向、地点、批次、开启/截止时间生成独立 title、description、canonical 和分享信息，并只在仍有效岗位详情页输出 `JobPosting` JSON-LD。截止岗位从 sitemap 排除、页面标记 noindex 且不输出 JobPosting；列表页没有批量塞入结构化岗位。
- `/admin/*`、`/login`、`/profile`、`/my`、`/resume`、`/bottle`、`/feedback` 已分别输出 `noindex, nofollow`；没有错误地只依赖 robots 阻止私密页收录。生产 `/login` 与 `/admin/users` 均已从 HTML 确认 noindex。
- 注册页移除“成都 / 西南财经大学 / 金融学”默认提示，只保留毕业年份 `2027`；个人中心也移除城市“成都”提示。求职方向由原 12 项扩充为 30 项，保留历史选项并新增银行、证券、基金、保险、投行、量化、战略、销售、财务、人力、研发、供应链、制造、设计、法务、职能、教师等方向。
- 7 篇实用指南已写入 `docs/seo/starjob-guide-drafts-2026-07-19.md`，包含建议 slug、SEO 标题、摘要、目标搜索词、正文和站内引导。它们明确标记为“待审核，未发布”，没有公开路由，也没有加入 sitemap；必须由用户审核后再发布。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、40-route `npm run build`、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。首次 TypeScript 只出现 `.next/types` / `.next/dev/types` 的 4 个数字后缀重复缓存，严格精确删除后重跑通过。Smoke 只读 250 条开放岗位，并实际检查 robots、sitemap、私密页 noindex、岗位 canonical 与 JobPosting。
- 生产验证：`/`、`/robots.txt`、`/sitemap.xml`、`/login`、`/admin/users`、`/forum` 均为 HTTP 200；抽样岗位详情为 200 且 HTML 含正式 canonical 与 JobPosting。第一次部署 `dpl_4ThqEXEZD26jm8pnaimhVzRKWoJv` 因 Vercel Production 缺少 Supabase 公共环境变量而 `ERROR`，没有替换正式站；随后从本机既有项目配置恢复 Production 的 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`MIMO_API_KEY`、`MIMO_BASE_URL`、`MIMO_MODEL`（值未输出），第二次部署成功。没有 migration 文件、没有 hosted DDL、没有 Supabase 数据写入。
- Google Search Console 已在本机 Chrome 登录态进入“欢迎使用”新增站点页，但尚未添加 `starjob.space`、执行 DNS 验证或提交 sitemap；百度搜索资源平台也尚未完成账号验证与站点提交。不能把搜索平台登记写成已完成。用户自有 `.codex-artifacts/` 与五份未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-19 已上线：管理员手动确认未验证邮箱

> 当前最新生产基线为 `main` / `origin/main` / `3ada808`（`feat: let admins confirm user emails`）。Vercel production deployment `dpl_J4e7xBPJgdmEuKfQcsKzGMb9c73r` / `https://job-bottle-i88tfvucj-raywang6688-7050s-projects.vercel.app` 已独立核验为 `READY`。

- `/admin/users` 对 `email_confirmed_at` 为空的 Auth 用户显示“设为已确认”。首次点击只提示风险，第二次点击“确认邮箱”后才提交；提示明确说明该操作跳过验证邮件，避免管理员误触。
- `PATCH /api/admin/users` 新增独立 `confirm_email` 动作。route 仍先通过当前 session 和 profile role 复核管理员身份，只在服务端使用 service-role client 调用 Supabase Auth `updateUserById(id, { email_confirm: true })`；浏览器端不接触 service-role key。已确认用户重复调用为无害 no-op。
- 邮箱确认操作不修改 profile、角色、显示名、停用状态、投递或简历数据。若账号同时被停用，界面会明确提示“邮箱状态已正常，账户仍处于停用状态”，不会误报为已经恢复登录。
- 在“邮箱未确认”筛选中操作成功后，该用户立即移出当前结果，结果数和分页同步更新；其他筛选下只更新该行。失败时保留原状态并显示错误。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、38-route `npm run build`、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。Smoke 只读 248 条开放岗位；本地 production 匿名 PATCH 探针返回 401。
- 提交 `3ada8081663363e32e6c373482729701e205dbf4` 已推送至 `main` / `origin/main`。生产 `/`、`/admin/users`、`/forum` 均为 HTTP 200；线上 chunks 已检出“设为已确认”“确认邮箱”“邮箱状态已正常”和 `confirm_email`，正式域名匿名 PATCH 返回 401。
- 本轮没有 migration 文件、没有 hosted DDL、没有环境变量变更。部署与生产只读/匿名探针均未确认任何真实用户邮箱，也没有执行真实用户状态写入；因无真实管理员浏览器登录态，登录后的按钮视觉和对真实未确认账号的成功写入仍是明确人工验收边界。
- `.codex-artifacts/` 与五份未跟踪 PRD 未修改、未暂存、未提交。

## 2026-07-18 已上线：老用户登录公告与后台用户活跃洞察

> 当前最新生产基线为 `main` / `origin/main` / `69e8ff9`（`feat: add login announcements and user activity insights`）。Vercel production deployment `dpl_Bd66Y3725uHvkCqiiSjorRHEAR89` / `https://job-bottle-94y0b1ddx-raywang6688-7050s-projects.vercel.app` 已独立核验为 `READY`。

- 老用户登录后会读取“拾星指南”中最新的管理员“公告”，不新增第二套公告发布系统。只有账号创建时间早于公告、且该账号尚未读过该公告时才显示；新注册用户仍优先走首次欢迎。公告与欢迎共用单一可访问弹层，不会叠加两个窗口，支持 ESC、焦点圈定、移动端底部 sheet 和前往 `/forum`。
- 公告已读同时写入 user-scoped localStorage 和 Supabase Auth user metadata（`latest_announcement_seen_id` / `latest_announcement_seen_at`）：本机立即去重，账号 metadata 用于跨设备去重。公告正文只以纯文本 `whitespace-pre-wrap` 渲染，不使用 HTML 注入。`GET /api/announcements/latest` 重新校验登录态，server-only 查询最新公告并确认作者 profile 为管理员；匿名返回 401，响应为 private/no-store。
- `/admin/users` 不再只搜索当前 100 人页面。管理员 API 会分页汇总全部 Auth 用户，服务端组合搜索邮箱、显示名、学校、方向和用户 ID，并支持活跃时间（24h / 3 日 / 7 日 / 从未登录）、身份、账户状态及排序；筛选后再分页返回 25 / 50 / 100 人。profile 查询只读取展示所需字段，投递/简历数量按稳定 ID 分页计数，避免 PostgREST 1000 行上限导致静默少算。
- 顶部开放式事实带展示用户总数、最近 24h 活跃、最近 3 日活跃和从未登录；事实带本身可点击筛选。活跃口径明确为 Supabase Auth `last_sign_in_at`，不把普通页面访问误写为实时活跃。筛选刷新期间保留旧结果但锁定行内身份/停用操作，避免迟到列表响应与账户保存冲突；当前管理员仍不能降级或停用自己，停用不删除用户数据。
- 2026-07-18 server-only hosted 只读快照：135 个 Auth 账户、近 24h 9 人、近 3 日 19 人、从未登录 109 人、停用 0 人；最新管理员公告存在，创建于 `2026-07-16T11:58:30.597876+00:00`。以上是动态快照，不是代码常量，也不代表页面浏览级 DAU。
- 验证通过：`npx tsc --noEmit`、`npm run lint`、38-route `npm run build`、`npm run smoke`、`git diff --check`、`npm audit --omit=dev --audit-level=high`（0 vulnerabilities）。Smoke 只读 242 条开放岗位并通过匿名提权、logo 上传和跨用户投递读取拒绝探针；新增公告和全量用户筛选契约均通过。`.next/types` / `.next/dev/types` 只出现交接文档允许清理的数字后缀重复缓存，严格仅删除这些生成副本后重跑。
- 本地 production 浏览器确认 1440×900 管理后台匿名保护页和 390px 页面均无横向溢出；没有可用真实管理员/老用户登录态，因此未把登录后用户列表视觉、实际公告弹出和 metadata 写回写成已完成的浏览器端到端验收。服务端聚合和公告存在性已用 server-only 只读探针确认。
- 生产核验：`https://www.starjob.space/`、`/admin/users`、`/forum` 均为 HTTP 200；线上 chunks 检出“最近 24h 活跃”“最近 3 日活跃”、`/api/announcements/latest` 和“查看全部拾星指南”。匿名公告 API 与管理员用户 API 均为 401。0.1.7 ZIP 仍为 HTTP 200 / `application/zip` / 111,586 bytes / SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。
- 本轮没有 migration、hosted DDL、环境变量变更或管理脚本写入；hosted 探针只读。实际用户点击公告“我知道了”时会按功能设计更新自己的 Auth metadata。`.codex-artifacts/` 与五份未跟踪 PRD 未修改、未暂存、未提交。

> 文件状态：**当前唯一优先交接文档**
>
> 更新时间：2026-07-19
>
> 用途：供后续 Codex / 开发者接手项目时先行阅读。旧 `PROJECT_CONTEXT.md` 与 `PROJECT_CONTEXT_AUDIT.md` 保留历史轨迹；若它们与本文件、当前代码或用户最新指令冲突，以本文件、当前代码和用户最新指令为准。

## 0. 强制持续同步规则

每次发生下列任一变化，必须在**同一工作会话结束前**更新本文件：

- 代码、组件、样式、路由、接口、类型或脚本变化；
- migration、RLS、Supabase 数据、环境变量配置或导入脚本变化；
- Git 提交、推送、Vercel 部署、生产验证或回滚；
- 已知风险、外部依赖、待验证项的状态变化；
- 用户确认的产品方向、视觉约束或不再实施的功能。

每次记录至少写明：日期、提交（如有）、用户可见变化、涉及文件/迁移、已运行的验证、已确认的外部状态，以及仍未确认的外部状态。**不得把 migration 文件存在、应用已部署、hosted Supabase DDL 已执行混为一谈。**

若变化影响当前基线或核验结论，也必须同步更新：

1. `/Users/wangrui/Downloads/PROJECT_CONTEXT.md` 顶部权威区；
2. `/Users/wangrui/Downloads/PROJECT_CONTEXT_AUDIT.md` 顶部核验区；
3. 本文件的“最新变更”和“验证 / 外部状态”章节。

## 1. 当前基线

- 工作目录：`/Users/wangrui/Documents/Web`
- 分支：`main`
- 当前提交：`3ada808` — `feat: let admins confirm user emails`
- 远端：`origin/main` 已同步到 `3ada808`
- 生产站点：`https://www.starjob.space/`
- 最近已确认的 Vercel 生产部署：2026-07-19，deployment `dpl_J4e7xBPJgdmEuKfQcsKzGMb9c73r`，状态 `READY`，对应 `3ada808`
- 本次生产部署 URL：`https://job-bottle-i88tfvucj-raywang6688-7050s-projects.vercel.app`
- Vercel 别名：`https://job-bottle-xi.vercel.app`
- 技术栈：Next.js App Router、TypeScript、Tailwind CSS v4、Supabase、Motion、jsPDF

运行品牌统一为 **拾星 StarJob**。Slogan：**用星瓶收录明日坐标**。辅助文案：**让拾星 StarJob 成为你秋招路上的超级伙伴**。

## 2. 产品当前形态

拾星 StarJob 是面向 2027 秋招的中文求职管理工具。核心路径：

```text
岗位坐标 /explore
  → 收录并前往官网投递
  → 投递管理 /my 更新阶段
  → 简历制作 /resume 创建、关联和导出版本
  → 星瓶 /bottle 回顾并分享投递历程
  → 拾星指南 /forum 查看官方公告、教程和经验分享
```

### 页面与视觉边界

- `/`、`/galaxy`、`/bottle` 是品牌场景页：保留深空背景、轨道、行星与星瓶视觉。
- `/explore`、`/my`、`/resume`、`/profile`、`/feedback`、`/forum` 是高频工作页：使用低眩光、开放集合和简洁层级，不得重新堆叠卡片墙、重阴影、大面积毛玻璃、无功能渐变或发光边框。
- `/explore` 是全国岗位地图与岗位清单共用筛选状态的入口；小区域采用折线外引名称，名称和区域均可点击，不写“北京省级”等不准确名称。
- `/my` 保留列表、看板、星图三种投递视图。投递状态修改采用乐观更新与失败回滚，**禁止**为此使用 `router.refresh()` 或 `window.location.reload()`。
- `/resume` 必须保持三栏：左侧简历版本、中间编辑、右侧实时 A4 预览。

## 3. 最新变更

### 3.1.0 2026-07-16 已上线：全站稳定性、数据防丢与交互性能修复

- 星瓶内岗位星原先在五角星上额外绘制横线和竖线，形成用户截图中的中心十字。`BottleStage` 已删除这组 spark stroke 与未再使用的 palette 字段，只保留星体渐变、轮廓和光晕；背景星点、星瓶 PNG、落位、动画和分享海报不变。提交 `8d143d1` 已推送，deployment `dpl_AnAnXbUMPpgxkqfRaEd3cUboGytt` READY；tsc、lint、38-route build、smoke 和 diff check 全通过。
- 岗位坐标与岗位详情的首次“加入星瓶”已改为连续动作：以 `preparing` 阶段收录成功后立即打开清洗后的官网链接，并在返回拾星时显示“已投递 / 还没有 / 不投了”确认，不再要求先后点击“保留候选”和“开始准备”。为避免异步保存触发浏览器弹窗拦截，登录态用户点击时先同步创建空白窗口，保存成功后再导航；保存失败会关闭空白窗口。提交 `d878c59` 已推送，deployment `dpl_2J7FnUF37kTnt4bboy2R2pgW77TU` READY，正式 `/explore` chunk 已检出新文案与 `preparing` 路径。
- 修复“现代单栏”带照片时页眉横线穿过照片的问题：左对齐页眉现在以文字底部与照片底部两者的最大值计算分隔线位置，横线固定在完整照片下方，后续正文从分隔线后继续。预览与 PDF 共用同一套操作坐标，因此两处同步生效。用户随后确认继续保留“学术研究”模板，本轮没有删除模板、修改模板 ID 或破坏历史简历兼容。
- 投递进度侧滑面板不再因同一条投递的父级对象更新而重新初始化表单；保存期间禁用冲突操作，避免用户刚填写的备注、阶段、优先级或跟进日期被并发响应覆盖。所有投递读写增加 12 秒可取消超时，超时时明确说明当前页面内容仍保留；岗位与投递列表增加请求代次保护，旧请求不能覆盖新结果。
- 简历删除改为二次确认，并先等待云端同步队列、完成云端删除后再移除本地数据；删除中的简历 ID 会进入 tombstone，后台 worker 不会把它重新上传。云端失败时保留本地简历。AI 导入、分段润色和整份翻译均可取消；导入客户端 43 秒截止，并在等待 10 / 26 秒后更新进度提示。AI 失败、离线或超时时，程序解析结果与原简历均保留，用户仍可直接导入程序结果。
- 星瓶 canvas 不再在每一帧读取布局并重设 bitmap，只在初始与 ResizeObserver 触发时调整尺寸；场景转场移除动画 blur / brightness，仅保留 transform / opacity；行星 hover 移除 filter 动画。岗位清单已按用户反馈恢复为一次显示当前全部匹配岗位，不再分页或无限滚动。筛选栏顶部新增“快捷查看”：全部岗位、近 7 天新上、近 7 天且符合偏好。
- 新增 Smoke 回归契约，覆盖投递请求超时、进度表单防重置、星瓶 resize-only 绘制、AI 取消 / 结果保留、简历删除竞态、完整岗位清单、近 7 天口径和偏好匹配。`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；TypeScript 只命中 `.next/types` / `.next/dev/types` 的数字后缀重复生成缓存，并严格只删除这些缓存后重跑。Build 生成 38 条路由；最终 Smoke 只读 231 条 hosted 岗位且匿名安全探针通过。
- 19 个跟踪文件已提交为 `7d11f45` 并推送到 `main` / `origin/main`。Vercel production deployment `dpl_63qHxfCtoyHzSUztcaT2QVCJiWfE` 已独立 inspect 为 `READY`；正式域名首页、岗位、简历、反馈、指南和网申助手均为 HTTP 200，三个受保护 AI POST 匿名请求均为 401。正式域名客户端 chunks 已检出快捷筛选、取消翻译、确认删除、取消 AI 复核、现代单栏和学术研究等本轮标记。
- 本轮 `npm audit --omit=dev --audit-level=high` 为 0 个漏洞；本地桌面与 390px 移动端无横向溢出、运行时错误或 console 错误。仍无真实登录凭据，云端删除、投递保存和真实 AI 取消 / 超时只完成静态契约与匿名边界验证；无 migration、hosted DDL、环境变量或 Supabase 写入。
- 快捷筛选逻辑：新上岗位只按 `jobs.created_at` 的滚动 7×24 小时计算，不使用会被后台编辑改变的 `updated_at`，也不把招聘开启日期 `start_date` 当作本站收录时间。偏好只在用户主动选择时生效；只填一类偏好则匹配该类，同时填写意向地区和岗位时要求两类都命中；全国 / 全球岗位可匹配任意地区偏好。没有偏好时选项禁用，并提供登录 / 前往个人中心填写偏好的入口。
- 本地 production 浏览器证据：1440×900 与 390×844 均无横向溢出。测试期间 hosted 开放岗位由 225 动态增加到 231，默认 DOM 同步一次显示全部 231 行；近 7 天结果由 44 动态增加到 50，切换后 DOM 为 50 行。未登录状态下偏好选项禁用，下拉框在 390px 视口内完整显示。`/my` 与 `/bottle` 未登录回跳分别为 `/login?next=%2Fmy`、`/login?next=%2Fbottle`；检查期间无 console error / warning。岗位数量是实时数据，以上仅为 2026-07-16 本轮验证快照。
- 当前仍是 `main` / `fd73dcd`，本轮 14 个仓库文件为未提交修改，尚未推送或部署；生产仍是 `fd73dcd` / `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL`。没有真实登录测试账号，因此云端简历删除、投递编辑与真实 MiMo 取消 / 超时分支尚未端到端验证。没有 migration、hosted DDL、环境变量或 Supabase 数据写入；`.codex-artifacts/` 与五份 PRD 未触碰。

### 3.0.0 2026-07-15 已上线：用户自选直接导入或 AI 复核

- 已有简历完成浏览器本地解析后，用户不再被强制等待 AI。弹窗同时提供“直接导入解析结果”和“交给 AI 复核”；AI 成功后新增“导入 AI 复核结果”，用户仍可选择原程序结果。`resume_import_created` 埋点新增 `review_mode: "program" | "ai"`，不记录正文。
- AI 超时、上游错误或结构失败不会清除 `localResult`，直接导入按钮继续可用。504 文案改为“AI 复核超时，你仍可直接导入程序解析结果，或稍后重试”，不会再把用户锁死在重复请求路径。
- 导入 prompt 不再把工作 / 项目等完整 bullets 同时重复放入原文和本地草稿。`buildLocalReviewHints` 只发送非空字段锚点、记录属性和 bullet / skill 数量；AI 仍以原文为唯一事实来源并返回完整严格 JSON。
- MiMo 上游硬截止从 22 秒调整为 38 秒，route segment 显式 `maxDuration = 45`。新增安全时序日志：只记录 outcome、elapsedMs、sourceChars、education / work / project / bullet counts，不输出文件名、正文、联系方式或完整草稿。
- 本地验证通过：按约束只删除 `.next/types` 与 `.next/dev/types` 中 `* 2.ts` 重复缓存后，`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过。`npm start` 下 `/resume` HTTP 200、未登录导入 API 401；客户端 chunks 含三个新选择权文案。
- 5 个相关文件提交为 `fd73dcdc3c2d349f4df30a8ce2213fa87ed4138c` 并推送 `origin/main`。Vercel production deployment `dpl_9iTDP2TUBZcjXdx9NyVX9Zo9QpzL` / `https://job-bottle-b3i6vmypq-raywang6688-7050s-projects.vercel.app` 为 READY。正式域名 `/resume` HTTP 200，线上 chunks 已检出“直接导入解析结果”“导入 AI 复核结果”“AI 超时或失败不会清除当前解析结果”和 `review_mode`；未登录导入 API 为 401。0.1.7 ZIP 仍为 HTTP 200 / `application/zip` / 111,586 bytes，SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。
- 没有可用真实登录测试账号，因此尚未完成生产真实文件的程序直导、AI 成功结果、38 秒超时降级与最终 A4 人工对照。没有 migration、hosted DDL 或 Supabase 数据写入；`.codex-artifacts/` 与五份 PRD 未修改或提交。

### 3.0.0 2026-07-15 诊断确认：简历智能导入偶发超时

- 用户看到的“智能导入请求超时，未创建简历，请重试”只由 `POST /api/resume/import` 服务端 `AbortController` 触发：当前硬截止为 22 秒，客户端没有另一层超时。文件本地读取、请求 400 / 429、AI 空结果和 JSON 结构错误使用不同文案，因此该提示可明确归因于 MiMo 请求未在 22 秒内完成。
- 当前一次请求最多同时携带 24,000 字原文和完整 `localDraft`，并要求 MiMo 以非流式 JSON 重新输出完整简历结构，允许最多 4,500 output tokens。复杂经历越多，输入会因“原文 + 完整草稿”重复膨胀，输出长度也随教育、工作、项目和 bullet 数量增长；22 秒与该最坏情况不匹配。
- 不含真实用户数据的上游探针：低复杂度 1,356 / 7,910 / 22,000 字原文分别约 6.5 / 6.8 / 5.1 秒返回 200；模拟 8 段工作、8 个项目、每段 6 个 bullet 时，原文 4,348 字、合并 prompt 12,313 字，35 秒仍触发 `AbortError`。因此主要变量是结构与输出复杂度，而非原文字数本身。
- 生产 Vercel Lambda 当前位于 `iad1`，MiMo host 为中国区 `token-plan-cn.xiaomimimo.com`；跨区域网络延迟是生产波动的额外放大因素。Vercel 历史日志查询本轮没有返回可用的导入请求记录，因此尚不能量化真实用户的 P50 / P95 或按区块数量统计失败率。
- 当前日志只记录 error name / code / status，不记录耗时、原文字数、区块数、bullet 数或 request ID。建议修复优先级：先把 AI 从“重建整份简历”收敛为只复核本地未确认字段 / 区块并减少重复载荷；其次把函数放到更靠近上游的区域；再增加不含正文的耗时与复杂度指标。单纯延长超时只能作为兜底。此次仅诊断与合成探针，未修改代码、未提交、未部署、未调用真实用户数据，也没有 migration、hosted DDL 或 Supabase 写入。

### 3.0 2026-07-15 已上线：中英文模板、导入语言识别与独立 AI 译本

- `/resume` 的“新建简历”改为先选择 `中文简历` 或 `English Resume`，再从对应模板创建。`ResumeTemplatePicker` 按语言隔离模板：中文只显示 6 套中文模板，英文只显示 `English Classic` / `English Modern`；已有简历在编辑时也只显示自身语言模板。语言由模板 ID 确定，未新增数据库字段或 migration。
- `src/lib/resume-import.ts` 在本地提取文本后按正文中 CJK / Latin 字符占比识别主要语言，`POST /api/resume/import` 的严格结构新增 `language: "zh-CN" | "en-US"` 并要求 AI 复核正文主要叙述语言。用户确认生成时自动分配同语言默认模板，复核结果和生成按钮明确显示中文 / 英文简历。
- 已有中文简历增加“AI 转英文”，英文简历增加“AI 转中文”。新增受保护的 `POST /api/resume/translate`、`src/lib/resume-translation.ts` 和 `ResumeCreateDialog.tsx`。翻译结果始终生成独立 UUID、独立段落 ID 和目标语言对应模板，不覆盖原简历，也不继承 `linkedJobId`；空白简历不会消耗 AI 请求。
- 翻译请求只发送可翻译文本结构，明确排除手机号、邮箱、LinkedIn、GitHub、个人网站与照片；译本创建时这些字段由浏览器本地原样保留。服务端要求真实登录、复用 `take_resume_ai_rate_slot`，使用严格 JSON schema，并校验教育 / 工作 / 项目 / 技能 / 校园 / 奖项数组及 bullet 数量不变；日期、GPA 和 current 标记由确定性逻辑回填。失败、超时或结构不一致时不创建或修改简历。
- `scripts/smoke_check.mjs` 新增语言选择、模板过滤、导入语言、翻译隐私载荷、服务端鉴权 / 限流 / 结构保持和独立译本契约；确定性探针确认中英文识别、6 / 2 模板数量、联系方式与照片不进入 AI 载荷，以及译本新 ID、目标模板、解除岗位绑定和本地保留精确字段。
- 验证通过：清理仅有的 `.next/types/cache-life.d 2.ts`、`routes.d 2.ts`、`validator 2.ts` 重复生成缓存后，`npx tsc --noEmit` 通过；`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过。Build 已产出 `ƒ /api/resume/translate`；本地与生产未登录 POST 均返回预期 401。
- 浏览器检查：本地桌面弹窗中文为 6 套、英文为 2 套；390×844 下弹窗 `scrollWidth === clientWidth === 390`、无横向溢出，主要操作按钮高度 44px。生产 `/resume` 返回 HTTP 200，线上客户端资源已检出 `English Resume`、`AI 转英文`、`AI 转中文`、`English templates` 与“使用此模板创建”。生产浏览器自动化连接本轮超时，因此未把线上点击流程写成已验证。没有真实登录态，尚未核验 MiMo 实际翻译质量、专有名词对照与译本 A4 最终视觉。
- 功能代码与更新日志提交为 `f212d51d518105196837cb791639149dbafbfc77`，随后更新日志基线提交为 `dc71b9c41ff89a2183e5ad1b276a312a98c2d99c`；本地、`origin/main` 一致。最终 Vercel production deployment 为 `dpl_2d3oiijZErMMuzQXzzjs1VPwhyNM`，URL `https://job-bottle-9rxffgsyi-raywang6688-7050s-projects.vercel.app`，状态 `READY`。生产未登录 `/api/resume/translate` 返回 401；0.1.7 ZIP 仍为 HTTP 200 / `application/zip` / 111,586 bytes / SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。`.codex-artifacts/` 与五份未跟踪 PRD 未修改。本轮无 migration、hosted DDL 或 Supabase 数据写入。

### 3.0 2026-07-15 已上线：已有简历智能导入

- `/resume` 页头新增“导入简历”。支持不超过 8 MB 的 PDF、DOCX 和 TXT；浏览器使用 `pdfjs-dist` / `mammoth` / `File.text()` 先在本地提取文字，原文件不上传。PDF 最多读取前 12 页并保留文本换行；提取文字少于 120 字符时按扫描件 / 图片型 PDF 处理，明确要求用户改用可复制文字的文件，首版不静默 OCR。
- `src/lib/resume-import.ts` 先用确定性规则识别姓名、邮箱、手机号、链接、明确求职意向、日期范围及教育 / 工作 / 项目 / 技能 / 校园 / 奖项 / 证书 / 语言硬区块，形成平台无 ID 草稿；`createResumeFromImport` 只在用户确认后生成新的 UUID 和各段记录 ID，并接入现有本地保存与云端同步。
- 新增受保护的 `POST /api/resume/import`。服务端先用 cookie session 的 `auth.getUser()` 验证登录，复用 `take_resume_ai_rate_slot`；只接收提取文字、文件名和本地候选，不接收 multipart 或原文件。MiMo 使用 JSON response format、4,500 token 上限、22 秒超时和 0 temperature，结果通过严格 Zod schema；确定性识别到的姓名、手机号、邮箱、LinkedIn、GitHub、个人网站不会被 AI 覆盖。
- MiMo prompt 明确禁止虚构原文不存在的经历、组织、时间、数字、成果、技能或责任等级，并把教育、工作、项目、校园、奖项、证书、语言作为硬边界。无法确认的字段必须为空并写入 warnings，不执行润色或自动补成果。
- `ResumeImportDialog` 展示“程序读取结果”、字符数、识别信号和风险提示；所有面向用户的模型表述统一为“AI 复核”。只有用户主动点击“交给 AI 复核”且得到合法结构后，才出现“生成拾星简历”。不会自动创建、覆盖或提交；生成后进入原有三栏编辑和 A4 预览，继承当前模板并记录不含原文的数量型埋点。
- Smoke 新增文件读取、规则解析、API 安全、确认生成、依赖和 Builder 接入契约；确定性运行探针用合成简历验证姓名、邮箱、手机号、求职意向、教育 / 工作 / 项目区块和最终平台结构。`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；首次 TypeScript 仅命中允许删除的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。
- 以上改动与下方个人中心 / 反馈拆分已提交为 `3acc952`，完整提交 `3acc95279032a7325299e3ae4b171046cdf68f64`，本地与 `origin/main` 一致。Vercel production deployment 为 `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`，URL `https://job-bottle-2b18mde3w-raywang6688-7050s-projects.vercel.app`，状态 `READY`，别名 `https://job-bottle-xi.vercel.app`；部署专属 URL 匿名访问会跳转 Vercel SSO，正式域名公开访问正常。
- 生产 `https://www.starjob.space/resume` 返回 HTTP 200；其线上客户端 chunk 已检出“导入简历”“本地读取 · AI 复核 · 确认生成”“交给 AI 复核”“生成拾星简历”。未登录 `POST /api/resume/import` 返回预期 401 与“请先登录，再使用智能导入”。由于没有可用 smoke 登录账号，仍未以真实登录用户完成 PDF / DOCX 选择、MiMo 上游结果对照和生成后 A4 视觉验收，不能写成已确认。本轮无 migration、hosted DDL 或 Supabase 数据写入。

### 3.0.1 2026-07-15 已上线：个人中心开放式平铺与反馈一级入口

- `/profile` 已移除旧的左侧分区导航、双栏“投递资产”骨架、三栏资料骨架和装饰性大星瓶。页面不再以“删掉背景的卡片”组织内容，改为统一的全宽软分隔线与“左侧模块说明 / 右侧内容”开放式平铺结构。
- 模块顺序调整为：**基本资料 → 求职偏好 → 简历与匹配 → 投递进展 → 账号**。页头只保留页面身份、状态摘要、打开投递和统一保存动作；四项概览改为横向信息带，保存偏好不再与全局保存重复。个人中心不再包含反馈类型、文本框或发送动作。
- 新增独立 `/feedback` 一级工作页，桌面顶部导航与“个人中心”并列；移动端顶部同样并列展示“反馈”和“个人中心 / 登录”，底部仍严格保持原六项主导航。页面副标题固定为“告诉我们您的建议与反馈，这对我们非常重要”，并使用开放式分区呈现问题类型、具体情况、邮件发送确认与隐私说明，不自动上传或发送简历正文、投递记录等个人资料。
- 基本资料在桌面以最多三列等宽字段排布，移动端逐级收为两列 / 单列；求职偏好以两个并列选项组呈现；简历和匹配岗位共享同一模块但以列表分隔；投递进展使用数字事实带和文本动作；账号只保留登录邮箱、公开分享说明和退出登录。没有新增卡片、阴影、发光或高频动效。
- `scripts/smoke_check.mjs` 已把新模块顺序、`/feedback` 路由、导航层级、`ProfileSection` 平铺骨架和禁止恢复旧侧栏、个人中心反馈表单、`profile-assets`、大星瓶、`BottleFact` 写入回归契约。
- 已通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；首轮 TypeScript 只命中允许删除的 `.next/dev/types/* 2.ts` 重复缓存，严格仅删除这些缓存后重跑通过。Smoke 只读 hosted Supabase 225 条开放岗位并完成匿名安全探针，没有 migration、hosted DDL 或数据写入。
- 本地浏览器检查：1280px 桌面宽度下八个顶部入口完整单行显示，页面无溢出；390px 移动宽度下顶部同时显示反馈与登录 / 个人中心，反馈分类按钮为 44px 高且 `scrollWidth === clientWidth === 390`。生产 `https://www.starjob.space/feedback`、`/profile` 均为 HTTP 200；反馈页 HTML 已检出 `/feedback` 一级导航、问题类型、发送反馈及最终副标题“告诉我们您的建议与反馈，这对我们非常重要”。已登录 `/profile` 的真实生产视觉仍待可用登录态验收。本节使用与上节相同的 `3acc952` / `dpl_HG6Uw7vXqpEek1zCYTbYaUpD9SQ5`，无 migration、hosted DDL 或 Supabase 数据写入。

### 3.0.2 2026-07-15 已上线：网申助手首屏产品图与文案精修

- `/extension` 首屏手机产品图不再使用此前的低分辨率截图。按用户提供的两张原始 popup 截图做确定性像素级拼接与等比缩放，完整保留真实文字和 UI，不让生成模型重绘界面；首次 imagegen 尝试因把透明区烘焙为棋盘格而被弃用，生成结果未接入网站。
- `public/assets/extension/starjob-resume-assistant-popup.png` 现为 760×1596 RGBA，SHA-256 `bc78c768524e4c047b6e0c747b9621451530fafe460831a524afc73296d9bbb9`；`public/assets/extension/starjob-resume-assistant-iphone17pm.png` 现为 760×1536 RGBA，SHA-256 `6f0a29fdb695d66135d4b6bacb2e401272918176c9e29336f6f24f7a5b400deb`。手机外框透明背景保留，灵动岛改为纯黑圆角胶囊，不再出现白色圆环。
- 标题固定换行为“`一份简历，`”与“`投向更多可能`”两行。说明文案改为“将拾星简历同步到浏览器，调用拾星网申工具填写常用字段。你只需检查后提交。”；`scripts/smoke_check.mjs` 已同步加入新文案与旧文案回归约束。
- 验证已通过：`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。首轮 TypeScript 只命中 `.next/dev/types/* 2.ts` 重复生成缓存，严格仅删除这些缓存后全套通过；Smoke 读取 hosted Supabase 225 条开放岗位并完成匿名安全探针，没有 migration、hosted DDL 或数据写入。
- 本地 production 页面已在 1440×1000 与 390×844 下检查。移动端 `scrollWidth === clientWidth === 390`，两段标题的 top 坐标分别为 105 与 143.875，证明换行稳定；产品图自然尺寸为 760×1536、移动端实际宽度 350px，页面无横向溢出。
- 四个任务文件已精确提交为 `2cc9af1`（`fix: sharpen extension product visual`），完整提交 `2cc9af1e6136290e68304747a7d60907eaecfe67`；本地与 `origin/main` 一致。`npx vercel --prod --yes` 部署为 `dpl_4N5VRgA7depzUu2FNNbPfYSwnuKZ`，URL `https://job-bottle-2fyr1ebv7-raywang6688-7050s-projects.vercel.app`，状态 `READY`，别名 `https://job-bottle-xi.vercel.app`。
- 生产 `https://www.starjob.space/extension` 与 `/extension/guide` 均返回 HTTP 200，并检出新标题、新文案和最终百度地址 `https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS`。线上 phone / popup PNG 分别为 412,971 / 318,068 bytes，尺寸与 SHA-256 均与本地一致；0.1.7 ZIP 返回 HTTP 200 / `application/zip` / 111,586 bytes，SHA-256 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`。未登录 `/api/resume/extension-profile` 返回预期 401。
- 生产移动端 390×844 DOM 实测 `scrollWidth === clientWidth === 390`，标题两个 span、新文案和 760×1536 产品图均已加载。该部署同时让此前 `ee1d83e` / `e110bde` 的 popup 0.1.7 修复与最终百度链接进入生产；下方“待部署”章节是部署前历史记录。本轮仍没有 migration、hosted DDL 或 Supabase 数据写入；百度网盘分享页可跳转，但其中实际文件内容未读取，不能写成已核验。

### 3.0.3 2026-07-15 已推送、待部署：网申助手 popup 宽度修复（0.1.7）

- 用户在 Chrome 工具栏打开 `0.1.6` 时，popup 会被压缩成约 50px 宽的竖条。根因是 `popup.css` 使用 `body { width: min(380px, 100vw) }`：扩展 popup 的 viewport 需要由内容固有宽度反推，`100vw` 参与该计算后形成收缩循环；普通网页截图不会暴露这个问题。
- 工作区源码已升为 `0.1.7`：`html` 明确使用 380px popup 视口，`body` 改为占满根视口并隐藏横向溢出；不改变单层开放工作面、填写逻辑、权限、同步来源或安全边界。`scripts/smoke_check.mjs` 新增固定 popup 宽度契约并禁止恢复 `width: min(380px, 100vw)`。
- 用户随后确认正确的百度网盘地址为 `https://pan.baidu.com/s/10QoSAiNpFOch881oCniEjA?pwd=SXZS`，提取码仍为 `SXZS`；前一条 `11xaueV0f0D_pFt_czk_MHw` 是误链，已加入 smoke 禁止回归。`/extension`、`/extension/guide` 与 smoke 契约已统一替换；HEAD 实测返回 302 至 `/share/init?surl=0QoSAiNpFOch881oCniEjA&pwd=SXZS`。该链接改动尚未部署，生产页面仍显示此前地址。
- 已重新生成本地测试版 `dist/starjob-resume-assistant-local/`、网站回退包 `public/downloads/starjob-resume-assistant-v0.1.7.zip` 和百度网盘待上传包 `dist/拾星网申助手-v0.1.7.zip`。两份正式 ZIP 均为 111,586 bytes，SHA-256 均为 `26f2b49712eb2c11f93432fb6e311547675e1e19d34bc84d7ffaf6235a995024`，字节一致。
- 隔离的 Chrome for Testing 已真实加载未打包 0.1.7 扩展并打开其 `chrome-extension://.../popup.html`；运行时 manifest 为 0.1.7，`html`、`body`、`.shell` 计算宽度均为 380px，完整品牌头、同步空状态和底部操作正常展开，无竖条或横向裁切。另以 380×800 预览完整的已同步/进度状态。通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；TypeScript 首轮只命中允许删除的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存，清理后全套通过。Smoke 只读 hosted Supabase 225 条开放岗位，没有 migration、hosted DDL 或数据写入。
- popup 修复提交为 `ee1d83e`；正确下载链接随后提交为 `e110bde`（`fix: correct extension download link`）并推送至 `origin/main`。本地与远端完整提交均为 `e110bde5844a32180ae6a2e66cef1e41cf0a285a`。本轮没有执行 Vercel 部署；推送后 `npx vercel ls --yes` 仍只显示此前 `dpl_7accugoddq4UzCChkUjCv9Q1eJg7` 为最新 Production。生产页面仍为 0.1.6 和此前下载链接；正确百度网盘地址仅确认可跳转，未核验其中实际文件内容。

### 3.1 2026-07-15 已上线：拾星网申助手（生产仍为 0.1.6）

- 首版 **拾星网申助手** 已提交为 `aa6ddc8`、推送 `origin/main` 并部署生产；Vercel deployment `dpl_7accugoddq4UzCChkUjCv9Q1eJg7` 状态为 `READY`。
- 扩展位于 `browser-extension/starjob-resume-assistant/`，采用 Manifest V3；权限只保留 `activeTab`、`scripting`、`storage`。用户必须在当前网申页主动点击后才会执行填写；不读取 Cookie / 浏览历史，不自动提交，不填写密码、验证码、证件号等敏感字段，文件上传仍需手动完成。
- 扩展可从拾星同步当前登录用户最多 20 份云端简历到浏览器本地存储。`/api/resume/extension-profile` 使用 cookie-based server Supabase client 和 `auth.getUser()`，查询限定 `user_id`，同步前移除 `photoDataUrl`；未使用 service role，也不会传递账号凭据。
- `/extension` 提供下载、同步、产品说明和隐私边界；`/extension/guide` 提供 Chrome / Edge 解压安装和使用教程；`/resume` 顶部新增“网申助手”入口，原三栏布局未改变。桌面顶部主导航现将“网申助手”提升为与“简历制作”“星瓶”同级的一级入口，文字上方显示斜体银蓝渐变 `BETA`，可访问名称为“网申助手 Beta”；移动端六项底部主导航未扩容。
- `0.1.6` 完成视觉收口：popup 使用拾星现有文字字标、单层开放工作面、分隔线式状态结果和分段填写方式，不使用卡片套卡片；`/extension` 首屏文案改为“一份简历，投向更多可能”，产品图改为透明背景的银色 iPhone 17 Pro Max 正面设备框和灵动岛，屏内仍为真实 popup 截图而非 AI 重绘，移除原先厚重蓝色外框。
- 当前生产扩展版本为 `0.1.6`；工作区已有上述待发布 `0.1.7` 修复。`0.1.6` 网站回退包与百度网盘包均为 111,630 bytes，SHA-256 均为 `0a38ba39e159d588d5903acd4a34fcced580f3475d6ff836103a638868e896f9`；在 `0.1.7` 正式上传和上线前，生产下载状态仍以此为准。
- 2026-07-15 最新确认：`/extension` 与 `/extension/guide` 的“获取安装包”按钮统一打开 `https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS`，页面同时明示提取码 `SXZS`。外链 HEAD 实测返回 302 至 `/share/init?surl=WhabI64zCSOXyn4zIAKMsw&pwd=SXZS`。仓库中的 ZIP 仍作为构建产物和回退包保留，但网站不直接下载该静态文件。
- 为避免正式包放宽来源限制，新增 `npm run build:extension:dev`：它在被 Git 忽略的 `dist/starjob-resume-assistant-local/` 生成独立本地测试版，只额外允许 `http://localhost:3000` 与 `http://127.0.0.1:3000`，并让扩展内同步入口打开本地站点。正式源码、网站下载包和百度网盘包仍只允许拾星生产域名。
- `0.1.2` 继续按真实网申截图修复字段错位：邻近表单项标签可识别没有 `for` 关联的“学校”；属性子串匹配要求足够长，通用 `name` 不再命中 `schoolName` / `companyName`；输入框 `type=tel` 只能增强已有语义，不再单独触发手机号，因此证书成绩和发证日期不会被手机号污染。教育“经历描述”映射课程与荣誉，工作同名字段只取对应工作记录；最近区块优先，防止教育描述先消耗工作描述序号。证书标题和详情改为结构化映射，发证日期因当前简历模型无值保持人工处理。
- `0.1.3` 修复重复经历描述仍可能整体错位的问题：旧逻辑让公司、职位、日期、描述分别按同类字段出现次数计数，页面只要在第一段前多一个可匹配描述控件，后续描述就会向前补位。现在优先从字段路径 `[0]` / `.0.` 或“实习经历-1”等标题读取记录索引，其次由学校 / 公司 / 项目名 / 证书名锚点划分记录；同一经历中的所有字段共享同一索引，不再因单个字段缺失或额外出现而连锁错位。
- MiMo 固定回退文案“页面字段格式无法识别”的根因是客户端分析对象携带了内部 `sensitive` 标记，而服务端字段 schema 使用 strict 模式拒绝未知属性。`0.1.3` 客户端只序列化七个允许的元数据字段，服务端同时安全剔除旧版本额外属性以向后兼容；带旧 `sensitive: false` 的本地真实请求已返回 200，发证日期仍映射为 `null`。
- `0.1.4` 进一步针对“四段实习出现 1→2、4→1”修复记录绑定：页面编号可能从 1 开始，而简历数组从 0 开始，因此所有同区块原始编号会先按实际出现值归一化为 0..N-1；“实习经历-1”等卡片标题优先于字段 name/id。公司自动补全组件产生的相邻重复公司输入框会归为同一锚点，不再多推进一段。四段 Chromium fixture 同时包含 1 起始编号、第一段前干扰描述框和重复公司搜索框，共正确标记 32 项；第 1–4 段公司、职位、日期、描述保持逐段对应，第四段明确不会回用第一段。
- `0.1.5` 修复项目、获奖和日期选择器的跨区块乱填。根因之一是已有明确 label / `aria-label` / placeholder 的控件仍会吸收同卡片相邻标签，导致“项目角色”同时拿到“项目名称”信号、“获奖时间”同时拿到“获奖名称”信号；现在控件自有标签优先，只有完全缺少自有标签时才取一个最近标签。根因之二是外层容器可能包住多段经历；现在带多个“实习经历-N”等标题的外层容器不能充当单条记录，项目名称、角色、描述和日期始终按最近的完整卡片共享索引，字段 name/id 中故意错写的数字不会拆散同一卡片。客户端和 MiMo prompt 同时把教育、工作、项目、校园、获奖、证书、语言设为硬区块边界；获奖名称 / 描述只使用结构化 `awards.title` / `awards.description`，当前简历没有获奖时间时保持未填。
- `0.1.5` 增加从上到下的相邻日期规则：在“起止时间 / 日期范围 / 任职时间 / 项目时间”等含两个日期控件的局部容器内，DOM 顺序第一个固定映射 `startDate`，第二个固定映射 `endDate`。对 Ant Design、Element、Arco、Semi、iView 及常见 date-picker 包装器，优先打开面板并只点击 `title` / `data-date` / `aria-label` 等属性能精确确认的目标年月日；Ant / Element 常见前后年、前后月按钮可安全导航。无法确认精确选项时不盲点日期，才回退原生值与 input/change 事件，并保留人工复核边界。
- 扩展执行改为“本地先填、AI 后补”：字段提取后立即按卡片级确定性规则填写页面；MiMo 只接收最多 6 个本地未识别字段，返回后以 `aiOnly` 模式补空项，不会重写已填字段或清除本地填写标记。即使用户关闭 popup 或 MiMo 超时，本地填写已先完成。扩展 MiMo 请求启用 `response_format: json_object` 和 800 输出 token 上限，服务端 8 秒、客户端 9 秒截止；6 个假字段本地真实探针由此前 8 秒 504 改为约 2.0 秒 200。
- 站内 `/resume` AI 润色同步提速：MiMo 请求启用 JSON 模式、2,200 输出 token 上限、0.1 temperature，服务端 / 客户端超时收紧为 18 / 22 秒；岗位信息进入 prompt 时最多 2,400 字符，系统提示去重压缩；JSON 模式下不再触发第二次 MiMo 格式修复，避免最坏双倍等待。同一用户、同一段落、同一目标的有效结果在当前服务实例内缓存 10 分钟，重复生成不再消耗新的上游调用或限流槽。四条无用户数据的真实润色探针约 6.3 秒返回有效 JSON；最小 JSON 探针约 1.1 秒。
- MiMo 官方平台显示旧 `mimo-v2-flash` 已在 2026 年 6 月转向 / 退役至 V2.5 系列；本地配置经不输出具体值的布尔探针确认已是非 Pro 的 V2.5 基础模型，因此本轮不擅自修改模型环境变量。10 分钟润色缓存和扩展限流均是进程内机制，多实例 / 冷启动下不全局共享。
- 填写流程升级为四阶段：页面字段提取、本地规则与 MiMo 智能复核、逐项填写、未填项整理。新增 `/api/resume/extension-match` 和短期 HMAC 匹配令牌；扩展只上传字段标签、placeholder / name / id、控件类型、所属区块和本地候选键，**不上传输入框当前值、姓名、手机号、简历正文或经历内容**。服务端将结果限制在标准字段键白名单并校验置信度；证件号、验证码、附件、密码和无对应值字段返回不匹配。MiMo 超时或不可用时自动回退本地规则，不阻断填写。
- 智能匹配当前使用每用户 10 分钟 8 次的内存限流和 8 秒上游超时。内存限流在多实例 / 冷启动环境中不是全局强一致限流；若正式用量上升，应迁移到持久化限流，但不得把 migration 文件存在、部署状态和 hosted DDL 执行混写。
- 本地验证：无效匹配令牌返回 401；MiMo 元数据格式、JSON 模式和限时回退均做了真实探针。最新版 Chromium fixture 返回 `STARJOB_EXTENSION_TEST_PASS` 并正确标记 42 项：四段工作逐段对应；两个项目即使描述字段 name 下标被故意互换仍保持名称 / 角色 / 日期 / 描述整卡一致；获奖区不会吸收实习字段；两个无 start/end 标签的日期范围按左开始、右结束填写；模拟 Ant 日期面板确认实际打开并精确点选目标日期。`npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check` 全部通过；TypeScript 首次只命中允许删除的 `.next/types` / `.next/dev/types` `* 2.ts` 重复缓存。`/extension` 已在 1440×900 和 390×844 做浏览器检查，移动端 `scrollWidth === innerWidth === 390`，无横向溢出，设备图和新首屏文案正确。最新 production build 的 `0.1.6` 回退 ZIP 返回 HTTP 200 / `application/zip` / 111,630 bytes。当前仍无法直接读取用户真实企业页面 DOM，0.1.6 真实页面验收需用户在 `chrome://extensions` 重新加载本地扩展并刷新空白表单后复测，不能写成已确认。
- 功能设计参考了公开的 MIT 项目与 Chrome 官方 Manifest V3 / `activeTab` / content script / storage 文档；未复制“牛客网申助手”的代码、品牌或资产。参考目录仅用于行为审计，仓库内资产全部使用拾星自有品牌。

### 3.2 帮助入口（`2736f94`）

- 所有当前业务 Drawer、首次访问说明弹窗和简历 AI 润色弹窗均有指南入口。
- 当前文案：**去拾星指南查看使用教程**。
- 点击后先关闭当前弹层，再进入 `/forum`。

### 3.3 投递星图与星瓶视觉（`5ed86c5`）

- 投递雷达亮点、状态文字、轨道线和岗位星使用同一圆心；修复雷达不在轨道圆心的问题。
- 轨道面以实际容器尺寸计算缩放，岗位星按同心轨道运行，避免圆轨与轨道线不重合。
- 当前阶段轨道使用金色强调；投递星图复用星瓶场景的深空背景图层。
- 岗位星点击范围优化，点击仍能打开对应投递记录。
- 星瓶内星星依投递阶段采用不同颜色和光晕：浏览偏冰蓝、已投递偏淡紫、笔试偏青、面试偏暖杏 / 金色，Offer 为明亮金色。
- 保留既有 Canvas 星层、落瓶动画、瓶腔几何和碰撞判定；没有引入 Three.js、R3F 或物理引擎。

### 3.4 简历同步、加载与 PDF 字体（`16d4f4f`、`2132c3c`、`1b56c0d`）

- 本地草稿改为游客 / 账号隔离；登录后会安全认领游客草稿，避免不同账号混用同一简历 ID。
- 云端保存改为逐份简历队列。网络短暂失败时保留本地副本，最多三次指数退避重试；网络恢复或页面重新可见时继续同步。
- 登录失效、关联岗位失效、模板约束未升级和临时网络错误均有区分提示；云端读取失败不阻断本地编辑。
- Noto Serif SC 字体拆为常用字与完整字集版本；预览与 PDF 使用同一字体 profile，PDF 模板切换正确使用当前 profile。
- PDF 下载仍由服务端 `/api/resume/download-auth` 校验真实登录；未登录时先保存浏览器草稿，登录/注册后返回原简历。

### 3.5 投递链接清理（`16d4f4f`）

- 所有统一投递入口会移除 `cid`、`click_id`、`clickid`（大小写不敏感）。
- 其他正常查询参数和 URL 锚点保持不变。

### 3.6 生产稳定性与数据一致性（`1b56c0d`）

- 新增 `supabase/migrations/20260714120000_production_debug_repairs.sql`，用于补齐资料、简历、管理员和数据一致性相关修复。
- AI 润色服务端增加超时、错误映射与不泄露敏感配置的结构化日志。
- 管理端导入、作者服务端接口、置顶接口和客户端同步路径补充错误处理与一致性保护。

### 3.7 求职社区转拾星指南（`6094a33`、`7ff7651`）

- `/forum` 路径保留，但产品名称和导航已变为 **拾星指南**。
- 内容分类固定为：**公告、教程、分享**。
- 客户端只展示管理员发布内容；普通用户发帖、评论、点赞和互动写入入口已移除。
- 管理员通过受保护 API 发布、编辑、删除内容，可同时重点展示多篇内容。
- 旧社区内容的迁移逻辑位于 `supabase/migrations/20260714200000_forum_to_guide_center.sql`；其中先移除旧分类约束、再归类数据的顺序已修正。

### 3.8 品牌 favicon 与搜索图标（`0f23544`）

- 新增雾白色 Apple 风格“星瓶 + 居中金星”图标。
- 站点提供 `src/app/icon.png`（512px）、`src/app/apple-icon.png`（180px）、`src/app/favicon.ico`（48px）以及 `src/app/manifest.ts`。
- `public/brand/starjob-mark.png` 为项目内品牌源图。
- 已核验生产首页输出 favicon、PNG icon、Apple icon、manifest；线上三个图标文件 SHA-256 与本地构建产物一致。
- 搜索结果图标需要等待搜索引擎重新抓取，部署完成不代表搜索页即时刷新。

### 3.9 指南快捷入口与上传链接清理（`2c52198`，已部署）

- 个人中心的四个“常用入口”已迁移到 `/forum` 拾星指南页，位于分类筛选和文章列表之前：浏览岗位坐标、处理投递进度、管理简历、查看秋招流程。
- 指南页沿用开放式工作面与分隔线布局：桌面和普通平板双列，390×844 移动端单列；不新增卡片墙。`/profile` 已移除常用入口，只保留“账号与反馈”。
- CSV / Excel 导入此前已通过 `sanitizeApplicationUrl` 清理 `cid` / `click_id` / `clickid`；现在 `src/lib/jobs.ts:toJobPayload` 也调用该清洗器，因此管理员手动新增或编辑岗位会在保存时清理这些参数，大小写不敏感，正常查询参数和 URL 锚点保留。
- 涉及文件：`src/components/forum/ForumClient.tsx`、`src/components/profile/ProfileClient.tsx`、`src/lib/jobs.ts`、`scripts/smoke_check.mjs`。未新增 migration。已推送 `main` 并部署 Vercel Production；只读审计现有 hosted `jobs` 链接，不需要 Supabase 数据修复写入。

## 4. 核心模块与当前约束

### 岗位坐标

- `/explore` 使用全国岗位地图，不再回退到旧浅色星云岗位地图。
- 地图、筛选栏与岗位列表共用地点筛选状态；筛选标题旁有“清空筛选”。
- 浏览岗位与真正投递分离：用户应先查看详情，再显式选择“收录并去官网投递”。
- 返回官网后保留“已投递 / 还没有 / 不投了”的确认闭环。

### 投递管理与星瓶

- 支持 `opened`、`applied`、`written_test`、`first_round`、`second_round`、`final_round`、`offer`、`rejected`、`withdrawn`；视觉轨道收敛为四个阶段带。
- `ProgressDrawer` 负责进度、备注、删除等主流程；保存是乐观更新，失败必须回滚。
- 星瓶星体必须位于瓶腔主路径和安全半径内，且互不重叠。
- 分享星瓶生成 3:4 PNG/PDF，展示瓶身、阶段统计、前五企业和二维码；不得泄露邮箱、手机号、用户 ID、偏好或简历数据。

### 简历

- 支持多模板、AI 润色、实时预览、账号云端同步和 PDF 下载。
- AI 润色仅从服务端调用；客户端不得暴露提供商、模型、密钥或服务端配置。
- PDF / 预览必须共享 A4 坐标、字体 profile 与分页规则。
- 任何同步失败都优先保证浏览器本地草稿可恢复。

### 拾星指南

- 原社区功能已收束为公告、教程与官方经验分享栏。
- 常规用户只能阅读；管理员才能维护内容与重点状态。
- 不要重新开放 `profiles` 公共读取。用户身份展示应继续经过服务端 `/api/forum/authors` 脱敏 / 权限判断。
- 多篇重点内容支持不得被改回“只能置顶一篇”。

## 5. 当前路由与服务端接口

```text
/                    深空首页
/explore             岗位坐标与全国地图
/jobs/:id            岗位详情
/my                  投递管理（列表 / 看板 / 星图）
/bottle              星瓶
/resume              简历制作
/extension           网申助手下载、简历同步与说明
/extension/guide     网申助手安装和使用教程
/profile             个人中心
/forum               拾星指南
/guide               静态秋招流程教程
/galaxy/*            地区 / 行业星系
/admin               管理后台
/admin/jobs          岗位管理
/admin/import        CSV / Excel 导入
/admin/users         用户管理

/api/admin/users           管理员账号管理
/api/admin/forum/pin       管理员重点内容状态
/api/admin/forum/posts     管理员指南内容 CRUD
/api/forum/authors         服务端作者身份 / 脱敏信息
/api/resume/ai-polish      登录后简历 AI 润色
/api/resume/download-auth  简历 PDF 下载登录校验
/api/resume/extension-profile  当前用户的去照片扩展同步数据
```

旧路由 `/jobs`、`/my-applications`、`/my-bottle` 均保留重定向兼容。

## 6. 数据库、迁移与外部状态

### 数据库判断规则

最终数据库结构必须同时核对：

1. `supabase/schema.sql`；
2. `supabase/policies.sql`；
3. `supabase/migrations/*`；
4. 如涉及线上行为，再核对 hosted Supabase 实际执行状态。

不能只看 `schema.sql`，也不能因 migration 文件在 Git 中就断言线上 DDL 已执行。

### 重要迁移

- `20260704010000_phase0_security_hardening.sql`：角色保护、状态历史、reports 表与搜索索引；`reports` 仍主要是数据库表 / RLS，**没有**完整论坛举报 UI。
- `20260708090000_resumes.sql`：简历表与 owner-only RLS。
- `20260710120000_profile_resume_cloud_repair.sql`：资料 / 简历云端修复。
- `20260711120000_application_workflow_details.sql`：投递工作流字段。
- `20260713193000_forum_admin_pinning.sql`：多篇置顶的排序与保护。
- `20260714120000_production_debug_repairs.sql`：本轮生产修复。
- `20260714200000_forum_to_guide_center.sql`：社区转指南。

### hosted Supabase：尚未由本文件确认的事项

- `20260713193000_forum_admin_pinning.sql` 是否已在 hosted Supabase 执行：本文件不把它写成已确认。
- `20260714200000_forum_to_guide_center.sql` 是否已在 hosted Supabase 执行：本文件不把它写成已确认。
- 后续如在 Supabase SQL Editor、CLI 或数据库直连中完成核验，必须把查询证据、时间、结果和影响更新到本文件。

## 7. 安全与数据边界

- `SUPABASE_SERVICE_ROLE_KEY` 仅可用于 server-only client、受保护 API route 和本地管理脚本。
- 禁止把 service role key 放入客户端、日志、Git、截图、文档或任何 `NEXT_PUBLIC_*` 变量。
- 不复制、输出、提交账号 CSV、密码或任何密钥。
- 用户未跟踪的 `.codex-artifacts/` 及以下 PRD 文件属于用户，禁止删除、修改或提交：
  - `docs/prd/job-bottle-prd-v3.md`
  - `docs/prd/job-bottle-prd-v4-bottle-system.md`
  - `docs/prd/job-bottle-redesign-prd.md`
  - `docs/prd/job-bottle-style-prd-v5.md`
  - `docs/prd/job-bottle-tech-spec.md`
- 普通论坛用户历史姓名展示规则是 Unicode 前三字符加三个星号；不能为了展示名称重新开启 profiles 公共读取。

## 8. 开发与验收工作流

### 开始任务前

1. 先阅读本文件；如需历史细节，再阅读 `PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md`。
2. 理解用户当前任务后，仅按任务相关索引读取页面、组件、类型、服务、样式、API route 和 migration；不要无关扫描整个仓库。
3. 先检查 `git status --short`，保留用户已有未跟踪或未提交内容。

### 每次代码修改后

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run smoke
git diff --check
```

若 TypeScript 指向 `.next/types` 或 `.next/dev/types` 中带 ` 2.ts`、` 3.ts` 等数字后缀的重复生成文件，只删除这些 `.next` 缓存副本并重跑；不要误改源码。

### 视觉验收

- 视觉调整需检查桌面、平板和 390 × 844 移动端。
- 修改首页轨道、投递星图、星瓶 Canvas 或全国地图时，必须做真实桌面 / 移动端视觉检查。
- 保持首页、星瓶、星系为深空场景；不要把场景页改成普通浅色工作页。

### 上线流程（仅当用户明确要求“上线 / 直接上线”）

1. 完成上述验证；
2. 仅暂存本次相关文件并提交；
3. 推送 `main`；
4. 执行 `npx vercel --prod --yes`；
5. 检查 `https://www.starjob.space/` 对应页面、资源或接口；
6. 将提交、部署 URL、验证结果和未验证外部状态更新回本文件。

## 9. 当前验证记录

2026-07-14 / `0f23544`：

- 通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。
- `npm run build` 已列出 `/icon.png`、`/apple-icon.png`、`/manifest.webmanifest` 静态路由。
- 生产首页输出 favicon（48px ICO）、icon（512px PNG）、Apple touch icon（180px PNG）和 manifest。
- 对 `https://www.starjob.space/` 的实际下载结果：favicon、icon、Apple icon 的 SHA-256 与本地 `src/app` 产物完全一致；manifest 为雾白主题并指向 `/icon.png` 与 `/apple-icon.png`。

2026-07-14 / `2c52198`：

- 通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`。初次 TypeScript 检查发现 `.next/types` 与 `.next/dev/types` 的 ` 2.ts` 生成缓存重复文件，已仅删除这些缓存副本并完整重跑通过。
- 通过本地 production server 在真实浏览器检查 `/forum`：桌面、768px 平板与 390×844 移动端均显示“常用入口”在文章分类与列表前；桌面/平板双列、移动端单列，无多余卡片容器或横向溢出。
- 已推送 `origin/main` 并通过 `npx vercel --prod --yes` 部署为 `READY`：部署 ID `dpl_CKXuwrF5GZ7LFjHwBGgmEc5AUr5v`，生产 URL `https://job-bottle-mkulnj4nz-raywang6688-7050s-projects.vercel.app`，别名 `https://job-bottle-xi.vercel.app`。
- `https://www.starjob.space/forum` 实测 HTTP 200，生产 HTML 含“常用入口”、浏览岗位坐标、处理投递进度、管理简历、查看秋招流程。线上浏览器视觉连接超时，故不把线上视觉截图写为已完成；已完成的本地三视口视觉检查仍有效。
- 使用 server-only service-role 对 hosted Supabase 的 214 条既有 `jobs.apply_url` 做只读审计，0 条含 `cid` / `click_id` / `clickid`（大小写不敏感），因此未执行任何数据写入。hosted Supabase DDL 状态没有变化，也未做新的 migration 执行断言。

2026-07-15 / 拾星网申助手生产发布（基线 `aa6ddc8`）：

- 通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；TypeScript 首次重跑只命中 `.next/types` / `.next/dev/types` 的 ` 2.ts`、` 3.ts` 重复缓存，已严格只删除这些缓存副本后重跑通过。
- `npm run build` 已列出静态 `/extension`、`/extension/guide` 和动态 `/api/resume/extension-profile`。未登录接口实测返回 HTTP 401；ZIP 静态资源返回 HTTP 200、`Content-Type: application/zip`、`Content-Length: 51095`。
- 扩展 DOM 回归 fixture 在真实 Chromium 中通过：姓名、邮箱、教育、工作、项目等 11 个字段填写成功；已有手机号保留；证件号和文件上传未处理；没有自动提交。
- 本地 production server 在 1440、768、390 宽度检查下载页，并在 390 宽度检查教程页；各视口 `scrollWidth === clientWidth`，无横向溢出。首次访问隐私说明弹层及关闭后的页面主体均已检查。
- `npm run smoke` 只读 Supabase 214 条岗位并完成匿名安全探针；未执行 migration、hosted DDL 或 Supabase 数据写入。代码已提交为 `aa6ddc8`、推送 `origin/main` 并通过 Vercel deployment `dpl_7accugoddq4UzCChkUjCv9Q1eJg7` 上线。
- 百度网盘最新改链后重新通过全套验证；本地 production server 的 `/extension` 与 `/extension/guide` 均输出 `https://pan.baidu.com/s/1WhabI64zCSOXyn4zIAKMsw?pwd=SXZS`、正确按钮文案和提取码。外链 HEAD 实测返回 302 至 `/share/init?surl=WhabI64zCSOXyn4zIAKMsw&pwd=SXZS`。
- 本地扩展构建完成后再次通过 `npx tsc --noEmit`、`npm run lint`、`npm run build`、`npm run smoke`、`git diff --check`；Smoke 明确检查正式 manifest / 同步桥不得出现 `localhost`，同时检查开发构建脚本不会覆盖正式 ZIP。
- 生产域名 `https://www.starjob.space/extension` 与 `/extension/guide` 均返回 HTTP 200，HTML 已检出一级“网申助手”入口、`BETA`、新首屏文案、iPhone 17 Pro Max 产品图及最新百度网盘地址。生产回退 ZIP 返回 HTTP 200 / `application/zip` / 111,630 bytes，SHA-256 为 `0a38ba39e159d588d5903acd4a34fcced580f3475d6ff836103a638868e896f9`，与本地正式包一致；未登录 `/api/resume/extension-profile` 返回预期 401。
- `0.1.1` Chromium 回归 fixture 使用带 `workExperience[0].companyName` / `position` 的真实冲突型属性、两段工作经历、只读日期框和“经历描述”文本域；17 个字段填写通过，第一段公司正确为工作公司而非姓名，第二段手填公司保留且其职位、日期、描述仍使用第二段简历数据。扩展脚本语法、ZIP 完整性及上述全套项目验证均通过。

## 10. 已知风险与后续注意事项

- 搜索引擎 favicon 有自己的抓取和缓存周期，生产图标上线已验证，不承诺搜索结果即时刷新。
- hosted Supabase migration 执行状态必须单独核验；不可将 Git 文件、Vercel API 上线和数据库 DDL 执行混为一谈。
- `reports` 不是完整举报功能；目前主要是表和 RLS。
- 岗位列表与指南列表仍没有完整的面向大数据量分页策略。
- 首页轨道、投递轨道和星瓶 Canvas 具有高视觉敏感性，改数学坐标、容器尺寸或材质时必须重新做真实视觉验收。
- 简历同步已增强，但所有新增模板、数据库约束或账号迁移仍需兼顾旧数据库 / 旧浏览器草稿的兼容性。
- 网申助手依赖 DOM 标签、字段属性、`autocomplete` 和分区上下文匹配；`0.1.1` 已修复截图所示的公司/姓名冲突、重复经历错位、日期和经历描述遗漏，但不同企业 ATS 的封闭 Shadow DOM 或完全自定义日期组件仍需用真实页面样本持续适配。明确不承诺验证码、附件上传、敏感声明和自动提交。

---

*本文件由 2026-07-14 的生产交接与 2026-07-15 的本地网申助手实现、构建和验证记录合并整理。后续任何变化必须按照第 0 节持续同步。*
