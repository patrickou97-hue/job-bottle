# PRD 5：Job Bottle 星系主页技术实现文档

## 1. 目标

为 Job Bottle / 秋招星瓶项目新增一个独立的星系主页。

这个主页不是普通信息流页面，而是一个太阳系式功能导航界面。用户进入网站后，看到一个深色星空背景，中间是“秋招星瓶”核心星体，周围有多个行星围绕运行。每个行星代表一个核心功能模块。用户点击行星后，跳转到对应页面。

目标效果：

1. 首页像一个冷色调太阳系。
2. 中心星体代表“秋招星瓶”品牌核心。
3. 不同功能页面用不同轨道行星表示。
4. 行星缓慢环绕中心运动。
5. 鼠标悬停行星时暂停或减速，并显示功能名称。
6. 点击行星跳转页面。
7. 视觉专业、克制、现代。
8. 不要游戏化，不要卡通。
9. 保持全中文界面。

## 2. 页面定位

当前项目已有：

```txt
/                 岗位列表或岗位星图
/my-applications  我的投递
/my-bottle        我的星瓶
/admin            管理后台
```

推荐调整为：

```txt
/                 星系主页
/jobs             岗位星图 / 岗位列表
/my-applications  我的投递
/my-bottle        我的星瓶
/admin            管理后台
```

理由：主页承担品牌展示和导航入口，岗位列表是具体功能页。

## 3. 用户端与管理员端导航结构

用户端页面：

```txt
/                 星系主页
/jobs             岗位星图
/my-applications  我的投递
/my-bottle        我的星瓶
/login            登录注册
```

管理员端页面：

```txt
/admin            管理后台首页
/admin/jobs       岗位管理
/admin/import     批量导入
```

管理员端不进入星系导航动画体系，继续保持冷色、专业、高效率的后台布局。

## 4. 星系主页核心模块

### 4.1 中心星体

中心星体代表：

```txt
秋招星瓶
```

中心文案：

```txt
秋招星瓶
把每一次投递，收进你的职业星图。
```

中心星体可以不跳转，也可以点击后跳转到 `/jobs`。

中心星体视觉：

1. 深色核心球体。
2. 冷蓝外发光。
3. 少量柔金星点。
4. 不要做成黄色太阳。
5. 应该像一个冷色能量核心或深空恒星。

### 4.2 行星入口

#### 行星 1：岗位星图

```txt
名称：岗位星图
路径：/jobs
说明：浏览和筛选当前开放岗位
视觉：较大的银蓝行星
```

#### 行星 2：我的投递

```txt
名称：我的投递
路径：/my-applications
说明：管理所有岗位投递进度
视觉：冷灰蓝行星，带小型轨道环
```

#### 行星 3：我的星瓶

```txt
名称：我的星瓶
路径：/my-bottle
说明：查看已投递岗位星星
视觉：透明玻璃感行星或瓶形卫星
```

#### 行星 4：登录 / 个人中心

未登录：

```txt
名称：登录
路径：/login
说明：登录后保存投递记录
视觉：小型冷色行星
```

已登录：

```txt
名称：个人中心
路径：/my-applications 或用户菜单
说明：查看个人数据
视觉：带用户符号的小行星
```

#### 行星 5：管理入口

只对 admin 显示：

```txt
名称：管理入口
路径：/admin
说明：维护岗位数据和导入岗位
视觉：低调暗色行星，带细线方形轨道
```

普通用户不能看到这个行星。

## 5. 视觉风格

### 5.1 整体方向

视觉关键词：

```txt
深色
冷色星空
低饱和蓝
银蓝光
极少柔金
太阳系导航
职业星图
现代
专业
克制
```

不要做成：

```txt
卡通太阳系
儿童科普页面
游戏选关界面
强霓虹赛博朋克
亮黄色太阳
大面积金色发光
AI 模板风 Dashboard
```

