"use client";

import Link from "next/link";
import { MessageSquareText, Search } from "lucide-react";
import { AssistantComposer } from "@/components/ui/AssistantComposer";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { buildLocationGroups } from "@/lib/locations";
import { hasJobPreferences, jobMatchesProfilePreferences } from "@/lib/jobs";
import { matchJobRole, type EvidenceItem } from "@/lib/job-role-search";
import { globalRanking, verifiedCompanyProfile, type CompanyProfile } from "@/lib/company-overview";
import type { SearchState } from "@/lib/job-search-assistant";
import type { Job, Profile } from "@/lib/types";

type Props = {
  current: SearchState;
  facets: { roleEvidence: EvidenceItem[]; roleTerms: string[]; locations: string[]; industries: string[]; batchTypes: string[]; categories: string[] };
  profile: Profile | null;
  focusedCompany?: string;
  onApply: (state: SearchState) => { jobs: Job[]; chips: string[] };
};
type Row = { id: string; company: string; title: string; detail: string; evidenceUrl?: string; profile?: CompanyProfile };
type Overview = { name: string; related?: boolean; introduction?: string; profile?: CompanyProfile; facts: { label: string; value: string }[]; count: number };
type Citation = { title: string; url: string };
type AdviceItem = { name: string; reason: string; jobId?: string; sources: Citation[] };
type Turn = { items?: AdviceItem[]; sources?: Citation[]; note?: string; ranked?: boolean; overview?: Overview; message: string; answer: string; rows?: Row[]; question?: string; companies?: string[]; total?: number };

function rowFor(job: Job, state: SearchState, reason: string): Row {
  const shortTitle = (job.job_titles || "查看招聘详情").split(/[\r\n]/)[0];
  const titles = (job.job_titles ?? "").split(/[,，、;；\n]/u).map(title => title.trim()).filter(Boolean);
  const matchedTitle = titles.find(title => state.keyword && title.toLowerCase().includes(state.keyword.toLowerCase()))
    ?? titles.find(title => state.categories.some(category => title.includes(category.replace(/类$/u, ""))));
  return { id: job.id, company: job.company_name, title: matchedTitle || (state.categories.length === 1 && job.job_categories?.includes(state.categories[0]) ? state.categories[0] : shortTitle),
    detail: reason, profile: verifiedCompanyProfile(job.company_name) };
}

export function JobSearchAssistant({ children, ...props }: Props & { children: ReactNode }) {
  const [chat, setChat] = useState(false);
  useEffect(() => {
    function followAnchor() { if (window.location.hash === "#job-assistant") setChat(true); }
    const mount = requestAnimationFrame(followAnchor);
    window.addEventListener("hashchange", followAnchor);
    return () => { cancelAnimationFrame(mount); window.removeEventListener("hashchange", followAnchor); };
  }, []);
  return <section id="job-assistant" className="job-search-modes" aria-label="查找岗位">
    <div className="job-mode-switch" data-chat={chat} role="group" aria-label="岗位搜索方式">
      <button type="button" aria-pressed={!chat} onClick={() => setChat(false)}><Search size={15} />搜索岗位</button>
      <button type="button" aria-pressed={chat} onClick={() => setChat(true)}><MessageSquareText size={15} aria-hidden="true" />智能问答 <span className="job-mode-vip">VIP</span></button>
    </div>
    <SearchConversation {...props} chat={chat}>{children}</SearchConversation>
  </section>;
}

