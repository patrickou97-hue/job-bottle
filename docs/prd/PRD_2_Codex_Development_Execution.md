# PRD 2：Codex 开发执行文档

## 1. 你的角色

你是本项目的全栈开发助手。你需要按照本文档分阶段开发一个秋招投递辅助网站。

你必须遵守：

1. 不要一次性实现所有功能。
2. 每次只完成当前阶段。
3. 不要提前开发后续阶段功能。
4. 不要自由更换技术栈。
5. 不要省略权限控制。
6. 不要把用户投递状态写入 jobs 表。
7. 不要让动画逻辑影响数据库主流程。
8. 每个阶段完成后，必须说明新增文件、修改文件、运行方式、测试方式、未完成内容。

## 2. 固定技术栈

必须使用：

```txt
Next.js App Router
TypeScript
Tailwind CSS
Supabase Auth
Supabase Postgres
Supabase Storage
Supabase Row Level Security
Motion for React
React Hook Form
Zod
Papa Parse
Lucide React
```

不要使用：

```txt
Vue
Nuxt
Angular
Django
Flask
Express 独立后端
MongoDB
Firebase
Java Spring
PHP
```

除非我明确要求，否则不要更换技术栈。

## 3. 项目目标

开发一个秋招岗位投递辅助网站。

核心功能：

1. 管理员发布和更新岗位。
2. 所有人浏览岗位。
3. 用户点击岗位信息跳转官网投递。
4. 用户注册登录后，可以保存自己的投递记录。
5. 用户可以查看自己投递过哪些岗位。
6. 用户可以自行标注投递状态。
7. 用户可以通过 tag 筛选岗位。
8. 用户投递后，生成带公司 logo 或公司简称的小星星，动画飞进玻璃瓶。
9. 用户点击玻璃瓶中的星星，可以查看和修改该岗位投递进度。

## 4. 数据库设计

### 4.1 profiles 表

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 4.2 jobs 表

```sql
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  start_date text,
  industry text,
  batch_type text,
  job_titles text,
  locations text,
  apply_url text not null,
  notes text,
  logo_url text,
  tags text[] default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 4.3 user_applications 表

```sql
create table user_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  status text not null default 'opened',
  progress_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, job_id)
);
```

### 4.4 状态约束

```sql
alter table user_applications
add constraint user_applications_status_check
check (
  status in (
    'opened',
    'applied',
    'written_test',
    'first_round',
    'second_round',
    'final_round',
    'offer',
    'rejected',
    'withdrawn'
  )
);
```

### 4.5 状态枚举

前端状态枚举：

```ts
export const APPLICATION_STATUS = [
  "opened",
  "applied",
  "written_test",
  "first_round",
  "second_round",
  "final_round",
  "offer",
  "rejected",
  "withdrawn"
] as const

export const APPLICATION_STATUS_LABELS = {
  opened: "已打开官网",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
  rejected: "拒绝",
  withdrawn: "放弃"
} as const
```

## 5. 推荐目录结构

```txt
app/
  page.tsx
  login/
    page.tsx
  my-applications/
    page.tsx
  my-bottle/
    page.tsx
  admin/
    jobs/
      page.tsx
    import/
      page.tsx

components/
  jobs/
    JobCard.tsx
    JobFilterBar.tsx
    ApplyButton.tsx
  applications/
    ApplicationBottle.tsx
    CompanyStar.tsx
    ProgressDrawer.tsx
    StatusSelect.tsx
  admin/
    AdminJobForm.tsx
    AdminJobTable.tsx
    CsvImportPanel.tsx
  auth/
    LoginForm.tsx
  layout/
    Navbar.tsx
    PageShell.tsx
  ui/
    Button.tsx
    Input.tsx
    Select.tsx
    Card.tsx
    Badge.tsx
    Drawer.tsx

lib/
  supabase/
    client.ts
    server.ts
  auth.ts
  jobs.ts
  applications.ts
  admin.ts
  csv.ts
  utils.ts
  constants.ts
  types.ts

supabase/
  schema.sql
  policies.sql
  seed.sql
