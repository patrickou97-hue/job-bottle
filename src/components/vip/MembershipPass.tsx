import { StarJobWordmark } from "@/components/brand/StarJobWordmark";
import { vipCardName, vipCardNames, type VipCardEdition } from "@/lib/starjob-vip";
import "./membership-pass.css";
import { VipMark } from "./VipMark";

function Engraving({ edition }: { edition: VipCardEdition }) {
  if (edition === "legend") return <>
    <g transform="translate(400 143)" className="vip-rosette">
      {Array.from({length: 60}, (_, n) => <ellipse key={n} rx="118" ry="54" cx="16" transform={`rotate(${n * 6})`} />)}
      <circle r="139" /><circle r="143" strokeDasharray="1 4" /><circle r="147" />
      <g className="vip-seal">
        <path d="M0 -98 69 -69 98 0 69 69 0 98 -69 69 -98 0 -69 -69Z" />
        {Array.from({length: 24}, (_, n) => <path key={n} transform={`rotate(${n*15})`} d="M0 -101V-106" />)}
      </g>
    </g>
    <g className="vip-linework">{Array.from({length: 24}, (_, n) => <path key={n}
      d={`M-24 ${178+n*3.5} C78 ${98+n*3},167 ${263+n*2},283 ${198+n*1.7} S441 ${23+n*2},555 ${53+n*3}`} />)}</g>
    <g className="vip-facets">
      <path d="M36 22H137m11 0h42m9 0h72M34 294h118m11 0h38" />
      <path d="m140 22 4 -3 4 3 -4 3Zm53 0 3 -2 3 2 -3 2ZM154 294l4 -3 4 3 -4 3Z" />
    </g>
  </>;
  if (edition === "jade") return <g>
    {Array.from({length: 19}, (_, n) => <path key={n}
      d={`M-35 ${273+n*2.2} C80 ${238+n*2.7},192 ${317+n*2},323 ${208+n*1.9} S445 ${62+n*1.1},552 ${86+n*2}`} />)}
    <path d="M-24 269 C118 216 204 303 329 189 S450 46 551 74" />
  </g>;
  if (edition === "premium") return <g transform="translate(423 132)">
    {Array.from({length: 66}, (_, n) => <path key={n} transform={`rotate(${n*360/66})`} d="M0 -46 Q9 -115 0 -273 Q-10 -129 0 -46Z" />)}
    <circle r="110"/><circle r="114" strokeDasharray="1 4"/><circle r="118"/>
  </g>;
  return <>
    {Array.from({ length: 24 }, (_, i) => <ellipse key={i} cx="433" cy="53" rx={78 + i * 8} ry={47 + i * 4.7} transform="rotate(-33 433 53)" />)}
    <path d="M-20 242Q205 153 558 207M141 340 486 -30" strokeDasharray="3 6" />
  </>;
}

export function MembershipPass({ email, edition }: { email?: string | null; edition: VipCardEdition | "one" }) {
  const isOne = edition === "one";
  const isFounder = edition === "legend";
  const label = isFounder ? "StarJob Legend 创始人卡，WANG RUI" : isOne ? "StarJob One 普通卡" : vipCardName(edition) + " 会员卡";

  return <div className="vip-pass-stage" role="img" aria-label={label + (email ? "，" + email : "")}>
    <div className="vip-pass-body" data-finish={edition}>
      {[1, 2, 3, 4, 5].map(layer => (
        <span key={layer} aria-hidden="true" className="vip-pass-edge"
          style={{ transform: `translateZ(calc(var(--pass-depth) * ${-layer / 5}))` }} />
      ))}
      <div className="vip-pass" data-edition={edition}>
        {!isOne && (
          <svg aria-hidden="true" className="vip-pass-etch" viewBox="0 0 520 320" preserveAspectRatio="none"><Engraving edition={edition} /></svg>
        )}
        <div className="vip-pass-top">
          <StarJobWordmark />
          {!isOne && <span>{isFounder ? "WANG RUI" : "MEMBER PASS"}</span>}
        </div>
        {!isOne && <VipMark large />}
        <div className="vip-pass-type">
          {isOne ? "One" : vipCardNames[edition]}
          {edition === "legend" && <span className="vip-pass-signature">Exclusive</span>}
        </div>
        <div className="vip-pass-foot">
          <span className={email ? "vip-pass-email" : undefined} title={email ?? undefined}>{email || (isOne ? "StarJob" : "拾星会员")}</span>
          {!isOne && <span>{isFounder ? "STARJOB FOUNDER" : "STARJOB MEMBERSHIP"}</span>}
          {isOne && (
            <svg aria-hidden="true" className="one-relief" viewBox="0 0 160 192">
              <path d="M80 0 Q86 88 160 96 Q86 104 80 192 Q74 104 0 96 Q74 88 80 0Z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  </div>;
}
