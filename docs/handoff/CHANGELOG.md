# 秋招星瓶 — 修改日志

> 2026-07-02 ~ 2026-07-03 全部修改记录

> 说明：第七轮曾把运行时品牌改为“未来星瓶”。第八轮已按 PRD 恢复为“秋招星瓶”，本文件前文保留历史记录。

---

## 第一轮：数据库验证 + 基础 UI 重构 (2026-07-02)

### 数据库连接验证
- 验证 Supabase REST API 连接：jobs 表 167 条数据正常读取
- 验证 Auth 端点可用（注册触发频率限制说明 Auth 通路正常）
- 验证 profiles / user_applications / jobs 三张表均可访问
- 验证 RLS 策略生效：匿名 key 无法读取 user_applications

### 岗位列表：卡片 → 列表行
- **JobCard.tsx** 完全重写
  - 原：方块卡片，每行 2-3 个，信息密度低
  - 改：紧凑水平行，一行一个岗位
  - 布局：公司名+行业 | 岗位 | 批次 | 地点 | 日期 | 操作按钮
  - 响应式：小屏自动隐藏次要列

### 首页瘦身
- **HomeClient.tsx** 重大修改
  - 删除整个 hero 区域（"岗位星图"大标题、副标题、CTA 按钮、星座 SVG）
  - 删除 MetricStrip 统计条
  - 删除右侧瓶子 sidebar
  - 布局改为：左侧筛选 | 右侧列表（两列）
  - 标题简化为"167 个岗位"
  - 加载文案"正在校准职业雷达..." → "加载中..."

### 瓶子重做
- **ApplicationBottle.tsx** 完全重写
  - 新 SVG 烧瓶造型：窄口宽身，优雅曲线
  - 添加瓶塞（暖棕色渐变+纹理）
  - 玻璃反光效果（左侧白色高光条）
  - 地面阴影椭圆
  - 文字溢出修复：公司名 max-w-[120px] + truncate

### 星星状态变色
- **CompanyStar.tsx** 完全重写
  - opened → offer：从暗到亮的渐变
  - offer 使用金色光晕
  - rejected/withdrawn：灰度+低透明
  - 星星大小根据公司名 hash 变化（36-46px）
  - 浮动动画更柔和

### 导航文字清理
- **Navbar.tsx**
  - "岗位星图" → "岗位列表"（后改回"岗位星图"）
  - "我的星瓶" → "投递瓶"（后改回"我的星瓶"）
  - 删除"冷色职业星图"副标题
- **JobFilterBar.tsx**："职业雷达" → "筛选"
- **LoginForm.tsx**：登录/注册副标题简化

---

## 第二轮：色彩系统重构 + 视觉深化 (2026-07-02~03)

### 色彩系统重构
- **globals.css** 完全重写
  - 背景压暗至 #02040A（近黑蓝）
  - 容器：rgba(8,12,24,0.72) + 极细边框 rgba(148,163,184,0.08)
  - 阴影改为纯黑：0 24px 80px rgba(0,0,0,0.42)
  - 所有发光效果降低 60%
- **tailwind.config.ts** 更新
  - nebula-blue: #7DD3FC → #6b8db5
  - nebula-silver: #D6E4FF → #b0bac8
  - aurum-300: → #c8a96a（柔金）
  - ink-primary: → #d8dce4

### 背景星空弱化
- **StarFieldBackground.tsx** 完全重写
  - 删除所有蓝紫银光团
  - 换成极稀疏星点（10 个，1-2px，opacity 0.15-0.25）
  - 背景几乎不可见

### 星瓶 SVG 精细化
- **ApplicationBottle.tsx** 多次重做
  - 冷银蓝玻璃瓶塞（#8AA4C8 → #5a7a9e）
  - 双层玻璃线：外层银蓝 + 内层白色高光
  - clipPath 防止瓶身线条穿透瓶塞
  - 后改为简单宽矩形（漂流瓶造型）+ 木塞
  - 渐变填充模拟玻璃深度
  - 瓶颈→瓶身肩部连接线
  - 左右双反光线

