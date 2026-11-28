"use client";

import Link from "next/link";
import { ArrowRight, Check, ChevronDown, ChevronRight, FileText, LoaderCircle, MessageSquareText, Search, Sparkles, X, Zap } from "lucide-react";
import { useState } from "react";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { VipFeatureStories } from "./VipFeatureStories";
import { VipAnimationFigure } from "./VipAnimationFigure";
import { VipBenefitDemos } from "@/components/vip/VipBenefitDemos";
import { VipMark } from "@/components/vip/VipMark";
import { StarJobWordmark } from "@/components/brand/StarJobWordmark";
import { refreshVipStatus, useVipStatus } from "@/components/vip/useVipStatus";
import { BASIC_POLISH_HOURLY_LIMIT, BASIC_POLISH_WEEKLY_LIMIT, VIP_BASIC_POLISH_HOURLY_LIMIT, VIP_BASIC_POLISH_WEEKLY_LIMIT, VIP_ADVANCED_MODEL, VIP_ADVANCED_HOURLY_LIMIT, VIP_ADVANCED_WEEKLY_LIMIT, VIP_COMPOSE_DAILY_LIMIT, VIP_COMPOSE_WEEKLY_LIMIT, VIP_FLASH_LABEL, VIP_PRICE } from "@/lib/starjob-vip";

export function VipPage({ basicModelId }: { basicModelId: string }) {
  const { status, error: statusError } = useVipStatus();
  return <VipMembershipPage key={status?.account?.id ?? "guest"} basicModelId={basicModelId} status={status} statusError={statusError} />;
}

