# PROJECT_CONTEXT.md — 秋招星瓶 (Job Bottle)

## 三文档不可绕过死命令（2026-08-09 起）

**死命令：任何代码、组件、样式、路由、API、类型、脚本、migration / RLS / DDL、数据库或外部数据写入、数据源或导入规则、环境变量、自动化、依赖、产品或视觉决策、测试、Git、部署、回滚、风险边界或验证证据只要发生变化，都必须在同一工作会话内同时、等量更新 `PROJECT_CONTEXT_FINAL.md`、`PROJECT_CONTEXT.md`、`PROJECT_CONTEXT_AUDIT.md`。三份任一漏写、内容不一致或缺少证据时，禁止暂存、提交、推送、部署、宣称完成或交接。后续代理无权跳过、弱化、延期、改成单文档记录，也不得用聊天记录、代码注释、提交信息或其他文档替代。**

每次三文档记录至少写明：日期、用户目标、根因/决策、实际改动文件与行为、兼容边界、验证命令和结果、提交与部署证据（如有）、已确认和未确认的外部状态。若本次只完成诊断而没有修改，也必须在三份文档中同步写清“零修改/零部署”及诊断证据。

## 2026-08-17 本地完成：单一投递清单与每家公司独立星轨（未上线）

- 用户进一步明确：不同公司的招聘流程不同，星轨不能按账户全局共用，必须允许逐公司单独编辑；“现在要做”和独立“材料准备”对当前管理无帮助，应从主工作台移除；所有公司应集中在一张交互清晰的列表中，并支持按进程与跟进时效组合筛选。
- `MyApplicationsClient.tsx` 已收敛为唯一公司清单，不再并列展示行动面板、材料区、看板或星图。列表直接呈现公司/岗位、当前进程、最近进展、下一步与操作；每行都能原地切换阶段、打开详情或编辑该公司的流程。顶部提供准备投递、已投待反馈、笔试/面试、Offer、已结束等进程筛选，并提供今天有进展、7 天内有进展、7/14 天以上无进展、下一步已逾期等时效筛选，以及需要关注、最近更新、公司名称排序。最近进展明确按该记录最后一次状态或信息更新时间计算，不伪装成已知企业反馈时间。
- `application-workflow.ts`、`ApplicationWorkflowRail.tsx` 与 `ProgressDrawer.tsx` 改为逐条 `user_applications` 读取和编辑星轨。每家公司可独立新增、删除、改名、排序和恢复默认节点，限制为 2–12 个节点、名称最多 12 字且不能重复；自定义节点用金色菱形与金色状态标签突出。每个节点仍映射既有标准状态，使阶段筛选、统计、历史和旧客户端保持兼容；抽屉按该公司节点绘制可横向滚动的轨道，并保留简历绑定、优先级、渠道、账号、联系人、备注、复盘、时间线和结束轨道。
- migration `20260817090000_application_workflow_custom_nodes.sql` 在 `user_applications` 增加 `workflow_nodes jsonb` 与 `workflow_node_id`，流程随投递记录保存并沿用该表既有 owner RLS，不再创建账户级 `application_workflows` 表。数据库约束要求数组为 2–12 个节点；客户端继续做节点 ID、名称、标准状态和重复名称校验。正式 Supabase 项目 `uzzdcjdjlbnxmhvilldj` 的 dry-run 只列出这一条迁移，随后 `db push --linked` 成功；远端 migration history 已回查为 local/remote 同为 `20260817090000`，匿名 REST 对两个新列返回 200，未重写现有投递记录。
- `StatusPill.tsx` 与工作主题状态色继续保持标准阶段可区分，自定义进程使用独立金色语义；已删除不再使用的全局星轨容器样式。自动回归新增“不同公司流程互不影响”覆盖，Smoke 门禁改为要求单一列表、组合筛选和逐公司 migration，并明确禁止重新加入“现在要做”、独立“材料准备”、账户全局星轨及投递看板/星图。
- 最终通过 `npm run typecheck`、定向 ESLint、Node 全量 123/123、`git diff --check`、55 路由生产构建与完整 `npm run smoke`；Smoke 只读读取 595 条开放岗位并验证 `/my` 等 17 个页面与 SEO。首次 Smoke 遇到可重建 Turbopack 持久化缓存损坏，精确清理 `.next` 后第二次发现页面探针仍要求已删除的“当前阶段”旧文案，修正门禁后完整复跑通过。真实登录桌面预览加载 8 条投递且无控制台错误，“笔试 / 面试”筛选准确得到 4/8 条，点击行内“编辑流程”正确打开对应公司的独立 7 节点编辑器；没有点击保存或改写真实记录。Hosted migration 已执行并完成只读 schema 回查；截至本条记录仍未 Git 暂存/提交/推送或完成 Vercel 部署，因此不能宣称应用已上线。移动端视觉、owner RLS 和自定义流程真实保存 E2E 仍未确认。
- 本地预览继续使用 `npm run build` + `npm start`，避免 Next.js 开发热更新所需 `unsafe-eval` 与项目正式 CSP 冲突导致页面停在“正在整理投递记录”；正式安全策略未放宽。用户原有 `package.json`、`.codex-artifacts/`、五份 PRD 和三文档中 2026-08-17 自动化 heartbeat 记录均保留未覆盖。

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
