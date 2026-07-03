# PRD 7：Job Bottle 统一深空背景与岗位星体捕获体验修复文档

## 1. 文档目的

本文档用于指导 Codex 修复当前 Job Bottle 用户端页面中的视觉结构问题，并进一步强化“岗位星图 = 在漫天星空中捕获属于自己的星星”的产品体验。

本次不是普通 UI 调色，而是对用户端视觉底座和岗位星图交互隐喻进行重构。

核心目标：

1. 修复页面底部和中部明显的颜色分层。
2. 建立统一的全局深空背景系统。
3. 所有用户端页面共享同一个 `SpaceShell / SpaceBackground`。
4. 禁止每个页面自己重复创建背景。
5. 岗位星图从普通列表升级为“发现并捕获岗位星体”的界面。
6. 背景底部增加克制的白色星点，增强真实太空感。
7. 可以加入少量低频陨石/流星，但必须克制、专业、不游戏化。
8. 保留现有岗位列表的易读性和投递效率。
9. 保留当前岗位列表界面，同时新增“地区星系 / 行业星系”的分类体验。

## 2. 当前问题诊断

当前页面底部出现明显的颜色分层，通常不是图片问题，而是 CSS 结构问题。

大概率原因包括：

### 2.1 多套背景叠加

当前页面可能同时存在：

```txt
body 背景
page wrapper 背景
main 容器背景
section 背景
表格外层背景
讨论区外层背景
我的投递页外层背景
```

这些背景各自使用了不同的：

```txt
radial-gradient
linear-gradient
rgba 透明度
backdrop-filter
blur
```

结果是：不同层叠加后产生明显的矩形色块。

### 2.2 页面容器没有覆盖全屏

某些页面容器可能只覆盖内容高度，没有覆盖整个 viewport，导致底部露出另一层背景。

常见问题：

```css
height: auto;
min-height 不够;
section 背景只覆盖局部;
main 背景和 body 背景不一致;
```

### 2.3 backdrop-blur 叠加导致亮度断层

如果多个半透明容器使用 `backdrop-blur`，并且底层背景不同，就会出现亮度不一致的色块。

### 2.4 每个页面独立写背景

不同页面分别写自己的星空背景，会导致切换页面时视觉不连续。

结果是用户感觉：

```txt
不是同一个宇宙空间
而是多个深色模板页面拼在一起
```

## 3. 修复原则

### 3.1 一个用户端只能有一个深空背景源

所有用户端页面必须共享统一的深空背景组件：

```txt
components/layout/SpaceShell.tsx
components/layout/SpaceBackground.tsx
```

不允许每个页面单独写：

```css
background: radial-gradient(...);
background: linear-gradient(...);
```

### 3.2 页面内容应该浮在背景上

正确结构：

```tsx
<div className="space-root">
  <SpaceBackground />
  <div className="space-content">
    {children}
  </div>
</div>
```

错误结构：

```tsx
<div className="page-a-gradient">
  <section className="another-gradient">
    <div className="table-gradient">
      ...
    </div>
  </section>
</div>
```

### 3.3 统一设计语言

所有用户端页面必须像在同一个深空系统里：

```txt
/
/jobs
/galaxy
/galaxy/region
/galaxy/industry
/my-applications
/my-bottle
/discussions
/login
```

管理员端 `/admin` 可以使用独立 AdminShell，不需要沉浸星空背景。

## 4. 统一 SpaceShell 需求

### 4.1 新增或重构组件

请新增或检查：

```txt
components/layout/SpaceShell.tsx
components/layout/SpaceBackground.tsx
```

### 4.2 SpaceShell 结构

```tsx
type SpaceShellProps = {
  children: React.ReactNode
}

export function SpaceShell({ children }: SpaceShellProps) {
  return (
    <div className="space-root">
      <SpaceBackground />
      <div className="space-content">
        {children}
      </div>
    </div>
  )
}
```

### 4.3 CSS 要求

```css
.space-root {
  position: relative;
  min-height: 100svh;
  background: #01030A;
  color: #E7EAF0;
  overflow-x: hidden;
}

.space-content {
  position: relative;
  z-index: 1;
  min-height: 100svh;
}
```

注意：

