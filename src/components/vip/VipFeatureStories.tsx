"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, FileText, MessageSquareText, Search } from "lucide-react";
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
        <p>整份简历的继续修改与高级润色共用额度。</p>
        <dl className="vip-model-quota">
          <div><dt>每小时</dt><dd>{VIP_ADVANCED_HOURLY_LIMIT}<small>次</small></dd></div>
          <div><dt>每周</dt><dd>{VIP_ADVANCED_WEEKLY_LIMIT}<small>次</small></dd></div>
        </dl>
        <p className="vip-model-upgrade">限免会员可在正式版发布后折扣升级。</p>
      </div>
      <VipAnimationFigure title="高级模型预告" className="vip-artwork vip-model-art">
        <svg viewBox="0 0 510 304" role="img" aria-label="ChatGPT、Claude 和 Gemini 模型预告。示例简历用金色笔迹标出正在润色的项目经历。">
          <defs>
            <linearGradient id="vip-model-paper" x2="0.9" y2="1">
              <stop stopColor="#ffffff" /><stop offset="1" stopColor="#f5f4f0" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="#bd9b66" strokeWidth="1.25">
            <path className="vip-svg-route" pathLength="1" d="M89 54v13c0 25 111 11 132 52" />
            <path className="vip-svg-route vip-svg-route--second" pathLength="1" d="M255 54v59" />
            <path className="vip-svg-route vip-svg-route--third" pathLength="1" d="M421 54v13c0 25-111 11-132 52" />
          </g>
          <rect x="8" y="9" width="494" height="51" rx="7" fill="#fafbfd" stroke="#cbd5df" />
          <path d="M172 22v25m166-25v25" stroke="#d7dfe7" />
          <image href="/brand/models/chatgpt-lockup.svg" x="32" y="21" width="116" height="27" />
          <image href="/brand/models/claude-lockup.svg" x="198" y="21" width="114" height="27" />
          <image href="/brand/models/gemini-lockup.svg" x="362" y="21" width="116" height="27" />
          <g transform="rotate(-3 255 196)">
            <rect x="100" y="114" width="309" height="167" rx="3" fill="#40556d" opacity=".16" />
            <rect x="97" y="108" width="309" height="167" rx="3" fill="#29415a" transform="rotate(7 255 196)" />
            <rect x="99" y="108" width="309" height="167" rx="3" fill="#b9c7d6" transform="rotate(3 255 196)" />
            <rect x="99" y="108" width="309" height="167" rx="3" fill="url(#vip-model-paper)" stroke="#c6d0db" />
            <path d="M121 130h20m-20 45h264" stroke="#a58a58" />
            <text x="121" y="161" fill="#203249" fontSize="21" fontWeight="600">项目经历</text>
            <g className="vip-svg-ink" fill="#374758" fontSize="16">
              <text x="121" y="206">整理用户访谈记录，归纳高频问题，</text>
              <text x="121" y="233">为下一轮产品迭代提供依据。</text>
            </g>
            <path className="vip-svg-route vip-svg-route--third" pathLength="1" d="M123 239q83-4 165-1m57-12 6 5 12-15" fill="none" stroke="#ae843f" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </svg>
      </VipAnimationFigure>
    </section>
  </>;
}
