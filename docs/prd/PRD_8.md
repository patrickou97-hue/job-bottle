请重构当前“岗位星体观测”模块。当前问题是：所有岗位星体直接铺在同一个观测区里，导致星体拥挤、文字重叠、视觉混乱。用户希望把它改成一个小型的“星云观测窗口”：第一层只显示大的星云分类，点击星云后再进入对应分类下的公司星体，并且星云入口不要再用方框和文字，要用 image2.0 生成的星云视觉资产。

一、核心产品结构

请将“岗位星体观测”从单层星体列表改成三层结构：

第一层：星云入口层
用户看到的是几个大的星云入口，而不是所有公司。
星云入口包括：
- 地区星系
- 行业星系
- 批次星系
- 已捕获星系

也可以在地区星系内部显示：
- 北京星云
- 上海星云
- 深圳星云
- 杭州星云
- 成都星云
- 香港星云
- 全国星云

行业星系内部显示：
- 互联网星云
- 金融星云
- 咨询星云
- 科技星云
- 制造星云
- 消费星云
- 医疗健康星云
- 能源星云
- 其他行业星云

第二层：具体星云窗口
用户点击某个星云后，进入一个小型星云观测窗口。
例如点击“互联网星云”后，只显示互联网行业相关公司星体。
点击“北京星云”后，只显示北京地区相关公司星体。

第三层：岗位详情层
用户点击具体公司星体后，右侧显示详情：
- 公司名称
- 岗位方向
- 地点
- 行业
- 批次
- 开启时间
- 当前状态
- 去官网投递 / 查看进度

二、页面布局要求

当前“岗位星体观测”区域不要再直接铺满所有公司星体。

改成：

默认状态：
左侧或中央显示星云入口。
每个星云入口是一个视觉化星云团，不是文字按钮，不是方框卡片。

点击星云后：
星云入口淡出或缩到左上角。
中间出现该星云内部的公司星体。
右侧保留详情区。
顶部显示返回入口：
← 返回星云入口

用户可以在同一个观测窗口内切换：
星云入口层 -> 公司星体层 -> 岗位详情层

不要跳转页面也可以，先在当前 /jobs 页面内完成交互。

三、星云入口视觉

当前方框 + 文字作为星云入口太丑，请删除这种方案。

星云入口应该是 image2.0 生成的星云 PNG/SVG 资产，视觉像深空中的星云团。

每个星云入口应包括：
1. 星云图形本体。
2. 少量星点。
3. 极弱冷色光晕。
4. 星云名称悬浮在旁边或下方。
5. 岗位数量小字，例如“42 个岗位”。
6. 不使用明显边框。
7. 不使用卡片背景。
8. 不使用金色描边。

视觉风格：
- 深空
- 冷蓝
- 银白
- 低饱和
- 真实星云
- 专业克制
- 不卡通
- 不游戏化
- 不霓虹

四、image2.0 生成星云资产

请使用 image2.0 生成一组透明背景星云资产，用于星云入口。

资产建议放在：

public/assets/nebula/
  nebula-region.png
  nebula-industry.png
  nebula-batch.png
  nebula-captured.png
  nebula-beijing.png
  nebula-shanghai.png
  nebula-internet.png
  nebula-finance.png
  nebula-consulting.png
  nebula-tech.png

生成要求：
- transparent background
- no text
- no logo
- no UI frame
- no border
- no rectangular background
- dark-mode compatible
- cold blue / silver blue nebula
- professional and restrained
- realistic cosmic nebula cloud
- subtle stars inside
- no cartoon
- no neon cyberpunk
- no game icon style

image2.0 prompt 示例：

Create a transparent PNG asset of a realistic cold blue nebula cloud for a dark professional website interface. The nebula should be soft, elegant, low-saturation, with subtle silver-blue light, sparse white star particles, and no rectangular background. No text, no logo, no UI frame, no border, no cartoon style, no neon cyberpunk, no game icon. The center should have a soft glowing cosmic cloud, edges fading naturally to transparent. Suitable as a clickable category node in a deep-space recruitment web app.

不同星云可以微调：
- 地区星系：更宽、更像星云地图。
- 行业星系：更集中、更像能量云团。
- 已捕获星系：里面有少量柔金星点，但不要金色大面积。
- 金融星云：可以略带冷银色。
- 互联网星云：可以略带冷蓝。
- 科技星云：可以略带青蓝。
- 咨询星云：可以略带淡紫蓝。

五、星云入口组件

请新增：

