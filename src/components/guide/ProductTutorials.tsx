"use client";

import Link from "next/link";
import { useId, useState, type KeyboardEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  Compass,
  FileText,
  FlaskConical,
  ListChecks,
  Puzzle,
  UserRound,
} from "lucide-react";

const TUTORIALS = [
  {
    id: "overview",
    label: "使用总览",
    icon: Compass,
    title: "把找机会、做准备和跟进连起来",
    summary: "拾星会帮你整理自己正在关注的求职机会。先核对岗位，再收入星瓶；实际投递后更新进度，简历和后续材料按目标岗位准备。",
    steps: [
      { title: "从岗位坐标开始", detail: "用地区、行业和岗位等条件缩小范围，打开详情核对招聘信息。", href: "/explore", linkLabel: "浏览岗位" },
      { title: "保存值得跟进的机会", detail: "登录后在岗位详情中收入星瓶；也可以把站外找到的职位录入自己的投递档案。", href: "/bottle", linkLabel: "打开星瓶" },
      { title: "按真实进度维护记录", detail: "从企业官网返回后，确认是否完成投递，再在投递管理中补上阶段和下一步计划。", href: "/my", linkLabel: "管理投递" },
      { title: "为重点岗位准备材料", detail: "制作对应版本的简历；使用网申助手时，检查填写结果并由自己完成最终提交。", href: "/resume", linkLabel: "制作简历" },
    ],
    destination: { href: "/explore", label: "从岗位坐标开始", note: "先看正在开放的机会" },
    nextId: "jobs",
  },
  {
    id: "jobs",
    label: "找岗位",
    icon: BriefcaseBusiness,
    title: "先筛选，再核对岗位详情",
    summary: "岗位坐标适合发现校招机会。筛选结果用来缩小范围，投递前仍应以企业招聘页面显示的信息为准。",
    steps: [
      { title: "按目标缩小范围", detail: "在岗位坐标输入公司或岗位关键词，再结合城市、行业和岗位类别筛选。" },
      { title: "打开岗位详情做判断", detail: "查看页面已收录的招聘批次、时间、工作地点和岗位描述；遇到缺项或变化，前往企业官方招聘页确认。" },
      { title: "选择下一步", detail: "暂时观望的岗位可以继续浏览；想跟进时登录并收入星瓶，或直接准备岗位简历。", href: "/resume", linkLabel: "准备岗位简历" },
    ],
    destination: { href: "/explore", label: "打开岗位坐标", note: "筛选并查看岗位详情" },
    nextId: "bottle",
  },
  {
    id: "bottle",
    label: "星瓶收藏",
    icon: FlaskConical,
    title: "把机会收进星瓶，之后继续处理",
    summary: "星瓶集中呈现你已经收入的求职机会，方便回看与打开对应岗位。它和投递管理分工不同：星瓶用于回顾机会，投递管理用于维护每条投递档案。",
    steps: [
      { title: "从岗位详情收入星瓶", detail: "登录后，在岗位详情点击收入星瓶相关操作；完成后可以从星瓶查看这条机会。" },
      { title: "回看已保存机会", detail: "打开星瓶，选择目标岗位并查看当前记录；如果要更新状态、日期或备注，转到投递管理。", href: "/my", linkLabel: "前往投递管理" },
      { title: "确认实际结果再更新", detail: "浏览官网不等于完成投递。收到笔试、面试或结果后，再按实际情况维护进度。" },
    ],
    destination: { href: "/bottle", label: "打开我的星瓶", note: "回看已经收入的机会" },
    nextId: "applications",
  },
  {
    id: "applications",
    label: "投递管理",
    icon: ListChecks,
    title: "每个机会都有自己的进度档案",
    summary: "投递管理记录你在拾星中收录的岗位，不会自动包含未录入的申请。按实际进展更新，日历和阶段统计才有可靠依据。",
    steps: [
      { title: "收录站内或站外机会", detail: "从岗位详情收入星瓶；站外岗位可用“添加外部岗位”建立个人档案，并补充来源、招聘要求和截止时间。" },
      { title: "打开单条投递维护档案", detail: "记录实际投递岗位、状态变化、备注与下一步时间；需要时关联简历版本、材料和问答。" },
      { title: "查看日历和阶段漏斗", detail: "日历展示已收录的招聘节点与跟进计划，可导出日历文件。漏斗只统计拾星中已有记录的岗位。" },
    ],
    destination: { href: "/my", label: "打开投递管理", note: "查看投递与跟进安排" },
    nextId: "resume",
  },
  {
    id: "resume",
    label: "简历制作",
    icon: FileText,
    title: "先整理事实，再为目标岗位准备版本",
    summary: "保留一份通用简历，再按重点岗位复制和调整。不同岗位的版本分开维护，减少改动互相覆盖。",
    steps: [
      { title: "创建或导入简历", detail: "在简历制作中新建一份，或导入已有内容；导入后先核对识别结果和联系方式。" },
      { title: "整理经历并调整顺序", detail: "编辑教育经历、实习与工作经验、项目等内容；这些列表支持拖动排序，也可以用上下按钮调整。" },
      { title: "生成岗位版本并检查", detail: "从当前简历创建目标岗位版本，结合岗位要求对照检查经历和关键词；导出前预览版式与个人信息。", href: "/my", linkLabel: "查看投递档案" },
    ],
    destination: { href: "/resume", label: "打开简历制作", note: "创建、编辑和管理版本" },
    nextId: "extension",
  },
  {
    id: "extension",
    label: "网申助手",
    icon: Puzzle,
    title: "让助手填写可确认的字段，由你核对和提交",
    summary: "网申助手把选定的简历同步到浏览器扩展，再按你点击的操作填写当前网申页面。安装、同步与完整填写说明请看专用安装教程。",
    steps: [
      { title: "准备并同步简历", detail: "先检查简历资料，在网申助手页面选择当前使用版本并同步到浏览器扩展。" },
      { title: "在目标页面主动启动填写", detail: "打开企业网申页，点浏览器工具栏中的拾星图标，选简历和填写方式，再点击填写当前页面。" },
      { title: "检查复核项目并手动提交", detail: "查看标记字段和低置信建议；答案库复用前确认问题语义。助手不会替你填写验证码、密码或最终提交。" },
    ],
    destination: { href: "/extension/guide", label: "查看安装与同步教程", note: "完整步骤和安全边界" },
    nextId: "profile",
  },
  {
    id: "profile",
    label: "个人中心",
    icon: UserRound,
    title: "让推荐和简历资料保持一致",
    summary: "个人中心汇总基础资料、求职偏好、简历版本和投递进展。补全意向地区与岗位后，可以更快回到匹配机会。",
    steps: [
      { title: "维护基础资料", detail: "检查用户名、所在城市、毕业年份、学校和专业；修改后点击保存资料。" },
      { title: "设置求职偏好", detail: "选择意向地区与岗位，保存后可在个人中心查看相近方向的岗位推荐。" },
      { title: "从汇总入口继续处理", detail: "在个人中心跳转到简历、岗位坐标、星瓶或投递管理；以各页面中的明细记录为准。" },
    ],
    destination: { href: "/profile", label: "打开个人中心", note: "资料、偏好与进度汇总" },
    nextId: "overview",
  },
] as const;

