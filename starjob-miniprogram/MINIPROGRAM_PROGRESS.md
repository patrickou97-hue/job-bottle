# 拾星微信小程序进度

> 独立工作目录：`/Users/wangrui/Documents/Web/starjob-miniprogram/`
>
> 本文只记录微信小程序工作。现有网站、Supabase migration、hosted DDL、Vercel 部署和微信平台配置分别记录，不混写。

## 当前状态

- 日期：2026-07-30
- 阶段：0.4.0 网页功能对齐、生产 migration 与小程序开发版本上传完成，等待微信审核与正式发布
- 网站基线：0.4.0 对齐代码待本轮推送 `main`，随后以生产探针确认部署
- 工作区保护：`.codex-artifacts/` 与五份 `docs/prd/*.md` 用户文件保持未修改、未暂存、未提交
- 小程序代码：已建立原生 TypeScript 工程和 11 个页面
- 数据库变更：微信身份映射、小程序会话、一次性网页登录码、指南范围、反馈队列与账号合并 migration 均已存在
- hosted Supabase DDL：截至 `20260726140000_shared_guide_feedback.sql` 均已推送并核对远端迁移历史
- Vercel 主体：确认以 Patrick（`patrickou97-hue`）账号的 `job-bottle` 为唯一生产项目；Ray 账号同名项目仅暂时保留，不承载主域名
- Vercel 环境变量：Patrick 生产项目的 AppID、AppSecret 与独立会话签名密钥均已确认并覆盖 Production / Preview
- Supabase 主体：生产站、本地环境与 hosted migration 均指向项目 ref `uzzdcjdjlbnxmhvilldj`
- 生产发布：提交 `4b1be73` 已推送 Patrick 的 GitHub `main`，Patrick Vercel 状态为 `success / Deployment has completed`
- 微信公众平台配置：真实 AppID 已写入；现有线上体验版已能读取生产岗位，正式审核资料仍需在平台复核
- 真实微信联调：开发者工具内 `wx.login` 已成功创建 `wechat_identities` 与有效 `miniprogram_sessions` 记录
- 账号复用：已有拾星网站用户可使用邮箱密码进入原 Supabase 账号，并可在小程序内安全绑定、合并或解绑微信身份
- 体验改造：岗位进入底部 dock；星瓶与投递合并；星图首页改为更克制的深海星图材质；补齐岗位详情、完整投递字段、资料编辑、邮箱登录、云端简历编辑/预览/PDF、指南与反馈
- 网页登录码 E2E：真实小程序登录态生成生产码；全新无痕 Chrome 建立同一账号 Session，`/profile` 显示微信用户工作台；重放同一码被拒绝
- 小程序发布：`0.2.1` 已预览并上传，包体 455,243 bytes；未提交审核、未审核通过、未正式发布，不覆盖用户已提交审核的 `0.2.0`
- 小程序发布：`0.3.0` 已预览并上传，包体 515,341 bytes；未提交审核、未审核通过、未正式发布，不覆盖用户已提交审核的 `0.2.0`
- 小程序发布：`0.4.0` 已由官方 CLI 预览并上传，包体 563,014 bytes；微信审核与正式发布状态必须继续在公众平台核验
- 首页视觉对齐：已按网页版移动端星系重做中心轨道、统一 OrbMaterial 行星材质、品牌字标、图标与短标签，并补齐“指南”第六颗行星
- 发布边界：`0.2.0` 审核状态来自用户说明，本轮未在微信公众平台独立核验；iPhone/Android 真机仍未覆盖

## 2026-07-30 网页功能对齐与 0.4.0