```

## 6. 环境变量

创建：

```txt
.env.local.example
```

内容：

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

注意：

1. 前端只能使用 `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。
2. `SUPABASE_SERVICE_ROLE_KEY` 不能暴露到浏览器。
3. 如果不需要 server admin 操作，第一版可以不用 service role key。

## 7. 分阶段开发要求

## Phase 1：项目初始化和数据库

### 目标

搭建项目基础结构，完成 Supabase 表结构和权限策略。

### 需要实现

1. Next.js App Router 项目。
2. TypeScript。
3. Tailwind CSS。
4. Supabase client。
5. `types.ts`。
6. `constants.ts`。
7. `schema.sql`。
8. `policies.sql`。
9. 基础 Navbar。
10. 基础首页占位。

### 数据库 SQL

必须提供完整 SQL：

1. 创建 profiles。
2. 创建 jobs。
3. 创建 user_applications。
4. 创建 updated_at 触发器。
5. 创建 is_admin 函数。
6. 开启 RLS。
7. 创建 RLS policies。

### RLS 要求

jobs：

1. 所有人可以读取 `is_active = true` 的 jobs。
2. admin 可以读取全部 jobs。
3. admin 可以 insert jobs。
4. admin 可以 update jobs。
5. admin 可以 delete jobs。

user_applications：

1. 用户只能 select 自己的记录。
2. 用户只能 insert 自己的记录。
3. 用户只能 update 自己的记录。
4. 用户只能 delete 自己的记录。

profiles：

1. 用户可以 select 自己的 profile。
2. 用户可以 update 自己的 display_name。
3. admin 可以 select 所有 profiles。
4. 普通用户不能把自己的 role 改成 admin。

### Phase 1 验收

完成后必须说明：

1. 如何创建 Supabase 项目。
2. 如何执行 SQL。
3. 如何配置 `.env.local`。
4. 如何启动本地项目。
5. 当前页面能否正常打开。

## Phase 2：首页岗位大厅

### 目标

实现岗位列表展示和筛选。

### 页面

```txt
/
```

### 功能

1. 从 jobs 表读取 `is_active = true` 的岗位。
2. 显示岗位卡片。
3. 支持关键词搜索。
4. 支持行业筛选。
5. 支持批次筛选。
6. 支持地点筛选。
7. 支持 tags 筛选。
8. 支持清空筛选。
9. 空结果状态提示。

### JobCard 显示字段

1. company_name
2. logo_url 或公司简称
3. start_date
4. industry
5. batch_type
6. job_titles
7. locations
8. notes
9. tags
10. 投递按钮

### 筛选规则

keyword：

匹配 company_name 和 job_titles。

industry：

匹配 industry。

batch_type：

匹配 batch_type。

location：

匹配 locations。

tags：

只要包含被选 tag，即可展示。

### Phase 2 验收

1. 首页可以展示岗位。
2. 筛选可以正常工作。
3. 无岗位时显示空状态。
4. JobCard 不报错。
5. 暂时不要求用户登录和投递记录。

## Phase 3：用户认证

### 目标

实现用户注册、登录、退出。

### 页面

```txt
/login
```

### 功能

1. 邮箱注册。
2. 邮箱登录。
3. 退出登录。
4. Navbar 显示当前登录状态。
5. 登录后自动创建 profiles 记录。
6. 登录后可以访问 `/my-applications` 和 `/my-bottle`。
7. 未登录访问用户页面时，跳转 `/login`。

### 注意

1. 使用 Supabase Auth。
2. 不要自己写密码存储。
3. 不要绕过 Supabase Auth。
4. 注册成功后，role 默认 user。

### Phase 3 验收

1. 用户可以注册。
2. 用户可以登录。
3. 用户可以退出。
4. 登录后 profiles 表有对应记录。
5. 未登录用户无法访问个人页面。

## Phase 4：投递记录功能

### 目标

实现用户点击投递链接后，创建投递记录。

### 功能

点击 JobCard 上的“去官网投递”：

未登录：

1. 跳转 `/login`。

已登录：