components/galaxy/NebulaGateway.tsx
components/galaxy/NebulaNode.tsx
components/galaxy/NebulaDetailWindow.tsx
components/galaxy/NebulaCompanyField.tsx

NebulaNode props：

type NebulaNodeProps = {
  id: string
  name: string
  count: number
  capturedCount?: number
  imageSrc: string
  variant: "region" | "industry" | "batch" | "captured"
  onClick: () => void
}

NebulaNode 视觉：
- 只用图片资产和文字悬浮。
- 不要卡片。
- 不要边框。
- hover 时星云轻微放大 1.04。
- hover 时透明度提升。
- hover 时出现轻微冷蓝光晕。
- 点击后播放星云放大进入动画。

六、星云进入动画

用户点击星云入口后：

1. 被点击的星云轻微放大。
2. 其他星云变暗并后退。
3. 当前星云扩散为观测窗口背景。
4. 公司星体从星云中浮现。
5. 右侧详情区域清空，显示“选择一颗岗位星体查看信号”。

动画要求：
- 时长 600-900ms。
- 使用 Motion for React。
- 不要爆炸。
- 不要强光。
- 不要游戏化。
- reduced motion 时直接切换。

七、公司星体排列规则

进入具体星云后，才显示公司星体。

公司星体必须规整排列，不要挤成一团。

布局规则：
1. 使用蜂窝布局或规整网格。
2. 每个星体之间至少 48px 间距。
3. 星体内部最多显示 1-2 个字。
4. 完整公司名只在 hover 或详情区显示。
5. 如果数量超过 60 个，启用分页或聚合星团。
6. 不要把 167 个岗位一次性显示在同一层。

建议：
- 一屏最多显示 40-60 个星体。
- 超过数量时显示“+N 个信号”，点击展开列表。
- 星体排列区域可以横向或纵向滚动，但不能文字重叠。

八、数据分组规则

请基于 jobs 表字段生成星云分类。

地区星云：
根据 jobs.locations 解析。
如果 locations 包含：
北京 -> 北京星云
上海 -> 上海星云
深圳 -> 深圳星云
广州 -> 广州星云
杭州 -> 杭州星云
成都 -> 成都星云
香港 -> 香港星云
全国 -> 全国星云
其他 -> 其他地区

行业星云：
根据 jobs.industry 解析。
互联网 -> 互联网星云
金融 -> 金融星云
咨询 -> 咨询星云
科技 -> 科技星云
制造 -> 制造星云
消费 -> 消费星云
医疗健康 -> 医疗健康星云
能源 -> 能源星云
其他 -> 其他行业

批次星云：
根据 jobs.batch_type 解析。
提前批、正式批、补录、实习等。

已捕获星云：
根据当前用户 user_applications 生成：
已打开官网、已投递、笔试、面试、Offer 等。

九、与现有列表的关系

请保留现有 /jobs 列表，不要删除。

岗位星体观测模块可以作为 /jobs 页面上方的交互入口。
下方仍然保留 167 个岗位列表。

视觉逻辑：
- 上方：星云观测窗口，负责发现和捕获体验。
- 下方：岗位列表，负责高效阅读和操作。

星云窗口和列表联动：
1. 点击星云后，下方列表自动筛选到对应分类。
2. 点击公司星体后，下方列表滚动到对应岗位。
3. 点击列表中的岗位时，上方星体高亮。
4. 投递后，星体和列表状态同步更新。

十、右侧详情区优化

当前右侧详情区可以保留，但它应该显示“当前选中星体”的详情。

默认：
选择一颗岗位星体查看信号。

选中后：
显示：
- 公司名称
- 岗位方向
- 行业
- 地点
- 批次
- 开启时间
- 当前状态
- 去官网投递 / 再次打开官网 / 查看进度

不要让所有公司名堆在星体上。

十一、不要做的事

1. 不要一上来显示全部 167 个公司星体。
2. 不要让文字互相重叠。
3. 不要用方框 + 文字作为星云入口。
4. 不要用普通卡片作为星云入口。
5. 不要把星云做成彩色游戏图标。
6. 不要使用金色大边框。
7. 不要删除原有岗位列表。
8. 不要破坏 Supabase 数据读取和投递逻辑。
9. 不要把界面改成英文。
10. 不要生成标题下面一堆说明小字。

十二、验收标准

完成后应满足：
1. 默认岗位星体观测区先显示星云入口，不直接显示所有公司。
2. 星云入口不是方框，而是 image2.0 生成的星云视觉资产。
3. 点击星云后进入对应分类的公司星体视图。
4. 公司星体规整排列，不重叠。
5. 公司简称不互相覆盖。
6. 点击公司星体能查看岗位详情。
7. 点击去官网投递有捕获视觉反馈。
8. 下方岗位列表仍然保留且可读。
9. 星云选择会联动筛选下方列表。
10. 整体保持深空、专业、克制，不游戏化。