1. `space-root` 背景只能是基础深色。
2. 复杂星空背景只放在 `SpaceBackground`。
3. 页面内部不要再加全屏背景。
4. 所有内容层级必须在 `z-index: 1` 以上。

## 5. 统一 SpaceBackground 需求

### 5.1 结构

```tsx
export function SpaceBackground() {
  return (
    <div className="space-background" aria-hidden="true">
      <div className="stars-layer stars-far" />
      <div className="stars-layer stars-mid" />
      <div className="stars-layer stars-bright" />
      <div className="meteor meteor-a" />
      <div className="meteor meteor-b" />
    </div>
  )
}
```

### 5.2 基础样式

```css
.space-background {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(circle at 70% 22%, rgba(90, 120, 160, 0.08), transparent 36%),
    radial-gradient(circle at 18% 78%, rgba(120, 140, 170, 0.045), transparent 40%),
    linear-gradient(180deg, #01030A 0%, #02040A 52%, #01030A 100%);
}
```

### 5.3 星点层

用户明确希望背景底部增加一些白色亮点，也就是更真实的星星。

请分三层实现：

```txt
far-stars     远处小星，低亮度，数量较多
mid-stars     中层星，亮度中等，数量较少
bright-stars  少量白色亮点，数量很少
```

要求：

1. 星点不能像噪声。
2. 星点不能密集到影响阅读。
3. 星点亮度要有层次。
4. 底部星点可以略多于顶部。
5. 亮星数量要少。
6. 星点位置要稳定，不要每次刷新变化。
7. 不要用很多 DOM 节点造成性能问题。

可用 CSS background 方案：

```css
.stars-layer {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
}

.stars-far {
  opacity: 0.34;
  background-image:
    radial-gradient(circle, rgba(214, 228, 255, 0.24) 1px, transparent 1.4px);
  background-size: 180px 180px;
  background-position: 12px 48px;
}

.stars-mid {
  opacity: 0.24;
  background-image:
    radial-gradient(circle, rgba(230, 236, 248, 0.32) 1.2px, transparent 1.8px);
  background-size: 260px 260px;
  background-position: 80px 120px;
}

.stars-bright {
  opacity: 0.36;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.52) 1.3px, transparent 2px);
  background-size: 420px 420px;
  background-position: 140px 260px;
}
```

### 5.4 底部星点增强

为了让底部更有真实太空感，可以增加底部 mask：

```css
.stars-bright {
  mask-image: linear-gradient(
    180deg,
    transparent 0%,
    rgba(0, 0, 0, 0.25) 45%,
    rgba(0, 0, 0, 1) 100%
  );
}
```

效果：底部星点略多，上方较少。

### 5.5 陨石 / 流星

允许加入少量低频陨石，增强太空真实性。

要求：

1. 每 12-25 秒出现一次。
2. 数量最多 1-2 条。
3. 颜色以冷白、银蓝为主。
4. 不能穿过主要文字密集区。
5. 不能像游戏特效。
6. 移动端可以关闭。
7. 不要使用大量 DOM 粒子。

CSS 示例：

```css
.meteor {
  position: absolute;
  width: 120px;
  height: 1px;
  opacity: 0;
  background: linear-gradient(
    90deg,
    rgba(214, 228, 255, 0),
    rgba(214, 228, 255, 0.62),
    rgba(214, 228, 255, 0)
  );
  filter: drop-shadow(0 0 6px rgba(214, 228, 255, 0.22));
}

@keyframes meteorDrift {
  0% {
    transform: translate3d(0, 0, 0) rotate(-18deg);
    opacity: 0;
  }
  6% {
    opacity: 0.52;
  }
  16% {
    opacity: 0;
  }
  100% {
    transform: translate3d(-36vw, 18vh, 0) rotate(-18deg);
    opacity: 0;
  }
}

.meteor-a {
  top: 18%;
  left: 86%;
  animation: meteorDrift 18s linear infinite;
  animation-delay: 4s;
}

.meteor-b {
  top: 62%;
  left: 92%;
  animation: meteorDrift 24s linear infinite;
  animation-delay: 14s;
}

@media (max-width: 768px) {
  .meteor {
    display: none;
  }
}
```

## 6. 删除页面独立背景