### 5.2 色彩系统

背景：

```txt
#02040A
#030712
#050814
#070B16
```

冷色高光：

```txt
#8AA4C8
#A7C7E7
#D6E4FF
#7DD3FC
```

柔金点缀：

```txt
#C8A96A
#D9B76E
```

文字：

```txt
主文字：#E7EAF0
次文字：#9CA3AF
弱文字：#5F6675
```

### 5.3 金色使用原则

金色只能用于少量星点、当前选中行星的一点高光、中心星体的极少局部点缀、Offer 或重点状态。

禁止金色大太阳、金色粗轨道、金色大按钮、金色边框包围所有区域。

## 6. 页面布局

### 6.1 桌面端

桌面端采用全屏星系画布布局：

```txt
┌────────────────────────────────────────────┐
│ 顶部极简导航                                │
├────────────────────────────────────────────┤
│                                            │
│              行星轨道系统                   │
│                                            │
│       行星       中心星体        行星        │
│                                            │
│              行星        行星               │
│                                            │
│  左下：当前 hover 的功能说明                 │
│  右下：进入岗位星图主按钮                    │
└────────────────────────────────────────────┘
```

### 6.2 移动端

移动端不要强行完整太阳系旋转。

移动端改为：

```txt
中心星体
纵向功能星球列表
```

或者：

```txt
中心星体
横向可滑动行星轨道
```

移动端要求：不横向溢出，行星动画减弱，点击区域足够大，不影响登录和跳转。

## 7. 组件设计

### 7.1 新增组件

建议新增：

```txt
components/galaxy/GalaxyHome.tsx
components/galaxy/OrbitSystem.tsx
components/galaxy/OrbitRing.tsx
components/galaxy/PlanetNode.tsx
components/galaxy/CoreStar.tsx
components/galaxy/GalaxyBackground.tsx
components/galaxy/PlanetInfoPanel.tsx
```

### 7.2 GalaxyHome

职责：

1. 主页容器。
2. 管理 hover 状态。
3. 管理当前用户是否登录。
4. 管理当前用户是否 admin。
5. 传入行星数据。
6. 负责页面布局。

Props：

```ts
type GalaxyHomeProps = {
  user: User | null
  isAdmin: boolean
}
```

### 7.3 Planet 数据结构

定义：

```ts
export type PlanetRoute = {
  id: string
  label: string
  description: string
  href: string
  orbitRadius: number
  orbitDuration: number
  initialAngle: number
  size: number
  variant: "primary" | "secondary" | "glass" | "admin" | "auth"
  requiresAuth?: boolean
  adminOnly?: boolean
}
```

示例：

```ts
const planetRoutes: PlanetRoute[] = [
  {
    id: "jobs",
    label: "岗位星图",
    description: "浏览和筛选当前开放岗位",
    href: "/jobs",
    orbitRadius: 190,
    orbitDuration: 38,
    initialAngle: 15,
    size: 76,
    variant: "primary"
  },
  {
    id: "applications",
    label: "我的投递",
    description: "管理所有岗位投递进度",
    href: "/my-applications",
    orbitRadius: 270,
    orbitDuration: 52,
    initialAngle: 130,
    size: 62,
    variant: "secondary",
    requiresAuth: true
  },
  {
    id: "bottle",
    label: "我的星瓶",
    description: "查看已投递岗位星星",
    href: "/my-bottle",
    orbitRadius: 235,
    orbitDuration: 46,
    initialAngle: 250,
    size: 68,
    variant: "glass",
    requiresAuth: true
  },
  {
    id: "admin",
    label: "管理入口",
    description: "维护岗位数据和导入记录",
    href: "/admin",
    orbitRadius: 330,
    orbitDuration: 70,
    initialAngle: 310,
    size: 52,
    variant: "admin",
    adminOnly: true
  }
]
```

如果用户未登录，可以显示：

