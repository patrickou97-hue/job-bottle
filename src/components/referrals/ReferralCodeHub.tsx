"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import { AlertTriangle, Check, Clipboard, Flag, KeyRound, Plus, Search, ShieldAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserOrNull } from "@/lib/auth";
import {
  createReferralCode,
  fetchReferralCodes,
  isReferralCodeExpired,
  matchReferralCompanies,
  reportReferralCode,
  type ReferralCodeCreateResult,
  type ReferralCodeInput,
  type ReferralCodeListItem,
} from "@/lib/referral-codes";
import { formatDateTime } from "@/lib/utils";
import type { Job } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

export function ReferralRiskNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact
      ? "border-y border-[color:var(--line-ghost)] py-3"
      : "border-y border-[#d6b36a]/35 bg-[#fbf4df]/45 px-4 py-4 sm:px-5"}
      role="note"
    >
      <div className="flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#8c641d]" />
        <div>
          <p className="text-sm font-medium text-ink-primary">内推码由用户自行分享，拾星不为真实性背书</p>
          <p className="mt-1 text-xs leading-5 text-ink-muted">
            发布后会立即进行一次智能审核；不合规内容将自动下架。使用前仍请在公司官方招聘渠道核对，任何收费、转账或索取敏感信息的行为都应立即停止并举报。
          </p>
        </div>
      </div>
    </div>
  );
}

