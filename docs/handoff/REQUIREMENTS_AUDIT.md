# 需求审计

## 已由当前工作区证据验证

- Next.js App Router、TypeScript、Tailwind CSS 已建立。
- 固定依赖已安装：Supabase、Motion、React Hook Form、Zod、Papa Parse、Lucide。
- `npm run lint` 通过。
- `npx tsc --noEmit` 通过。
- `npm run build` 通过。
- `npm run smoke` 通过。
- 首页本地浏览器验证通过：
  - 标题为“秋招星瓶”
  - 主标题为“岗位星图”
  - 导航为中文：“岗位星图 / 我的投递 / 我的星瓶 / 登录”
  - 普通用户导航没有“管理后台”
  - 页面包含“筛选”“我的星瓶”“秋招星瓶”
  - 首页主视觉 SVG 已渲染
  - 未出现旧模板说明文案：“调整信号”“根据行业、城市、岗位方向”“你投递过的公司”
  - 未出现可见英文品牌文案或 Supabase 原始字样
  - 无横向溢出
- 390px 移动宽度验证通过：
  - 无横向溢出
  - 移动导航按钮存在
  - 首页 SVG 仍渲染
- `/admin` 页面本地浏览器验证通过：
  - 使用独立管理导航：“管理后台 / 岗位管理 / 批量导入 / 返回用户端 / 退出登录”
  - 不显示用户端“我的投递 / 我的星瓶”
  - 未登录时显示“请先登录管理员账号”
  - 无横向溢出
- Supabase publishable key 已写入 `.env.local`，代码兼容新旧 key 名称。
- Supabase 连接验证已执行；`jobs` 表可读，当前计数 167。
- `/jobs` 本地浏览器验证通过：真实加载 167 条岗位、无数据库错误、无横向溢出、排序控件可见。
- `/my-applications` 未登录浏览器验证通过：跳转 `/login?next=%2Fmy-applications`，无旧品牌、无横向溢出、无空状态闪出。
- `/my-bottle` 未登录浏览器验证通过：跳转 `/login?next=%2Fmy-bottle`，无旧品牌、无横向溢出、无空瓶状态闪出。
- `profiles` 和 `user_applications` 当前计数 0，需要真实注册/登录后继续验证。
- image2.0 生成的新 logo 已接入：`public/brand/job-bottle-logo-v2.png`。
- image2.0 生成的新星瓶美术参考资产已保留：`public/brand/glass-bottle-art-v2.png`。
- image2.0 生成的更宽运行时透明星瓶前景已接入：`public/assets/bottle-front.png`。
- 运行时星瓶已改为透明 PNG 前景瓶 + DOM 星星层 + SVG fallback，避免 div 拼瓶或贴图叠加导致视觉凌乱。
- SVG fallback 已改为仅在 PNG 加载失败时显示，避免新旧瓶身叠影。
- 星瓶内公司星星已放大到约 40-48px，中文简称不再被省略。
- 星瓶外层大面积卡片背景已移除，修复页面横向背景分层和矩形边界。
- 登录态读取已加本地 session 预判和超时保护，未登录访问个人页会快速进入登录页。
- `/jobs` 已新增岗位星图状态栏、筛选摘要和“全部 / 未投递 / 已投递”视图切换。
- 品牌名已恢复为“秋招星瓶”，源码中不再使用“未来星瓶”作为运行时品牌。
- 主页行星中间线、玻璃行星椭圆环和主画面横向尘线已移除；浏览器检查 `lineLikeSpans = 0`。
- 旧版品牌素材已归档到 `public/brand/archive`；运行时代码只引用 `public/brand/job-bottle-logo-v2.png`。

## 已由代码结构覆盖

- 岗位星图首页：`src/components/jobs/HomeClient.tsx`
- 职业雷达筛选：`src/components/jobs/JobFilterBar.tsx`
- 岗位卡片：`src/components/jobs/JobCard.tsx`
- 投递记录创建：`src/lib/applications.ts`
- 官网投递后的待落星队列：`src/lib/bottle-drop.ts`
- 我的投递：`src/components/applications/MyApplicationsClient.tsx`
- 我的秋招星瓶：`src/components/applications/MyBottleClient.tsx`
- 星瓶状态容器：`src/components/applications/ApplicationBottle.tsx`
- 星瓶视觉舞台：`src/components/applications/BottleStage.tsx`
- 星瓶堆叠坐标：`src/components/applications/bottleGeometry.ts`
- 星星视觉：`src/components/applications/StackedStar.tsx`
- 首页原创星图主视觉：`src/components/visuals/HeroConstellation.tsx`
- 岗位空状态 SVG：`src/components/visuals/EmptyConstellation.tsx`
- 用户端外壳：`src/components/layout/UserShell.tsx`
- 管理员端外壳：`src/components/layout/AdminShell.tsx`
- 投递轨道抽屉：`src/components/applications/ProgressDrawer.tsx`
- 删除投递记录二次确认：`src/components/applications/ProgressDrawer.tsx`
- 下次进入星瓶的待落星动画：`src/components/applications/BottleStage.tsx`
- 管理员岗位 CRUD：`src/components/admin/AdminJobsClient.tsx`
- CSV 导入：`src/components/admin/CsvImportPanel.tsx`
- 公司标识上传：`src/lib/storage.ts`

## 数据库与权限覆盖

- `supabase/schema.sql`
  - `profiles`
  - `jobs`
  - `user_applications`
  - updated_at 触发器
  - `is_admin()`
  - 新用户 profile 自动创建
  - `company-logos` Storage bucket
- `supabase/policies.sql`
  - 上架岗位公开读取
  - 岗位管理仅管理员可写
  - 投递记录按 `user_id` 隔离
  - 公司标识公开读取，仅管理员写入

## 数据覆盖

- 原始 Excel：`data/source/27秋招信息整理.xlsx`
- 可导入 CSV：`data/processed/27_jobs_import.csv`
- 数据库 seed：`supabase/seed.sql`
- 生成脚本：`scripts/build_seed_from_excel.py`
- 冒烟脚本：`scripts/smoke_check.mjs`
- 当前 seed 结果：167 条有效岗位，2 条非标准网页链接已跳过。
- seed 已做重复执行保护：同一公司 + 同一投递链接不会重复插入。

## 仍需真实账号和权限验证

当前工作区已有 `.env.local`，且 `jobs` 表已可读。以下项目仍需真实账号和管理员角色验证：

- 邮箱注册、登录、退出。
- 新用户自动创建 `profiles`。
- 手动设置管理员后，管理员页面可访问。
- 管理员新增、编辑、删除、上架、下架岗位。
- 管理员上传公司标识到 `company-logos` bucket。
- CSV 导入写入 `jobs`。
- 首页读取 `is_active = true` 岗位。
- 登录用户点击“去官网投递”后创建 `user_applications`，并跳转官网。
- 登录用户点击“去官网投递”后，下次进入“我的星瓶”应播放一次对应星星从瓶口下落的动画。
- 重复点击不会生成重复记录，也不会覆盖已有投递状态。
- 我的投递只显示当前用户记录。
- 星瓶只显示当前用户记录。
- 投递轨道保存状态和备注。

## 外部验证准备

执行顺序：

1. 注册用户。
2. 在 SQL Editor 手动设置管理员：

```sql
update public.profiles
set role = 'admin'
where id = '<user_id>';
```

3. 用管理员账号验证后台、公司标识上传、CSV 导入。
4. 用普通用户验证投递记录、我的投递和我的星瓶。