### 星星轨道层级
- **ApplicationBottle.tsx** 新增 getStatusYRange()
  - opened/applied → 瓶底（Y: 65%-85%）
  - written_test/一轮/二轮 → 中层（Y: 40%-65%）
  - final_round → 中上层（Y: 25%-40%）
  - offer → 瓶口附近（Y: 12%-25%）
  - rejected/withdrawn → 最底部（Y: 70%-88%）
  - X 范围限制在 22%-78%（确保在瓶壁内）

### 星星暖色变色
- **CompanyStar.tsx** 改为暖色系
  - opened: #1a1a20（近黑）
  - applied: #2a2520（暗暖）
  - written_test: #3d3525（暖棕）
  - first_round: #52452a（中暖）
  - second_round: #6b5a30（暖琥珀）
  - final_round: #8a7540（金琥珀）
  - offer: #c8a96a（明亮金）+ 金色光晕
  - 默认低透明、hover 冷蓝光、选中冷色环

### 筛选逻辑修复
- **jobs.ts** 修改
  - getJobFacetOptions：拆分逗号值去重（"互联网, 外企" → "互联网"+"外企"）
  - filterJobs：匹配逻辑同步更新
  - 岗位按 updated_at desc 排序（最新在前）

### 首页交互增强
- **HomeClient.tsx**
  - 顶部小瓶子装饰图标 + 岗位计数
  - 底部详情卡：点击带投递的岗位行时显示
  - 页面底部 padding 加深（pb-24）

### 导航统一
- **Navbar.tsx**
  - "岗位星图 / 我的投递 / 我的星瓶"
  - 用户显示：display_name 或"个人中心"

---

## 第三轮：讨论区 + 交接文档 (2026-07-03)

### 讨论区功能
新增文件：
- **supabase/forum.sql** — 3 张表（forum_posts/forum_comments/forum_likes）+ RLS + 触发器
- **src/lib/forum.ts** — 数据层（CRUD + 点赞切换 + 批量取作者名）
- **src/app/forum/page.tsx** — 页面入口
- **src/components/forum/ForumClient.tsx** — 主客户端（分类标签+发帖+帖子列表）
- **src/components/forum/PostCard.tsx** — 帖子卡片（展开/折叠+评论+点赞）
- **src/components/forum/NewPostForm.tsx** — 发帖表表单
- **supabase/fix_forum_rls.sql** — 论坛 RLS 修复 SQL

### 论坛获取失败修复
- **根因**：forum_posts.user_id 引用 auth.users(id)，不是 profiles(id)，PostgREST 找不到外键关系
- **forum.ts** 重写：去掉 join profiles(display_name)，改为两次查询（先取帖子，再批量取作者名）
- **PostCard.tsx** 修改：author_name 替代 profiles.display_name

### Navbar 更新
- **Navbar.tsx** 添加"讨论区"导航项

### 交接文档
- **docs/handoff/VISUAL_REDESIGN_2026.md** — 视觉重设计交接文档（中文）
- 更新：新增路由变更、星瓶重做、讨论区、文件结构说明

---

## 第四轮：星系主页 (PRD_5) + 路由调整 (2026-07-03)

### 路由变更
- `/` → 星系主页（新）
- `/jobs` → 岗位列表（从 / 迁移）
- **src/app/page.tsx** 替换为 GalaxyHome
- **src/app/jobs/page.tsx** 新建，迁移原首页逻辑

### 星系主页
新增文件：
- **src/components/galaxy/GalaxyHome.tsx** — 全屏星系导航界面
- **src/lib/planet-routes.ts** — 行星路由配置

功能：
- 中心"未来星瓶"核心星体
- 5 个环绕行星（岗位星图/我的星瓶/我的投递/讨论区/管理入口）
- CSS @keyframes 轨道旋转 + 行星反向旋转保持文字正立
- hover 行星：放大 + 轨道提亮 + 信息面板更新
- 点击行星：跳转对应页面（需登录的自动跳登录）
- 管理入口仅 admin 可见
- 移动端：降级为垂直列表
- 支持 prefers-reduced-motion

---

## 第五轮：瓶子持续优化 (2026-07-03)

### 瓶子形状多次迭代
1. 窄口烧瓶（Q 曲线）→ 不对称问题
2. 宽矩形漂流瓶（rect 元素）→ 对称修复
3. 渐变填充 + 肩部连接线 + 木塞纹理 + 双反光