请检查并删除或弱化这些样式：

```txt
app/jobs/page.tsx 内的全屏 gradient
app/my-applications/page.tsx 内的全屏 gradient
app/my-bottle/page.tsx 内的全屏 gradient
app/discussions/page.tsx 内的全屏 gradient
components 中重复的 background radial-gradient
表格外层大面积背景
页面底部独立 dark block
section 背景色块
```

页面内部只允许使用轻量 surface：

```css
.surface-subtle {
  background: rgba(8, 12, 24, 0.28);
  backdrop-filter: blur(12px);
}

.surface-readable {
  background: rgba(8, 12, 24, 0.42);
  backdrop-filter: blur(16px);
}
```

如果必须有边界，只能极弱：

```css
border: 1px solid rgba(148, 163, 184, 0.06);
```

禁止：

```css
border: 1px solid gold;
border: 1px solid rgba(255, 215, 106, 0.3);
box-shadow: 0 0 40px gold;
```

## 7. 岗位星图：捕获属于自己的星星

### 7.1 产品隐喻

岗位星图不是普通岗位列表，而是一个“深空中发现并捕获岗位星体”的界面。

隐喻映射：

```txt
岗位 = 星体
公司 = 星体核心
行业 = 星系区域
地区 = 星云区域
筛选 = 调整观测参数
点击岗位 = 观察星体
点击去官网投递 = 捕获星体
我的投递 = 捕获后的投递轨道
我的星瓶 = 已捕获星体的收藏容器
```

### 7.2 不是只改文案

“捕获属于自己的星星”必须从视觉和交互体现，而不是只写在页面文案里。

必须包含：

1. 岗位星体化。
2. 捕获动画。
3. 已捕获状态。
4. 我的投递轨道。
5. 我的星瓶联动。

## 8. 保留现有岗位列表，同时新增分类星系

用户希望既保留当前界面，也增加一个分类体验。

因此：

```txt
/jobs 保留当前易读岗位列表
/galaxy 新增岗位星系入口
```

### 8.1 /jobs

`/jobs` 是高效岗位列表页。

保留：

```txt
搜索
筛选
岗位列表
投递按钮
查看进度
```

视觉上优化为深空信号列表，但不删除列表。

### 8.2 /galaxy

`/galaxy` 是创意星系分类入口。

用户进入后先选择：

```txt
地区星系
行业星系
```

两个入口应表现为星云团，而不是普通卡片。

## 9. 地区星系

### 9.1 路由

```txt
/galaxy/region
/galaxy/region/[region]
```

### 9.2 地区星云

地区星系包含：

```txt
北京星云
上海星云
深圳星云
广州星云
成都星云
杭州星云
香港星云
全国星云
其他地区
```

点击后进入对应地区岗位星云。

例如：

```txt
北京星云 -> /galaxy/region/beijing
上海星云 -> /galaxy/region/shanghai
```

### 9.3 地区星云视觉

1. 岗位数量越多，星云略大。
2. 已捕获数量越多，星云内亮星略多。
3. 星云使用低饱和冷色。
4. 不使用方框。
5. hover 时星云轻微发亮。
6. 点击时有星云放大进入动画。

## 10. 行业星系

### 10.1 路由

```txt
/galaxy/industry
/galaxy/industry/[name]
```

### 10.2 行业星云

行业星系包含：

```txt
互联网星云
金融星云
咨询星云
科技星云
制造星云
消费星云
地产/基建星云
医疗健康星云
能源星云
其他行业
```

点击后进入对应行业岗位星云。

例如：

```txt
互联网星云 -> /galaxy/industry/internet
金融星云 -> /galaxy/industry/finance
```

### 10.3 行业星云视觉

1. 岗位数量越多，星云略大。
2. 行业不同可以有非常低饱和的冷色差异。
3. 不使用彩色星球。
4. 不使用游戏化星云。
5. hover 时显示岗位数量和已捕获数量。
6. 点击时有星云放大进入动画。

## 11. 具体星云页

### 11.1 具体地区星云页

例如：

```txt
/galaxy/region/beijing
```

页面标题：

```txt
北京星云
```

内容：

