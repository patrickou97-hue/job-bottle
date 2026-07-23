# 拾星微信小程序进度

> 独立工作目录：`/Users/wangrui/Documents/Web/starjob-miniprogram/`
>
> 本文只记录微信小程序工作。现有网站、Supabase migration、hosted DDL、Vercel 部署和微信平台配置分别记录，不混写。

## 当前状态

- 日期：2026-07-23
- 阶段：真实 AppID、生产数据 API 与微信登录桥接联调
- 网站基线：`main` / `origin/main` / `104aa05766585d511a66190a7cb34c7ae75be96d`
- 工作区保护：`.codex-artifacts/` 与五份 `docs/prd/*.md` 用户文件保持未修改、未暂存、未提交
- 小程序代码：已建立原生 TypeScript 工程和 6 个页面
- 数据库变更：新增微信身份映射与小程序会话迁移
- hosted Supabase DDL：`20260723120000_miniprogram_wechat_auth.sql` 已推送并核对远端迁移历史
- Vercel 主体：确认以 Patrick（`patrickou97-hue`）账号的 `job-bottle` 为唯一生产项目；Ray 账号同名项目仅暂时保留，不承载主域名
- Vercel 环境变量：Patrick 生产项目的 AppID、AppSecret 与独立会话签名密钥均已确认并覆盖 Production / Preview
- Supabase 主体：生产站、本地环境与 hosted migration 均指向项目 ref `uzzdcjdjlbnxmhvilldj`
- 微信公众平台配置：真实 AppID 已写入；请求域名、隐私声明与审核配置待完成

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
- [x] 实现 access token、refresh token、本地恢复、单次刷新合并和 401 恢复
- [x] 增加项目结构与客户端密钥标识自动检查
- [x] 写入真实小程序 AppID
- [x] 实现微信 `code2Session` 服务端桥接，响应和日志不返回 `session_key`、openid 或 AppSecret
- [x] 对 openid / unionid 只存服务端 HMAC，不存原值
- [x] 实现 15 分钟 access token、30 天 refresh token、刷新令牌哈希存储和单次轮换
- [x] 实现登录、刷新、退出、岗位、岗位详情、星瓶收录、投递列表、简历列表、个人资料 API
- [x] 推送 server-only 身份表与会话表迁移，普通客户端没有直接表权限
- [x] 小程序岗位页切换到线上 API；线上失败时显示错误，不回退成伪数据

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
- [ ] 部署服务端路由并执行真实 `wx.login` 端到端验证

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
      jobs/
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
- `npm run validate`：通过；6 个页面文件完整，未发现客户端密钥标识
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
- 微信开发者工具：服务端口已开启（端口号只用于本机）；CLI 已能连接 IDE，但当前微信工具登录票据过期，需要重新扫码登录后再导入

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