1. upsert `user_applications`。
2. `user_id = 当前用户 id`。
3. `job_id = 当前岗位 id`。
4. status 默认 opened。
5. 如果已经存在记录，不重复创建。
6. 打开 apply_url。
7. 按钮状态变成“查看进度”。

### 注意

1. 不要把状态写进 jobs 表。
2. `user_applications` 必须使用 `unique(user_id, job_id)` 防重复。
3. 如果 apply_url 不合法，提示错误，不创建记录。
4. 数据库写入成功后再触发后续行为。

### Phase 4 验收

1. 登录用户点击投递后，数据库生成 user_applications。
2. 同一用户重复点击同一岗位，不产生重复记录。
3. 不同用户点击同一岗位，各自生成自己的记录。
4. 未登录用户点击投递会跳转登录。
5. 用户数据不会串。

## Phase 5：我的投递记录页面

### 目标

用户可以查看和管理自己的投递记录。

### 页面

```txt
/my-applications
```

### 功能

1. 展示当前用户所有投递记录。
2. 每条记录关联展示 job 信息。
3. 支持修改 status。
4. 支持编辑 progress_note。
5. 支持打开官网链接。
6. 支持删除投递记录。
7. 支持按 status 筛选。
8. 支持关键词搜索公司和岗位。

### 表格字段

1. 公司
2. 岗位
3. 地点
4. 行业
5. 批次
6. 当前状态
7. 备注
8. 投递时间
9. 更新时间
10. 操作

### Phase 5 验收

1. 用户只能看到自己的投递记录。
2. 修改状态后数据库同步更新。
3. 编辑备注后数据库同步更新。
4. 删除记录后页面同步更新。
5. 状态筛选正常。

## Phase 6：玻璃瓶页面和星星组件

### 目标

实现投递记录的可视化收藏。

### 页面

```txt
/my-bottle
```

### 组件

```txt
ApplicationBottle
CompanyStar
ProgressDrawer
StatusSelect
```

### 功能

1. 读取当前用户所有 user_applications。
2. 每条记录生成一个 CompanyStar。
3. 星星显示 logo_url。
4. 如果没有 logo_url，显示公司简称。
5. 星星放在玻璃瓶中。
6. 星星位置根据 application.id 生成稳定坐标。
7. 点击星星打开 ProgressDrawer。
8. 用户可以在 ProgressDrawer 里修改状态和备注。
9. 用户可以在 ProgressDrawer 里打开官网链接。

### 稳定坐标规则

写一个工具函数：

```ts
function getBottlePosition(id: string): { x: number; y: number }
```

要求：

1. 输入 application.id。
2. 输出稳定 x 和 y。
3. x 和 y 控制在瓶子内部区域。
4. 同一个 id 每次刷新位置一致。

### Phase 6 验收

1. 用户可以看到玻璃瓶。
2. 已投递岗位显示为星星。
3. 星星刷新后位置不乱变。
4. 点击星星可以打开详情。
5. 在详情中可以修改状态和备注。

## Phase 7：投递动画

### 目标

实现用户点击投递后，小星星飞入玻璃瓶。

### 技术

使用 Motion for React。

### 动画逻辑

1. 用户点击“去官网投递”。
2. user_applications 写入成功。
3. 页面生成 FlyingStar 临时组件。
4. FlyingStar 从按钮位置飞到玻璃瓶位置。
5. 动画结束后，刷新瓶子内星星列表。
6. 移除 FlyingStar 临时组件。

### 注意

1. 动画失败不能影响投递记录。
2. 数据库写入优先于动画。
3. 不要为了动画破坏页面结构。
4. 不要强依赖复杂 canvas。
5. 第一版用 DOM + Motion 即可。

### Phase 7 验收

1. 点击投递后出现星星飞行动画。
2. 动画结束后玻璃瓶中出现对应星星。
3. 重复点击同一岗位不会重复新增星星。
4. 动画失败不影响投递记录。

## Phase 8：管理员岗位后台

### 目标

实现岗位 CRUD。

### 页面

```txt
/admin/jobs
```

### 功能

