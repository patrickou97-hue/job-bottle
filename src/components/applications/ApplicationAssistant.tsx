"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronRight, MessageSquareText, Sparkles } from "lucide-react";
import { AssistantComposer } from "@/components/ui/AssistantComposer";
import { useVipStatus } from "@/components/vip/useVipStatus";
import { assistantRecordTitle, describeEdit, matchAssistantRecords, recordDetail, type AssistantEdit, type AssistantIntent } from "@/lib/application-assistant";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { AssistantCreate } from "@/lib/application-assistant";
import type { ApplicationWithJob } from "@/lib/types";

type RecordItem = { id: string; updatedAt: string; title: string; detail: string };
type Proposal = { mode: "delete" } | { mode: "update"; edit: AssistantEdit };
type Turn = { create?: { id: string; draft: AssistantCreate }; id: number; message: string; reply: string; clarification?: string; rows: RecordItem[]; proposal?: Proposal; selected?: string };
const prompts = ["哪些投递超过 7 天没有进展？", "新增一条外部岗位投递"];

async function callAssistant(body: object, signal: AbortSignal) {
  const response = await fetch("/api/vip/application-assistant", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "投递助手暂时无法连接。");
  return result;
}

type AssistantProps = { accountId: string; applications: ApplicationWithJob[]; onChanged: () => Promise<void> };

export function ApplicationAssistant(props: AssistantProps) {
  const { status, error } = useVipStatus(true);
  return status?.active && !error ? <AssistantConversation {...props} /> : null;
}

