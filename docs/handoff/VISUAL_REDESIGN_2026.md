# 视觉重设计交接文档 (2026)

> 本文档面向接手本项目的开发者或 AI Agent，说明视觉重设计的完整背景、当前状态和设计约束。
> 阅读本文档后，应能直接上手开发，无需回溯所有 PRD。

---

## 一、背景：为什么重设计

### 1.1 原始状态

项目最初采用典型的 SaaS Dashboard 视觉语言：

- 黑色背景 + 金色强调色，形成"黑金"质感
- 金色边框、金色渐变按钮、金色结构线条
- 装饰性副标题和说明文案（如"调整信号""根据行业、城市、岗位方向"等）
- 较强的视觉层级感，偏向仪表盘风格
- 多处出现模板化的 AI 生成风格文字

### 1.2 用户反馈

用户明确要求：

- **更暗、更安静**——不要金色结构元素，不要抢眼
- **专业感**——像成熟的暗色产品，不像 SaaS Demo
- **去掉 AI 味**——删除所有模板化说明文案和装饰性副标题
- **信息优先**——内容本身是重点，不要装饰抢视线

### 1.3 重设计轮次

| 轮次 | 核心动作 | 关键决策 |
|------|---------|---------|
| 第一轮 | 冷色替换金色 | 主色从金色改为冷蓝银（nebula blue #6b8db5），金色仅保留在 aurum 色阶中，用于极少量高亮 |
| 第二轮 | 压低对比度 | 背景改为 #02040A（接近纯黑），边框透明度降至 0.07-0.08，整体趋向"隐没" |
| 第三轮 | 去模板化文案 | 删除首页所有副标题说明文字，标题改为纯功能性文字 |
| 第四轮 | 导航简化 | 普通用户不再看到"管理后台"主项，admin 才出现低调的"管理入口"链接 |
| 第五轮 | 星场降级 | `StarFieldBackground` 的星星数量压至 10 颗、opacity 降至 0.15-0.25，几乎不可见 |
| 第六轮 | 按钮降级 | "去官网投递"等按钮改为冷色边框+半透明背景，不再是金色高亮 |

---

## 二、当前视觉方向

### 2.1 色彩体系

#### 背景（三层渐变）
```
body {
  background: linear-gradient(170deg, #02040A 0%, #050814 50%, #080c1a 100%);
}
```
- 最底层：#02040A（接近纯黑，带极微弱的蓝）
- 中间层：#050814
- 最浅层：#080c1a
- 三色之间的差距极小，肉眼几乎分辨不出渐变边界，仅提供"有深度"的潜意识感受

#### 核心冷色
| 色名 | 值 | 用途 |
|------|-----|------|
| nebula-blue | #6b8db5 | 状态高亮、hover 态、活跃导航项背景 |
| nebula-ice | #8a9db8 | 辅助冷色 |
| nebula-violet | #8b9dc3 | 次级冷色 |
| nebula-silver | #b0bac8 | 亮文字（非最高优先级的前景文字） |

#### 金色（最小化使用）
| 色名 | 值 | 用途 |
|------|-----|------|
| aurum-300 | #c8a96a | 仅用于"登录"按钮的极淡金色边框（opacity 0.18），以及星瓶塞子上的单条高亮线 |
| aurum-400 | #b89858 | 未使用 |
| aurum-500 | #a68848 | 未使用 |
| aurum-600 | #8a7038 | 未使用 |

#### 文字色阶
| 色名 | 值 | 用途 |
|------|-----|------|
| text-primary / ink-primary | #d8dce4 | 主标题、公司名等高优先级文字 |
| text-secondary / ink-secondary | #8a919d | 次级说明文字 |
| text-muted / ink-muted | #525966 | 日期、地点等低优先级辅助信息 |
| text-faint | #3a3f4a | 几乎不可见的最底文字 |

#### 重要约束
- **没有金色边框结构元素**：所有容器边框统一使用 `rgba(148, 163, 184, 0.07)` 或 `0.08`
- **没有金色按钮**：`.gold-button` 虽然名字里有 gold，实际渲染为极淡的冷色边框 + 半透明背景
- **金色仅出现在**：(1) 星瓶塞子上的 1px 高亮线 (2) Offer 状态星星的微弱光环 (3) `pulseGold` 动画（也已大幅压低 opacity）

### 2.2 玻璃态容器系统

`globals.css` 定义了一套统一的容器样式：