```ts
{
  id: "login",
  label: "登录",
  description: "登录后保存你的投递记录",
  href: "/login",
  orbitRadius: 310,
  orbitDuration: 64,
  initialAngle: 210,
  size: 54,
  variant: "auth"
}
```

如果已登录，则不显示登录行星，或者替换为“个人中心”。

## 8. 行星环绕动画实现方案

### 8.1 技术选择

推荐优先级：

```txt
第一选择：CSS transform + CSS variables
第二选择：Motion for React
第三选择：SVG animateTransform
不推荐：Canvas
不推荐：Three.js
```

理由：

1. 当前需求是 2D 页面导航，不需要 3D 引擎。
2. CSS 和 Motion 更容易维护。
3. Canvas 会增加点击命中、响应式和可访问性复杂度。
4. Three.js 对这个项目过重。

### 8.2 CSS 动画方案

每个行星结构：

```tsx
<div className="orbit" style={{ width, height }}>
  <button className="planet" />
</div>
```

轨道容器旋转：

```css
.orbit {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  animation: orbit var(--duration) linear infinite;
}

.planet {
  position: absolute;
  left: 50%;
  top: 0;
  transform: translate(-50%, -50%);
}
```

关键帧：

```css
@keyframes orbit {
  from {
    transform: translate(-50%, -50%) rotate(var(--initial-angle));
  }
  to {
    transform: translate(-50%, -50%) rotate(calc(var(--initial-angle) + 360deg));
  }
}
```

这种方式会让行星自身也跟着旋转。需要在 planet 内部加一层反向旋转，保持文字或图标方向稳定。

```css
.planet-inner {
  animation: counter-orbit var(--duration) linear infinite;
}

@keyframes counter-orbit {
  from {
    transform: rotate(calc(-1 * var(--initial-angle)));
  }
  to {
    transform: rotate(calc(-1 * (var(--initial-angle) + 360deg)));
  }
}
```

### 8.3 Motion 方案

也可以使用 Motion：

```tsx
<motion.div
  className="orbit-layer"
  animate={{ rotate: 360 }}
  transition={{
    repeat: Infinity,
    duration: planet.orbitDuration,
    ease: "linear"
  }}
>
  <motion.button
    className="planet-node"
    style={{ x: planet.orbitRadius }}
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.96 }}
  >
    {planet.label}
  </motion.button>
</motion.div>
```

如果整个 orbit layer 旋转，行星上的文字会跟着转。需要让内部内容反向旋转，或者行星只显示图形，文字使用 hover tooltip 固定显示。

推荐做法：

1. 行星本体不直接显示长文字。
2. 只显示图标或简称。
3. hover 后在固定信息区显示完整中文名称和说明。

### 8.4 动画控制

要求：

1. 默认慢速环绕。
2. hover 某个行星时，该行星所在轨道暂停或减速。
3. 用户开启 reduced motion 时，停止自动环绕。
4. 页面不可见时不需要额外处理，由浏览器优化即可。
5. 不要所有行星同速同方向。
6. 部分轨道可以逆时针，增加自然感。
7. 动画不能影响点击。

### 8.5 reduced motion

必须支持：

```css
@media (prefers-reduced-motion: reduce) {
  .orbit {
    animation: none;
  }
}
```

Motion 中使用：

```ts
const shouldReduceMotion = useReducedMotion()
```

如果 `shouldReduceMotion` 为 true，直接静态布局。

## 9. 轨道设计

### 9.1 轨道视觉

轨道不是粗线，也不是金色线。

要求：

1. 使用极细冷灰蓝线。
2. 透明度低。
3. 部分轨道可以是虚线。
4. hover 某个行星时，对应轨道轻微提亮。
5. 轨道不抢视觉。

CSS：

```css
.orbit-ring {
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.orbit-ring-active {
  border-color: rgba(138, 164, 200, 0.22);
}
```

### 9.2 轨道数量