function AssistantConversation({ accountId, applications, onChanged }: AssistantProps) {
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const request = useRef<AbortController | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => request.current?.abort(), []);
  function patchTurn(id: number, patch: Partial<Turn>) {
    setTurns((all) => all.map((turn) => turn.id === id ? { ...turn, ...patch } : turn));
  }

  async function saveNew(turn: Turn) {
    if (!turn.create || request.current) return;
    const { id, draft } = turn.create;
    const controller = new AbortController();
    request.current = controller; setBusy(true);
    try {
      const result = await callAssistant({ mode: "create", accountId, id, draft }, controller.signal);
      const title = draft.company + " · " + draft.position;
      patchTurn(turn.id, { reply: "已新增「" + title + "」。", create: undefined, selected: result.created,
        rows: [{ id: result.created, title, detail: APPLICATION_STATUS_LABELS[draft.status], updatedAt: result.updatedAt }] });
      await onChanged();
    } catch (error) {
      if (!controller.signal.aborted) patchTurn(turn.id, { reply: error instanceof Error ? error.message : "暂时无法确认新增结果。" });
    } finally {
      if (!controller.signal.aborted) { request.current = null; setBusy(false); }
    }
  }

  async function send(message: string) {
    if (!message.trim() || request.current) return;
    const last = turns.at(-1);
    if (last?.create && /^(确认|确定|确认新增|确认添加)[。！!]?$/u.test(message.trim())) {
      setText(""); await saveNew(last); return;
    }
    if (last?.create && /^(取消|算了|不要添加了)[。！!]?$/u.test(message.trim())) {
      setText(""); patchTurn(last.id, { create: undefined, reply: "已取消新增。" }); return;
    }
    const controller = new AbortController();
    request.current = controller;
    const id = (turns.at(-1)?.id ?? 0) + 1;
    const context = turns.slice(-3).flatMap((turn) => turn.create ? [turn.message, JSON.stringify(turn.create.draft)] : turn.clarification ? [turn.message, turn.clarification] : [turn.message]);
    const previousIds = last?.selected ? [last.selected] : last?.rows.map((r) => r.id) ?? [];
    setBusy(true); setText("");
    setTurns((all) => [...all, { id, message: message.trim(), reply: "", rows: [] }]);
    try {
      const result = await callAssistant({ mode: "chat", accountId, message: message.trim(), history: context }, controller.signal);
      const intent: AssistantIntent = result.intent;
      if (intent.action === "clarify") { patchTurn(id, { reply: intent.question, clarification: intent.question }); return; }
      if (intent.action === "create") {
        const draft = intent.draft;
        const existing = applications.find(row => row.job.company_name === draft.company &&
          (row.applied_position?.trim() || row.job.job_titles) === draft.position);
        if (existing) {
          patchTurn(id, { reply: "已有同公司、同岗位的投递，可以直接告诉我怎样更新它。",
            rows: [{ id: existing.id, updatedAt: existing.updated_at, title: assistantRecordTitle(existing), detail: recordDetail(existing) }] });
        } else {
          patchTurn(id, { reply: "请核对这条外部投递。你也可以在对话中补充日期或修正阶段。", create: { id: crypto.randomUUID(), draft } });
        }
        return;
      }
      const matches = matchAssistantRecords(applications, intent.filter, previousIds);
      const rows = matches.map((row) => ({ id: row.id, updatedAt: row.updated_at, title: assistantRecordTitle(row), detail: recordDetail(row) }));
      const proposal = intent.action === "query" ? undefined : intent.action === "delete" ? { mode: "delete" as const } : { mode: "update" as const, edit: intent.edit };
      const reply = !rows.length ? "没有找到匹配的投递。可以换一个公司名或岗位关键词。"
        : !proposal ? `找到 ${rows.length} 条投递。`
        : rows.length === 1 ? "找到这条投递，请核对变更。"
        : `匹配到 ${rows.length} 条投递，请选中要处理的一条。`;
      patchTurn(id, { reply, rows, proposal: rows.length ? proposal : undefined, selected: proposal && rows.length === 1 ? rows[0].id : undefined });
    } catch (error) {
      if (!controller.signal.aborted) { patchTurn(id, { reply: error instanceof Error ? error.message : "暂时无法连接，请重试。" }); setText(message); }
    } finally { if (!controller.signal.aborted) { request.current = null; setBusy(false); } }
  }

  async function apply(turn: Turn, row: RecordItem) {
    if (!turn.proposal || request.current) return;
    const controller = new AbortController(); request.current = controller; setBusy(true);
    try {
      await callAssistant({ ...turn.proposal, accountId, id: row.id, updatedAt: row.updatedAt }, controller.signal);
      patchTurn(turn.id, { reply: `已${turn.proposal.mode === "delete" ? "删除" : "更新"}「${row.title}」。`,
        proposal: undefined, rows: turn.proposal.mode === "delete" ? [] : [{ ...row, detail: describeEdit(turn.proposal.edit) }], selected: row.id });
    } catch (error) {
      if (!controller.signal.aborted) patchTurn(turn.id, { reply: error instanceof Error ? error.message : "未能确认变更，请重新查询。", proposal: undefined, rows: [] });
    } finally {
      if (!controller.signal.aborted) { await onChanged(); request.current = null; setBusy(false); }
    }
  }

  const visible = expanded ? turns : turns.slice(-2);
  return <section id="application-assistant" className="application-assistant" aria-labelledby="application-assistant-heading">
    <div className="application-assistant-heading"><MessageSquareText size={19} aria-hidden="true" /><h2 id="application-assistant-heading">AI 投递助手</h2><span>VIP</span></div>
    <AssistantComposer value={text} onChange={setText} onSend={() => void send(text)} busy={busy} inputRef={input} maxLength={700}
      label="给投递助手发消息" placeholder="问问最近该跟进谁，或告诉我哪份投递有了新进展…" />
    {!turns.length && <div className="application-assistant-prompts">{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => { setText(prompt); input.current?.focus(); }}>{prompt}<ChevronRight size={13}/></button>)}</div>}
    {turns.length > 2 && <button type="button" className="text-action mt-3 text-xs" onClick={() => setExpanded(!expanded)}>{expanded ? "收起较早对话" : "查看较早对话"}</button>}
    <div aria-live="polite" aria-relevant="additions text">
      {visible.map((turn) => {
        const latest = turn === turns.at(-1);
        const row = turn.rows.find((item) => item.id === turn.selected);
        return <div className="application-assistant-turn" key={turn.id}>
          <p className="application-assistant-message assistant-user-message">{turn.message}</p>
          <div className="application-assistant-reply"><Sparkles size={15} aria-hidden="true"/><p>{turn.reply || "正在整理…"}</p></div>
          {turn.rows.length > 0 && <ol className="application-assistant-records">{turn.rows.map((item, index) => <li key={item.id}>
            <span><strong>{index + 1}. {item.title}</strong><small>{item.detail}</small></span>
            {latest && turn.proposal && turn.rows.length > 1 && <button type="button" disabled={busy} aria-pressed={turn.selected === item.id} onClick={() => patchTurn(turn.id, { selected: item.id })}>{turn.selected === item.id ? "已选中" : "选择"}</button>}
          </li>)}</ol>}
          {latest && turn.create && <div className="application-assistant-confirm">
            <p><strong>{turn.create.draft.company} · {turn.create.draft.position}</strong> · {APPLICATION_STATUS_LABELS[turn.create.draft.status]}
              {turn.create.draft.status !== "opened" && " · 投递日期：" + (turn.create.draft.appliedDate || "今天")}</p>
            <button type="button" disabled={busy} onClick={() => void saveNew(turn)}>确认新增</button>
            <button type="button" disabled={busy} onClick={() => patchTurn(turn.id, { create: undefined, reply: "已取消新增。" })}>取消</button>
          </div>}
          {latest && turn.proposal && row && <div className="application-assistant-confirm">
            <p><strong>{row.title}</strong> · {turn.proposal.mode === "delete" ? "将删除这条投递及其进度历史。" : describeEdit(turn.proposal.edit)}</p>
            <button type="button" disabled={busy} data-delete={turn.proposal.mode === "delete"} onClick={() => void apply(turn, row)}>{turn.proposal.mode === "delete" ? "确认删除这条投递" : "确认修改"}</button>
            <button type="button" disabled={busy} onClick={() => patchTurn(turn.id, { reply: "已取消，记录保持原样。", proposal: undefined })}>取消</button>
          </div>}
        </div>;
      })}
    </div>
  </section>;
}