### 堆积定位
- **ApplicationBottle.tsx** 新增 calculatePilePositions()
  - 按状态权重排序（rejected 最底层 → offer 最顶层）
  - 48px 网格，从瓶底向上逐行排列
  - 确定性 ±4px 随机偏移
  - 星星不会飞出瓶子

### 下落动画
- localStorage 追踪投递数量变化
- 新增投递后 → 下次进入瓶子页面 → 新星星从瓶口（neckY=65）落入
- 重力加速 + 3 次递减弹跳
- motion/react keyframes 实现

---

## 第六轮：首页行星颜色 + 间距优化 (2026-07-03)

### 行星颜色区分
- **GalaxyHome.tsx** 每种 variant 不同颜色
  - primary（岗位星图）：钢蓝 #3a5580
  - secondary（我的投递）：青绿 #2a4a5a
  - glass（我的星瓶）：银白玻璃感
  - accent（讨论区）：紫色 #3d2a55
  - admin（管理入口）：深灰 #252530

### 轨道线颜色匹配
- 每条轨道线颜色与对应行星一致
- hover 时轨道颜色加深

### 行星间距修复
- 岗位星图轨道：190 → 240（离核心 60px 间距）
- 我的星瓶：280 → 335
- 我的投递：360 → 415
- 讨论区：430 → 480
- 管理入口：490 → 540
- 确保相邻行星不碰撞

---

## 第七轮：太空质感 + Logo + 登录修复 (2026-07-03)

### Canvas 星空背景
- **GalaxyHome.tsx** 新增 StarField 组件
  - 200 颗白色星点，随机大小（0.3-1.5px）
  - 独立闪烁频率
  - 彗星动画：每 8-23 秒随机出现，拖尾渐变，2-3 秒消失
  - Canvas opacity 0.6

### 登录按钮修复
- 首页右下角新增「登录」按钮（与「进入岗位星图」并排）
- 移动端在行星列表底部也显示登录入口
- 已登录用户不显示登录按钮

### Logo 集成
- **public/logo.png** 从 logo/image.png 复制并压缩
- **Navbar.tsx**：左上角显示 logo 图片（size-14，无边框，rounded-xl）
- **GalaxyHome.tsx**：核心星体显示 logo 图片
- **GalaxyHome.tsx**：星瓶行星使用 logo 图片

### 项目重命名
- "秋招星瓶" → "未来星瓶"（4 处源码修改）

---

## 涉及文件清单

### 新增文件 (15)
- src/app/jobs/page.tsx
- src/components/galaxy/GalaxyHome.tsx
- src/lib/planet-routes.ts
- src/lib/forum.ts
- src/app/forum/page.tsx
- src/components/forum/ForumClient.tsx
- src/components/forum/PostCard.tsx
- src/components/forum/NewPostForm.tsx
- supabase/forum.sql
- supabase/fix_forum_rls.sql
- public/logo.png
- docs/handoff/VISUAL_REDESIGN_2026.md
- src/components/applications/ApplicationBottle.tsx (多次重写)
- src/components/applications/CompanyStar.tsx (多次重写)

### 修改文件 (12)
- src/app/page.tsx
- src/app/layout.tsx
- src/app/globals.css
- tailwind.config.ts
- src/lib/constants.ts
- src/lib/jobs.ts
- src/lib/types.ts
- src/components/layout/Navbar.tsx
- src/components/layout/UserShell.tsx
- src/components/jobs/HomeClient.tsx
- src/components/jobs/JobCard.tsx
- src/components/jobs/JobFilterBar.tsx
- src/components/auth/LoginForm.tsx
- src/components/visuals/StarFieldBackground.tsx
- src/components/applications/MyBottleClient.tsx

---

## 第八轮：image2.0 美术重绘 + 深色星空底层 + 落瓶动画修复 (2026-07-03)

### 品牌与资产
- 运行时品牌恢复为“秋招星瓶”。
- 使用 image2.0 重新生成 logo：`public/brand/job-bottle-logo-v2.png`。
- 使用 image2.0 生成艺术星瓶参考/质感层：`public/brand/glass-bottle-art-v2.png`。
- Navbar、星系主页核心星体、星瓶行星已切换到新 logo。