请重构“我的投递轨道”模块。当前它是横向时间轴，但我希望它改成类似主页星系的圆形同心轨道系统。

核心设计理念：
每一个投递状态是一层环形轨道。岗位星体会根据当前投递状态进入对应轨道，并围绕中心缓慢旋转。

状态越靠近 Offer，轨道越靠内；状态越早期，轨道越靠外。

一、轨道状态映射

请将投递状态映射为同心圆轨道：

最外圈：
已打开官网 opened

第二圈：
已投递 applied

第三圈：
笔试 written_test

第四圈：
一面 first_round

第五圈：
二面 second_round

第六圈：
终面 final_round

最内圈：
Offer offer

拒绝 rejected：
不进入主轨道，显示为远处暗星或轨道外暗区。

放弃 withdrawn：
显示为半透明远星，不参与旋转主轨道。

轨道顺序：
opened 外圈最大
applied
written_test
first_round
second_round
final_round
offer 最内圈

二、视觉目标

不要做成普通进度条。
不要做成横向时间轴。
不要做成 dashboard 卡片。

它应该像一个小型星系系统：

- 中心是“我的投递引力核心”
- 不同状态是同心轨道
- 每个岗位是一个小星体
- 星体在对应状态轨道上缓慢旋转
- 状态越接近 Offer，星体越靠近中心
- Offer 星体亮度最高，但仍然克制
- 已拒绝和已放弃星体变暗，脱离主轨道

整体风格：
深色
冷色星空
专业克制
无明显方框
无金色粗线
无游戏化爆光

三、组件结构

请新增或重构：

components/applications/ApplicationOrbitSystem.tsx
components/applications/ApplicationOrbitRing.tsx
components/applications/ApplicationOrbitStar.tsx
components/applications/ApplicationOrbitLegend.tsx
components/applications/ApplicationOrbitDetail.tsx

替换当前横向 CaptureOrbit / 我的投递轨道组件。

四、数据结构

每个 user_application 需要映射为一个轨道星体：

type OrbitApplication = {
  id: string
  jobId: string
  companyName: string
  jobTitle: string
  status: ApplicationStatus
  updatedAt: string
  applyUrl: string
}

状态类型：

type ApplicationStatus =
  | "opened"
  | "applied"
  | "written_test"
  | "first_round"
  | "second_round"
  | "final_round"
  | "offer"
  | "rejected"
  | "withdrawn"

五、轨道配置

请定义轨道配置：

const ORBIT_CONFIG = {
  opened: {
    label: "已打开官网",
    radius: 260,
    duration: 96,
    opacity: 0.38
  },
  applied: {
    label: "已投递",
    radius: 220,
    duration: 84,
    opacity: 0.46
  },
  written_test: {
    label: "笔试",
    radius: 180,
    duration: 72,
    opacity: 0.54
  },
  first_round: {
    label: "一面",
    radius: 145,
    duration: 62,
    opacity: 0.62
  },
  second_round: {
    label: "二面",
    radius: 112,
    duration: 54,
    opacity: 0.70
  },
  final_round: {
    label: "终面",
    radius: 82,
    duration: 46,
    opacity: 0.78
  },
  offer: {
    label: "Offer",
    radius: 48,
    duration: 38,
    opacity: 0.92
  }
}

注意：
1. radius 需要根据容器大小响应式缩放。
2. 桌面端可用较大半径。
3. 移动端半径缩小。
4. 不要让星体超出容器。

六、星体位置算法

同一个状态可能有多个岗位星体，不能堆在一起。

请实现：

getOrbitStarPosition(application, indexInStatus, totalInStatus, status)

规则：
1. 同一状态轨道上的星体均匀分布角度。
2. 使用 application.id hash 加入轻微角度偏移。
3. 星体沿轨道缓慢旋转。
4. 每次刷新初始位置稳定，不要完全随机。
5. 同一轨道多个星体不能重叠。
6. 如果同一状态超过 8 个星体，启用聚合星团。

角度示例：
angle = (indexInStatus / totalInStatus) * 360 + hashOffset

七、聚合规则

当同一轨道星体数量过多：

如果 totalInStatus <= 8：
直接显示全部星体。

如果 totalInStatus > 8：
显示前 7 个星体 + 一个聚合星团。

聚合星团显示：
+N

