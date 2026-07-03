# PRD 1：秋招投递辅助网站产品需求文档

## 1. 产品名称

秋招星瓶 Job Bottle

## 2. 产品定位

这是一个面向学生秋招投递的岗位信息管理与个人投递进度记录网站。

管理员可以持续发布和更新秋招岗位信息。普通用户可以浏览岗位、筛选岗位、跳转企业官网投递，并在登录后记录自己的投递状态。用户每投递一个岗位，系统会生成一颗带公司标识的小星星，并将其动画化放入一个玻璃瓶中。用户可以点击玻璃瓶里的星星，查看和更新该岗位的投递进度。

本产品不是招聘平台，不负责岗位真实性背书，不代替企业官网投递，不抓取第三方投递状态。它的核心价值是帮助学生集中查看岗位、快速跳转投递、保存个人投递记录、可视化管理秋招进度。

## 3. 目标用户

### 3.1 普通用户

主要是准备秋招、暑期实习、提前批、正式批投递的大学生。

用户需求：

1. 想快速看到当前开放的岗位。
2. 想按行业、城市、岗位方向、批次筛选岗位。
3. 想直接点击链接跳转企业官网投递。
4. 想记录自己投递过哪些公司。
5. 想维护每个岗位的进度，例如已投递、笔试、一面、二面、终面、Offer、拒绝、放弃。
6. 想用更有趣的方式管理投递记录，而不是普通表格。

### 3.2 管理员

管理员是网站维护者。

管理员需求：

1. 可以新增岗位。
2. 可以编辑岗位。
3. 可以删除或下架岗位。
4. 可以批量导入岗位。
5. 可以维护公司 logo、行业、岗位方向、城市、批次、投递链接等信息。
6. 可以保证用户看到的是最新岗位信息。

## 4. 产品目标

### 4.1 MVP 目标

第一版必须实现：

1. 岗位大厅。
2. 用户注册和登录。
3. 用户点击岗位投递链接。
4. 系统记录用户点击过或投递过的岗位。
5. 用户可以查看自己的投递记录。
6. 用户可以修改每个岗位的投递状态。
7. 用户投递后生成小星星进入玻璃瓶的动画。
8. 管理员可以发布、编辑、删除岗位。
9. 用户可以按 tag 和关键词筛选岗位。

### 4.2 非 MVP 目标

第一版暂不做：

1. 企业账号。
2. 简历上传和解析。
3. 自动投递。
4. 自动抓取企业官网岗位。
5. 自动识别投递进度。
6. 社交社区。
7. AI 简历匹配。
8. 多管理员审核流。
9. 微信小程序。
10. 复杂数据看板。

这些功能可以后续扩展，但第一版不能因为这些功能拖慢上线。

## 5. 核心原则

### 5.1 岗位信息与用户投递记录必须分离

岗位信息属于公共数据。用户投递记录属于个人数据。

不能把用户状态写进岗位表。同一个岗位会被多个用户投递，每个用户的状态不同。

### 5.2 第三方官网投递状态无法自动获取

用户点击岗位链接后会跳转到企业官网。系统无法知道用户是否真的完成投递。

因此系统只记录两类信息：

1. 用户点击过投递链接。
2. 用户自行标注的投递状态。

默认状态可以设为“已打开官网”或 `opened`。

### 5.3 动画不能影响主流程

正确流程：

1. 用户点击投递按钮。
2. 系统写入或更新 `user_applications` 数据。
3. 成功后打开官网链接。
4. 成功后播放星星进入玻璃瓶动画。

数据库写入优先。动画失败不能影响投递记录。

### 5.4 权限必须由数据库兜底

不能只靠前端判断管理员权限。必须使用数据库层面的 Row Level Security 或后端接口权限控制。

## 6. 推荐技术栈

前端和全栈框架：

- Next.js App Router
- TypeScript
- Tailwind CSS

后端和数据库：

- Supabase Auth
- Supabase Postgres
- Supabase Storage
- Supabase Row Level Security

动画：

- Motion for React

表单和校验：

- React Hook Form
- Zod

CSV 解析：

- Papa Parse

图标：

- Lucide React

## 7. 信息架构

网站页面包括：