- [x] 首页以网页版移动端固定几何为基准，提供岗位、投递、星瓶、简历、指南、我的六个真实入口
- [x] 岗位页补齐城市、方向、批次、近 7 天、偏好匹配、未收录/已收录筛选及原生分享
- [x] 个人中心补齐资料完成度、投递/活跃/简历统计与偏好岗位推荐
- [x] 指南补齐公告分类、五步秋招流程，并为网申助手与诘星提供明确跨端入口
- [x] 简历补齐照片、文本/TXT 导入、程序识别/AI 复核、分段润色、独立双语译本及语言与技能合并排序
- [x] 重复收录岗位不再把已有投递阶段重置为 opened
- [x] 网页与小程序共用简历 AI 账号级限流，服务端函数只向 service role 开放
- [x] hosted migration `20260730120000_miniprogram_resume_ai_rate_limit.sql` applied
- [x] 小程序 `npm run check`、网页 TypeScript、ESLint、生产构建、完整 smoke 与 `git diff --check` 通过
- [x] 微信开发者工具 iPhone 12/13 模拟器确认六行星首页与 312 条生产岗位
- [x] 官方 CLI 最终预览与 `0.4.0` 上传，包体 563,014 bytes
- [ ] 微信公众平台提交审核
- [ ] 微信审核通过
- [ ] 正式发布
- [ ] iPhone 与 Android 真机回归

## 2026-07-26 首页视觉同源改版（已并入 0.4.0）

- [x] 删除小程序独有的欢迎文案、英文品牌字、拟真条纹、陨石坑与行星环
- [x] 以网页版移动端固定几何为基准，改为全屏中心双轨道系统
- [x] 六个真实入口统一为网页版 OrbMaterial 的径向渐变、暗部、描边、高光与克制光晕
- [x] 补回投递与指南行星，并将岗位、投递、星瓶、简历、指南、我的映射到真实小程序页面
- [x] 中心行星与顶部品牌均使用网页端同款拾星字标
- [x] 轨道时长对齐网页版移动端 `138s`，页面隐藏时继续暂停动画
- [x] 微信开发者工具 iPhone 15 Pro Max 与 iPhone 5 模拟器视觉验收
- [x] 投递行星点击后成功进入真实投递进度页
- [x] `npm run check` 与 `git diff --check -- starjob-miniprogram` 通过
- [ ] Git 提交与推送（本轮执行中）
- [x] 微信预览与 `0.4.0` 开发版本上传
- [ ] 微信提审与正式发布
- [ ] iPhone 与 Android 真机回归

## 2026-07-26 双端核心功能对齐与 0.3.0

- [x] 原生简历完整编辑器：全部共享字段、增删排序、8 套模板、本地草稿、云端冲突保护
- [x] 原生简历预览与服务端 PDF 生成
- [x] 星瓶内编辑完整投递信息：状态、阶段、优先级、渠道、账号、联系人、简历、行动日期、备注与复盘
- [x] 小程序内资料编辑、邮箱登录及微信/邮箱账号绑定、合并与安全解绑
- [x] 拾星指南双端展示范围、公告读取与反馈队列
- [x] 行星材质改为低塑料感的分层表面、暗部和克制光晕
- [x] hosted migration `20260726140000` applied
- [x] 网页提交 `4b1be73` 生产部署成功，公开与未登录权限探针通过
- [x] 微信官方自动化验证真实登录态、云端简历编辑器、PDF、指南、星瓶完整字段与个人资料
- [x] 0.3.0 预览与上传
- [ ] 0.3.0 提交审核
- [ ] 0.3.0 审核通过
- [ ] 0.3.0 正式发布
- [ ] iPhone 与 Android 真机回归

## 2026-07-26 安全网页登录码与 0.2.1

- [x] 小程序“我的”开放 8 位网页登录码入口
- [x] 5 分钟有效、单次消费和重放保护
- [x] 30 秒持久生成限流与 10 分钟 10 次持久猜码限流
- [x] 网页消费接口可信 Origin、严格格式与 no-store
- [x] Supabase SSR Cookie 明确写入最终响应
- [x] 后台区分仅邮箱、仅微信、邮箱与微信已绑定
- [x] hosted migration `20260724183000` applied
- [x] 小程序真实登录态 → 生产码 → 无痕 Chrome → `/profile` E2E
- [x] 0.2.1 预览与上传
- [ ] 0.2.1 提交审核
- [ ] 0.2.1 审核通过
- [ ] 0.2.1 正式发布
- [ ] iPhone 与 Android 真机回归

## 隔离规则