点击聚合星团：
打开该状态下的岗位列表浮层。

不要把几十颗星全部塞在一条轨道上。

八、轨道视觉

轨道线必须非常弱，不能像明显线框。

轨道线样式：
- 1px
- rgba(148, 163, 184, 0.08)
- 虚线或极弱实线
- hover 某个状态时该轨道轻微提亮
- 不使用金色轨道线

轨道标签：
每条轨道可以在右侧或轨道上方显示小标签：
已打开官网
已投递
笔试
一面
二面
终面
Offer

但标签必须克制，不要压住星体。

九、星体视觉

每个岗位星体：

默认：
- 小型冷蓝星体
- 内部显示公司简称 1-2 个字
- 低亮度
- 微弱边缘光

hover：
- 放大 1.08
- 亮度提升
- 显示公司名和岗位方向
- 对应详情面板更新

selected：
- 外圈出现冷色细环
- 详情面板固定显示该岗位

Offer：
- 可以有少量柔金核心
- 不要爆光
- 不要大面积金色

rejected：
- 暗灰色
- 放在主轨道外侧远处
- 不参与主轨道旋转或慢速漂浮

withdrawn：
- 半透明暗星
- 放在远处暗区

十、动画要求

轨道旋转：
- 使用 Motion for React 或 CSS transform
- 每条轨道速度不同
- 不要所有轨道同速
- 旋转非常慢
- 鼠标 hover 某颗星时，可以暂停该轨道或减速
- 用户开启 prefers-reduced-motion 时停止旋转

状态变化动画：
当用户将某个岗位状态从 opened 改为 written_test：

1. 星体从 opened 外圈移动到 written_test 轨道。
2. 移动路径是向内的轻微弧线。
3. 动画时长 600-900ms。
4. 不要直接闪现。
5. 动画结束后星体加入新轨道旋转。

这就是“岗位进入对应状态轨道”的核心体验。

十一、交互逻辑

点击星体：
1. 设置 selectedApplication。
2. 右侧或下方显示详情。
3. 可以修改状态。
4. 可以打开官网。
5. 可以写进度备注。

修改状态：
1. 更新 Supabase user_applications.status。
2. 成功后触发星体迁移到对应轨道。
3. 失败则保持原状态并显示错误提示。

hover 轨道标签：
1. 高亮对应轨道。
2. 该状态的星体变亮。
3. 其他轨道略微变暗。

点击轨道标签：
1. 过滤该状态。
2. 详情列表显示该状态下所有岗位。

十二、页面布局

在“我的投递”页面中：

顶部：
我的投递

中间主视觉：
ApplicationOrbitSystem 圆形投递轨道

右侧或下方：
ApplicationOrbitDetail 选中岗位详情

底部：
可选的列表视图，用于高效查看全部投递记录

不要删除列表能力。轨道是主视觉，列表是辅助阅读。

十三、空状态

如果没有投递记录：

显示一个暗色空轨道系统。
中心文案：
暂无投递记录

辅助文案：
从岗位星图中打开官网投递后，岗位星体会进入这里。

但不要把文案放进大框里。

十四、与岗位星图和星瓶联动

投递路径闭环：

1. 在岗位星图点击“去官网投递”。
2. 岗位星体被捕获。
3. 进入我的投递轨道 opened 外圈。
4. 在我的星瓶中新增星星。
5. 用户更新状态后：
   - 我的投递轨道中星体向内移动。
   - 我的星瓶中对应星星亮度/状态变化。

十五、不要做的事

1. 不要继续使用横向时间轴作为主视觉。
2. 不要让星体全部堆在一条线。
3. 不要轨道线太亮。
4. 不要每条轨道都用金色。
5. 不要强烈旋转，避免眩晕。
6. 不要动画鬼畜。
7. 不要删除列表视图。
8. 不要破坏 Supabase 状态更新逻辑。
9. 不要把界面改成英文。
10. 不要做成游戏抽卡界面。

十六、验收标准

完成后必须满足：

1. 我的投递轨道是圆形同心轨道，不是横向时间轴。
2. 每个状态对应一条轨道。
3. opened 在最外圈，offer 在最内圈。
4. 岗位星体根据状态进入对应轨道。
5. 星体在轨道上缓慢旋转。
6. 多个星体不会严重重叠。
7. 同一状态太多岗位时有聚合机制。
8. 点击星体能查看详情。
9. 修改状态后星体会迁移到对应轨道。
10. 视觉专业克制，不游戏化。
11. 保留列表辅助阅读。
12. 不影响数据库读取和状态更新。