桌面端建议 4-5 条轨道。不要超过 6 条。

### 9.3 轨道椭圆

为了避免太像儿童太阳系，建议轨道用轻微椭圆和倾斜角：

```css
transform: translate(-50%, -50%) rotate(-12deg) scaleY(0.68);
```

但行星运动和点击区域会变复杂。MVP 可以先用圆形轨道，第二版再做椭圆轨道。

## 10. 行星节点设计

### 10.1 行星视觉

行星是抽象功能节点，不要做真实太阳系行星。

风格：

```txt
冷色玻璃球
深色球体
银蓝边缘光
少量星尘
柔和阴影
```

不同 variant：

#### primary

用于岗位星图。

```txt
稍大
银蓝光
内部有星图线
```

#### secondary

用于我的投递。

```txt
中等
冷灰蓝
内部有轨道线
```

#### glass

用于我的星瓶。

```txt
半透明玻璃球
内部有小瓶子或星点
```

#### auth

用于登录。

```txt
小型暗色球体
外圈一圈冷蓝线
```

#### admin

用于管理入口。

```txt
更低调
冷灰
可以有小型方形网格线
仅 admin 可见
```

### 10.2 行星 hover

hover 时：

1. 轻微放大。
2. 边缘冷蓝提亮。
3. 显示 tooltip 或固定说明区。
4. 鼠标指针变成 pointer。
5. 轨道轻微提亮。
6. 不要强金色爆光。

### 10.3 行星点击

点击行星：

```ts
router.push(planet.href)
```

如果 `requiresAuth` 且用户未登录：

```ts
router.push(`/login?next=${planet.href}`)
```

如果 `adminOnly` 且不是 admin：

1. 不显示该行星。
2. 不要显示后再弹无权限。

## 11. 固定说明区

为了避免行星上堆很多文字，建议在页面左下角设置固定说明区。

默认状态：

```txt
选择一个星体
进入岗位、投递记录或星瓶。
```

hover 岗位星图：

```txt
岗位星图
浏览和筛选当前开放机会。
```

hover 我的投递：

```txt
我的投递
管理所有岗位的投递状态。
```

hover 我的星瓶：

```txt
我的星瓶
查看你收集过的投递星星。
```

hover 管理入口：

```txt
管理入口
维护岗位数据和导入记录。
```

注意：说明区可以有说明文字，因为它是交互反馈，不是每个标题下固定小字。

## 12. 顶部导航

星系主页顶部导航应该极简。

用户端导航：

```txt
秋招星瓶
岗位星图
我的投递
我的星瓶
```

右侧：

未登录：

```txt
登录
```

已登录：

```txt
个人中心
```

admin 用户：

头像菜单或小入口里显示：

```txt
管理入口
```

不要在普通用户主导航里直接放管理后台。

## 13. 页面文案

星系主页主文案：

```txt
秋招星瓶
把每一次投递，收进你的职业星图。
```

辅助文案可以很短：

```txt
选择一个星体开始。
```

按钮：

```txt
进入岗位星图
查看我的星瓶
```

行星名称：

```txt
岗位星图
我的投递
我的星瓶
登录
个人中心
管理入口
```

不要出现英文 UI。

## 14. 路由调整

如果当前 `/` 是岗位列表，建议调整：

```txt
旧：
/ = 岗位列表

新：
/ = 星系主页
/jobs = 岗位列表
```

需要检查并修改：

```txt
app/page.tsx
app/jobs/page.tsx
components/layout/Navbar.tsx
```

迁移要求：

1. 原首页岗位列表逻辑移动到 `/jobs`。
2. 所有导航中“岗位星图”指向 `/jobs`。
3. 星系主页中的“岗位星图”行星也指向 `/jobs`。
4. 不破坏岗位读取、筛选、投递逻辑。

## 15. 文件结构建议

新增：