1. 小程序客户端代码、配置、测试和文档全部放在本目录。
2. 不把小程序页面或运行时混入现有 Next.js `src/`。
3. 只有共享数据契约、安全服务端接口或数据库迁移确有必要时，才对网站工程做最小改动。
4. 微信 AppSecret、Supabase service role key 和任何服务端密钥不得进入小程序代码、Git、日志或截图。
5. 任何涉及现有网站的改动都必须单独列出文件、验证结果和上线状态。

## 已完成

- [x] 按顺序核对三份交接文档的当前权威信息
- [x] 核对 Git 分支、HEAD、`origin/main` 和用户已有未跟踪文件
- [x] 确认仓库当前没有既有小程序目录或 Monorepo 共享包
- [x] 定位现有 Supabase、登录、资料、岗位、投递、简历、指南和公告相关代码
- [x] 建立独立小程序目录与进度文档
- [x] 建立原生微信小程序 TypeScript 工程
- [x] 建立统一设计令牌、页面壳和交互状态
- [x] 实现岗位坐标首页、搜索、城市/方向筛选和近 7 天筛选
- [x] 实现岗位详情、星瓶入口和复制外部投递链接交互
- [x] 实现微信登录页和 `wx.login` → 安全服务端的请求契约
- [x] 实现投递、简历、我的三个主入口及登录/加载/空/错误状态
- [x] 使用网页端同款“拾星”文字 Logo，分别生成深浅背景适配资产
- [x] 将网页端行星运行特色转译为原生小程序星图首页，以 5 个低负载 CSS 行星入口承载岗位、星瓶、投递、简历与我的
- [x] 按腾讯官方小程序 skill 建议改为纯文字自定义 TabBar，移除原生空图标槽并统一底部安全区
- [x] 星图页面隐藏时暂停轨道动画，五颗行星同速运行并保持固定相对夹角，避免标签追尾
- [x] 岗位页从 Tab 页面改为星图子页面后补充明确返回入口
- [x] 增加邮箱登录入口，服务端通过 Supabase Auth 校验已有拾星账号并签发小程序会话
- [x] 增加独立星瓶页、阶段筛选、投递进度更新和岗位收录入口
- [x] 增加云端简历创建表单，直接写入网站共用的 `resumes` 表
- [x] 增加原生岗位地图与城市岗位聚合，地图标识使用克制圆点，不使用瓶子图标
- [x] 岗位地图下方一次渲染全部匹配岗位，保持连续下滑体验
- [x] 自定义导航按微信胶囊实际坐标计算顶部品牌区，并为状态栏、底部 TabBar 与 Home Indicator 预留安全区
- [x] 完成 7 个页面的开发者工具视觉审计；截图与审计报告保存在本地 `.audit/2026-07-24/`
- [x] 岗位页状态栏与头图区统一颜色，Logo 下移避开系统分界线
- [x] 复用网页端真实星瓶素材并完整显示；地图继续使用圆点
- [x] 星瓶素材按小程序实际显示尺寸无损观感压缩至 34 KB，消除 200 KB 资源体积告警
- [x] 岗位列表与详情移除截止日期，统一展示开启日期
- [x] 开启日期兼容 `M.D` 与标准年月日格式，避免 iOS 对非标准 `new Date()` 字符串解析不一致
- [x] 实现 access token、refresh token、本地恢复、单次刷新合并和 401 恢复
- [x] 增加项目结构与客户端密钥标识自动检查
- [x] 写入真实小程序 AppID
- [x] 实现微信 `code2Session` 服务端桥接，响应和日志不返回 `session_key`、openid 或 AppSecret
- [x] 对 openid / unionid 只存服务端 HMAC，不存原值
- [x] 实现 15 分钟 access token、30 天 refresh token、刷新令牌哈希存储和单次轮换
- [x] 实现登录、刷新、退出、岗位、岗位详情、星瓶收录、投递列表、简历列表、个人资料 API
- [x] 推送 server-only 身份表与会话表迁移，普通客户端没有直接表权限
- [x] 小程序岗位页切换到线上 API；线上失败时显示错误，不回退成伪数据
- [x] 将岗位坐标加入底部 dock，并修复五个 dock 页面的当前项高亮同步
- [x] 将星瓶与投递管理合并为同一工作台，支持完整投递状态筛选与原生 picker 更新
- [x] 岗位列表可进入真实详情页，并继续使用开启日期而非截止日期
- [x] 个人中心支持称呼、手机号、城市、学校、专业、毕业年份、意向地区与目标方向编辑
- [x] 已有网站账号支持邮箱密码登录同一 Supabase 用户
- [x] 云端简历列表可进入原生 A4 风格预览页，并兼容历史简历内容缺省字段
- [x] 使用微信官方自动化 SDK 完成首页、岗位、岗位详情、星瓶、资料编辑、邮箱登录和简历预览截图验收
- [x] 云端简历可原生编辑全部共享字段、切换全部 8 套模板、复制、删除、冲突覆盖和恢复本地草稿
- [x] 云端简历可在小程序内生成并打开与网页共用排版的 PDF
- [x] 星瓶可编辑网页版共用的完整投递工作流字段
- [x] 小程序内读取官方指南与公告并直接提交反馈
- [x] 邮箱账号与微信身份支持安全绑定、数据合并及有条件解绑