```txt
/
  首页岗位大厅

/login
  登录与注册页面

/my-bottle
  我的玻璃瓶页面

/my-applications
  我的投递记录页面

/admin/jobs
  管理员岗位管理页面

/admin/import
  管理员岗位批量导入页面
```

## 8. 用户端功能需求

### 8.1 首页岗位大厅

首页展示所有开放岗位。

每个岗位卡片展示：

1. 公司名称
2. 公司 logo 或公司简称
3. 所在行业
4. 批次类型
5. 招聘岗位
6. 工作地点
7. 开启时间
8. 投递链接按钮
9. 备注
10. tags

用户可以进行筛选：

1. 关键词搜索：搜索公司名称和岗位名称。
2. 行业筛选：例如金融、互联网、咨询、制造、消费、地产等。
3. 批次筛选：提前批、正式批、暑期实习、补录等。
4. 城市筛选：北京、上海、深圳、广州、成都、香港等。
5. 岗位方向筛选：投行、行研、管培、产品、数据分析、市场、财务、风控等。
6. 多 tag 筛选。

排序方式：

1. 默认按更新时间倒序。
2. 可选按开启时间排序。
3. 可选按公司名称排序。

空状态：

如果没有搜索结果，显示：“没有找到符合条件的岗位，可以调整筛选条件。”

### 8.2 投递按钮

每个岗位卡片上有“去官网投递”按钮。

点击逻辑：

未登录用户：

1. 跳转到 `/login`。
2. 登录后可以回到原岗位页面。

已登录用户：

1. 在 `user_applications` 表中 upsert 一条记录。
2. 如果该用户已经记录过该岗位，不重复创建。
3. 如果没有记录，创建新记录，默认 `status = opened`。
4. 打开岗位 `apply_url`。
5. 播放星星飞入玻璃瓶动画。

按钮文案：

- 未投递过：去官网投递
- 已记录过：查看进度
- 状态为 offer：已获得 Offer
- 状态为 rejected：已结束
- 状态为 withdrawn：已放弃

### 8.3 我的投递记录

页面路径：

```txt
/my-applications
```

展示当前登录用户的所有投递记录。

字段包括：

1. 公司名称
2. 岗位名称
3. 行业
4. 城市
5. 当前状态
6. 用户备注
7. 投递时间
8. 最近更新时间
9. 官网链接

用户可以：

1. 修改投递状态。
2. 编辑备注。
3. 再次打开官网链接。
4. 删除该投递记录。
5. 通过状态筛选投递记录。

状态枚举：

```txt
opened        已打开官网
applied       已投递
written_test  笔试
first_round   一面
second_round  二面
final_round   终面
offer         Offer
rejected      拒绝
withdrawn     放弃
```

### 8.4 我的玻璃瓶

页面路径：

```txt
/my-bottle
```

功能说明：

用户每记录一个岗位，系统生成一颗小星星。小星星进入玻璃瓶，代表用户已经将该岗位收藏进自己的秋招投递记录。

玻璃瓶表现：

1. 页面中央或右侧展示一个玻璃瓶。
2. 瓶子内显示用户所有投递过的岗位星星。
3. 每颗星星带公司 logo 或公司简称。
4. 星星位置根据 application id 生成稳定坐标，不要每次刷新随机变化。
5. 不同状态可以有不同视觉样式，但第一版不强制做复杂色彩体系。

点击星星：

1. 打开岗位进度抽屉 Progress Drawer。
2. 展示公司名称、岗位名称、地点、投递链接、当前状态、用户备注。
3. 用户可以直接修改状态和备注。
4. 用户可以再次打开官网链接。

### 8.5 玻璃瓶动画

触发条件：

用户点击“去官网投递”，并且 `user_applications` 写入成功。

动画效果：

1. 投递按钮附近出现一颗小星星。
2. 小星星带公司 logo 或简称。
3. 小星星飞向玻璃瓶瓶口。
4. 小星星进入瓶子后，瓶子内新增该岗位星星。
5. 动画时长建议 600ms 到 1200ms。

失败兜底：

1. 如果动画失败，不影响投递记录。
2. 如果 logo 加载失败，显示公司简称。
3. 如果用户关闭动画，也不影响核心功能。

## 9. 管理员端功能需求

### 9.1 管理员权限

管理员由 `profiles.role` 判断。

role 可选值：