### 字体与底层视觉
- 全局字体改为 Geist + 苹方优先。
- 标题使用更克制的 display 字体栈。
- 背景进一步压暗为近黑深蓝，并加入极弱径向深度。
- 星系主页新增行星表面高光、暗面、尘带和中心星体细节。

### 星瓶与动画
- `ApplicationBottle.tsx` 再次重构：改为自然瓶口、曲线瓶肩、透明玻璃外轮廓、内层折射线和瓶底星尘。
- 叠加 image2.0 星瓶图作为低透明质感层，避免页面瓶子单调。
- 新增投递星星从瓶口落入、横向碰撞偏移、触底回弹、旋转衰减的仿物理动画。

### 真实数据状态
- Supabase `jobs` 表真实可读，当前计数 167。
- `profiles` 与 `user_applications` 当前计数为 0，仍需真实账号验证个人投递闭环。

---

## 第九轮：官网投递可用性 + 待落星队列 + 排序补齐 (2026-07-03)

### 官网投递链路
- `HomeClient.tsx` 新增当前用户状态缓存，避免点击投递时先等待异步登录检查导致浏览器拦截官网窗口。
- 点击“去官网投递”后，先同步打开一个深色占位窗口；投递记录保存成功后再跳转到企业官网。
- 如果保存失败或登录态失效，占位窗口会关闭，不会留下空白页。

### 下次进入星瓶落星
- 新增 `src/lib/bottle-drop.ts`。
- 投递成功后写入待落星队列。
- `ApplicationBottle.tsx` 进入页面时优先读取待落星队列，播放一次从瓶口下落、碰壁、回弹、沉底动画。
- 动画完成后才清除队列，避免 React 开发模式初始化导致动画被提前消费。

### 视觉减法
- 移除主页行星中间线。
- 移除玻璃行星椭圆环。
- 移除主画面横向尘线。
- 移除运行时星瓶贴图叠加，保留 `glass-bottle-art-v2.png` 作为美术参考资产；运行时瓶身回到更干净的 SVG 玻璃轮廓。

### 岗位检索
- `JobFilterBar.tsx` 新增“排序方式”。
- `JobFilters` 新增 `sortBy`。
- `filterJobs()` 增加排序：
  - 最近更新优先
  - 开启时间优先
  - 公司名称排序

### 交接
- 新增 `docs/handoff/NEXT_AGENT_BRIEF.md`，供后续 agent 快速接手。
- 更新 `IMPLEMENTATION_STATUS.md` 与 `REQUIREMENTS_AUDIT.md`。

---

## 第十轮：冒烟验证脚本 + 文件归档整理 (2026-07-03)

### 可重复验证
- 新增 `scripts/smoke_check.mjs`。
- 新增 `npm run smoke`。
- 冒烟脚本会读取 `.env.local`，验证 Supabase `jobs` 表可读。
- 冒烟脚本会复用已有本地服务；如果没有服务，则自动找空端口启动 `next dev`。
- 冒烟脚本会检查 `/`、`/jobs`、`/login`、`/forum`、`/admin` 的关键中文文案，并阻止旧品牌“未来星瓶”回流。

### 文件组织
- 移除根目录散落的 `logo/` 文件夹。
- 将旧版 `logo/image.png` 归档为 `public/brand/archive/original-logo-source.png`。
- 将旧版 `public/logo.png` 归档为 `public/brand/archive/legacy-logo.png`。
- 当前运行时 logo 仍为 `public/brand/job-bottle-logo-v2.png`。

### 文档
- README 增加 `npm run smoke` 与品牌资产目录说明。
- 交接说明补充旧素材归档位置和冒烟验证方式。

---

## 第十一轮：个人页保护态 + 删除二次确认 (2026-07-03)

### 未登录保护态
- `MyApplicationsClient.tsx` 新增 `redirecting` 状态。
- `MyBottleClient.tsx` 新增 `redirecting` 状态。
- 未登录访问 `/my-applications` 和 `/my-bottle` 时，页面显示“正在前往登录...”，避免短暂闪出空投递或空瓶状态。

### 删除安全
- `ProgressDrawer.tsx` 的“删除记录”改为二次确认。
- 第一次点击提示“再次点击确认删除这条投递记录。”，第二次点击才真正删除。