## 正在进行

- [x] 核对真实 Auth、profiles 外键、RLS 和服务端接口边界
- [x] 提炼网站品牌与移动端视觉约束
- [x] 用户授权跳过视觉生成，直接按既定品牌和界面约束实现
- [x] 实现安全服务端身份桥接和真实岗位 API
- [x] 把岗位页从明确标注的界面样例切换为同一套线上数据
- [x] 在 Supabase Auth 开启 Anonymous Sign-Ins，供服务端创建无邮箱的内部 Auth UUID
- [x] 复核 Patrick Vercel 中 AppID 与 AppSecret 的精确变量名
- [x] 核对 Patrick 项目绑定 `www.starjob.space`，根域名以 308 跳转到 `www`
- [x] 核对线上代码、本地环境与远端迁移使用同一 Supabase 项目
- [x] 清除本地 Vercel CLI 对 Ray 副本的默认关联和登录，保留可恢复备份以防误部署
- [x] 在 Patrick 项目补充 `MINIPROGRAM_SESSION_SECRET`
- [x] 开启微信开发者工具服务端口
- [x] 部署服务端路由并验证生产岗位 API 与微信登录失败边界
- [x] 微信开发者工具内执行真实 `wx.login` 端到端验证
- [x] 完成本轮 5 个主入口与登录页开发者工具视觉验收
- [ ] 使用至少一台 iPhone 与一台 Android 真机验收刘海/挖孔、软键盘、系统大字体和 273 行滚动表现
- [x] 部署邮箱登录、简历编辑/预览/PDF、资料编辑和星瓶完整投递字段 API，执行生产接口验证
- [x] 上传 0.3.0 开发版本
- [ ] 在不影响 0.2.0 当前审核的前提下安排 0.3.0 提审

## 当前客户端目录

```text
starjob-miniprogram/
  MINIPROGRAM_PROGRESS.md
  project.config.json
  package.json
  tsconfig.json
  scripts/
    validate-project.mjs
  miniprogram/
    app.ts
    app.json
    app.wxss
    assets/
    config/
    fixtures/
    services/
    types/
    pages/
      galaxy/
      jobs/
      bottle/
      applications/
      resumes/
      profile/
      login/
```

## 当前可运行范围

- 微信开发者工具使用真实 AppID 导入本目录。
- 岗位坐标与岗位详情已指向 `https://www.starjob.space/api/miniprogram` 的真实数据接口。
- 微信登录真实调用 `wx.login`，只把一次性 code 发送给 StarJob 服务端。
- 投递、简历、个人资料通过服务端验证短期 access token 后，以 service role 按已验证的 `user_id` 精确查询，不把 service role key 下发到小程序。
- 小程序请求层不使用 `PATCH`，更新统一采用微信支持的 `PUT` 或动作型 `POST`。

## 本轮验证

