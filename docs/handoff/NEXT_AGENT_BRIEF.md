# 下一位 Agent 接手说明

## 当前产品方向

项目名保持为“秋招星瓶”。整体方向是专业、克制、深色星空、玻璃星瓶、职业星图。不要改回“未来星瓶”，不要做成普通 SaaS 仪表盘，也不要把页面堆成一组大卡片。

## 当前关键路径

- `/`：星系主页，负责品牌与功能导航。
- `/jobs`：岗位星图，读取 Supabase `jobs` 表，当前真实数据为 167 条。
- `/my-applications`：个人投递记录。
- `/my-bottle`：我的星瓶，展示投递星星与落瓶动画。
- `/forum`：讨论区。
- `/admin`、`/admin/jobs`、`/admin/import`：管理员端，必须与用户端信息架构分离。

## 重要实现细节

- 官网投递入口在 `src/components/jobs/HomeClient.tsx`。
- 点击“去官网投递”后，会先同步打开一个安全占位窗口，保存投递记录成功后再跳转官网，避免浏览器拦截异步弹窗。
- 投递成功后调用 `queueBottleDrop()`，把对应 `application.id` 写入本地待落星队列。
- `src/components/applications/ApplicationBottle.tsx` 进入页面时读取待落星队列，播放一次从瓶口下落、轻微碰撞、回弹沉底的动画，动画完成后才清除队列。
- 运行时星瓶由 `BottleStage.tsx`、`StackedStar.tsx` 和 `bottleGeometry.ts` 组成：透明 PNG 前景瓶在上层，DOM 星星在中层，SVG fallback 在底层。
- `public/assets/bottle-front.png` 是当前运行时透明星瓶前景，已按“瓶子可以宽一些”重绘并接入。
- SVG fallback 只应在 `bottle-front.png` 加载失败时显示；不要让 fallback 常驻，否则会和 PNG 星瓶叠出旧版灰色轮廓。
- 星瓶内星星当前约 40-48px，中文公司简称不应被省略。
- `ApplicationBottle.tsx` 不应再加大面积背景卡片；星瓶页必须保持无框舞台，避免出现横向背景分层和左右矩形边界。
- `/` 首页已重构为无边界深空星系导航，入口组件是 `src/components/galaxy/SpaceHome.tsx`，`GalaxyHome.tsx` 只做兼容包装。
- 首页轨道线需要保留，这是用户明确纠正过的星系元素；但轨道线应低对比、无卡片感，不要改回粗 UI 圆框。
- 首页点击行星要先走 `PlanetTransitionOverlay` 放大进入动画，再跳转；受保护入口未登录时跳 `/login?next=...`。
- 首页不要恢复 canvas 星场、传统底部按钮或大面积卡片；桌面轨道半径已按窗口高度缩放，避免 1280x720 裁切外圈行星。
- 登录态读取统一走 `getCurrentUserOrNull()`，它会先查浏览器本地 session、解析过期时间，并带 1800ms 超时保护，避免个人页无限“读取中”。
- `MyBottleClient` 的 loading 状态不要再加大矩形背景，否则会重新出现星瓶页背景分层。
- `/jobs` 顶部已有岗位星图状态栏和“全部 / 未投递 / 已投递”切换。
- `/jobs` 顶部“岗位星体观测”已按 PRD_8 重构为星云入口层，不要改回 167 个公司星体默认直铺。
- 星云相关组件在 `src/components/galaxy/NebulaGateway.tsx`、`NebulaNode.tsx`、`NebulaCompanyField.tsx`、`NebulaDetailWindow.tsx`；分组规则在 `src/lib/nebula-groups.ts`。
- 星云入口资产在 `public/assets/nebula/`，当前主资产为 region、industry、batch、captured 四张 image2.0 透明 PNG，部分子星云复用别名文件和 CSS 滤镜。
- 星云内公司星体使用 `src/lib/star-layout.ts` 的稳定布局与聚合机制；不要引入随机散点，否则会重新出现重叠和刷新跳动。
- 星云选择会筛选下方岗位列表；清空筛选会让星云窗口回到入口层。
- `/my-applications` 主视觉已按 PRD_8 改为同心圆投递轨道，不要恢复横向时间轴作为主视觉。
- 同心轨道组件在 `src/components/applications/ApplicationOrbitSystem.tsx`、`ApplicationOrbitRing.tsx`、`ApplicationOrbitStar.tsx`、`ApplicationOrbitLegend.tsx`、`ApplicationOrbitDetail.tsx`；轨道半径和顺序在 `ApplicationOrbitConfig.ts`。
- 投递轨道里点击星体只选中右侧详情，点击“查看 / 修改进度”才打开 `ProgressDrawer`；不要把星体点击直接改成弹抽屉。
- 点击投递轨道标签会筛选底部列表；同轨道记录过多时 `+N` 聚合星团可展开。
- `npm run smoke` 现在包含源码级防回归约束；如果你改星瓶或登录态逻辑，先跑它确认没有把旧问题带回来。
- `npm run smoke` 也会检查主页星系结构、轨道线保留和行星进入转场，不要随手删这些约束。
- `npm run smoke` 也会检查星云观测入口、同心投递轨道和深空背景资产。
- `public/brand/glass-bottle-art-v2.png` 是 image2.0 星瓶参考资产，不接入运行时。
- `public/brand/job-bottle-logo-v2.png` 是当前运行时 logo。
- 旧版 logo 素材已归档到 `public/brand/archive`，不要重新接回运行时页面，除非用户明确要求回滚。

## 已验证

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run smoke`
- `/` 浏览器视觉检查：无旧品牌、无行星中间线、无横向溢出；轨道线保留，行星分布完整，点击前无开发 issue overlay。
- `/jobs` 浏览器检查：排序控件可见，真实加载 167 条岗位，无数据库错误，无横向溢出。
- `/jobs` 浏览器检查：默认显示星云入口；进入“行业星系 -> 互联网星云”后显示 23 个公司星体，星体检测 0 个重叠，下方列表同步为 23 个岗位。
- `/my-applications` 未登录会跳转 `/login?next=%2Fmy-applications`，不会闪出空投递状态。
- `/my-bottle` 未登录会跳转 `/login?next=%2Fmy-bottle`，不会闪出空瓶状态。

## 仍需真实账号验证

当前 Supabase `profiles` 和 `user_applications` 计数仍为 0。还需要用真实注册账号验证：

- 注册、登录、退出。
- 新用户 profile 自动创建。
- 普通用户投递记录写入。
- 待落星动画在真实账号下触发。
- 我的投递和我的星瓶只显示当前用户数据。
- 手动设置 admin 后后台新增、编辑、删除、导入、上传公司标识。
- 登录后补测 `/my-applications` 同心轨道：状态迁移、聚合星团、详情修改进度和下方列表筛选。