```css
/* .glass-panel — 主要面板容器 */
border: 1px solid rgba(148, 163, 184, 0.08);
background: rgba(8, 12, 24, 0.72);
box-shadow: 0 24px 80px rgba(0, 0, 0, 0.42);
backdrop-filter: blur(20px);

/* .night-card — 卡片容器 */
border: 1px solid rgba(148, 163, 184, 0.08);
background: rgba(8, 12, 24, 0.78);

/* .star-border — 边框辅助类 */
border-color: rgba(148, 163, 184, 0.08);
```

**关键点**：边框透明度极低（0.07-0.08），在深色背景上几乎不可见。hover 态才升至 0.16。这是有意为之——容器"隐没"在背景中，内容浮于其上。

### 2.3 背景星场

`StarFieldBackground.tsx` 实现了一个极简的静态星场：

- 10 颗白色圆点，固定位置
- 尺寸 1-2px，opacity 0.15-0.25
- 底部有一层极淡的冷蓝径向渐变（`rgba(100, 130, 180, 0.03)`）
- `z-index: -1`，`pointer-events: none`
- 支持 `quiet` 模式：opacity 再减半

**设计意图**：星场几乎不可见，仅提供"有深度"的潜意识背景，绝不抢夺内容注意力。

### 2.4 排版

- 系统字体栈：`-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans SC", sans-serif`
- 无装饰性字体或特殊字重
- 无副标题、无说明文案、无 slogan
- 所有文字都是功能性标签（"岗位星图""我的投递""查看进度"）

---

## 三、架构笔记

### 3.1 关键文件地图

```
src/
├── app/
│   └── globals.css              ← CSS 变量 + 玻璃态工具类
├── tailwind.config.ts           ← 色彩系统定义（void/nebula/aurum/text/night/star/ink）
├── components/
│   ├── jobs/
│   │   ├── HomeClient.tsx       ← 首页主组件（岗位列表 + 投递记录逻辑）
│   │   ├── JobCard.tsx          ← 岗位卡片（单行，无边框容器，hover 背景变化）
│   │   └── JobFilterBar.tsx     ← 筛选侧栏
│   ├── applications/
│   │   ├── ApplicationBottle.tsx ← 星瓶状态容器（统计 + 详情卡片 + ProgressDrawer）
│   │   ├── BottleStage.tsx      ← 透明 PNG 星瓶前景 + DOM 星星舞台
│   │   ├── StackedStar.tsx      ← 单颗堆叠星星（状态驱动样式）
│   │   ├── bottleGeometry.ts    ← 星星稳定堆叠坐标
│   │   ├── StatusPill.tsx       ← 状态标签
│   │   ├── ProgressDrawer.tsx   ← 投递进度抽屉
│   ├── layout/
│   │   ├── Navbar.tsx           ← 顶部导航栏
│   │   ├── UserShell.tsx        ← 用户端页面外壳
│   │   └── AdminShell.tsx       ← 管理端页面外壳
│   ├── visuals/
│   │   ├── StarFieldBackground.tsx ← 全局背景星场
│   │   ├── HeroConstellation.tsx   ← 首页主视觉 SVG
│   │   └── EmptyConstellation.tsx  ← 空状态星座图
│   └── ui/
│       └── Button.tsx           ← 通用按钮组件
└── lib/
    ├── jobs.ts                  ← 岗位查询 + 筛选 + facet 聚合
    ├── applications.ts          ← 投递记录 CRUD
    ├── constants.ts             ← 站点名、状态标签等常量
    ├── utils.ts                 ← 确定性哈希、URL 工具等
    └── types.ts                 ← TypeScript 类型定义
```

### 3.2 组件层级

```
UserShell
├── Navbar（导航栏）
│   ├── 站点 Logo + 名称
│   ├── 三项导航：岗位星图 / 我的投递 / 我的星瓶
│   ├── 管理入口（仅 admin）
│   └── 用户头像 + 退出
└── 页面内容（通过 children 传入）

HomeClient（首页）
├── 消息提示条
├── 左侧：JobFilterBar（筛选）
└── 右侧：
    ├── 计数标题（"XX 个岗位"）
    ├── 岗位列表容器（div.divide-y 分割线）
    │   └── JobCard × N
    ├── 空状态（EmptyConstellation）
    └── 底部详情卡片（selectedApplication 时浮出）

MyBottleClient（星瓶页）
└── ApplicationBottle
    ├── 统计行（已收录 / 进行中 / Offer）
    ├── BottleStage（透明 PNG 前景瓶 + DOM 星星层 + SVG fallback）
    ├── StackedStar × N（稳定堆叠在瓶内）
    └── 详情卡片 + ProgressDrawer
```

### 3.3 星瓶系统

`ApplicationBottle.tsx` 是核心视觉组件：

