"use client";

import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

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
    body: "结束后把结果改为 Offer、未通过或不投了。需要复盘时，可以在拾星指南查看官方整理的求职经验和准备方法。",
    href: "/forum",
    action: "查看拾星指南",
  },
];

export function JobSearchGuide() {
  const [current, setCurrent] = useState(0);
  const reducedMotion = useReducedMotion();
  const id = useId();
  const step = STEPS[current];
  return (
    <div className="observatory-page alive-guide">
      <section className="page-hero">
        <div>
          <h1 className="page-title">秋招流程</h1>
          <p className="page-subtitle mt-3">从筛选岗位到复盘，找到你现在要做的那一步。</p>
        </div>
      </section>

      <div className="alive-guide__layout">
        <div className="alive-guide__steps" role="group" aria-label="选择求职阶段">
          {STEPS.map((item, index) => <button key={item.title} type="button" aria-pressed={current === index} aria-controls={`${id}-content`} onClick={() => setCurrent(index)} className="alive-guide__step">
            {current === index ? <motion.span aria-hidden="true" className="alive-guide__selection" layoutId={`${id}-selection`} transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 320, damping: 30 }} /> : null}
            <span className="alive-guide__number">{String(index + 1).padStart(2, "0")}</span><span>{item.title}</span><ArrowRight size={16} aria-hidden="true" />
          </button>)}
        </div>
        <section id={`${id}-content`} className="alive-guide__content" aria-label="阶段说明" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={current} initial={reducedMotion ? false : { opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: reducedMotion ? 0 : .18 }}>
              <p className="alive-guide__progress">第 {current + 1} 步 / 共 {STEPS.length} 步</p>
              <h2>{step.title}</h2>
              <p className="alive-guide__body">{step.body}</p>
              <Link href={step.href} className="gold-button alive-guide__action">{step.action}<span className="alive-action-icon"><ArrowRight size={16} aria-hidden="true" /></span></Link>
            </motion.div>
          </AnimatePresence>
          <div className="alive-guide__controls"><button type="button" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)} aria-label="上一步"><ArrowLeft size={17} /></button><button type="button" disabled={current === STEPS.length - 1} onClick={() => setCurrent((value) => value + 1)} aria-label="下一步"><ArrowRight size={17} /></button></div>
        </section>
      </div>
    </div>
  );
}