function VipMembershipPage({ basicModelId, status, statusError }: {
  basicModelId: string; status: ReturnType<typeof useVipStatus>["status"]; statusError: boolean;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const basicModelName = ["deepseek-flash", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"].includes(basicModelId)
    ? "DeepSeek V4.1 Flash" : basicModelId;
  const memberEmail = status?.active || welcome ? status?.account?.email : null;
  function closeWelcome() {
    setWelcome(false);
    requestAnimationFrame(() => document.getElementById("vip-benefits-link")?.focus({ preventScroll: true }));
  }
  async function purchase() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/vip", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "activate" }),
      });
      const body = await response.json();
      if (!response.ok || body.active !== true) throw new Error(body.error || "开通未完成，请重试。");
      setWelcome(true);
      refreshVipStatus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "连接中断，请重试。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vip-page">
      {welcome && <MotionDialog labelledBy="welcome-vip-title" describedBy="welcome-vip-copy" className="vip-welcome" onBackdropClick={closeWelcome} onEscapeKeyDown={closeWelcome}>
        <button type="button" className="vip-welcome-close" aria-label="关闭欢迎页" onClick={closeWelcome}><X size={20} /></button>
        <header className="vip-welcome-heading">
          <h2 id="welcome-vip-title">欢迎加入 <span>StarJob VIP</span></h2>
          <p id="welcome-vip-copy">限免会员已开通。现在你可以从这三件事开始。</p>
        </header>
        <MembershipPass email={memberEmail} />
        <nav aria-label="开始使用会员权益">
          <Link href="/explore#job-assistant"><Search /><span><strong>找一个想投的岗位</strong><small>了解公司业务，按城市和岗位方向找机会。</small></span><ChevronRight /></Link>
          <Link href="/resume/materials"><FileText /><span><strong>把手头的材料写成简历</strong><small>上传周报、项目文档或 SQL，生成可编辑的初稿。</small></span><ChevronRight /></Link>
          <Link href="/my#application-assistant"><MessageSquareText /><span><strong>看看哪些投递该跟进了</strong><small>向投递助手提问，整理记录、更新面试进度。</small></span><ChevronRight /></Link>
        </nav>
        <p className="vip-welcome-note">本次开通 ¥0，无自动续费。高级模型随正式付费版发布，限免会员届时可享折扣升级。</p>
      </MotionDialog>}
      <div className="vip-hero-field">
      <section className="vip-hero vip-boundary" aria-labelledby="vip-title">
        <div className="vip-hero-copy">
          <h1 id="vip-title" lang="en">
            <em className="vip-introducing">Introducing</em>{" "}
            <span className="vip-product-name">StarJob <span>VIP</span></span>
          </h1>
          <p className="vip-detail">
            <mark>跃进全面AI赋能</mark>
            <span>全面使用AI寻找岗位、制造简历与整理投递记录</span>
          </p>
          <div className="vip-hero-actions">
            {status?.active ? (
              <Link id="vip-benefits-link" href="#vip-benefits" className="vip-button"><Check size={17} /> 使用会员权益 <ArrowRight size={18} /></Link>
            ) : status?.checkoutAvailable && !status.signedIn ? (
              <Link className="vip-button" href="/login?next=%2Fvip">限时免费开通 <ArrowRight size={18} /></Link>
            ) : (
              <button className="vip-button" type="button" disabled={!status?.checkoutAvailable || busy} onClick={() => void purchase()}>
                {busy ? <><LoaderCircle className="motion-safe:animate-spin" size={17} /> 正在处理</> : <>{status?.checkoutAvailable ? "限时免费开通" : "开通暂未开放"} <ArrowRight size={18} /></>}
              </button>
            )}
            <div className="vip-price"><del aria-label={`划线价 ${VIP_PRICE} 元`}>¥{VIP_PRICE}</del><span>{status?.plan === "free_launch" ? "限免会员已开通" : "限时免费开通"}</span></div>
          </div>
          <p className="vip-preview-note">本次开通 ¥0，无自动续费。高级模型随正式付费版发布，限免会员届时可折扣升级。  <a href="#vip-terms">服务说明</a></p>
          {statusError || error ? <p className="vip-hero-error" role="alert">{error || "暂时无法获取 VIP 状态，请刷新页面重试。"}</p> : null}
        </div>
        <MembershipPass email={memberEmail} />
      </section>
      </div>

      <div className="vip-body vip-boundary">
      <nav className="vip-index" aria-label="本页目录">
        <a href="#vip-benefits">权益内容 <ChevronDown size={14} /></a>
        <a href="#vip-materials">材料如何成稿 <ChevronDown size={14} /></a>
        <a href="#vip-workflow">更多功能 <ChevronDown size={14} /></a>
        <a href="#vip-faq">开通与升级 <ChevronDown size={14} /></a>
      </nav>
      <section className="vip-benefits" id="vip-benefits" aria-labelledby="vip-benefits-title">
        <div className="vip-section-heading"><h2 id="vip-benefits-title">权益内容</h2><span><del>¥{VIP_PRICE}</del> <small>限时免费开通</small></span></div>
        <VipBenefitDemos />
        <ul>
          <li><Search /><div><h3>问公司，也能找岗位</h3><p>问“中金公司怎么样？”，直接看公司业务和招聘方向。也可以问“有哪些世界五百强科技公司的产品岗？”，对照榜单、公司简介和招聘公告，再追问感兴趣的那一家。</p><Link href="/explore#job-assistant" className="vip-text-link">去找岗位 <ArrowRight size={15} /></Link></div><strong>AI 岗位问答</strong></li>
          <li><FileText /><div><h3>把手头的材料写成简历</h3><p>把周报、项目文档和 SQL 一起交给{VIP_FLASH_LABEL}，按教育、实习、项目等模块整理成初稿。缺少的学校、专业和照片可在编辑器补充。</p><Link href="/resume/materials" className="vip-text-link">从材料开始 <ArrowRight size={15} /></Link></div><strong>每天 {VIP_COMPOSE_DAILY_LIMIT} 次 · 每周 {VIP_COMPOSE_WEEKLY_LIMIT} 次</strong></li>
          <li><Zap /><div><h3>按目标岗位润色一段经历</h3><p>在简历编辑器选中一段，交给基础模型精简或改写。普通用户每小时 {BASIC_POLISH_HOURLY_LIMIT} 次、每周 {BASIC_POLISH_WEEKLY_LIMIT} 次。</p><Link href="/resume" className="vip-text-link">去简历制作 <ArrowRight size={15} /></Link></div><strong>每小时 {VIP_BASIC_POLISH_HOURLY_LIMIT} 次 · 每周 {VIP_BASIC_POLISH_WEEKLY_LIMIT} 次</strong></li>
          <li><MessageSquareText /><div><h3>跟进已经投出的岗位</h3><p>说“帮我记录路易威登管培生的一面”，核对后即可新增外部投递。也可以问哪些投递该跟进，更新面试阶段、追加备注或删除记录。</p><Link href="/my#application-assistant" className="vip-text-link">打开投递助手 <ArrowRight size={15} /></Link></div><strong>AI 投递助手</strong></li>
        </ul>
        <div className="vip-upgrade"><Sparkles size={20} aria-hidden="true" /><div><h3>高级模型 <small>（将与正式付费版一起发布）</small></h3><p>正式付费版可在材料工作台继续修改整份简历，也可在编辑器高级润色单段。两处共用每小时 {VIP_ADVANCED_HOURLY_LIMIT} 次、每周 {VIP_ADVANCED_WEEKLY_LIMIT} 次的额度。限免会员需另行升级，届时享折扣优惠。</p><a className="vip-text-link" href="#vip-models">查看高级模型预告 <ArrowRight size={15} /></a></div></div>
      </section>
      <section className="vip-feature vip-materials-feature" id="vip-materials" aria-labelledby="materials-heading">
        <div className="vip-feature-copy">
          <h2 id="materials-heading">从一叠材料，<br />到一份简历。</h2>
          <p>直接粘贴笔记，或上传 PDF、DOCX、TXT 和 SQL 文件。AI 会把材料中的时间、职责和成果放进对应的简历模块。</p>
          <ul className="vip-ticks">
            <li><Check /> 从已有简历带入姓名、联系方式和照片</li>
            <li><Check /> 对照 A4 预览，检查教育、实习与项目经历</li>
            <li><Check /> 自动存入「简历制作」，可继续编辑或下载 PDF</li>
          </ul>
          <Link href="#vip-example" className="vip-text-link">看看三份文件如何写成项目经历 <ArrowRight size={16} /></Link>
        </div>
        <VipMaterialsAnimation />
      </section>
      <MaterialExample />
      <VipFeatureStories />
      <section className="vip-faq" id="vip-faq" aria-labelledby="vip-faq-title">
        <h2 id="vip-faq-title">开通前，你可能想问</h2>
        <div>
          <details open><summary>现在开通 VIP，可以用哪些功能？ <ChevronDown size={18} /></summary><p>你可以用 AI 了解公司、找岗位，把手头的材料整理成简历，再用基础模型润色。投出简历后，还可以让投递助手记录进度，看看哪些岗位该跟进。</p></details>
          <details><summary>限时免费开通怎么收费？会续费吗？ <ChevronDown size={18} /></summary><p>活动期间，登录并点击「限时免费开通」即可领取当前账号的会员权益。实付 ¥0，不会自动续费。</p></details>
          <details><summary>正式付费版上线后，怎么升级？ <ChevronDown size={18} /></summary><p>你可以自行决定是否升级。使用高级模型需要升级到正式付费版，限免会员届时可享升级折扣。价格和开通方式将在发布时公布。</p></details>
          <details><summary>之后可能会有哪些新功能？ <ChevronDown size={18} /></summary><p>我们正在考虑简历投递托管，让你能按自己的求职意向，委托助手处理投递。目前还在规划中，开放时间和使用方式尚未确定。</p></details>
        </div>
      </section>
      <section id="vip-terms" className="vip-terms" aria-labelledby="vip-terms-heading">
        <h2 id="vip-terms-heading">会员服务说明</h2>
        <dl>
          <div><dt>开通与升级</dt><dd>限免期间开通为 ¥0，无自动续费。高级模型属于正式付费版权益，限免会员可在正式版发布后选择折扣升级。</dd></div>
          <div><dt>模型说明</dt><dd>基础模型目前为 {basicModelName}。高级模型首期计划使用 {VIP_ADVANCED_MODEL.name}，Claude 和 Gemini 仍在评估中。型号可能随版本更新，以本页公布的信息为准。</dd></div>
          <div><dt>材料与隐私</dt><dd>生成简历时，你提交的材料文字会发送给 AI 模型服务处理。请使用有权分享的材料，并先隐去客户姓名、联系方式等敏感信息。</dd></div>
          <div><dt>使用 AI 建议</dt><dd>投递前，请核对简历中的日期、职责和成果。AI 提供的公司介绍与岗位推荐仅供参考，招聘要求和截止时间请以招聘方公告为准。</dd></div>
          <div><dt>使用帮助</dt><dd>各项使用次数可在<a href="#vip-benefits">权益内容</a>中查看。遇到开通或额度问题，可通过<Link href="/feedback">帮助与反馈</Link>联系我们。</dd></div>
        </dl>
      </section>
      </div>
    </div>
  );
}

