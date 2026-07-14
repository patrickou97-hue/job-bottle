import Link from "next/link";
import { ArrowRight } from "lucide-react";

const STEPS = [
  {
    title: "筛岗位",
    body: "在岗位坐标按行业、地点和岗位类别筛选。先打开岗位详情，核对职责、批次和报名信息，再决定是否进入投递记录。",
    href: "/explore",
    action: "打开岗位坐标",
  },
  {
    title: "建记录",
    body: "点击“收录并去官网投递”后，系统先记为“已浏览”。从官网返回后，按实际情况改成已投递或不投了，避免把浏览当成投递。",
    href: "/my",
    action: "查看投递",
  },
  {
    title: "配简历",
    body: "保留一份通用简历。遇到重点岗位时复制一份，填写目标岗位并绑定该岗位，之后可以在投递页看到是否已关联简历。",
    href: "/resume",
    action: "管理简历",
  },
  {
    title: "记节点",
    body: "收到笔试、面试或 Offer 时，打开该岗位的进度面板更新阶段。把日期、联系人、题目和待办记在备注里，方便下次打开时继续处理。",
    href: "/my",
    action: "更新进度",
  },
  {
    title: "做复盘",
    body: "结束后把结果改为 Offer、已结束或不投了。需要复盘时，可以在拾星指南查看官方整理的求职经验和准备方法。",
    href: "/forum",
    action: "查看拾星指南",
  },
];

export function JobSearchGuide() {
  return (
    <div className="observatory-page">
      <section className="page-hero">
        <div>
          <h1 className="page-title">秋招流程</h1>
        </div>
      </section>

      <div className="border-y border-[color:var(--line-ghost)]">
        {STEPS.map((step) => (
          <details key={step.title} className="group border-b border-[color:var(--line-ghost)] last:border-b-0">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-semibold text-ink-primary marker:hidden">
              {step.title}
              <span className="text-xl font-normal text-ink-muted transition group-open:rotate-45" aria-hidden="true">+</span>
            </summary>
            <div className="grid gap-4 pb-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <p className="max-w-2xl text-sm leading-7 text-ink-secondary">{step.body}</p>
              <Link href={step.href} className="text-action h-10 px-0 text-sm">
                {step.action}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
