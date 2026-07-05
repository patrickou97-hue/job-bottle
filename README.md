# 拾星

拾星是一个面向学生秋招投递的岗位星图与个人投递进度管理工具。界面采用全中文冷色星空职业图视觉：银蓝星轨、原创矢量星图、玻璃星瓶和独立管理后台。

## 目录

- `src/app`：Next.js App Router 页面
- `src/components`：页面组件、业务组件和 UI 基础组件
- `src/lib`：Supabase 客户端、业务访问逻辑、类型、工具函数
- `supabase`：数据库 schema、RLS policies、seed 数据
- `docs/prd`：产品、开发执行、视觉系统 PRD
- `docs/handoff`：交接说明
- `data/source`：原始 Excel 数据
- `data/processed`：由源数据生成的 CSV
- `public/brand`：当前品牌视觉资产；旧版素材归档在 `public/brand/archive`
- `public/assets`：运行时 UI 美术资产，包括透明 PNG 星瓶前景图
- `scripts`：数据转换脚本

## 本地运行

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

打开：

```txt
http://localhost:3000
```

## 环境变量

`.env.local`：

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

前端只使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。项目也兼容旧变量名 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。不要把 `SUPABASE_SERVICE_ROLE_KEY` 暴露到浏览器。

## Supabase 初始化

在 Supabase SQL Editor 中按顺序执行：

1. `supabase/schema.sql`
2. `supabase/policies.sql`
3. `supabase/seed.sql`

第一位管理员需要手动设置：

```sql
update public.profiles
set role = 'admin'
where id = '<user_id>';
```

## 数据说明

原始数据：

```txt
data/source/27秋招信息整理.xlsx
```

已生成：

```txt
data/processed/27_jobs_import.csv
supabase/seed.sql
```

生成命令：

```bash
python3 scripts/build_seed_from_excel.py
```

当前 seed 从 Excel 中保留 167 条标准网页投递链接岗位，跳过 2 条非 `http/https` 链接。

## 检查命令

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run smoke
```

`npm run smoke` 会读取 `.env.local`，验证 Supabase `jobs` 表可读，并临时启动本地站点检查 `/`、`/jobs`、`/login`、`/forum`、`/admin` 的关键中文文案与旧品牌残留。脚本也会检查星瓶和登录态防回归约束：个人页不能无限读取、星瓶不能恢复大面积矩形背景、旧版 SVG 瓶身不能常驻叠加、星星公司简称不能被省略。

## 已实现功能

- 岗位星图首页
- 职业雷达筛选
- 岗位排序：最近更新、开启时间、公司名称
- 用户登录与注册
- 投递记录 upsert
- 我的投递页面
- 我的星瓶页面
- 星系导航首页
- 讨论区
- 星星稳定坐标
- 投递进度抽屉
- 官网投递后下次进入星瓶的瓶口落星动画
- 管理员岗位 CRUD
- 管理员 CSV 导入
- 管理员上传公司标识到 Storage
- Supabase RLS 权限策略
- 用户端和管理员端独立导航与布局
- 首页原创 HeroConstellation SVG
- EmptyConstellation 空状态 SVG
- 透明 PNG 前景玻璃星瓶与稳定堆叠星星层

## 视觉系统

全站遵循 `docs/prd/PRD_3_Job_Bottle_Visual_System_CN.md` 和 `docs/prd/PRD_4_Job_Bottle_Visual_Rebuild_CN.md`：

- 全中文界面
- 用户端冷色星空职业星图
- 金色只作为少量点缀
- 用户端和管理员端信息架构分离
- 管理员端为冷色内容管理台