function MembershipPass({ email }: { email?: string | null }) {
  return (
    <div className="vip-pass-stage" role="img" aria-label={email ? "StarJob VIP 会员卡，" + email : "StarJob VIP 会员卡"}>
      <div className="vip-pass">
        <svg className="vip-pass-etch" viewBox="0 0 520 320" preserveAspectRatio="xMidYMid slice">
          {Array.from({ length: 24 }, (_, i) => <ellipse key={i} cx="433" cy="53" rx={78 + i * 8} ry={47 + i * 4.7} transform="rotate(-33 433 53)" />)}
          <path d="M-20 242Q205 153 558 207M141 340 486 -30" strokeDasharray="3 6" />
        </svg>
        <div className="vip-pass-top"><StarJobWordmark /><span>MEMBER PASS</span></div>
        <VipMark large />
        <div className="vip-pass-type">VIP</div>
        <div className="vip-pass-foot"><span className={email ? "vip-pass-email" : undefined} title={email ?? undefined}>{email || "拾星会员"}</span><span>STARJOB MEMBERSHIP</span></div>
      </div>
    </div>
  );
}

const examples = [
  { file: "会议纪要.docx", heading: "产品周会 · 10 月 12 日", excerpt: "陈玥已与产品、数据同事核对首次使用的定义，并把双方确认的统计口径写入指标字典。", result: "与产品、数据团队核对首次使用的统计口径，整理功能指标字典。" },
  { file: "看板结构.docx", heading: "功能看板 · 结构说明", excerpt: "整理人：陈玥。看板分为触达、首次使用、重复使用三个模块，每个模块都支持按渠道查看。", result: "梳理覆盖触达、首次使用与重复使用的看板结构，支持按渠道查看各环节数据。" },
  { file: "XX功能LT7.sql", heading: "首周活跃天数 · 查询节选", excerpt: "-- 作者：陈玥｜按渠道计算首周平均活跃天数\nSELECT channel, AVG(active_days_7d) AS lt7\nFROM feature_user_first_week\nGROUP BY channel", result: "编写 SQL，按渠道计算功能用户首周平均活跃天数，为比较不同渠道的使用情况提供指标。" },
] as const;

