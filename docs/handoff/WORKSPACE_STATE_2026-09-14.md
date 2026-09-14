# StarJob 工作区整理状态（2026-09-14）

## 当前基线

- 正式分支：origin/main，当前提交 06e73c3（全局 UI 与动效性能发布）。
- 主工作区：main，当前提交 06e73c3，已与 origin/main 对齐。
- 上次 UI 发布使用独立工作树 /private/tmp/starjob-ui-release，已推送并完成 Vercel 部署。正式站、登录页、内推码筛选和 1.1.5 下载包已做匿名探针验证。
- 上一轮混合候选已存入命名 stash：archive: pre-cleanup mixed workspace 2026-09-14，可按需恢复，但不应直接合并。

## 内容分层

### 已上线、以后应从 origin/main 继续

- 全局 UI 与动效：src/app/login/、src/components/auth/、src/components/jobs/、src/components/layout/、src/styles/。
- 岗位内推码显示与“有内推码企业”筛选：HomeClient、JobCard、JobFilterBar、VirtualJobList、src/lib/referral-codes.ts。
- 行星贴图资产：public/assets/space/orbital-ink-atlas-v2.png、src/components/galaxy/ink-orbs.css。
- 生产扩展 1.1.5：以 origin/main 和线上下载包为准。

### 本地候选，未确认发布

- 网申助手智能填充候选：browser-extension/、src/app/api/resume/extension-autofill/route.ts、src/lib/extension-smart-fill-v2.ts 及相关夹具。
- 星瓶分享撤下与应用页试验：ApplicationBottle.tsx、BottleStage.tsx、已删除的 SharePosterEditor.tsx、shareBottle* 和对应测试。
- 旧版本扩展包已从当前工作区删除；public/downloads/ 只保留 v1.1.5.zip。正式站旧版本直链当前仍返回 200，需下一次明确发布清理提交后才会消失。

### 受保护资料

- docs/prd/：产品需求历史与方案，保留原样，不批量改名、删除或提交。
- deliverables/：评审截图、复盘文档和交付物，保留原样。
- promo-video/：独立宣传片工程；node_modules/ 和 out/ 已由其自身 .gitignore 忽略，源文件不要混入 Web 发布提交。
- docs/design/：设计审计与方案记录，继续作为历史资料；新的结论写入本文件或交接日志，不覆盖旧记录。

## 清理规则

1. 后续功能开发从 origin/main 的干净工作树开始，UI 修改不要重新从 bed8982 的脏工作区拷贝。
2. 任何候选功能先放在带主题的分支或独立工作树，验证通过后再合并；不要把扩展、宣传片和产品 UI 混在同一次提交。
3. 发布前必须分别记录：代码提交、Vercel 部署、页面/API 探针、匿名行为、真实账号 E2E。未验证的状态不能写成“已上线”。
4. 本次主工作区的 75 项混合变更已存入命名 stash；主分支随后对齐 origin/main。恢复 stash 前先按文件类别拆分，不要整体发布。

## 已验证边界

- 发布候选：npm test 181/181、typecheck、Webpack build、smoke、lint 0 error；桌面、平板、手机页面和登录行星暂停/继续/减少动态效果均已验证。
- 未验证：真实账号登录后的投递、星瓶、管理员和扩展第三方网站 E2E；这些仍需单独账号与设备验收。

## 下一次接手入口

先读本文件，再按 starjob-production-handoff 顺序读取三个根交接文档和 docs/handoff/详细文档。开发时使用最新 origin/main，并只选择一类变更进入当前分支。
