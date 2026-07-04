# 交接说明

## 当前状态

项目已经从 Phase 1 扩展到完整 MVP 功能闭环，包含用户端、个人投递、星瓶、管理员岗位管理和 CSV 导入。

已按 `docs/prd/PRD_4_Job_Bottle_Visual_Rebuild_CN.md` 完成视觉与信息架构重构：

- 用户端改为冷色星空职业星图。
- 管理员端改为独立冷色内容管理台。
- 用户端导航不再常驻暴露管理后台。
- admin 用户才会在用户端看到低调“管理入口”。
- 首页新增原创 `HeroConstellation` SVG。
- 空状态新增 `EmptyConstellation` SVG。
- `ApplicationBottle` 已拆为星瓶状态容器，运行时由 `BottleStage` 呈现透明 PNG 前景瓶与 DOM 星星层。
- 普通区块标题下的模板化说明文案已大幅删除。

2026-07-03 最新补充：

- 品牌名已从其他 agent 临时改动的“未来星瓶”恢复为 PRD 指定的“秋招星瓶”。
- 使用 image2.0 重新生成并接入 logo：`public/brand/job-bottle-logo-v2.png`。
- 使用 image2.0 生成星瓶美术参考：`public/brand/glass-bottle-art-v2.png`。
- 使用 image2.0 重新生成更宽的运行时透明玻璃星瓶前景：`public/assets/bottle-front.png`。
- 星瓶已改为透明 PNG 前景瓶 + DOM 星星层 + SVG fallback，不再用 div 或粗糙矩形拼瓶身。
- 星星落瓶动画改为下次进入 `/my-bottle` 时从瓶口进入、横向偏移、触底回弹、旋转衰减的仿物理落点动画。
- “去官网投递”会先同步打开安全占位窗口，投递记录保存成功后再跳转官网，降低浏览器拦截概率；保存失败时关闭占位窗口。
- “去官网投递”成功后会把对应投递记录加入待落星队列，下次打开“我的星瓶”时播放一次瓶口下落动画，动画完成后再清除队列。
- 岗位筛选已补充排序方式：最近更新优先、开启时间优先、公司名称排序。
- 未登录访问 `/my-applications` 与 `/my-bottle` 已验证会跳转登录页并保留 `next` 返回路径，且不会闪出空投递/空星瓶状态。
- 投递进度抽屉的“删除记录”已改为二次确认，降低误删风险。
- 新增 `npm run smoke` 冒烟检查：读取 Supabase、复用或启动本地站点、检查关键页面中文文案、旧品牌残留，以及星瓶/登录态关键防回归源码约束。
- 旧版 logo 文件已归档到 `public/brand/archive`，根目录不再保留散落的 `logo/` 文件夹。
- 全局字体改为 Geist + 苹方优先，标题使用更克制的 display 样式。
- 星系主页保留行星表面高光和暗面；已移除行星中间线、玻璃行星椭圆环和主画面横向尘线。
- 星系主页已按新增“无边界深空星系导航”PRD 重构：主页由 `SpaceHome` 及拆分组件组成，保留低对比度轨道线，点击行星先播放放大进入动画再跳转。
- 主页不再使用 canvas 星场或传统底部按钮，桌面行星会随窗口高度缩放轨道，移动端为无框星体列表。
- 登录态残留进一步收紧：默认等待 1800ms，过期或不可读的 Supabase 本地 session 不再导致 `/my-bottle` 长时间停留在读取状态。
- 全站用户端背景已升级为 image2.0 深空图片资产，桌面与移动端分别使用 `space-background-desktop.png` 和 `space-background-mobile.png`，修复横向颜色分层。
- `/jobs` 岗位星图已按 PRD_8 改为星云入口 -> 具体星云 -> 公司星体详情，不再默认铺满 167 个公司星体。
- 星云入口使用透明星云 PNG 资产，主要文件位于 `public/assets/nebula/`。
- 星云内公司星体使用稳定规整布局，超过可视数量时显示可点击聚合信号，避免文字和星体堆叠。
- 星云选择会联动下方岗位列表筛选，点击星体会滚动到对应岗位。
- `/my-applications` 主视觉已从横向时间轴改为同心圆投递轨道，状态越接近 Offer 越靠近中心。
- 投递轨道支持状态标签筛选、轨道星体详情、聚合星团展开，并保留底部列表与进度抽屉。

## 关键文件