### 浏览器验证
- `/my-applications` 未登录跳转 `/login?next=%2Fmy-applications`，无横向溢出，无旧品牌，无空状态闪出。
- `/my-bottle` 未登录跳转 `/login?next=%2Fmy-bottle`，无横向溢出，无旧品牌，无空瓶状态闪出。

---

## 第十二轮：透明 PNG 星瓶与下次进入落星 (2026-07-03)

### 星瓶视觉底层
- 使用 image2.0 重新生成更宽的透明玻璃星瓶前景，并接入 `public/assets/bottle-front.png`。
- 新增 `BottleStage.tsx`、`StackedStar.tsx`、`bottleGeometry.ts` 和 `useBottleStack.ts`。
- 星瓶改为前景透明 PNG、DOM 星星层、SVG fallback 的三层结构，避免继续用 div 或粗糙 SVG 拼瓶身。

### 落星交互
- 保留“去官网投递”后的待落星队列。
- 移除岗位页即时飞星动画；真正的星星下落只在下次进入 `/my-bottle` 时触发。
- 星星落点基于 application id 稳定哈希，已存在的星星直接出现在堆叠位置，只有新投递记录播放瓶口下落动画。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`

---

## 第十三轮：星瓶叠影修复 + 岗位星图状态栏 (2026-07-03)

### 星瓶修复
- `BottleStage.tsx` 的 SVG fallback 改为仅在 `bottle-front.png` 加载失败时显示，修复新 PNG 星瓶与旧版线框叠在一起的问题。
- `StackedStar.tsx` 移除中文首字省略，星星文字不再被截成“锐...”一类不可读状态。
- `bottleGeometry.ts` 将星星尺寸提升到约 40-48px，并同步放大底部堆叠间距，提升第一批投递星星的公司识别度。

### 岗位星图
- `HomeClient.tsx` 新增岗位星图状态栏：开放岗位数、当前结果数、公司数、已收录数。
- 新增“全部 / 未投递 / 已投递”视图切换，方便用户避开已投递岗位或快速回看已收录岗位。
- 新增当前筛选摘要和快速入口：“投递轨道”“我的星瓶”。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`

---

## 第十四轮：登录态不卡住 + 星瓶背景分层修复 (2026-07-03)

### 登录态读取
- `src/lib/auth.ts` 新增带超时的登录态读取，并优先判断浏览器本地是否存在 Supabase session。
- 用户端、个人投递、我的星瓶、讨论区、管理员壳和星系主页已统一使用 `getCurrentUserOrNull()`。
- 未登录访问 `/my-bottle` 和 `/my-applications` 改用 `router.replace()` 进入登录页，避免历史栈留下卡住页面。

### 星瓶背景
- `ApplicationBottle.tsx` 移除大面积卡片背景、边框和阴影。
- 星瓶页现在是无框舞台，瓶子直接落在统一星空背景上，只保留小型统计胶囊和详情浮层，修复截图中的横向背景分层与左右矩形边界。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`
- 浏览器验证：未登录访问 `/my-bottle` 会快速进入 `/login?next=%2Fmy-bottle`，不再停留在“读取投递记录...”。

---

## 第十五轮：冒烟脚本防回归约束 (2026-07-03)

### 可重复防回归
- `scripts/smoke_check.mjs` 新增源码级约束检查。
- 冒烟脚本现在会防止以下问题回流：个人页登录态无限读取、星瓶恢复大面积矩形背景、旧版 SVG 瓶身常驻叠加、星星公司简称被省略。

### 验证
- `npm run smoke`

---

## 第十六轮：无边界星系主页重构 + 登录态残留修复 (2026-07-03)

### 星系主页
- 按新增 PRD 拆出 `SpaceHome`、`SpaceBackground`、`CorePlanet`、`FloatingPlanet`、`PlanetLabel`、`PlanetTransitionOverlay`、`MobilePlanetList` 和 `OrbitLines`。
- `/` 改为深空星系导航：左上品牌、右上登录入口、中心“秋招星瓶”、功能入口以行星呈现。
- 轨道线按用户最新反馈保留为低对比度星系元素，不再是旧版 UI 圆框；行星围绕中心缓慢运动。
- 点击行星会先播放“进入行星”的放大转场，再跳转目标页面；未登录访问受保护行星会转到 `/login?next=...`。
- 桌面轨道会按窗口高度缩放，避免 1280x720 下外圈行星被裁切；移动端使用无框星体列表。
- 移除首页 canvas 星场，改为 CSS 深空背景，避免复杂粒子系统和水合不一致。

### 登录态与星瓶等待态
- `getCurrentUserOrNull()` 的默认超时降到 1800ms，并会解析 Supabase 本地 session 的 `expires_at`，过期或不可读时直接视为未登录。
- `MyBottleClient` 的等待态去掉大面积矩形背景，只保留轻量漂浮文字，避免未登录等待时出现横向背景分层。

### 防回归
- `npm run smoke` 新增首页星系组件、轨道线保留、行星进入转场、星瓶等待态和登录态 1800ms 超时约束。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`
- 浏览器验证：首页无开发 issue overlay，轨道线保留，行星不堆叠、不裁切；`/my-bottle` 未登录快速跳转 `/login?next=%2Fmy-bottle`。