function MaterialExample() {
  const [selected, setSelected] = useState(0);
  const example = examples[selected];
  return (
    <section className="vip-example" id="vip-example" aria-labelledby="example-heading">
      <div className="vip-example-header"><div><h2 id="example-heading">杂乱的文件也能成为有条理的经历</h2><p>点开一份示例材料，看看它在右侧简历里对应哪一句。</p></div></div>
      <div className="vip-example-pages">
        <div className="vip-note">
          <div className="vip-example-switch" role="group" aria-label="选择示例文件">
            {examples.map((item, i) => <button key={item.file} type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}><FileText size={13} />{item.file}</button>)}
          </div>
          <div className="vip-excerpt" aria-live="polite"><strong>{example.heading}</strong>
            {selected === 2 ? <pre>{example.excerpt}</pre> : <p>{example.excerpt}</p>}
          </div>
        </div>
        <div className="vip-result"><span><Sparkles size={14} /> 简历成稿示例</span><h3>项目经历 · 产品功能使用分析</h3>
          <ul>{examples.map((item, i) => <li key={item.file} data-selected={i === selected}>{item.result}</li>)}</ul>
        </div>
        <div className="vip-example-arrow" aria-hidden="true"><ChevronRight size={19} /></div>
      </div>
    </section>
  );
}