export function ReferralCodeDrawer({
  open,
  companyName,
  jobId,
  jobTitle,
  currentUserId,
  jobs,
  onClose,
}: {
  open: boolean;
  companyName: string;
  jobId?: string | null;
  jobTitle?: string | null;
  currentUserId: string | null;
  jobs: Job[];
  onClose: () => void;
}) {
  const [codes, setCodes] = useState<ReferralCodeListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<ReferralCodeListItem | null>(null);

  useEffect(() => {
    if (!open || !companyName) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      setMessage("");
      void fetchReferralCodes(createClient(), companyName, jobs)
        .then((rows) => { if (active) setCodes(rows); })
        .catch(() => { if (active) setError("内推码暂时无法读取，请稍后重试。"); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [companyName, jobs, open]);

  function handleCreated(result: ReferralCodeCreateResult) {
    if (result.reviewStatus !== "removed") setCodes((current) => [result.item, ...current]);
    setUploadOpen(false);
    setMessage(getCreatedMessage(result.reviewStatus));
  }

  return (
    <>
      <Drawer open={open} title={`${companyName} · 内推码`} onClose={onClose} showHelpLink={false}>
        <div className="space-y-5 pb-3">
          <div>
            <p className="text-sm text-ink-secondary">{jobTitle ? `正在查看：${jobTitle}` : "查看该公司当前可用的社区分享"}</p>
            <Link href={`/referrals?company=${encodeURIComponent(companyName)}`} className="text-action mt-2 inline-flex text-xs">
              前往内推码广场查看全部公司
            </Link>
          </div>
          <ReferralRiskNotice compact />
          {message ? <div className="info-banner px-3 py-2 text-xs" role="status">{message}</div> : null}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-ink-primary">社区分享</h3>
              <p className="mt-1 text-xs text-ink-muted">{codes.length} 条记录 · 上传者匿名</p>
            </div>
            {currentUserId ? (
              <Button className="min-h-9 px-3 text-xs" onClick={() => setUploadOpen(true)}>
                <Plus aria-hidden="true" className="size-3.5" />上传该公司内推码
              </Button>
            ) : (
              <Link href={`/login?next=${encodeURIComponent(`/referrals?company=${companyName}`)}`} className="gold-button inline-flex min-h-9 items-center rounded-lg px-3 text-xs font-medium">
                登录后上传
              </Link>
            )}
          </div>
          <ReferralCodeList
            codes={codes}
            loading={loading}
            error={error}
            currentUserId={currentUserId}
            onReport={setReportTarget}
          />
        </div>
      </Drawer>
      {uploadOpen && currentUserId ? (
        <ReferralUploadDialog
          open
          jobs={jobs}
          fixedCompanyName={companyName}
          fixedJobId={jobId}
          onClose={() => setUploadOpen(false)}
          onCreated={handleCreated}
        />
      ) : null}
      {reportTarget ? (
        <ReferralReportDialog
          item={reportTarget}
          currentUserId={currentUserId}
          onClose={() => setReportTarget(null)}
          onReported={() => {
            setReportTarget(null);
            setMessage("举报已记录，感谢你帮助维护内推码广场。" );
          }}
        />
      ) : null}
    </>
  );
}

export function ReferralCodeList({
  codes,
  loading,
  error,
  currentUserId,
  onReport,
}: {
  codes: ReferralCodeListItem[];
  loading: boolean;
  error: string;
  currentUserId: string | null;
  onReport: (item: ReferralCodeListItem) => void;
}) {
  if (loading) return <div className="border-y border-[color:var(--line-ghost)] py-9 text-center text-sm text-ink-muted"><span className="loading-line">正在核对内推码</span></div>;
  if (error) return <div className="border-y border-[color:var(--line-ghost)] py-9 text-center text-sm text-[color:var(--text-danger)]" role="alert">{error}</div>;
  if (codes.length === 0) {
    return <div className="border-y border-[color:var(--line-ghost)] py-10 text-center"><p className="text-sm font-medium text-ink-primary">还没有人分享这家公司的内推码</p><p className="mt-2 text-xs text-ink-muted">如果你有可信来源，可以成为第一个分享者。</p></div>;
  }

  return (
    <div className="divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
      {codes.map((item) => <ReferralCodeRow key={item.id} item={item} currentUserId={currentUserId} onReport={() => onReport(item)} />)}
    </div>
  );
}

function ReferralCodeRow({ item, currentUserId, onReport }: { item: ReferralCodeListItem; currentUserId: string | null; onReport: () => void }) {
  const [copied, setCopied] = useState(false);
  const expired = isReferralCodeExpired(item);
  const seededPreview = item.id.startsWith("local-preview-");
  const sourceItem = item.source_type === "tencent_job_link" || item.source_type === "public_post";

  async function copyCode() {
    if (expired || seededPreview) return;
    await navigator.clipboard.writeText(item.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className={expired ? "py-5 opacity-55" : "py-5"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold tracking-[0.08em] text-ink-primary">{item.code}</span>
            {seededPreview ? <span className="rounded-sm bg-[#fbf4df] px-1.5 py-0.5 text-[10px] font-medium text-[#7d5a1f]">本地演示</span> : null}
            {sourceItem ? <span className="rounded-sm bg-[#e8edf4] px-1.5 py-0.5 text-[10px] font-medium text-[#31557f]">来源同步</span> : null}
            {expired ? <span className="text-[10px] font-medium text-[color:var(--text-danger)]">已过期</span> : null}
          </div>
          <p className="mt-2 text-sm leading-6 text-ink-secondary">{item.applicable_roles || "适用范围未说明，请在官方投递页确认"}</p>
          {item.usage_note ? <p className="mt-1 text-xs leading-5 text-ink-muted">{item.usage_note}</p> : null}
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-muted">
            <span>{item.publisher_name || (item.source_type === "tencent_job_link" ? "腾讯文档岗位链接" : item.source_platform ? `${item.source_platform}公开帖子` : "匿名分享")}</span>
            <span>{item.expires_at ? `有效期至 ${item.expires_at}` : "未填写有效期"}</span>
            <span>发布于 {formatDateTime(item.created_at)}</span>
            {item.source_url ? <a href={item.source_url} target="_blank" rel="noreferrer" className="text-action hover:underline">查看来源</a> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-ink-secondary hover:bg-[color:var(--surface-hover-bg)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={expired || seededPreview}
            onClick={() => void copyCode()}
          >
            {copied ? <Check aria-hidden="true" className="size-3.5 text-[#39725b]" /> : <Clipboard aria-hidden="true" className="size-3.5" />}
            {copied ? "已复制" : seededPreview ? "演示码" : "复制"}
          </button>
          {sourceItem ? null : <button type="button" className="inline-flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-[color:var(--surface-hover-bg)] hover:text-[color:var(--text-danger)]" onClick={onReport} aria-label={currentUserId ? `举报内推码 ${item.code}` : "登录后举报"}>
            <Flag aria-hidden="true" className="size-3.5" />
          </button>}
        </div>
      </div>
    </article>
  );
}

export function ReferralUploadDialog({
  open,
  jobs,
  fixedCompanyName,
  fixedJobId,
  onClose,
  onCreated,
}: {
  open: boolean;
  jobs: Job[];
  fixedCompanyName?: string;
  fixedJobId?: string | null;
  onClose: () => void;
  onCreated: (result: ReferralCodeCreateResult) => void;
}) {
  const companies = useMemo(() => [...new Set(jobs.map((job) => job.company_name))].sort((a, b) => a.localeCompare(b, "zh-CN")), [jobs]);
  const [companyName, setCompanyName] = useState(fixedCompanyName ?? "");
  const [companyQuery, setCompanyQuery] = useState(fixedCompanyName ?? "");
  const [companySearchOpen, setCompanySearchOpen] = useState(false);
  const [activeCompanyIndex, setActiveCompanyIndex] = useState(0);
  const [jobId, setJobId] = useState(fixedJobId ?? "");
  const [code, setCode] = useState("");
  const [applicableRoles, setApplicableRoles] = useState("");
  const [usageNote, setUsageNote] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const companyJobs = jobs.filter((job) => job.company_name === companyName);
  const companyMatches = useMemo(
    () => matchReferralCompanies(companies, companyQuery),
    [companies, companyQuery],
  );

  function chooseCompany(company: string) {
    setCompanyName(company);
    setCompanyQuery(company);
    setJobId("");
    setCompanySearchOpen(false);
    setActiveCompanyIndex(0);
  }

  async function submit() {
    if (!agreed) {
      setError("请先确认内推码来源真实，并同意风险提示。" );
      return;
    }
    setSaving(true);
    setError("");
    const input: ReferralCodeInput = { companyName, jobId: jobId || null, code, applicableRoles, usageNote, expiresAt };
    try {
      const result = await createReferralCode(input);
      onCreated(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "内推码上传失败，请稍后重试。" );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open ? (
        <MotionDialog labelledBy="referral-upload-title" describedBy="referral-upload-description" className="max-w-2xl p-5 sm:p-7" onBackdropClick={saving ? undefined : onClose} onEscapeKeyDown={saving ? undefined : onClose}>
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="referral-upload-title" className="text-xl font-semibold text-ink-primary">上传自己的内推码</h2><p id="referral-upload-description" className="mt-2 text-sm leading-6 text-ink-muted">提交后先公开，并立即完成一次智能审核；疑似求职机构、求职辅导、付费代投或引流的内容会自动下架。</p></div>
            <button type="button" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-[color:var(--surface-hover-bg)]" onClick={onClose} aria-label="关闭上传内推码"><X aria-hidden="true" className="size-4" /></button>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <FormField label="公司" required>
              {fixedCompanyName ? <div className="field-shell flex h-11 items-center px-3.5 text-sm text-ink-primary">{fixedCompanyName}</div> : (
                <CompanySearchCombobox
                  query={companyQuery}
                  selectedCompany={companyName}
                  matches={companyMatches}
                  open={companySearchOpen}
                  activeIndex={activeCompanyIndex}
                  onQueryChange={(nextQuery) => {
                    setCompanyQuery(nextQuery);
                    if (nextQuery !== companyName) {
                      setCompanyName("");
                      setJobId("");
                    }
                    setCompanySearchOpen(true);
                    setActiveCompanyIndex(0);
                  }}
                  onOpenChange={setCompanySearchOpen}
                  onActiveIndexChange={setActiveCompanyIndex}
                  onSelect={chooseCompany}
                />
              )}
            </FormField>
            <FormField label="适用岗位">
              <Select value={jobId} onChange={(event) => setJobId(event.target.value)} aria-label="选择适用岗位">
                <option value="">该公司通用 / 暂不确定</option>
                {companyJobs.map((job) => <option key={job.id} value={job.id}>{job.job_titles || job.job_categories.join("、") || "岗位信息待补充"}</option>)}
              </Select>
            </FormField>
            <FormField label="内推码" required helper="2–64 位字母、数字、短横线或下划线">
              <Input value={code} maxLength={64} autoCapitalize="characters" autoComplete="off" onChange={(event) => setCode(event.target.value)} placeholder="例如 STARJOB-2026" />
            </FormField>
            <FormField label="有效期" helper="不知道可以留空">
              <Input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
            </FormField>
            <div className="sm:col-span-2"><FormField label="适用范围" helper="例如：2027 校招技术与产品岗位"><Input value={applicableRoles} maxLength={160} onChange={(event) => setApplicableRoles(event.target.value)} placeholder="说明批次、地区或岗位范围" /></FormField></div>
            <div className="sm:col-span-2"><FormField label="使用说明" helper="最多 500 字；不得包含联系方式、外链或交易信息"><Textarea value={usageNote} maxLength={500} onChange={(event) => setUsageNote(event.target.value)} placeholder="说明在官方投递页的填写位置或注意事项" /></FormField></div>
          </div>
          <label className="mt-5 flex cursor-pointer items-start gap-3 border-y border-[color:var(--line-ghost)] py-4 text-xs leading-5 text-ink-secondary">
            <input type="checkbox" className="mt-0.5 size-4 accent-[#12294e]" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
            <span>我确认此内推码来源真实、可以公开分享，未收取费用，也不会要求使用者提供验证码、密码、身份证或转账。</span>
          </label>
          {error ? <p className="mt-4 text-sm text-[color:var(--text-danger)]" role="alert">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={onClose}>取消</Button><Button disabled={saving} onClick={() => void submit()}>{saving ? "正在上传并审核" : "确认上传"}</Button></div>
        </MotionDialog>
      ) : null}
    </AnimatePresence>
  );
}

function CompanySearchCombobox({
  query,
  selectedCompany,
  matches,
  open,
  activeIndex,
  onQueryChange,
  onOpenChange,
  onActiveIndexChange,
  onSelect,
}: {
  query: string;
  selectedCompany: string;
  matches: string[];
  open: boolean;
  activeIndex: number;
  onQueryChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onActiveIndexChange: (index: number) => void;
  onSelect: (company: string) => void;
}) {
  const listId = useId();
  const showResults = open && query.trim().length > 0;

  return (
    <div className="relative isolate">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 z-10 size-4 -translate-y-1/2 text-ink-muted" />
        <Input
          role="combobox"
          aria-label="搜索并选择公司"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showResults}
          aria-activedescendant={showResults && matches[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          autoComplete="off"
          className="pl-10 pr-10"
          value={query}
          placeholder="输入公司名称搜索"
          onFocus={() => onOpenChange(true)}
          onBlur={() => window.setTimeout(() => onOpenChange(false), 100)}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && matches.length > 0) {
              event.preventDefault();
              onOpenChange(true);
              onActiveIndexChange((activeIndex + 1) % matches.length);
            } else if (event.key === "ArrowUp" && matches.length > 0) {
              event.preventDefault();
              onOpenChange(true);
              onActiveIndexChange((activeIndex - 1 + matches.length) % matches.length);
            } else if (event.key === "Enter" && showResults && matches[activeIndex]) {
              event.preventDefault();
              onSelect(matches[activeIndex]);
            } else if (event.key === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onOpenChange(false);
            }
          }}
        />
        {selectedCompany ? <Check aria-hidden="true" className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#39725b]" /> : null}
      </div>
      {showResults ? (
        <div id={listId} role="listbox" aria-label="公司匹配结果" className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-50 max-h-52 overflow-y-auto overscroll-contain rounded-lg border border-[color:var(--line)] bg-[color:var(--surface-read-bg-strong)] p-1.5 shadow-[0_18px_44px_rgba(15,35,65,0.2)]">
          {matches.length > 0 ? matches.map((company, index) => (
            <button
              id={`${listId}-${index}`}
              key={company}
              type="button"
              role="option"
              aria-selected={company === selectedCompany}
              className={index === activeIndex ? "flex min-h-10 w-full items-center justify-between rounded-md bg-[color:var(--surface-hover-bg)] px-3 text-left text-sm text-ink-primary" : "flex min-h-10 w-full items-center justify-between rounded-md px-3 text-left text-sm text-ink-secondary hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary"}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => onActiveIndexChange(index)}
              onClick={() => onSelect(company)}
            >
              <span className="truncate">{company}</span>
              {company === selectedCompany ? <Check aria-hidden="true" className="size-3.5 shrink-0 text-[#39725b]" /> : null}
            </button>
          )) : (
            <div className="px-3 py-4 text-xs leading-5 text-ink-muted">岗位库中没有匹配公司，请检查名称或换一个关键词。</div>
          )}
        </div>
      ) : null}
      <p className="mt-1.5 text-[10px] leading-4 text-ink-muted">
        {selectedCompany ? `已匹配岗位库：${selectedCompany}` : "输入关键词，从岗位库公司中选择"}
      </p>
    </div>
  );
}

function ReferralReportDialog({ item, currentUserId, onClose, onReported }: { item: ReferralCodeListItem; currentUserId: string | null; onClose: () => void; onReported: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const reasons = ["内推码已失效或错误", "疑似收费、诈骗或代投", "包含联系方式或敏感信息", "公司或适用范围不匹配"];

  async function submit() {
    if (!currentUserId) return;
    setSaving(true);
    setError("");
    try {
      await reportReferralCode(createClient(), currentUserId, item.id, reason);
      onReported();
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : "举报未提交，请稍后重试。" );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      <MotionDialog labelledBy="referral-report-title" describedBy="referral-report-description" className="max-w-lg p-5 sm:p-7" onBackdropClick={onClose} onEscapeKeyDown={onClose}>
        <h2 id="referral-report-title" className="text-lg font-semibold text-ink-primary">举报这条内推码</h2>
        <p id="referral-report-description" className="mt-2 text-sm leading-6 text-ink-muted">举报不会向上传者展示你的身份。</p>
        {!currentUserId ? (
          <div className="mt-5"><p className="text-sm text-ink-secondary">请先登录，再提交举报。</p><Link href={`/login?next=${encodeURIComponent("/referrals")}`} className="gold-button mt-4 inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-medium">前往登录</Link></div>
        ) : (
          <div className="mt-5 space-y-2">{reasons.map((itemReason) => <button key={itemReason} type="button" className={reason === itemReason ? "flex w-full items-center gap-3 rounded-lg bg-[#e8edf4] px-3 py-3 text-left text-sm text-[#12294e]" : "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-ink-secondary hover:bg-[color:var(--surface-hover-bg)]"} onClick={() => setReason(itemReason)}><AlertTriangle aria-hidden="true" className="size-4 shrink-0" />{itemReason}</button>)}</div>
        )}
        {error ? <p className="mt-4 text-sm text-[color:var(--text-danger)]" role="alert">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onClose}>取消</Button>{currentUserId ? <Button variant="danger" disabled={!reason || saving} onClick={() => void submit()}>{saving ? "提交中" : "提交举报"}</Button> : null}</div>
      </MotionDialog>
    </AnimatePresence>
  );
}

function FormField({ label, required = false, helper, children }: { label: string; required?: boolean; helper?: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-medium text-ink-secondary">{label}{required ? <span className="ml-1 text-[color:var(--text-danger)]">*</span> : null}</span>{children}{helper ? <span className="mt-1.5 block text-[10px] leading-4 text-ink-muted">{helper}</span> : null}</label>;
}

export function ReferralPlazaClient({ jobs, initialUserId, initialCompany = "" }: { jobs: Job[]; initialUserId: string | null; initialCompany?: string }) {
  const [codes, setCodes] = useState<ReferralCodeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState(initialCompany);
  const [availability, setAvailability] = useState<"usable" | "all">("usable");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [currentUserId, setCurrentUserId] = useState(initialUserId);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    void Promise.all([fetchReferralCodes(supabase, undefined, jobs), getCurrentUserOrNull(supabase)])
      .then(([rows, user]) => {
        if (!active) return;
        setCodes(rows);
        setCurrentUserId(user?.id ?? initialUserId);
      })
      .catch(() => { if (active) setError("内推码广场暂时无法读取，请稍后重试。" ); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialUserId, jobs]);

  const grouped = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    const map = new Map<string, ReferralCodeListItem[]>();
    codes.forEach((item) => {
      if (availability === "usable" && isReferralCodeExpired(item)) return;
      if (query && ![item.company_name, item.applicable_roles ?? ""].some((value) => value.toLowerCase().includes(query))) return;
      map.set(item.company_name, [...(map.get(item.company_name) ?? []), item]);
    });
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0], "zh-CN"));
  }, [availability, codes, keyword]);
  const companiesWithCodes = new Set(codes.filter((item) => !isReferralCodeExpired(item)).map((item) => item.company_name)).size;
  const usableCount = codes.filter((item) => !isReferralCodeExpired(item)).length;
  const previewMode = codes.some((item) => item.id.startsWith("local-preview-"));

  return (
    <div className="observatory-page space-y-7">
      <section className="page-hero">
        <div><p className="page-kicker">社区互助</p><h1 className="page-title">内推码广场</h1><p className="page-description">按公司查看同学匿名分享的内推码，也可以上传你自己的码。</p></div>
        <div className="progress-summary grid grid-cols-2 gap-x-8 gap-y-4 px-4 py-3 sm:grid-cols-3 sm:px-5">
          <PlazaStat value={companiesWithCodes} label="有可用码的公司" />
          <PlazaStat value={usableCount} label="当前可用" />
          <PlazaStat value={codes.length} label="全部分享" />
        </div>
      </section>
      <ReferralRiskNotice />
      {notice ? <div className="info-banner px-4 py-3 text-sm" role="status">{notice}</div> : null}
      {previewMode ? <div className="info-banner px-4 py-3 text-sm" role="status">当前为本地演示模式：带“本地演示”的内推码不可用于真实投递；你上传的内容只保存在这台浏览器。</div> : null}
      <section className="border-y border-[color:var(--line-ghost)]">
        <div className="flex flex-wrap items-end justify-between gap-4 py-4">
          <div><h2 className="section-title">按公司查找</h2><p className="mt-1 text-xs text-ink-muted">不展示上传者身份；使用前请回到公司官方招聘页面核对。</p></div>
          {currentUserId ? <Button className="gap-2" onClick={() => setUploadOpen(true)}><KeyRound aria-hidden="true" className="size-4" />上传内推码</Button> : <Link href="/login?next=%2Freferrals" className="gold-button inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium">登录后上传</Link>}
        </div>
        <div className="grid gap-3 border-t border-[color:var(--line-ghost)] py-4 sm:grid-cols-[minmax(220px,1fr)_180px]">
          <Input type="search" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索公司或适用岗位" aria-label="搜索内推码公司或适用岗位" />
          <Select value={availability} onChange={(event) => setAvailability(event.target.value as "usable" | "all")} aria-label="筛选内推码有效状态"><option value="usable">只看当前可用</option><option value="all">包含已过期</option></Select>
        </div>
      </section>
      {loading ? <div className="empty-state"><span className="loading-line">正在整理内推码</span></div> : error ? <div className="empty-state" role="alert"><div><h2>内推码暂时无法读取</h2><p>{error}</p></div></div> : grouped.length === 0 ? <div className="empty-state"><div><h2>没有符合条件的内推码</h2><p>换一个公司名称，或切换为包含已过期记录。</p></div></div> : (
        <section aria-label="内推码公司清单">
          <div className="hidden grid-cols-[minmax(180px,0.8fr)_90px_minmax(220px,1fr)_130px_auto] gap-4 border-b border-[color:var(--line)] px-4 pb-3 text-[11px] font-medium text-ink-muted md:grid"><span>公司</span><span>可用数量</span><span>主要适用范围</span><span>最近分享</span><span className="text-right">操作</span></div>
          <div className="divide-y divide-[color:var(--line-ghost)] border-b border-[color:var(--line-ghost)]">{grouped.map(([company, items]) => <button key={company} type="button" className="data-row grid w-full gap-3 px-3 py-5 text-left md:grid-cols-[minmax(180px,0.8fr)_90px_minmax(220px,1fr)_130px_auto] md:items-center md:gap-4 md:px-4" onClick={() => setSelectedCompany(company)}><span className="text-sm font-semibold text-ink-primary">{company}</span><span className="text-sm tabular-nums text-ink-secondary">{items.filter((item) => !isReferralCodeExpired(item)).length}</span><span className="truncate text-xs text-ink-secondary">{items[0]?.applicable_roles || "适用范围待核对"}</span><span className="text-xs text-ink-muted">{formatDateTime(items[0]?.created_at)}</span><span className="text-action justify-self-start text-xs md:justify-self-end">查看内推码</span></button>)}</div>
        </section>
      )}
      <ReferralCodeDrawer open={Boolean(selectedCompany)} companyName={selectedCompany} currentUserId={currentUserId} jobs={jobs} onClose={() => setSelectedCompany("")} />
      {uploadOpen && currentUserId ? <ReferralUploadDialog open jobs={jobs} onClose={() => setUploadOpen(false)} onCreated={(result) => {
        if (result.reviewStatus !== "removed") {
          setCodes((current) => [result.item, ...current]);
          setSelectedCompany(result.item.company_name);
        }
        setNotice(getCreatedMessage(result.reviewStatus));
        setUploadOpen(false);
      }} /> : null}
    </div>
  );
}

function PlazaStat({ value, label }: { value: number; label: string }) {
  return <div><div className="font-display text-2xl font-semibold leading-none tabular-nums text-ink-primary md:text-3xl">{value}</div><div className="mt-2 whitespace-nowrap text-xs text-ink-muted">{label}</div></div>;
}

function getCreatedMessage(status: ReferralCodeCreateResult["reviewStatus"]) {
  if (status === "removed") return "内推码已提交并完成智能审核；内容不符合社区规则，现已自动下架。";
  if (status === "approved") return "内推码已公开，并已通过本次智能审核。";
  if (status === "preview") return "内推码已加入本地广场预览，仅保存在这台浏览器。";
  return "内推码已公开；智能审核未完成，已进入管理员人工复核。";
}