```txt
app/page.tsx                         星系主页
app/jobs/page.tsx                    原岗位列表页面

components/galaxy/GalaxyHome.tsx
components/galaxy/OrbitSystem.tsx
components/galaxy/OrbitRing.tsx
components/galaxy/PlanetNode.tsx
components/galaxy/CoreStar.tsx
components/galaxy/GalaxyBackground.tsx
components/galaxy/PlanetInfoPanel.tsx

lib/planet-routes.ts
```

如果已经有 `app/page.tsx` 岗位列表代码，需要移动，不要删除业务逻辑。

## 16. 响应式要求

### 16.1 桌面端

```txt
>= 1024px
```

使用完整星系轨道。

### 16.2 平板端

```txt
768px - 1023px
```

缩小轨道半径，减少说明区尺寸。

### 16.3 移动端

```txt
< 768px
```

不要使用大型旋转星系。

移动端布局：

```txt
中心星体
功能星球列表
```

功能星球列表：

```txt
岗位星图
我的投递
我的星瓶
登录 / 个人中心
```

每个入口是横向玻璃条，左侧小星球，右侧中文名称。

## 17. 性能要求

1. 不使用 Three.js。
2. 不使用大型图片背景。
3. 不使用高密度粒子系统。
4. SVG 和 CSS 动画优先。
5. 动画数量控制在 5 个以内。
6. 移动端减少动画。
7. 页面首屏不能因为动画明显卡顿。

## 18. 可访问性要求

1. 行星必须是 button 或 link，不要只是 div。
2. 每个行星必须有 `aria-label`。
3. 键盘 tab 可以聚焦行星。
4. focus 状态清楚。
5. prefers-reduced-motion 时停止环绕。
6. 中文 tooltip 不应该是唯一信息来源，固定说明区也要更新。

## 19. Codex 执行指令

请按以下要求开发：

```txt
请为 Job Bottle 项目新增一个独立星系主页。

核心要求：
1. 将根路径 `/` 改为星系主页。
2. 将现有岗位列表页迁移到 `/jobs`。
3. 首页使用太阳系/星系式导航布局。
4. 中心星体显示“秋招星瓶”。
5. 周围行星代表：
   - 岗位星图 -> /jobs
   - 我的投递 -> /my-applications
   - 我的星瓶 -> /my-bottle
   - 登录/个人中心 -> /login 或个人入口
   - 管理入口 -> /admin，仅 admin 可见
6. 实现行星缓慢环绕动画。
7. hover 行星时显示中文说明，并轻微提亮轨道。
8. 点击行星跳转对应页面。
9. requiresAuth 页面未登录时跳转 `/login?next=目标路径`。
10. 支持 prefers-reduced-motion。
11. 移动端不要强行完整轨道，改为功能星球列表。
12. 全站中文界面。
13. 不使用 Three.js，不使用 Canvas，不使用大型图片。
14. 不破坏已有 Supabase 数据读取、登录、投递记录和管理员权限。

请新增组件：
- components/galaxy/GalaxyHome.tsx
- components/galaxy/OrbitSystem.tsx
- components/galaxy/PlanetNode.tsx
- components/galaxy/CoreStar.tsx
- components/galaxy/GalaxyBackground.tsx
- components/galaxy/PlanetInfoPanel.tsx
- lib/planet-routes.ts

请修改：
- app/page.tsx
- 新增 app/jobs/page.tsx，并迁移原岗位列表逻辑
- components/layout/Navbar.tsx 中“岗位星图”指向 /jobs

视觉风格：
- 更深色
- 专业克制
- 冷色星空
- 少量银蓝光
- 极少柔金点缀
- 不要游戏化
- 不要卡通太阳系
- 不要大面积金色
- 不要 AI 模板感

完成后请输出：
1. 修改了哪些文件。
2. 新增了哪些文件。
3. 原岗位列表如何迁移到 /jobs。
4. 行星动画如何实现。
5. 如何处理登录状态和 admin 可见性。
6. 如何测试桌面端、移动端和 reduced motion。
```

