"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, MessageSquareText, Search } from "lucide-react";
import { VipAnimationFigure } from "./VipAnimationFigure";
import { VIP_ADVANCED_HOURLY_LIMIT, VIP_ADVANCED_WEEKLY_LIMIT } from "@/lib/starjob-vip";

const scenarios = [
  { name: "了解公司", icon: Search, question: "中金公司主要做什么？", heading: "中国国际金融股份有限公司",
    answer: "中金公司为企业提供上市融资和并购顾问服务，也为机构与个人投资者提供证券研究、资产管理和财富管理服务。",
    detail: "可继续追问这家公司的招聘方向，或打开收录的招聘公告。", link: "去问一家公司", href: "/explore#job-assistant" },
  { name: "润色经历", icon: FileText, question: "帮我精简这段实习经历，保留我做过的事。", heading: "实习经历",
    before: "每周都会把来自三个渠道的反馈整理到一起，遇到重复的问题就合并，再发给产品同事。",
    answer: "每周汇总三个渠道的用户反馈，合并重复问题，供产品团队评审。", link: "去润色一段经历", href: "/resume" },
  { name: "跟进投递", icon: MessageSquareText, question: "路易威登管培生约了一面，帮我更新进度。", heading: "路易威登 · 管培生",
    answer: "已投递 → 一面", detail: "投递助手先列出匹配的记录与拟修改的阶段，确认后保存到投递管理。", link: "去整理投递", href: "/my#application-assistant" },
] as const;

export function VipFeatureStories() {
  const [selected, setSelected] = useState(0);
  const scenario = scenarios[selected];
  return <>
    <section id="vip-workflow" className="vip-feature vip-story" aria-labelledby="vip-workflow-title">
      <div className="vip-feature-copy">
        <h2 id="vip-workflow-title">从了解公司，<br />到跟进一面。</h2>
        <p>投之前，问问公司具体做什么，把简历里的经历写清楚。收到面试通知后，说一句话就能整理投递进度。</p>
        <div className="vip-story-options" role="group" aria-label="选择功能示例">
          {scenarios.map(({ name, icon: Icon }, i) => <button key={name} type="button" aria-pressed={selected === i}
            aria-controls="vip-story-answer" onClick={() => setSelected(i)}><Icon size={15} />{name}</button>)}
        </div>
        <Link className="vip-text-link" href={scenario.href}>{scenario.link} <ArrowRight size={16} /></Link>
      </div>
      <div className="vip-story-sheet" id="vip-story-answer" aria-live="polite" aria-atomic="true">
        <div className="vip-story-sheet-top"><span>{scenario.name}示例</span><MessageSquareText size={17} aria-hidden="true" /></div>
        <p className="vip-story-question">{scenario.question}</p>
        <div className="vip-story-answer"><h3>{scenario.heading}</h3>
          {"before" in scenario && <p className="vip-story-before"><span>原句</span>{scenario.before}</p>}
          <p>{scenario.answer}</p>
          {"detail" in scenario && <small>{scenario.detail}</small>}
        </div>
      </div>
    </section>

    <section id="vip-models" className="vip-feature vip-models" aria-labelledby="vip-models-title">
      <div className="vip-feature-copy">
        <span className="vip-models-status">即将上线 · 正式付费版</span>
        <h2 id="vip-models-title">高级模型访问</h2>
        <ul className="vip-ticks">
          <li><Check /> 整份继续修改与高级润色共用每小时 {VIP_ADVANCED_HOURLY_LIMIT} 次、每周 {VIP_ADVANCED_WEEKLY_LIMIT} 次的额度</li>
          <li><Check /> 限免会员届时可享折扣，升级后使用高级模型</li>
        </ul>
      </div>
      <VipAnimationFigure title="高级模型预告" className="vip-artwork vip-model-art">
        <svg viewBox="0 0 510 304" role="img" aria-label="高级模型访问预告，展示 ChatGPT、Claude 和 Gemini 品牌。">
          <defs><linearGradient id="vip-model-field" x2="1" y2="1"><stop stopColor="#e6eaf2" /><stop offset=".53" stopColor="#f4f3ef" /><stop offset="1" stopColor="#f2e6d3" /></linearGradient></defs>
          <rect width="510" height="304" rx="15" fill="url(#vip-model-field)" />
          <g fill="none" stroke="#c3c8cc" opacity=".7"><ellipse cx="263" cy="205" rx="207" ry="66" /><ellipse cx="263" cy="205" rx="235" ry="82" strokeDasharray="2 6" /></g>
          <g fill="none" stroke="#ab894f" strokeWidth="2">
            <path className="vip-svg-route" pathLength="1" d="M92 115c0 50 111 22 163 84" />
            <path className="vip-svg-route vip-svg-route--second" pathLength="1" d="M255 101v98" />
            <path className="vip-svg-route vip-svg-route--third" pathLength="1" d="M418 115c0 50-111 22-163 84" />
          </g>
          <g fill="#fff" stroke="#c7cdd3">
            <rect x="18" y="52" width="148" height="65" rx="12" /><rect x="181" y="38" width="148" height="65" rx="12" /><rect x="344" y="52" width="148" height="65" rx="12" />
          </g>
          <image href="/brand/models/chatgpt-lockup.svg" x="34" y="69" width="116" height="31" />
          <image href="/brand/models/claude-lockup.svg" x="198" y="55" width="114" height="31" />
          <image href="/brand/models/gemini-lockup.svg" x="361" y="69" width="114" height="31" />
          <g transform="translate(168 191)">
            <rect x="3" y="5" width="175" height="57" rx="10" fill="#8e97a5" opacity=".18" />
            <rect width="175" height="57" rx="10" fill="#20374e" />
            <path d="M23 17h11l6 6v16H23zM34 17v7h6m-13 5h9m-9 5h7" fill="none" stroke="#e9cf9e" strokeWidth="1.5" />
            <text x="53" y="36" fill="#fff" fontSize="17">简历深度修改</text>
          </g>
        </svg>
      </VipAnimationFigure>
    </section>
  </>;
}