- `npm install`：通过，3 个 package，0 vulnerabilities
- `npm run typecheck`：通过
- `npm run validate`：通过；9 个页面文件完整，未发现客户端密钥标识
- `npm run check`：通过
- `git diff --check -- starjob-miniprogram`：通过
- 网站 `npm run build`：通过，新增 8 条小程序 API 路由进入 Next.js 构建产物
- 网站 `npm run lint`：通过
- 网站 `npm run smoke`：通过
- hosted migration：dry-run 仅包含本次迁移，正式推送后本地/远端版本一致
- 生产项目审计：Patrick 项目 ID 为 `prj_6WlUi0UF0JRmBsgj4rmWgcRgYuR2`，连接 GitHub `patrickou97-hue/job-bottle` 的 `main`
- 主域名审计：Patrick 项目绑定 `www.starjob.space`（Production）、`starjob.space`（308 跳转）与 `job-bottle.vercel.app`
- Supabase 主体审计：生产前端包中公开项目域名、本地 `.env.local` 与 Supabase CLI 链接均为 `uzzdcjdjlbnxmhvilldj`
- Supabase Auth：Management API 已开启并回读确认 `external_anonymous_users_enabled=true`
- Ray 项目审计：Ray 无权访问生产域名，按用户要求暂不删除；本地 Ray 项目关联与 CLI 凭据已移为可恢复备份，避免误部署
- 微信开发者工具：服务端口已开启（端口号只用于本机）；CLI 已登录并导入真实 AppID 工程
- 真实微信登录：开发者工具内完成用户协议/隐私政策确认并成功登录，数据库已确认身份映射与未撤销会话
- 生产岗位 API：`GET /api/miniprogram/jobs` 返回 200 与 291 条当前开放岗位
- 生产登录失败边界：无效微信 code 返回 401 / `WECHAT_LOGIN_FAILED`，响应未包含 session key、openid 或 AppSecret 标识

## 初步可行性

- 可直接共享：同一套 Supabase 中的岗位、用户资料、投递、简历、指南和公告数据，但必须继续受 RLS 或服务端权限校验约束。
- 必须改造：微信登录需要服务端身份桥接与唯一身份映射；指南需要平台可见范围字段及服务端查询约束；小程序登录态不能照搬浏览器 Cookie。
- 暂不承诺：微信账号与既有网页账号自动合并、PDF 导出、任意外部招聘官网直跳、文件上传下载、消息订阅和管理员后台，均需在真实平台能力与审核要求核验后决定。

## 已核对的真实代码与数据边界

- Supabase 浏览器客户端：`src/lib/supabase/client.ts`
- Supabase Cookie 服务端客户端：`src/lib/supabase/server.ts`
- service role 服务端客户端：`src/lib/supabase/admin.ts`
- 当前登录与 profile 补建：`src/lib/auth.ts`
- 统一业务类型：`src/lib/types.ts`
- 岗位查询、筛选与近七天口径：`src/lib/jobs.ts`
- 投递记录：`src/lib/applications.ts`
- 简历模型与本地草稿：`src/lib/resume.ts`、`src/lib/resume-sync.ts`
- 拾星指南：`src/lib/forum.ts`、`src/app/api/admin/forum/posts/route.ts`
- 登录公告：`src/app/api/announcements/latest/route.ts`
- 基础表与触发器：`supabase/schema.sql`
- 基础 RLS：`supabase/policies.sql`
- 后续字段和安全修复：`supabase/migrations/`

当前确认：

1. `profiles.id`、`user_applications.user_id`、`resumes.user_id` 都以 `auth.users.id` 为账号主键。
2. `profiles`、投递、简历已有 owner-only RLS；岗位开放读取，管理员写入。
3. 网页登录依赖 Supabase Auth 浏览器/Cookie session，小程序不能直接复用。
4. 星瓶不是第二张收藏表；当前核心收藏/投递入口统一落在 `user_applications`，并以 `candidate_stage`、`status`、`priority` 等字段表达状态。
5. 拾星指南和公告目前都复用 `forum_posts`；当前没有平台展示范围字段。
6. 公告已读目前写在 Auth `user_metadata.latest_announcement_seen_id`，小程序接入前需要确认更新入口和跨端并发覆盖风险。
7. 当前仓库不是 Monorepo，也没有既有微信小程序目录或共享 package。