1. 只有 admin 可以访问。
2. 展示全部 jobs。
3. 新增岗位。
4. 编辑岗位。
5. 删除岗位。
6. 上架和下架岗位。
7. 搜索岗位。
8. 按行业、批次、地点筛选。
9. 编辑 tags。
10. 填写 logo_url。

### 表单字段

```txt
company_name
start_date
industry
batch_type
job_titles
locations
apply_url
notes
logo_url
tags
is_active
```

### 表单校验

1. company_name 必填。
2. apply_url 必填。
3. apply_url 必须是 URL。
4. tags 是数组。
5. is_active 默认 true。

### Phase 8 验收

1. admin 可以进入后台。
2. 普通用户不能进入后台。
3. admin 可以新增岗位。
4. admin 可以编辑岗位。
5. admin 可以删除岗位。
6. admin 可以下架岗位。
7. 首页只展示 is_active = true 的岗位。

## Phase 9：CSV 批量导入

### 目标

管理员可以批量导入岗位。

### 页面

```txt
/admin/import
```

### 原始 CSV 字段

```txt
公司名称
开启时间
所在行业
类型
招聘岗位
工作地点
投递链接
备注
```

### 字段映射

```txt
公司名称 -> company_name
开启时间 -> start_date
所在行业 -> industry
类型 -> batch_type
招聘岗位 -> job_titles
工作地点 -> locations
投递链接 -> apply_url
备注 -> notes
```

### 功能

1. 上传 CSV。
2. 使用 Papa Parse 解析。
3. 展示预览。
4. 校验必填字段。
5. apply_url 为空的行标记错误。
6. 错误行默认不导入。
7. 管理员确认后批量插入 jobs。
8. 导入后显示成功数量和失败数量。

### tags 自动生成

根据以下字段生成 tags：

1. industry
2. batch_type
3. locations
4. job_titles

拆分符号包括：

```txt
,
，
、
/
|
空格
```

### Phase 9 验收

1. 可以上传 CSV。
2. 可以预览解析结果。
3. 错误行有提示。
4. 确认后成功导入 jobs。
5. 首页可以看到导入后的岗位。

## Phase 10：UI 打磨

### 目标

让网站看起来像一个精致的学生秋招工具，而不是普通后台系统。

### 要求

1. 使用浅色渐变背景。
2. 岗位卡片使用圆角和轻阴影。
3. 玻璃瓶使用玻璃拟态效果。
4. 星星有轻微悬浮动画。
5. 按钮状态明确。
6. 移动端可用。
7. 首页、我的投递、玻璃瓶、管理员后台视觉风格统一。

### 不要做

1. 不要过度卡通。
2. 不要让动画影响信息阅读。
3. 不要用太多花哨颜色。
4. 不要牺牲可读性。

## 8. 每阶段交付格式

每完成一个阶段，必须输出：

```txt
本阶段完成内容：
- ...

新增文件：
- ...

修改文件：
- ...

运行方式：
- ...

测试方式：
- ...

当前未完成：
- ...

需要我确认的问题：
- ...
```

如果遇到技术问题，必须说明：

```txt
问题：
原因：
解决方案：
是否影响后续开发：
```

## 9. 禁止事项

1. 禁止一次性写完整项目。
2. 禁止忽略数据库权限。
3. 禁止把用户状态写进 jobs 表。
4. 禁止把 service role key 暴露到前端。
5. 禁止让用户看到其他用户投递记录。
6. 禁止为了动画牺牲基础功能。
7. 禁止使用假数据冒充真实数据库功能。
8. 禁止写无法运行的伪代码。
9. 禁止跳过错误处理。
10. 禁止用 localStorage 代替数据库保存核心投递记录。

## 10. 第一阶段开始指令

请从 Phase 1 开始开发。

当前只完成：

1. 项目初始化。
2. 目录结构。
3. Supabase client。
4. 数据库 schema.sql。
5. policies.sql。
6. types.ts。
7. constants.ts。
8. 基础首页。
9. 基础 Navbar。
10. `.env.local.example`。

不要实现首页岗位列表、登录、投递、动画、管理员后台和 CSV 导入。

完成后按固定交付格式回复。