**瓶子实现**：
- 运行时前景瓶使用 `public/assets/bottle-front.png` 透明 PNG。
- `BottleStage.tsx` 采用前景 PNG、DOM 星星层、SVG fallback 的三层结构。
- 舞台比例为更宽的瓶身，最大宽度 560px。
- PNG 图层禁用 pointer events，星星仍可点击打开详情。

**星星定位**：
- 每颗星星的 X/Y 坐标由 `bottleGeometry.ts` 基于 application id 稳定计算。
- 坐标按行堆叠，底部更宽、上方更窄，模拟星星沉入瓶底。
- 状态只影响排序和视觉色调，不再让星星漂浮成散点。
- 已存在星星直接出现在稳定位置，只有新投递记录在下次进入 `/my-bottle` 时从瓶口下落。

**星星样式（StackedStar.tsx）**：
- 使用极简圆形星光，不使用 emoji 或卡通五角星。
- 尺寸由 id 哈希决定，约 22-29px。
- 状态驱动冷灰、银蓝和极少量 offer 金色高光。
- hover 态轻微放大，点击打开投递详情。

### 3.4 筛选去重逻辑

`src/lib/jobs.ts` 中的 `filterJobs()` 和 `getJobFacetOptions()`：

**筛选维度**：
1. keyword（模糊匹配公司名 + 岗位名）
2. industry（逗号分隔后精确匹配）
3. batchType（精确匹配）
4. location（包含匹配）
5. tags（任一标签匹配）

**Facet 去重**：
- `getJobFacetOptions()` 对所有岗位做聚合
- industry 字段可能包含多个值（逗号分隔），拆分后去重
- locations 使用 `splitToTags()` 工具函数拆分
- 最终返回排序后的唯一值数组

### 3.5 导航系统

**用户端导航**（Navbar.tsx）：
- 三项主链接：`/`（岗位星图）、`/my-applications`（我的投递）、`/my-bottle`（我的星瓶）
- admin 用户额外看到"管理入口"链接（指向 `/admin`）
- 移动端：汉堡菜单展开
- 使用 `usePathname()` 高亮当前页

**管理端导航**（AdminShell.tsx）：
- 完全独立的导航："管理后台 / 岗位管理 / 批量导入 / 返回用户端 / 退出登录"
- 用户端导航不在管理端显示

---

## 四、已知问题 / TODO

### 4.1 论坛功能

- **状态**：项目中尚未发现论坛/社区功能模块
- PRD 中可能有相关规划，但当前代码库无 `Forum`、`Community`、`Post` 相关组件
- 如果 PRD 要求论坛功能，需要从零搭建

### 4.2 星瓶 SVG 精度

- 当前瓶身使用硬编码的 path 坐标，玻璃反光和瓶塞细节可以进一步打磨
- 瓶内星星的边界检测未实现——星星可能部分超出瓶身轮廓
- 可考虑增加瓶内液面渐变、气泡等细节（需谨慎，避免过度装饰）

### 4.3 移动端适配

- JobCard 在小屏下隐藏了公司名、批次、地点、日期等列，仅显示岗位名 + 操作按钮
- 星瓶在小屏下高度固定 600px，可能超出视口
- 导航栏有汉堡菜单，但菜单项样式可能需要微调
- `max-w-[520px]` 的星瓶在窄屏下宽度适配正常，但详情卡片可能需要响应式调整

### 4.4 数据库状态

- `.env.local` 已配置 Supabase 连接
- 但 Supabase 项目中尚未执行 `schema.sql`、`policies.sql`、`seed.sql`
- 当前所有数据相关功能（投递、星瓶、筛选）在没有数据库的情况下显示空状态

### 4.5 HeroConstellation

- `HeroConstellation.tsx` 存在但当前首页（HomeClient.tsx）未直接使用它
- 可能是早期版本遗留，或用于其他页面

---

## 五、未来设计约束（红线）

以下是视觉方向的硬约束，任何后续开发都必须遵守：

### 5.1 绝对禁止

- ❌ 金色边框、金色结构线条、金色分隔线
- ❌ 亮色按钮（橙、金、红、绿等）
- ❌ 装饰性副标题（如"开启你的职业旅程""探索无限可能"）
- ❌ 模板化说明文案
- ❌ SaaS Dashboard 风格的渐变卡片
- ❌ 高饱和度颜色
- ❌ 强对比度的明暗关系

### 5.2 必须遵守