1. 北京地区岗位星体。
2. 辅助信号列表。
3. 搜索和筛选。
4. 点击星体查看详情。
5. 点击去官网投递触发捕获。

### 11.2 具体行业星云页

例如：

```txt
/galaxy/industry/internet
```

页面标题：

```txt
互联网星云
```

内容：

1. 互联网行业岗位星体。
2. 辅助信号列表。
3. 地区、批次、状态筛选。
4. 点击星体查看详情。
5. 点击去官网投递触发捕获。

## 12. 岗位星体化方案

### 12.1 星体节点

每个岗位渲染成一个星体节点：

```txt
公司简称
状态外环
批次环
亮度
hover 信息
```

### 12.2 星体位置

不要完全随机。

规则：

1. 按行业或地区形成星云区域。
2. 同一行业/地区岗位聚集。
3. 使用 `job.id` hash 生成稳定位置。
4. 每次刷新位置不变。
5. 避免严重重叠。
6. 筛选时不匹配星体变暗，匹配星体变亮。

### 12.3 状态视觉

```txt
未投递：暗淡星点
已打开官网：弱光环
已投递：稳定亮星
笔试：单层轨道环
一面：双层轨道环
二面：双层轨道环并略亮
终面：慢速脉冲
Offer：柔金核心
拒绝：暗化
放弃：半透明
```

### 12.4 批次视觉

```txt
提前批：虚线外环
正式批：实线微环
补录：短周期弱脉冲
实习：小卫星点
```

## 13. 捕获交互

### 13.1 触发条件

用户点击某个岗位的：

```txt
去官网投递
```

且成功写入或 upsert `user_applications` 后，触发捕获动画。

### 13.2 捕获动画

动画流程：

```txt
岗位星体短暂变亮
出现捕获光环
小星点从星体脱离
沿自然弧线飞向投递轨道或星瓶入口
岗位状态变成已打开官网
官网新窗口打开
```

要求：

1. 动画时长 700-1000ms。
2. 路径自然，不鬼畜。
3. 不爆炸。
4. 不撒花。
5. 不强金色。
6. 不影响数据库写入。
7. 重复点击同一岗位不重复生成星星。

### 13.3 捕获后的状态

捕获后：

1. 岗位星体从暗星变为已捕获状态。
2. 在我的投递里出现记录。
3. 在我的星瓶里出现对应星星。
4. 如果用户更新状态，星体视觉同步变化。

## 14. 我的投递轨道

新增或优化：

```txt
CaptureOrbit
```

轨道节点：

```txt
已打开官网 -> 已投递 -> 笔试 -> 一面 -> 二面 -> 终面 -> Offer
```

要求：

1. 已捕获岗位的小星体显示在对应状态节点附近。
2. 轨道线非常弱，不能像明显框线。
3. hover 星体显示公司和岗位。
4. 点击星体打开进度详情。
5. 状态变化时星体移动到对应节点。
6. 如果用户没有投递记录，轨道淡化显示。

## 15. 需要新增的组件

### 15.1 背景和布局

```txt
components/layout/SpaceShell.tsx
components/layout/SpaceBackground.tsx
components/layout/UserNavbar.tsx
```

### 15.2 星系分类

```txt
components/galaxy/GalaxyGateway.tsx
components/galaxy/GalaxyChoice.tsx
components/galaxy/RegionGalaxyMap.tsx
components/galaxy/IndustryGalaxyMap.tsx
components/galaxy/NebulaNode.tsx
components/galaxy/NebulaTransition.tsx
```

### 15.3 岗位星体

```txt
components/opportunity/OpportunityStarfield.tsx
components/opportunity/OpportunityStar.tsx
components/opportunity/OpportunityCluster.tsx
components/opportunity/OpportunitySignalList.tsx
components/opportunity/OpportunitySignalRow.tsx
components/opportunity/OpportunityDetailPanel.tsx
```

### 15.4 捕获系统

```txt
components/capture/CaptureAnimation.tsx
components/capture/CaptureOrbit.tsx
components/capture/CapturedStar.tsx
components/capture/useCaptureMotion.ts
```

## 16. 新增路由建议

```txt
/galaxy
/galaxy/region
/galaxy/region/[region]
/galaxy/industry
/galaxy/industry/[name]
```