## 身份方案结论

当前 Supabase Auth 没有原生微信小程序 provider，不能把 `wx.login` 的 code 当作 Supabase session，也不能用伪造邮箱代替微信身份。

当前采用服务端身份桥接：

```text
微信小程序
  ├─ wx.login() 取得一次性 code
  ├─ POST /api/miniprogram/auth/wechat
  ▼
StarJob 安全服务端
  ├─ 校验请求与一次性 code
  ├─ 使用 AppID + AppSecret 调用 code2Session
  ├─ 对 openid / unionid 做服务端 HMAC 后查唯一映射
  ├─ 通过 Supabase Anonymous Sign-In 创建无邮箱的 auth.users UUID
  ├─ 签发仅供 StarJob API 验证的 15 分钟 HS256 access token
  └─ 哈希存储并单次轮换 30 天 opaque refresh token
  ▼
StarJob 小程序 API
  └─ 验证 sub 后使用 service role 严格追加 user_id 条件，不向客户端暴露 Supabase 密钥
```

关键原因：

- 当前首期不让小程序直接调用 Supabase Data API，避免额外导入 JWT signing key。
- access token 只由 StarJob 服务端签发与验证；`MINIPROGRAM_SESSION_SECRET` 独立于 Supabase legacy JWT secret。
- refresh token 不伪装成邮箱会话，服务端只保存 SHA-256 哈希并在每次刷新后立即轮换。
- 新微信用户通过 Supabase 官方 Anonymous Sign-In 获得无邮箱、无手机号的唯一 `auth.users` UUID；微信 HMAC 映射使其能在同一微信身份再次登录。当前 hosted 配置仍需人工开启 Anonymous Sign-Ins。

当前依据：