- 首页工作台：`src/components/jobs/HomeClient.tsx`
- 职业雷达：`src/components/jobs/JobFilterBar.tsx`
- 岗位卡：`src/components/jobs/JobCard.tsx`
- 星瓶：`src/components/applications/ApplicationBottle.tsx`
- 星瓶舞台：`src/components/applications/BottleStage.tsx`
- 星星堆叠坐标：`src/components/applications/bottleGeometry.ts`
- 星星视觉：`src/components/applications/StackedStar.tsx`
- 待落星队列：`src/lib/bottle-drop.ts`
- 新 logo：`public/brand/job-bottle-logo-v2.png`
- 星瓶美术参考资产：`public/brand/glass-bottle-art-v2.png`
- 运行时透明星瓶前景：`public/assets/bottle-front.png`
- 旧版视觉资产归档：`public/brand/archive/`
- 星系主页：`src/components/galaxy/GalaxyHome.tsx`
- 星系主页主控：`src/components/galaxy/SpaceHome.tsx`
- 星系背景：`src/components/galaxy/SpaceBackground.tsx`
- 全站深空背景：`src/components/layout/SpaceBackground.tsx`
- 全站深空外壳：`src/components/layout/SpaceShell.tsx`
- 星云入口：`src/components/galaxy/NebulaGateway.tsx`
- 星云节点：`src/components/galaxy/NebulaNode.tsx`
- 星云内公司星体：`src/components/galaxy/NebulaCompanyField.tsx`
- 星云详情：`src/components/galaxy/NebulaDetailWindow.tsx`
- 星云分组：`src/lib/nebula-groups.ts`
- 稳定星体布局：`src/lib/star-layout.ts`
- 中心星体：`src/components/galaxy/CorePlanet.tsx`
- 功能行星：`src/components/galaxy/FloatingPlanet.tsx`
- 轨道线：`src/components/galaxy/OrbitLines.tsx`
- 行星进入转场：`src/components/galaxy/PlanetTransitionOverlay.tsx`
- 首页星图主视觉：`src/components/visuals/HeroConstellation.tsx`
- 空状态星座图：`src/components/visuals/EmptyConstellation.tsx`
- 用户端外壳：`src/components/layout/UserShell.tsx`
- 管理员端外壳：`src/components/layout/AdminShell.tsx`
- 投递轨道：`src/components/applications/ProgressDrawer.tsx`
- 同心投递轨道：`src/components/applications/ApplicationOrbitSystem.tsx`
- 投递轨道配置：`src/components/applications/ApplicationOrbitConfig.ts`
- 投递轨道环：`src/components/applications/ApplicationOrbitRing.tsx`
- 投递星体：`src/components/applications/ApplicationOrbitStar.tsx`
- 投递轨道图例：`src/components/applications/ApplicationOrbitLegend.tsx`
- 投递轨道详情：`src/components/applications/ApplicationOrbitDetail.tsx`
- 我的投递：`src/components/applications/MyApplicationsClient.tsx`
- 管理后台：`src/components/admin/AdminJobsClient.tsx`
- 批量导入：`src/components/admin/CsvImportPanel.tsx`
- Supabase schema：`supabase/schema.sql`
- RLS policies：`supabase/policies.sql`
- 种子数据：`supabase/seed.sql`

## 运行验证

已经通过：

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run smoke
```

本地浏览器验证：

- 首页主视觉 SVG 已渲染。
- 首页用户导航为“岗位星图 / 我的投递 / 我的星瓶 / 登录”，没有普通“管理后台”主项。
- 首页没有旧模板说明文字：“调整信号”“根据行业、城市、岗位方向”“你投递过的公司”。
- 首页桌面和 390px 移动宽度均无横向溢出。
- `/admin` 使用独立管理导航，包含“管理后台 / 岗位管理 / 批量导入 / 返回用户端 / 退出登录”。
- 未登录访问 `/admin` 只显示管理员登录提示，不展示后台业务内容。
- `/jobs` 已验证真实读取 167 条岗位，排序控件可见，无数据库错误，无横向溢出。
- 冒烟脚本已验证 `/`、`/jobs`、`/login`、`/forum`、`/admin` 关键中文文案正常，无“未来星瓶”旧品牌残留，并会阻止登录态卡住、星瓶背景分层、旧瓶身叠影、星星文字省略、首页回退到 canvas/旧轨道实现等回归。
- 浏览器验证 `/my-applications` 未登录跳转到 `/login?next=%2Fmy-applications`，无横向溢出，无旧品牌，无空状态闪出。
- 浏览器验证 `/my-bottle` 未登录跳转到 `/login?next=%2Fmy-bottle`，无横向溢出，无旧品牌，无空瓶状态闪出。
- 浏览器验证 `/` 首页无开发 issue overlay，轨道线保留，行星分布完整，1280x720 下外圈行星未被裁切。
- 浏览器验证 `/` 首页 logo 可见，轨道线保留，行星不重叠，无横向溢出。
- 浏览器验证 `/jobs` 默认显示星云入口，不再直铺全部公司；进入“行业星系 -> 互联网星云”后显示 23 个公司星体，检测 0 个重叠，下方列表同步为 23 个岗位，无横向溢出。

本地服务当前使用端口：

```txt
http://localhost:3001
```

## 数据库注意事项

`.env.local` 已创建，使用用户提供的 Supabase URL 和 publishable key。代码已兼容：

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

真实连接测试结果已更新：Supabase 项目可访问，`jobs` 表可读，当前岗位数为 167。`profiles` 和 `user_applications` 当前计数为 0，仍需要注册/登录真实用户后验证个人投递、星瓶和管理员权限闭环。

`schema.sql` 包含：

- `profiles`
- `jobs`
- `user_applications`
- `updated_at` 触发器
- `is_admin()`
- 新用户自动创建 profile 的 `handle_new_user()` 触发器
- `company-logos` Storage bucket，用于管理员上传公司标识

`policies.sql` 包含：

- 所有人可读上架岗位
- 管理员可管理岗位
- 用户只能管理自己的投递记录
- 普通用户不能自行改成管理员
- 公司标识公开可读，仅管理员可上传、更新、删除

## 管理员设置

用户注册后，在 Supabase SQL Editor 中执行：

```sql
update public.profiles
set role = 'admin'
where id = '<user_id>';
```

## 后续可优化

- 引入数据库分页，支持超过 1000 条岗位
- 增加真实通知系统代替页面内提示
- 加入端到端测试脚本
- 使用真实登录账号补测 `/my-applications` 同心投递轨道的状态迁移动画、聚合星团和进度抽屉更新。
