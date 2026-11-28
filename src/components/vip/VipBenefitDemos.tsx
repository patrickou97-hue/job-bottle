"use client";

import { VipAnimationFigure } from "./VipAnimationFigure";
import { useId, type ReactNode } from "react";

function JobSearchScene() {
  return <>
    <rect width="360" height="214" fill="#e5edf4" />
    <g fill="none" stroke="#c8d8e4" strokeWidth=".9" aria-hidden="true">
      <circle cx="43" cy="190" r="45" /><circle cx="43" cy="190" r="68" /><circle cx="43" cy="190" r="92" />
      <path d="m8 205 95-117m-70 125 59-133" strokeDasharray="2 5" />
    </g>
    <g className="vip-demo-first">
      <rect x="19" y="19" width="257" height="42" rx="21" fill="#233e5a" />
      <g fill="none" stroke="#f7e1ad" strokeWidth="1.8"><circle cx="42" cy="38" r="6" /><path d="m47 43 5 5" /></g>
      <text x="63" y="46" fill="white" fontSize="16">想找一些外企产品经理岗</text>
    </g>
    <g fill="none" stroke="#6b8499" strokeWidth="1.6" strokeLinecap="round">
      <path className="vip-demo-line" pathLength="1" d="M43 62v79q0 18 19 18h60" />
      <path className="vip-demo-line" pathLength="1" d="M43 78q0 21 20 21h32" />
    </g>
    <g className="vip-demo-middle">
      <rect x="89" y="76" width="228" height="46" rx="6" fill="#fbfdff" stroke="#b9cbd9" />
      <circle cx="90" cy="99" r="3.5" fill="#b48c48" />
      <text x="104" y="105" className="vip-demo-em">爱立信</text><text x="181" y="104" className="vip-demo-meta">公告方向 · 产品类</text>
    </g>
    <g className="vip-demo-last">
      <rect x="115" y="136" width="227" height="46" rx="6" fill="#fbfdff" stroke="#b9cbd9" />
      <circle cx="116" cy="159" r="3.5" fill="#b48c48" />
      <text x="129" y="165" className="vip-demo-em">滨松中国</text><text x="208" y="164" className="vip-demo-meta">公告方向 · 产品类</text>
    </g>
  </>;
}

function PolishScene() {
  return <>
    <rect width="360" height="214" fill="#eee9df" />
    <g transform="rotate(-2 158 87)" className="vip-demo-paper">
      <rect x="21" y="20" width="270" height="112" rx="3" fill="#fbf9f3" stroke="#d1c8b7" />
      <text x="38" y="42" className="vip-demo-meta">项目经历 · 原句</text>
      <text x="38" y="68" className="vip-demo-body">我整理了 12 份访谈记录，</text>
      <text x="38" y="89" className="vip-demo-body">把用户常提的问题分了类。</text>
    </g>
    <g className="vip-demo-middle">
      <path d="M62 106h251l16 16v75H62z" fill="#fffefd" stroke="#ccbea4" />
      <path d="M313 106v16h16" fill="#ece4d3" stroke="#ccbea4" />
      <text x="77" y="128" className="vip-demo-meta">精简后</text>
      <path className="vip-demo-highlight" d="M76 155h178" stroke="#edd397" strokeWidth="8" />
      <text x="77" y="156" className="vip-demo-em">归类 12 份用户访谈记录，</text>
      <text x="77" y="180" className="vip-demo-em">梳理高频问题。</text>
    </g>
    <g className="vip-demo-last" fill="none" stroke="#a8803d" strokeWidth="1.7" strokeLinecap="round">
      <path className="vip-demo-line" pathLength="1" d="M34 111q-4 29 18 35m-5-8 7 9-10 2" />
    </g>
  </>;
}

function ApplicationScene() {
  const grid = useId();
  return <>
    <defs><pattern id={grid} width="18" height="18" patternUnits="userSpaceOnUse">
      <path d="M0 18V0h18" fill="none" stroke="#adc5da" strokeOpacity=".12" />
    </pattern></defs>
    <rect width="360" height="214" fill="#243d54" /><rect width="360" height="214" fill={`url(#${grid})`} />
    <g className="vip-demo-first">
      <rect x="21" y="20" width="232" height="36" rx="16" fill="#e1eaf0" />
      <text x="37" y="43" fontSize="15" fill="#203b52">把管培生的进度改成一面</text>
    </g>
    <rect x="35" y="71" width="289" height="125" rx="7" fill="#f8fafb" />
    <text x="52" y="98" className="vip-demo-em">路易威登 · 管培生</text>
    <path d="M52 110h254" stroke="#d8e0e7" />
    <circle cx="65" cy="136" r="4" fill="#627a90" />
    <text x="52" y="163" className="vip-demo-meta">已投递</text>
    <path className="vip-demo-line" pathLength="1" d="M72 136h112" stroke="#b08b4b" strokeWidth="2" fill="none" />
    <g className="vip-demo-middle">
      <circle cx="189" cy="136" r="9" fill="#f0e2c6" /><circle cx="189" cy="136" r="4" fill="#876328" />
      <text x="175" y="163" className="vip-demo-body">一面</text>
    </g>
    <g className="vip-demo-last" fill="#3e6260">
      <path d="m222 181 3 3 6-7" stroke="currentColor" fill="none" strokeWidth="1.7" />
      <text x="236" y="185" fontSize="12">已确认并保存</text>
    </g>
  </>;
}

function Scene({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <VipAnimationFigure className="vip-demo" title={title} caption={title}>
    <svg viewBox="0 0 360 214" role="img" aria-label={description}>{children}</svg>
  </VipAnimationFigure>;
}

export function VipBenefitDemos() {
  return <div id="vip-demos" className="vip-demos" role="group" aria-label="会员功能演示">
    <Scene title="岗位匹配示例" description="询问外企产品经理岗，找到爱立信和滨松中国公告中的产品大类。"><JobSearchScene /></Scene>
    <Scene title="简历润色示例" description="把整理访谈记录的经历精简为两行，保留原有的 12 份访谈和归类工作。"><PolishScene /></Scene>
    <Scene title="投递跟进示例" description="要求把路易威登管培生的投递进度改成一面，核对后保存。"><ApplicationScene /></Scene>
  </div>;
}
