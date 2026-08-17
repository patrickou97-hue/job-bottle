"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { KeyRound, Search, X } from "lucide-react";
import type { AdminReferralCode } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type StatusFilter = "all" | "active" | "removed" | AdminReferralCode["review_status"];

export function AdminReferralsClient() {
  const [codes, setCodes] = useState<AdminReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [target, setTarget] = useState<AdminReferralCode | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/referrals", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { codes?: AdminReferralCode[]; error?: string } | null;
        if (!response.ok) throw new Error(body?.error || "内推码记录读取失败。");
        if (active) setCodes(body?.codes ?? []);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "内推码记录读取失败。"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return codes.filter((item) => {
      if (status === "active" && !item.is_active) return false;
      if (status === "removed" && item.is_active) return false;
      if (!["all", "active", "removed"].includes(status) && item.review_status !== status) return false;
      return !query || [item.company_name, item.code, item.applicable_roles ?? "", item.usage_note ?? ""]
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [codes, keyword, status]);

  return (
    <div className="observatory-page space-y-7">
      <section className="page-hero">
        <div><p className="page-kicker">社区安全</p><h1 className="page-title">内推码管理</h1><p className="page-description">查看单次智能审核结果、举报数量，并人工下架不合规内容。</p></div>
        <div className="progress-summary grid grid-cols-3 gap-6 px-5 py-3">
          <AdminStat label="全部" value={codes.length} />
          <AdminStat label="公开中" value={codes.filter((item) => item.is_active).length} />
          <AdminStat label="已下架" value={codes.filter((item) => !item.is_active).length} />
        </div>
      </section>

      <section className="grid gap-3 border-y border-[color:var(--line-ghost)] py-4 sm:grid-cols-[minmax(240px,1fr)_220px]">
        <div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-muted" /><Input className="pl-10" type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索公司、内推码或说明" /></div>
        <Select value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} aria-label="筛选审核状态">
          <option value="all">全部记录</option><option value="active">当前公开</option><option value="removed">已下架</option><option value="queued">等待审核</option><option value="reviewing">审核中</option><option value="approved">智能审核通过</option><option value="rejected">智能审核下架</option><option value="error">转人工复核</option>
        </Select>
      </section>

      {loading ? <div className="empty-state"><span className="loading-line">正在读取内推码审核记录</span></div>
        : error ? <div className="empty-state" role="alert"><div><h2>记录读取失败</h2><p>{error}</p></div></div>
        : filtered.length === 0 ? <div className="empty-state"><div><h2>没有符合条件的记录</h2><p>可以更换关键词或审核状态。</p></div></div>
        : <div className="divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">{filtered.map((item) => (
          <article key={item.id} className="grid gap-4 py-5 lg:grid-cols-[minmax(190px,0.7fr)_minmax(240px,1.2fr)_minmax(210px,0.9fr)_auto] lg:items-center">
            <div><div className="flex flex-wrap items-center gap-2"><KeyRound aria-hidden="true" className="size-4 text-[color:var(--aurora)]" /><span className="text-sm font-semibold text-ink-primary">{item.company_name}</span><StatusBadge item={item} /></div><p className="mt-2 font-mono text-sm tracking-[0.06em] text-ink-secondary">{item.code}</p></div>
            <div><p className="text-sm text-ink-secondary">{item.applicable_roles || "未填写适用范围"}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-muted">{item.usage_note || "未填写使用说明"}</p></div>
            <div className="text-xs leading-5 text-ink-muted"><p>{reviewLabel(item)}</p>{item.review_reason ? <p className="mt-1 line-clamp-2">{item.review_reason}</p> : null}<p className="mt-1">举报 {item.report_count} · {formatDateTime(item.created_at)}</p></div>
            <Button variant="danger" className="justify-self-start lg:justify-self-end" disabled={!item.is_active} onClick={() => setTarget(item)}>{item.is_active ? "人工下架" : "已下架"}</Button>
          </article>
        ))}</div>}

      <AnimatePresence>{target ? <DeactivateDialog item={target} onClose={() => setTarget(null)} onDone={(reason) => {
        setCodes((current) => current.map((item) => item.id === target.id ? { ...item, is_active: false, deactivated_source: "admin", deactivation_reason: reason } : item));
        setTarget(null);
      }} /> : null}</AnimatePresence>
    </div>
  );
}

function DeactivateDialog({ item, onClose, onDone }: { item: AdminReferralCode; onClose: () => void; onDone: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/admin/referrals", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, reason }) });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "内推码下架失败。");
      onDone(reason.trim());
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "内推码下架失败。");
    } finally { setSaving(false); }
  }

  return <MotionDialog labelledBy="deactivate-referral-title" describedBy="deactivate-referral-description" className="max-w-lg p-6" onBackdropClick={saving ? undefined : onClose} onEscapeKeyDown={saving ? undefined : onClose}>
    <div className="flex items-start justify-between gap-4"><div><h2 id="deactivate-referral-title" className="text-lg font-semibold text-ink-primary">人工下架内推码</h2><p id="deactivate-referral-description" className="mt-2 text-sm text-ink-muted">{item.company_name} · {item.code}</p></div><button type="button" className="inline-flex size-9 items-center justify-center rounded-lg text-ink-muted hover:bg-[color:var(--surface-hover-bg)]" onClick={onClose} aria-label="关闭"><X aria-hidden="true" className="size-4" /></button></div>
    <label className="mt-5 block"><span className="mb-2 block text-xs font-medium text-ink-secondary">下架原因</span><Textarea value={reason} maxLength={240} onChange={(event) => setReason(event.target.value)} placeholder="例如：用户举报后确认属于求职辅导引流" /></label>
    {error ? <p className="mt-3 text-sm text-[color:var(--text-danger)]" role="alert">{error}</p> : null}
    <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={onClose}>取消</Button><Button variant="danger" disabled={saving || reason.trim().length < 2} onClick={() => void submit()}>{saving ? "正在下架" : "确认下架"}</Button></div>
  </MotionDialog>;
}

function StatusBadge({ item }: { item: AdminReferralCode }) {
  const label = item.is_active ? "公开中" : item.deactivated_source === "ai" ? "智能下架" : "人工下架";
  const className = item.is_active ? "bg-[#e7f1ec] text-[#356a55]" : "bg-[#f7e7e4] text-[#9a4438]";
  return <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${className}`}>{label}</span>;
}

function reviewLabel(item: AdminReferralCode) {
  if (item.review_status === "queued") return "等待智能审核";
  if (item.review_status === "reviewing") return "智能审核中";
  if (item.review_status === "error") return "智能审核未完成 · 需人工复核";
  if (item.review_status === "rejected") return `判定不合规${confidenceText(item.review_confidence)}`;
  return `智能审核通过${confidenceText(item.review_confidence)}`;
}

function confidenceText(value: number | null) {
  return value === null ? "" : ` · 置信度 ${Math.round(value * 100)}%`;
}

function AdminStat({ label, value }: { label: string; value: number }) {
  return <div><div className="font-display text-2xl font-semibold tabular-nums text-ink-primary">{value}</div><div className="mt-1 text-xs text-ink-muted">{label}</div></div>;
}