export function ProductTutorials() {
  const [activeId, setActiveId] = useState<(typeof TUTORIALS)[number]["id"]>(TUTORIALS[0].id);
  const tabsId = useId();
  const panelId = `${tabsId}-panel`;
  const topicIndex = TUTORIALS.findIndex((topic) => topic.id === activeId);
  const topic = TUTORIALS[topicIndex];
  const TopicIcon = topic.icon;
  const nextTopic = TUTORIALS.find((item) => item.id === topic.nextId) ?? TUTORIALS[0];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % TUTORIALS.length;
    if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + TUTORIALS.length) % TUTORIALS.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = TUTORIALS.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    setActiveId(TUTORIALS[nextIndex].id);
    document.getElementById(`${tabsId}-tab-${TUTORIALS[nextIndex].id}`)?.focus();
  }

  return (
    <div className="observatory-page mx-auto max-w-[1080px] space-y-7">
      <nav aria-label="面包屑" className="flex items-center gap-2 text-sm text-ink-muted">
        <Link href="/forum" className="inline-flex min-h-9 items-center gap-1.5 transition-colors hover:text-ink-primary">
          <ArrowLeft aria-hidden="true" className="size-4" />拾星指南
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page" className="text-ink-secondary">产品使用教程</span>
      </nav>

      <header className="page-hero border-b border-[color:var(--line-ghost)]">
        <div className="max-w-3xl">
          <p className="page-kicker">STARJOB · 使用手册</p>
          <h1 className="page-title mt-2">在拾星步步运筹帷幄</h1>
          <p className="page-subtitle mt-3">选择一个主题，直接查看操作方法与页面入口。秋招阶段安排另见 <Link href="/guide" className="text-action inline-flex">秋招流程<ArrowUpRight aria-hidden="true" className="size-3.5" /></Link>。</p>
        </div>
      </header>

      <section aria-label="产品使用主题" className="overflow-hidden rounded-[22px] border border-[color:var(--line-ghost)] bg-[color:var(--surface-read-bg)] shadow-[0_12px_36px_-28px_rgba(29,47,79,.28)]">
        <div role="tablist" aria-label="选择产品教程主题" className="flex overflow-x-auto border-b border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)] px-2 py-2 [scrollbar-width:thin] sm:px-3">
          {TUTORIALS.map((item, index) => {
            const Icon = item.icon;
            const selected = item.id === activeId;
            return (
              <button
                key={item.id}
                id={`${tabsId}-tab-${item.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActiveId(item.id)}
                onKeyDown={(event) => handleTabKeyDown(event, index)}
                className={`relative flex min-h-[54px] shrink-0 items-center gap-2.5 rounded-xl px-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7e98ba] focus-visible:ring-offset-2 sm:min-w-[128px] sm:px-4 ${selected ? "bg-white text-ink-primary shadow-[0_2px_8px_-4px_rgba(27,43,66,.2)]" : "text-ink-secondary hover:bg-white/60 hover:text-ink-primary"}`}
                data-active={selected}
              >
                <span className="text-[10px] tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className="whitespace-nowrap text-sm font-medium">{item.label}</span>
                {selected ? <span aria-hidden="true" className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-[color:var(--aurora)]" /> : null}
              </button>
            );
          })}
        </div>

        <div id={panelId} role="tabpanel" aria-labelledby={`${tabsId}-tab-${topic.id}`} tabIndex={0} className="grid min-w-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div className="flex items-center gap-3 text-xs font-semibold tracking-[0.12em] text-ink-muted">
              <TopicIcon aria-hidden="true" className="size-4 text-[color:var(--aurora)]" />
              <span>主题 {String(topicIndex + 1).padStart(2, "0")} / {String(TUTORIALS.length).padStart(2, "0")}</span>
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.03em] text-ink-primary sm:text-[30px]">{topic.title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-secondary">{topic.summary}</p>

            <ol className="mt-8 divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
              {topic.steps.map((step, index) => (
                <li key={step.title} className="grid gap-2 py-5 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-4">
                  <span className="font-mono text-xs tabular-nums text-ink-muted">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-ink-primary">{step.title}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-6 text-ink-secondary">{step.detail}</p>
                    {"href" in step && step.href && "linkLabel" in step && step.linkLabel ? (
                      <Link href={step.href} className="text-action mt-2 inline-flex min-h-8 items-center gap-1 text-xs font-semibold">
                        {step.linkLabel}<ArrowUpRight aria-hidden="true" className="size-3.5" />
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <aside className="flex flex-col justify-between gap-8 border-t border-[color:var(--line-ghost)] bg-[color:var(--surface-subtle-bg)] px-5 py-6 sm:px-8 lg:border-l lg:border-t-0 lg:px-7 lg:py-8">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-ink-muted">前往对应页面</p>
              <h3 className="mt-3 text-lg font-semibold text-ink-primary">{topic.destination.note}</h3>
              <Link href={topic.destination.href} className="gold-button pressable mt-5 inline-flex min-h-11 items-center gap-3 px-4 text-sm font-semibold">
                {topic.destination.label}<ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>

            <div className="border-t border-[color:var(--line)] pt-5">
              <p className="text-xs text-ink-muted">继续阅读</p>
              <button type="button" onClick={() => setActiveId(nextTopic.id)} className="group mt-2 flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-ink-primary hover:text-[color:var(--aurora)]">
                <span>下一个主题：{nextTopic.label}</span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5" />
              </button>
              <Link href="/forum" className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs text-ink-secondary transition-colors hover:text-ink-primary">
                回到公告与求职经验<ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-[color:var(--line-ghost)] pt-5 text-xs text-ink-muted">
        <span className="inline-flex items-center gap-2"><Check aria-hidden="true" className="size-4 text-[color:var(--ok)]" />操作路径以当前页面为准；需要登录的功能会提示你先登录。</span>
        <Link href="/forum" className="text-action inline-flex min-h-9 items-center">浏览全部指南文章<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
      </footer>
    </div>
  );
}