- ✅ 所有容器边框使用冷色极低透明度（`rgba(148, 163, 184, 0.07-0.08)`）
- ✅ 背景保持 #02040A 色调，不做明显渐变
- ✅ 文字使用定义好的 ink-* 色阶
- ✅ 交互高亮使用 nebula-blue，opacity 控制在 0.06-0.35
- ✅ 信息优先——每个页面的核心是数据，不是视觉
- ✅ 星星颜色使用暖色渐进：暗色 → 淡黄 → 金色（仅 offer 状态触发金色）

### 5.3 可变区域（有灵活度）

- 星瓶 SVG 可以继续打磨细节
- 星场数量和透明度可以根据实际效果微调（但方向是"几乎不可见"）
- 新增组件可以探索 glass-panel / night-card 系统，但不要引入新色系
- 动画可以存在但必须微妙（7-8s 周期，2-3px 位移）
- 金色可以在极少量场景使用（offer 状态高亮、星瓶塞子装饰线），但绝不能作为结构色

### 5.4 新增组件的视觉指南

如果需要新增组件，遵循以下模板：

```tsx
// 容器
<div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4 backdrop-blur-xl">

// 文字
<h3 className="text-sm font-medium text-ink-primary">标题</h3>
<p className="text-xs text-ink-muted">辅助信息</p>

// 按钮（主操作）
<button className="rounded-full border border-nebula-blue/16 bg-white/[0.035] px-4 py-2 text-sm text-ink-secondary transition hover:border-nebula-blue/30 hover:text-nebula-silver">

// 按钮（次要操作）
<button className="muted-button rounded-full px-4 py-2 text-sm">

// 标签/徽章
<span className="status-pill rounded-full px-2 py-0.5 text-xs">
```

---

## 六、运行与验证

### 6.1 常规验证命令

```bash
cd /Users/wangrui/Documents/Web
npm run lint          # ESLint 检查
npx tsc --noEmit      # TypeScript 类型检查
npm run build         # Next.js 构建
npm run dev           # 开发服务器（默认 http://localhost:3001）
```

### 6.2 视觉验证检查点

浏览器打开首页后确认：

1. 背景为极深的近黑色，无明显渐变
2. 无金色边框或金色结构元素
3. 无装饰性副标题或说明文案
4. 导航为纯中文功能性标签
5. 星场背景几乎不可见
6. 岗位列表使用细分割线，无独立卡片边框
7. 390px 宽度无横向溢出

---

## 七、参考文档

| 文档 | 路径 |
|------|------|
| 需求审计 | `docs/handoff/REQUIREMENTS_AUDIT.md` |
| 实施状态 | `docs/handoff/IMPLEMENTATION_STATUS.md` |
| 本文档 | `docs/handoff/VISUAL_REDESIGN_2026.md` |
| PRD（如存在） | `docs/prd/PRD_4_Job_Bottle_Visual_Rebuild_CN.md` |

---

*最后更新：2026-07-03*

---

## 十、最新更新（2026-07-03）

### 10.1 路由变更

原首页 `/`（岗位列表）已迁移到 `/jobs`，`/` 现在是星系主页。

```
/                 星系主页（太阳系导航）
/jobs             岗位列表（原首页）
/my-applications  我的投递
/my-bottle        我的星瓶
/forum            讨论区（新增）
/login            登录注册
/admin            管理后台
```

### 10.2 星系主页（PRD_5）

新增组件：
- `src/components/galaxy/GalaxyHome.tsx` — 主页客户端
- `src/lib/planet-routes.ts` — 行星路由配置

视觉：中心"秋招星瓶"核心星体 + 5个环绕行星（岗位星图/我的投递/我的星瓶/讨论区/管理入口）
动画：CSS @keyframes 轨道旋转 + 行星反向旋转保持文字正立
移动端：降级为垂直列表布局
管理入口行星仅 admin 可见

### 10.3 星瓶重做

瓶子改为简单宽矩形 + 短颈 + 木塞，无复杂曲线。
星星采用"堆积"定位：从瓶底向上逐行排列，类似真实物体受重力沉降。
新增下落动画：投递后下次进入瓶子页面，新星星从瓶口掉落并弹跳 settling。
使用 localStorage 追踪投递数量变化。

### 10.4 讨论区

新增 `supabase/forum.sql`（需在 Supabase 执行）
新增 `src/lib/forum.ts` 数据层
新增 `src/components/forum/` 组件（ForumClient, PostCard, NewPostForm）
导航栏已添加"讨论区"链接

### 10.5 交接文档位置

- `docs/handoff/REQUIREMENTS_AUDIT.md` — 需求审计
- `docs/handoff/IMPLEMENTATION_STATUS.md` — 实现状态
- `docs/handoff/VISUAL_REDESIGN_2026.md` — 本文件（视觉重设计交接）
- `docs/prd/PRD_1-5` — 产品需求文档