```txt
user
admin
```

只有 admin 可以访问：

```txt
/admin/jobs
/admin/import
```

非管理员访问时显示：“无权限访问。”

### 9.2 岗位管理

页面路径：

```txt
/admin/jobs
```

管理员可以：

1. 查看全部岗位。
2. 新增岗位。
3. 编辑岗位。
4. 删除岗位。
5. 上架和下架岗位。
6. 搜索岗位。
7. 按行业、批次、城市筛选岗位。
8. 上传或填写公司 logo。

岗位字段：

```txt
company_name    公司名称，必填
start_date      开启时间
industry        所在行业
batch_type      类型
job_titles      招聘岗位
locations       工作地点
apply_url       投递链接，必填
notes           备注
logo_url        公司 logo
tags            标签数组
is_active       是否展示
```

表单规则：

1. `company_name` 必填。
2. `apply_url` 必填。
3. `apply_url` 必须是合法 URL。
4. `tags` 可以自动生成，也可以手动编辑。
5. `is_active` 默认 true。

### 9.3 批量导入岗位

页面路径：

```txt
/admin/import
```

输入文件：

CSV 文件。

原始字段映射：

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

导入流程：

1. 管理员上传 CSV。
2. 前端解析 CSV。
3. 展示预览表。
4. 系统检查必填字段。
5. `apply_url` 为空的行标记为错误，默认跳过。
6. 管理员确认导入。
7. 批量插入 `jobs` 表。
8. 显示导入成功数量和失败数量。

tags 自动生成规则：

1. `industry` 加入 tags。
2. `batch_type` 加入 tags。
3. `locations` 按常见分隔符拆分后加入 tags。
4. `job_titles` 按逗号、顿号、斜杠、空格等拆分后，提取岗位方向加入 tags。

第一版不要追求完美 NLP，简单规则即可。

## 10. 数据库设计

### 10.1 profiles 表

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

字段说明：

- id：对应 Supabase Auth 用户 id。
- display_name：用户昵称。
- role：用户角色，user 或 admin。
- created_at：创建时间。
- updated_at：更新时间。

### 10.2 jobs 表

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

### 10.3 user_applications 表

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

### 10.4 状态约束

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

## 11. 权限设计

### 11.1 基本规则

jobs：

1. 所有人可以读取 `is_active = true` 的岗位。
2. 管理员可以读取全部岗位。
3. 管理员可以新增、编辑、删除岗位。

user_applications：

1. 用户只能读取自己的投递记录。
2. 用户只能新增自己的投递记录。
3. 用户只能更新自己的投递记录。
4. 用户只能删除自己的投递记录。

profiles：

1. 用户可以读取和更新自己的 profile。
2. 管理员可以读取所有 profile。
3. 用户不能自行把 role 改成 admin。

### 11.2 管理员判断函数

建议写一个数据库函数：

```sql
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1
    from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  );
$$ language sql security definer;
```

## 12. 前端组件设计

### 12.1 JobCard

职责：

展示单个岗位。

Props：

```ts
type JobCardProps = {
  job: Job;
  application?: UserApplication | null;
  onApply: (job: Job) => Promise<void>;
  onOpenProgress?: (job: Job) => void;
}
```

展示内容：

1. 公司名称
2. logo 或简称
3. 行业
4. 批次
5. 岗位
6. 城市
7. 开启时间
8. tags
9. 投递按钮

### 12.2 JobFilterBar

职责：

岗位筛选。

筛选项：

1. keyword
2. industry
3. batch_type
4. location
5. tags

### 12.3 ApplyButton

职责：

处理投递点击。

逻辑：

1. 检查登录状态。
2. 未登录跳转 login。
3. 已登录则 upsert application。
4. 打开官网链接。
5. 触发动画。

### 12.4 ApplicationBottle

职责：

展示玻璃瓶和星星。

Props：

```ts
type ApplicationBottleProps = {
  applications: ApplicationWithJob[];
  onStarClick: (application: ApplicationWithJob) => void;
}
```

### 12.5 CompanyStar

职责：

展示公司星星。

Props：

```ts
type CompanyStarProps = {
  companyName: string;
  logoUrl?: string | null;
  status: ApplicationStatus;
}
```

### 12.6 ProgressDrawer