function SearchConversation({ current, facets, profile, focusedCompany, onApply, chat, children }: Props & { chat: boolean; children: ReactNode }) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [vipRequired, setVipRequired] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const pane = conversation.current;
    if (!pane) return;
    const latest = pane.querySelector<HTMLElement>(".job-search-answer:last-child");
    pane.scrollTop = latest ? pane.scrollTop + latest.getBoundingClientRect().top - pane.getBoundingClientRect().top : pane.scrollHeight;
  }, [turns, busy, error]);
  const stateKey = JSON.stringify(current);
  useEffect(() => () => { pending.current?.abort(); }, [stateKey]);
  const hasPreferences = hasJobPreferences(profile);
  const options = useMemo(() => {
    const locations = new Set(["scope:nationwide"]);
    for (const group of buildLocationGroups(facets.locations)) {
      if (group.province !== "其他") locations.add("province:" + group.province);
      for (const city of group.cities) locations.add("city:" + city);
    }
    return { roleEvidence: facets.roleEvidence, roleTerms: facets.roleEvidence.length ? undefined : facets.roleTerms, locations: [...locations], industries: facets.industries, categories: facets.categories, batchTypes: facets.batchTypes, hasPreferences };
  }, [facets, hasPreferences]);

  async function ask(message: string) {
    message = message.trim();
    if (!message || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setVipRequired(false);
    const post = async (body: object) => {
      const response = await fetch("/api/vip/job-search", {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "VIP_REQUIRED" && !controller.signal.aborted) {
          setVipRequired(true);
          setText(message);
        }
        throw Error(data.error || "查询暂时不可用。");
      }
      return data;
    };
    try {
      const last = turns.at(-1);
      const history = turns.slice(-4).map(turn => ({
        question: turn.message, answer: [turn.answer, turn.overview?.name, turn.overview?.introduction,
          ...(turn.items ?? []).map(item => item.name + "：" + item.reason), ...(turn.rows ?? []).map(row => row.company + " · " + row.title)].filter(Boolean).join("\n").slice(0, 1800),
      }));
      const data = await post({ current, options, message, history, focusedCompany, companies: last?.companies,
        clarification: last?.question ? last.message + "\n" + last.question : undefined });
      let turn: Turn;
      if (data.action === "advice") {
        turn = { message, answer: data.answer, items: data.items, sources: data.sources, note: data.note, companies: data.items.map((item: AdviceItem) => item.name) };
      } else if (data.action === "clarify") {
        turn = { message, answer: data.question, question: data.question, companies: data.companies ?? last?.companies };
      } else if (data.action === "company") {
        if (data.overview) {
          turn = { message, answer: "", rows: data.rows, companies: data.relatedCompanies && data.rows.length ? data.rows.map((row: Row) => row.company) : [data.company],
            overview: { name: data.company, related: data.relatedCompanies, introduction: data.introduction, profile: data.profile, facts: data.facts, count: data.count } };
        } else {
          turn = { message, companies: [data.company], rows: data.rows, answer: data.company + "在拾星有 " + data.count + " 条招聘信息。" +
            (data.hasEvidence ? "以下内容摘自该公司的招聘资料。" : "所查招聘资料没有披露你问到的具体信息，可打开岗位详情核对招聘公告。") };
        }
      } else {
        const results = onApply(data.state);
        const ranked = data.state.employerGroup === "global500_tech";
        const recommend = ranked || data.action === "recommend";
        const role = data.state.role as SearchState["role"];
        if (role) {
          const matches = results.jobs.flatMap(job => {
            const evidence = matchJobRole(job, role);
            return evidence ? [{ job, evidence }] : [];
          });
          const rows: Row[] = [];
          const companies = new Set<string>();
          let named = 0, related = 0;
          for (const { job, evidence } of matches) {
            if (evidence.level === "named") named++;
            if (evidence.level === "related") related++;
            if (rows.length >= 3 || companies.has(job.company_name)) continue;
            companies.add(job.company_name);
            const title = evidence.source === "岗位职责" ? "职责与「" + role.name + "」相关" :
              evidence.level === "category" ? evidence.term + " · 大类线索" : evidence.term;
            rows.push({ id: job.id, company: job.company_name, title, evidenceUrl: evidence.url, profile: verifiedCompanyProfile(job.company_name),
              detail: [evidence.source + "写有「" + evidence.term + "」", job.batch_type, job.locations && "公告地点：" + job.locations].filter(Boolean).join(" · ") });
          }
          const category = matches.length - named - related;
          const conditions = [data.state.industry, data.state.location?.replace(/^(city|province):/, "").replace("scope:nationwide", "全国"), data.state.batchType].filter(Boolean).join("、");
          let answer = (conditions ? "按「" + conditions + "」筛选，" : "") + "为你查找「" + role.name + "」。";
          if (named) answer += named + " 条招聘或内推资料明确列出匹配职位。";
          if (related) answer += related + " 条公告的职责、相近职位或关键词与目标有关。";
          if (category) answer += category + " 条公告列出了相关岗位大类，具体职位名称需以招聘方岗位表为准。";
          if (!matches.length) answer += "现有招聘资料里暂时没有足够依据推荐岗位。";
          turn = { message, answer, ranked, rows, total: matches.length, companies: rows.map(row => row.company) };
        } else {
          const preferred = recommend && hasPreferences ? results.jobs.filter(job => jobMatchesProfilePreferences(job, profile)) : [];
          const candidates = preferred.length ? preferred : results.jobs;
          const seen = new Set<string>();
          const suggestions = recommend ? candidates.filter(job => {
            const name = verifiedCompanyProfile(job.company_name)?.catalogueName ?? job.company_name;
            if (seen.has(name)) return false;
            seen.add(name);
            return true;
          }) : candidates;
          const rows = suggestions.slice(0, 3).map(job => rowFor(job, data.state, recommend ?
            [preferred.length ? "符合已保存的求职偏好" : "", job.locations, job.batch_type, job.industry].filter(Boolean).join(" · ") : ""));
          const criteria = results.chips.join(" · ");
          let answer = criteria + "。共匹配 " + results.jobs.length + " 条招聘信息。";
          if (ranked) answer = criteria + "。在已核实上榜的科技公司中，拾星有 " + results.jobs.length + " 条符合条件的招聘信息。";
          if (!rows.length) answer += data.state.location ? "可以试试放宽地区条件。" : "可以描述你想做的具体工作，我会按岗位方向再找。";
          else if (recommend) answer += preferred.length ? "优先推荐与你的求职偏好匹配的岗位。" :
            hasPreferences ? "当前没有同时符合已存偏好的岗位，以下为当前筛选中的备选。" : "按当前筛选和排序，建议先看这几条。";
          turn = { message, answer, ranked, rows, total: results.jobs.length, companies: rows.map(row => row.company) };
        }
      }
      if (controller.signal.aborted) return;
      setTurns(all => [...all.slice(-7), turn]);
      setText("");
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "暂时无法连接，请重试。");
    } finally {
      if (pending.current === controller) { pending.current = null; setBusy(false); }
    }
  }
  return <div className="job-search-assistant" data-chat={chat}>
    <div className="job-mode-field">
      <div className="job-mode-input" inert={chat}>{children}</div>
      <div className="job-mode-input" inert={!chat}>
        <AssistantComposer value={text} onChange={setText} onSend={() => void ask(text)} busy={busy} maxLength={500}
          label="向岗位助手提问" sendLabel="发送岗位问题" placeholder="问一家公司，或说说你想找什么岗位…" />
      </div>
    </div>
    {!turns.length && <div className="job-chat-prompts" inert={!chat}>{["推荐几个适合我的岗位", "君乐宝这家公司怎么样？", "找一些世界五百强科技公司产品岗"].map(prompt =>
      <button type="button" key={prompt} disabled={busy} onClick={() => void ask(prompt)}>{prompt}</button>)}</div>}
    <div className="job-mode-replies" inert={!chat}>
      <div className="job-mode-replies-clip">
        <div className="job-mode-transcript" ref={conversation} aria-live="polite" aria-relevant="additions text">
          {turns.map((turn, index) => <div key={index + turn.message} className="job-search-answer">
            <p className="assistant-user-message"><span className="sr-only">你问</span>{turn.message}</p>
            {turn.overview ? <article className="job-company-overview" aria-label={turn.overview.name + "公司信息"}>
              <h3>{turn.overview.profile?.displayName ?? turn.overview.name}</h3>
              {turn.overview.profile && <><p>{turn.overview.profile.summary}</p>
                <a className="job-company-source" href={turn.overview.profile.sourceUrl} target="_blank" rel="noreferrer">{turn.overview.profile.sourceLabel} ↗</a></>}
              {!turn.overview.profile && <p>{turn.overview.introduction || "暂未查到有来源的公司业务简介。以下是拾星收录的招聘信息。"}</p>}
              {turn.overview.facts.length > 0 && <details><summary>查看招聘概况</summary><dl>{turn.overview.facts.map(fact =>
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></details>}
              <p className="job-company-listings">{turn.overview.count > 0 ? "拾星收录 " + turn.overview.count + " 条招聘信息" +
                (turn.overview.count > 3 ? "，以下为最近更新的 3 条。" : "。") : turn.rows?.length ? "以下为库中名称或检索词相关的招聘记录，公司主体关系待核实。" : "岗位库暂未匹配到这家公司的招聘记录。"}</p>
            </article> : <p style={{whiteSpace: "pre-line"}}>{turn.answer}</p>}
            {turn.items && turn.items.length > 0 && <ol>{turn.items.map(item => <li key={item.name}>
              <strong>{item.name}</strong><p>{item.reason}</p>
              {item.jobId && <Link className="job-company-source" href={`/jobs/${item.jobId}`}>查看站内招聘公告</Link>}
              <AdviceSources sources={item.sources} />
            </li>)}</ol>}
            {turn.sources && <AdviceSources sources={turn.sources} />}
            {turn.note && <small>{turn.note}</small>}
            {turn.ranked && <a className="job-company-source" href={globalRanking.url} target="_blank" rel="noreferrer">{globalRanking.year} 年《财富》世界500强榜单 ↗</a>}
            {Boolean(turn.rows?.length) && <ol>{turn.rows?.map(row => <li key={row.id}>
              <Link href={`/jobs/${row.id}`}>{row.company} · {row.title}</Link>{row.detail && <small>{row.detail}</small>}
              {row.evidenceUrl && <a className="job-company-source" href={row.evidenceUrl} target="_blank" rel="noreferrer">查看内推原文 ↗</a>}
              {!turn.overview && row.profile && <div className="job-recommendation-profile">
                {turn.ranked && <strong>世界500强第 {row.profile.globalTechRank} 位</strong>}
                <p>{row.profile.summary}</p><a className="job-company-source" href={row.profile.sourceUrl} target="_blank" rel="noreferrer">{row.profile.sourceLabel} ↗</a>
              </div>}
              {(!turn.overview || turn.overview.related) && !row.profile && <button type="button" disabled={busy} onClick={() => void ask("介绍一下" + row.company)}>了解公司</button>}
            </li>)}</ol>}
            {index === turns.length - 1 && (turn.total ?? 0) > 3 && <a href="#job-list" className="text-action">查看岗位清单</a>}
            <small className="job-answer-notice">回答由AI生成，请谨慎判断招聘信息是否真实。</small>
          </div>)}
          {busy && <p role="status">正在查看岗位资料…</p>}
          {error && <p role="alert" className="job-chat-feedback">{error}{vipRequired && <> <Link href="/vip">去开通 VIP</Link></>}</p>}
        </div>
      </div>
    </div>
  </div>;
}

function AdviceSources({ sources }: { sources: Citation[] }) {
  return sources.map(source => <p key={source.url}><a className="job-company-source" href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a></p>);
}