保留：

```txt
/jobs
/my-applications
/my-bottle
/discussions
/admin
```

## 17. 执行顺序

### Phase 1：统一背景，修复色块分层

1. 新增 SpaceShell。
2. 新增 SpaceBackground。
3. 所有用户端页面接入。
4. 删除各页面重复背景。
5. 增加底部克制白色星点。
6. 增加少量低频流星。
7. 修复底部色块分层。

### Phase 2：新增地区/行业星系入口

1. 新增 `/galaxy`。
2. 新增地区星系入口。
3. 新增行业星系入口。
4. 新增 NebulaNode。
5. 点击进入对应分类。

### Phase 3：具体星云岗位页

1. 新增 `/galaxy/region/[region]`。
2. 新增 `/galaxy/industry/[name]`。
3. 显示岗位星体。
4. 保留辅助列表。
5. 点击星体显示详情。

### Phase 4：捕获动画和投递轨道

1. 投递后星体捕获动画。
2. 已捕获状态。
3. CaptureOrbit。
4. 我的星瓶联动。

### Phase 5：统一我的投递、星瓶、讨论区

1. 我的投递视觉统一。
2. 讨论区视觉统一。
3. 星瓶背景统一。
4. 导航统一。

## 18. Codex 执行指令

请按以下要求修改项目：

```txt
请修复 Job Bottle 用户端的背景色块分层问题，并升级岗位星图为“在深空中捕获属于自己的岗位星星”的体验。

当前问题：
1. 页面底部和中部出现明显颜色分层。
2. 原因可能是 body、page wrapper、section、表格容器分别叠加了不同 gradient 和 backdrop-blur。
3. 需要建立统一 SpaceShell / SpaceBackground，所有用户端页面共享同一个深空背景。
4. 用户希望背景底部有一些克制白色亮点作为星星，也可以有少量低频陨石/流星，增强真实太空感。
5. 用户希望岗位星图不只是表格，而是从视觉上体现“捕获属于自己的星星”。
6. 用户希望保留当前 /jobs 易读岗位列表，同时新增地区星系和行业星系分类体验。

请执行：
1. 新增 components/layout/SpaceShell.tsx。
2. 新增 components/layout/SpaceBackground.tsx。
3. 所有用户端页面接入 SpaceShell。
4. 删除各页面独立的大面积 background gradient。
5. 修复底部色块分层。
6. SpaceBackground 底部增加稳定的白色星点。
7. SpaceBackground 增加 1-2 条低频流星动画，移动端关闭。
8. 保留 /jobs 的易读岗位列表。
9. 新增 /galaxy 作为岗位星系入口。
10. /galaxy 中用户可以选择地区星系和行业星系。
11. 新增 /galaxy/region 展示北京星云、上海星云、深圳星云等。
12. 新增 /galaxy/industry 展示互联网星云、金融星云、咨询星云等。
13. 具体星云页展示岗位星体和辅助信号列表。
14. 岗位星体使用 job.id hash 生成稳定位置。
15. 点击岗位星体显示详情。
16. 点击去官网投递后，播放捕获星体动画。
17. 捕获后的岗位进入我的投递和我的星瓶。
18. 不要删除现有列表，不要破坏 Supabase 数据逻辑。
19. 不要使用明显方框、金色描边、dashboard 卡片。
20. 不要改成英文界面。

分阶段完成，不要一次性破坏所有页面。
```

## 19. 验收标准

完成后必须满足：

1. 底部不再有明显矩形颜色分层。
2. 所有用户端页面共享同一个深空背景。
3. 背景底部有克制白色星点。
4. 背景有少量低频流星/陨石。
5. `/jobs` 仍然保留易读岗位列表。
6. `/galaxy` 可以选择地区星系和行业星系。
7. 地区星系有北京星云、上海星云等。
8. 行业星系有互联网星云、金融星云等。
9. 具体星云页有岗位星体和辅助列表。
10. 点击星体可以查看岗位详情。
11. 点击投递有捕获星体的视觉反馈。
12. 已捕获岗位能进入我的投递和我的星瓶。
13. 页面专业克制，不游戏化。
14. 移动端可用。
15. 不影响登录、投递、管理员后台、讨论区功能。