职责：

展示和编辑投递进度。

字段：

1. 公司名称
2. 岗位名称
3. 城市
4. 投递链接
5. 状态选择器
6. 备注文本框
7. 保存按钮

### 12.7 StatusSelect

职责：

修改投递状态。

状态文案映射：

```ts
const statusLabels = {
  opened: "已打开官网",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
  rejected: "拒绝",
  withdrawn: "放弃"
}
```

### 12.8 AdminJobForm

职责：

新增和编辑岗位。

### 12.9 CsvImportPanel

职责：

上传、预览、校验和导入 CSV。

## 13. 用户流程

### 13.1 普通用户投递流程

1. 用户进入首页。
2. 用户筛选岗位。
3. 用户看到感兴趣的岗位。
4. 用户点击“去官网投递”。
5. 如果未登录，跳转登录。
6. 如果已登录，系统创建投递记录。
7. 系统打开企业官网。
8. 星星飞入玻璃瓶。
9. 用户之后进入“我的玻璃瓶”或“我的投递记录”查看进度。
10. 用户自行修改状态。

### 13.2 管理员发布岗位流程

1. 管理员登录。
2. 进入 `/admin/jobs`。
3. 点击新增岗位。
4. 填写公司名称、岗位、城市、行业、批次、链接等。
5. 保存。
6. 岗位出现在首页。

### 13.3 管理员批量导入流程

1. 管理员整理 CSV。
2. 进入 `/admin/import`。
3. 上传 CSV。
4. 查看预览。
5. 系统提示错误行。
6. 管理员确认导入。
7. 系统批量写入岗位。
8. 首页显示新岗位。

## 14. UI 风格要求

整体风格：

1. 清爽。
2. 精致。
3. 有轻微玻璃拟态。
4. 不要做成低龄化卡通。
5. 适合大学生求职场景。
6. 重点突出岗位信息和投递进度。

视觉关键词：

1. glassmorphism
2. soft shadow
3. rounded cards
4. star collection
5. calm gradient background
6. dashboard clarity

颜色建议：

1. 背景：浅蓝、浅紫、灰白渐变。
2. 卡片：白色半透明。
3. 主按钮：蓝紫色。
4. Offer 状态可用绿色。
5. Rejected 状态可用灰色或红色。
6. Withdrawn 状态可用灰色。

## 15. 非功能需求

### 15.1 性能

1. 首页岗位列表首屏加载应控制在 2 秒以内。
2. 筛选操作应即时响应。
3. 岗位数量在 1000 条以内时，前端筛选可以接受。
4. 超过 1000 条后，应改为数据库查询分页。

### 15.2 安全

1. 所有用户私有数据必须按 user_id 隔离。
2. 管理员权限必须后端校验。
3. 投递链接需要校验 URL 格式。
4. 不允许用户上传危险文件。
5. logo 上传只允许图片类型。

### 15.3 可维护性

1. 代码必须使用 TypeScript。
2. 数据类型集中定义。
3. 数据库访问逻辑集中封装。
4. 状态枚举集中维护。
5. 组件职责清晰。

### 15.4 可扩展性

未来可以扩展：

1. 岗位收藏但不投递。
2. AI 岗位匹配。
3. 简历版本管理。
4. 投递日历。
5. 面试提醒。
6. 岗位截止日期提醒。
7. 多人共建岗位库。
8. 岗位失效反馈。

## 16. 验收标准

MVP 完成后必须满足：

1. 普通用户可以注册、登录、退出。
2. 首页可以看到岗位列表。
3. 首页可以筛选岗位。
4. 用户点击岗位投递链接后，可以跳转官网。
5. 用户点击后，系统会创建投递记录。
6. 用户可以查看自己的投递记录。
7. 用户可以修改自己的投递状态。
8. 用户可以编辑自己的投递备注。
9. 用户可以在玻璃瓶中看到自己投递过的岗位星星。
10. 用户点击星星可以查看和修改该岗位进度。
11. 管理员可以新增岗位。
12. 管理员可以编辑岗位。
13. 管理员可以删除或下架岗位。
14. 管理员可以批量导入岗位。
15. 非管理员不能访问管理员后台。
16. 用户不能查看其他用户的投递记录。
17. 动画失败不会影响投递记录创建。