---

## 第十七轮：全站深空背景 + 主页修复 (2026-07-03)

### 深空背景
- 使用 image2.0 生成并接入 `public/assets/space-background-desktop.png` 与 `public/assets/space-background-mobile.png`。
- 新增 `SpaceBackground.tsx` 与 `SpaceShell.tsx`，用户端页面统一使用真实深空背景图、稳定星点和低频流星。
- `globals.css` 移除旧的纵向渐变背景，修复页面中部横向背景颜色分层。

### 主页恢复
- `SpaceHome.tsx` 恢复左上 logo：`public/brand/job-bottle-logo-v2.png`。
- 放大主页轨道半径与最小缩放，保留轨道线作为星系元素。
- 调整行星角度和半径，修复行星重叠、轨道变小和入口缺失的问题。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`
- 浏览器验证：首页 logo 可见、轨道线保留、行星不重叠、无横向溢出。

---

## 第十八轮：PRD_8 星云观测 + 同心投递轨道 (2026-07-03)

### 岗位星体观测
- 新增 `NebulaGateway.tsx`、`NebulaNode.tsx`、`NebulaCompanyField.tsx`、`NebulaDetailWindow.tsx`。
- `/jobs` 顶部观测区从“全部公司星体直铺”改为三层结构：星系入口 -> 具体星云 -> 公司星体详情。
- 星云入口使用 image2.0 透明 PNG 资产：`public/assets/nebula/nebula-region.png`、`nebula-industry.png`、`nebula-batch.png`、`nebula-captured.png` 及常用别名文件。
- 公司星体使用稳定蜂窝/网格布局，最多显示 48 个，超过后显示可点击 `+N` 聚合信号，打开同星云剩余岗位列表。
- 星云选择会联动下方岗位列表筛选；点击公司星体会滚动并高亮下方岗位，列表清空会同步回到星云入口。

### 我的投递轨道
- 新增 `ApplicationOrbitSystem.tsx`、`ApplicationOrbitRing.tsx`、`ApplicationOrbitStar.tsx`、`ApplicationOrbitLegend.tsx`、`ApplicationOrbitDetail.tsx` 和 `ApplicationOrbitConfig.ts`。
- `/my-applications` 主视觉从横向时间轴改为圆形同心轨道：opened 最外圈，offer 最内圈，rejected/withdrawn 进入远处暗区。
- 同一状态星体按稳定角度分布并缓慢旋转；同轨道超过 7 条后显示可点击聚合星团。
- 点击轨道标签会同步筛选下方投递列表；点击星体只选中右侧详情，点击详情里的“查看 / 修改进度”才打开进度抽屉。
- 保留底部列表作为高效阅读入口，不破坏 Supabase 状态更新逻辑。

### 验证
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`
- 浏览器验证 `/jobs`：默认显示星云入口；进入“行业星系 -> 互联网星云”后显示 23 个公司星体，检测 0 个重叠；下方列表同步为 23 个岗位；无横向溢出。
- 浏览器验证 `/`：logo 可见、轨道线保留、行星不重叠、无横向溢出。