## 20. 分阶段执行建议

### Phase 1：静态星系主页

先只完成静态版本。

要求：

1. `/` 显示星系主页。
2. 原岗位列表迁移到 `/jobs`。
3. 星系主页有中心星体和 4-5 个静态行星入口。
4. 点击行星能跳转对应页面。
5. admin 行星只对 admin 显示。
6. 移动端显示功能星球列表。
7. 暂时不要实现环绕动画。
8. 不要改数据库，不要改投递逻辑。

Codex 指令：

```txt
请先只做 Phase 1：新增星系主页的静态版本。

要求：
1. `/` 显示星系主页。
2. 原岗位列表迁移到 `/jobs`。
3. 星系主页有中心星体和 4-5 个静态行星入口。
4. 点击行星能跳转对应页面。
5. admin 行星只对 admin 显示。
6. 移动端显示功能星球列表。
7. 暂时不要实现环绕动画。
8. 不要改数据库，不要改投递逻辑。

完成并确认无报错后，再做 Phase 2 环绕动画。
```

### Phase 2：行星环绕动画

再加入环绕动画。

要求：

1. 使用 CSS transform 或 Motion for React。
2. 不使用 Three.js，不使用 Canvas。
3. 行星缓慢围绕中心运行。
4. 不同行星速度和初始角度不同。
5. hover 时行星轻微放大，轨道提亮。
6. prefers-reduced-motion 时停止动画。
7. 移动端不要启用大型轨道动画。
8. 不影响点击跳转。

Codex 指令：

```txt
现在做 Phase 2：为星系主页增加行星环绕动画。

要求：
1. 使用 CSS transform 或 Motion for React。
2. 不使用 Three.js，不使用 Canvas。
3. 行星缓慢围绕中心运行。
4. 不同行星速度和初始角度不同。
5. hover 时行星轻微放大，轨道提亮。
6. prefers-reduced-motion 时停止动画。
7. 移动端不要启用大型轨道动画。
8. 不影响点击跳转。
```

## 21. 验收标准

### 21.1 功能验收

1. 访问 `/` 显示星系主页。
2. 点击“岗位星图”行星跳转 `/jobs`。
3. 点击“我的投递”行星跳转 `/my-applications`。
4. 点击“我的星瓶”行星跳转 `/my-bottle`。
5. 未登录点击需要登录的行星，跳转 `/login?next=...`。
6. admin 用户可以看到“管理入口”行星。
7. 普通用户看不到“管理入口”行星。
8. 原岗位列表功能在 `/jobs` 正常运行。
9. 顶部导航“岗位星图”指向 `/jobs`。

### 21.2 动画验收

1. 行星缓慢环绕中心。
2. 不同行星速度不同。
3. hover 行星时有清楚反馈。
4. 点击行星不会被动画影响。
5. reduced motion 开启时动画停止或显著减少。
6. 移动端不出现大型旋转轨道。

### 21.3 视觉验收

1. 首页第一眼像深色专业星系导航。
2. 不像儿童太阳系。
3. 不像游戏选关界面。
4. 不像普通 SaaS Dashboard。
5. 金色只少量点缀。
6. 页面深色、克制、现代。
7. 中文文案统一。
8. 与现有“我的星瓶”页面视觉一致，但主页更像入口导航。

## 22. 禁止事项

1. 不要引入 Three.js。
2. 不要做复杂 3D。
3. 不要用 Canvas 粒子系统。
4. 不要把行星做得五颜六色。
5. 不要使用真实太阳系贴图。
6. 不要大面积使用金色。
7. 不要把管理员后台混进用户端主体验。
8. 不要破坏现有岗位列表、投递记录和登录逻辑。
9. 不要把界面改成英文。
10. 不要生成大量标题下解释性小字。