- [Supabase JWT signing keys](https://supabase.com/docs/guides/auth/signing-keys)
- [Supabase custom JWT usage](https://supabase.com/docs/guides/auth/jwts)
- [Supabase third-party auth limitations](https://supabase.com/docs/guides/auth/third-party/overview)
- [Supabase users and anonymous-user boundary](https://supabase.com/docs/guides/auth/users)

建议新增两张 server-only 表：

### `wechat_identities`

- 主键 `id`
- `user_id` 外键到 `auth.users(id)`
- `openid_hash`
- 可空 `unionid_hash`
- `created_at`、`updated_at`、`last_login_at`、可空 `disabled_at`
- `openid_hash` 唯一约束
- `unionid_hash` 非空时的部分唯一索引
- 启用 RLS，不给普通客户端任何直接读写策略

### `miniprogram_sessions`

- 主键 `id`
- `user_id` 外键到 `auth.users(id)`
- `refresh_token_hash`
- `created_at`、`expires_at`、`last_used_at`
- 可空 `revoked_at`
- refresh token 唯一约束
- 启用 RLS，不给普通客户端任何直接读写策略

首次并发登录通过 `openid_hash` 唯一约束恢复竞争；竞争中多建的匿名 Auth 用户立即删除。绑定已有网页账号仍需网页端重新验证当前 Supabase session，再生成短时、单次使用的绑定凭证；不能依据昵称或未验证邮箱自动合并。

## 指南双端展示方案

在真实表结构确认后，建议在 `forum_posts` 增加：

- `platform_visibility text not null default 'both'`
- check：`both | web | miniprogram`
- 现有数据随默认值安全回填为 `both`

读取约束：

- 网页：只读 `both | web`
- 小程序：只读 `both | miniprogram`
- 管理员发布/编辑 API 校验枚举，普通用户没有修改权限
- `/api/announcements/latest` 同样增加网页可见过滤
- 小程序公告接口只返回小程序可见公告

迁移文件、hosted DDL、网站部署、小程序构建和生产验证必须各自记录。

## 首期范围判断

### 可以迁移

- 岗位列表、搜索、筛选、详情
- 星瓶收藏与投递记录
- 投递状态、优先级、备注、下一步与时间
- 个人资料和求职偏好
- 简历查看与基础字段编辑
- 拾星指南、公告和反馈入口

### 需要平台适配

- 微信登录、账号绑定、解绑和注销
- 外部招聘链接：优先复制链接并明确提示，不提供无响应按钮
- 富文本：白名单解析，禁止任意 HTML/脚本
- 文件上传下载、PDF、分享卡片和消息订阅
- 深色模式、系统字号、安全区、表单草稿与断网重试

### 首期不迁移

- 浏览器插件本体及依赖扩展 API 的自动填写
- 浏览器插件安装操作
- 管理员后台
- 未完成安全评审的自动账号合并

## 待用户/平台配置

- 微信开发者工具重新扫码登录
- 微信公众平台合法请求域名与业务域名配置权限
- 隐私政策、用户信息用途声明、审核演示路径与测试账号

## 变更日志

### 2026-07-26

- 按在线体验报告将岗位坐标放入底部 dock，并把星瓶与投递管理合并。
- 补齐岗位详情、投递状态修改、个人资料编辑、邮箱登录、简历创建与简历预览能力。
- 星图首页减小行星尺寸、压低镜面高光和发光强度，保留网站的轨道运行识别度。
- 修复 custom tab 在岗位、星瓶、简历、个人中心仍错误高亮“首页”的问题。
- 修复星瓶“收录岗位”使用 `navigateTo` 打开 tab 页失败的问题。
- 使用微信官方自动化 SDK 做逐页本地截图验收；简历预览使用模拟响应验证，未写入生产测试数据。
- 小程序 `npm run check`、网站 TypeScript、lint、build、smoke、`git diff --check` 与生产依赖高危审计全部通过。

### 2026-07-23

- 创建独立目录和本文档。
- 确认当前生产基线与交接记录一致。
- 开始身份链路、数据模型和小程序视觉方向审计。
- 明确 Patrick Vercel 项目为生产主体，Ray 同名项目仅暂时保留。
- 确认 Patrick 项目绑定主域名、GitHub 主分支及正确的小程序 AppID / AppSecret 变量名。
- 确认生产站、本地环境与 hosted migration 共用 Supabase 项目 `uzzdcjdjlbnxmhvilldj`。
- 在 Patrick Vercel 增加 Sensitive 的 `MINIPROGRAM_SESSION_SECRET`，覆盖 Production / Preview。
- 开启生产 Supabase Anonymous Sign-Ins，并回读确认配置生效。
- 清除本地 Ray Vercel 默认关联，保留可恢复备份，后续部署只通过 Patrick 的 GitHub/Vercel 生产链。
- 开启微信开发者工具服务端口；发现现有登录票据已过期，待扫码后继续导入和上传。
- 推送提交 `ace6ef4` 到 Patrick GitHub `main`，由 Patrick Vercel 生产链发布。
- 在 `www.starjob.space` 验证岗位 API 已上线，并验证无效微信 code 的安全失败响应。
- 完成现有 Auth、profiles、岗位、投递、简历、指南、公告和 RLS 的定向代码核对。
- 确定“服务端微信身份桥接 + 导入的 ES256 signing key + 短期 RLS access token + 单次轮换 refresh token”的首选身份方向。
- 视觉生成服务连续三次连接失败；未用文字草图冒充视觉方案，等待外部服务恢复后重试。
- 用户随后明确授权跳过视觉服务，直接写代码；视觉生成不再是当前阻塞。
- 新增原生 TypeScript 小程序工程、6 个页面、请求/会话层、共享业务类型、样例岗位和品牌资源。
- 岗位样例所有外部副作用均禁用；真实 API 上线前不声称已共享生产数据。
- 首轮 `npm run check` 与 `git diff --check` 通过。
- 收到真实 AppID 并写入 `project.config.json`；AppSecret 未进入源码、日志或本文。
- 新增服务端认证、岗位、投递、简历和资料 API，以及 HMAC 身份映射与旋转会话实现。
- 新增并上线 `20260723120000_miniprogram_wechat_auth.sql`，远端迁移历史已核对一致。
- 小程序岗位数据由样例切换为生产 API，不再自动回退样例。
- 网站 build、lint、smoke 与小程序 check 全部通过。