function VipMaterialsAnimation() {
  return (
    <VipAnimationFigure className="vip-artwork" title="材料整理动画">
      <svg viewBox="0 0 620 485" role="img" aria-label="插画演示，三份零散材料整理成一页 A4 简历">
        <defs>
          <pattern id="vip-print-dot" x="0" y="0" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r=".6" fill="#244a7c" opacity=".14" />
          </pattern>
          <filter id="vip-paper-shadow" x="-40%" y="-30%" width="185%" height="180%">
            <feDropShadow dx="0" dy="9" stdDeviation="10" floodColor="#12294e" floodOpacity=".18" />
          </filter>
          <linearGradient id="vip-print-paper" x1="0" x2="1" y1="0" y2="1">
            <stop stopColor="#ffffff" /><stop offset="1" stopColor="#eff3fa" />
          </linearGradient>
        </defs>

        <rect width="620" height="485" fill="#dce5ef" />
        <rect width="620" height="485" fill="url(#vip-print-dot)" />
        <path d="M-12 332c128 39 213-9 265-126C311 76 407 62 637 109" fill="none" stroke="#e9eff7" strokeWidth="73" opacity=".6" />
        <path d="M26 383c102 35 189 4 250-85 49-71 86-86 152-76" fill="none" stroke="#516f92" strokeWidth="1.3" strokeDasharray="2 8" strokeLinecap="round" opacity=".43" />

        <g transform="translate(59 98) rotate(-10)" filter="url(#vip-paper-shadow)">
          <g className="vip-svg-note vip-svg-note--one">
            <rect width="167" height="88" rx="5" fill="#f9fbff" />
            <path d="M14 22h10v13H14zM17 26h4m-4 4h4" fill="none" stroke="#48658a" strokeWidth="1.3" strokeLinecap="round" />
            <text x="32" y="33" className="vip-art-label">会议纪要.docx</text>
            <text x="15" y="56" className="vip-art-caption">与产品、数据团队确认口径</text>
            <path d="M15 70h95" stroke="#a2afc1" strokeWidth="1.7" strokeDasharray="3 3" />
          </g>
        </g>
        <g transform="translate(103 207) rotate(6)" filter="url(#vip-paper-shadow)">
          <g className="vip-svg-note vip-svg-note--two">
            <rect width="171" height="75" rx="4" fill="#ffdfa0" />
            <text x="16" y="27" className="vip-art-label">看板结构.docx</text>
            <text x="16" y="48" className="vip-art-caption">按渠道查看三个使用环节</text>
            <path d="M16 59q46 4 101 0" fill="none" stroke="#9a7436" strokeWidth="1.4" />
          </g>
        </g>
        <g transform="translate(47 312) rotate(-4)" filter="url(#vip-paper-shadow)">
          <g className="vip-svg-note vip-svg-note--three">
            <rect width="157" height="74" rx="5" fill="#c6d9eb" />
            <text x="15" y="28" className="vip-art-label">XX功能LT7.sql</text>
            <path d="M15 43h117m-117 9h82m-82 9h103" stroke="#8399b0" strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>

        <g stroke="#47678e" fill="none" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
          <path className="vip-svg-route" pathLength="1" d="M243 155q31 8 52 38l22 29" />
          <path className="vip-svg-route vip-svg-route--second" pathLength="1" d="M274 240q26 0 52-15" />
          <path className="vip-svg-route vip-svg-route--third" pathLength="1" d="M223 340q64-12 102-90" />
          <path className="vip-svg-arrow" d="m316 214 13 10-13 9" />
        </g>
        <g className="vip-svg-flow" fill="#fff8dc">
          <circle r="4" className="vip-particle-one" />
          <circle r="3.5" className="vip-particle-two" />
          <circle r="4" className="vip-particle-three" />
        </g>
        <g transform="translate(334 65) rotate(7)" filter="url(#vip-paper-shadow)">
          <g className="vip-svg-resume">
            <rect width="233" height="329" rx="7" fill="url(#vip-print-paper)" />
            <path d="M17 22h199M17 300h199" stroke="#c8d4e2" strokeWidth="1" />
            <text x="18" y="57" className="vip-art-resume-title">陈玥</text>
            <text x="19" y="76" className="vip-art-caption">数据分析实习生</text>
            <g className="vip-svg-ink vip-svg-ink--one">
              <text x="19" y="106" className="vip-art-section">指标口径</text>
              <path d="M19 115h194" stroke="#a1b2c7" strokeWidth="1" />
              <text x="19" y="134" className="vip-art-caption">与产品、数据团队核对首次使用定义</text>
              <path d="M19 148h122" stroke="#91a2b7" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g className="vip-svg-ink vip-svg-ink--two">
              <text x="19" y="176" className="vip-art-section">看板结构</text>
              <path d="M19 185h194" stroke="#a1b2c7" strokeWidth="1" />
              <text x="19" y="204" className="vip-art-caption">按渠道呈现触达、首次与重复使用</text>
              <path d="M19 218h153m-153 8h136" stroke="#91a2b7" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g className="vip-svg-ink vip-svg-ink--three">
              <text x="19" y="254" className="vip-art-section">SQL 分析</text>
              <path d="M19 263h194" stroke="#a1b2c7" strokeWidth="1" />
              <text x="19" y="282" className="vip-art-caption">按渠道计算首周平均活跃天数</text>
            </g>
            <text x="18" y="318" className="vip-art-caption">StarJob · 简历草稿</text>
            <g transform="translate(189 31)" fill="#b18b47">
              <path d="M10 0q1 9 10 10-9 1-10 10Q9 11 0 10 9 9 10 0Z" />
            </g>
          </g>
        </g>
        <g className="vip-svg-asterisk" fill="#fffdf1">
          <path d="M302 77q2 12 14 14-12 2-14 14-2-12-14-14 12-2 14-14Z" />
          <path d="M577 354q1.7 10 11 11-9 1.7-11 11-1.7-9-11-11 9-1 11-11Z" />
        </g>
      </svg>
    </VipAnimationFigure>
  );
}
