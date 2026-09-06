"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MessageSquareText,
  RefreshCw,
  Search,
  Smartphone,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  fetchAdminFeedback,
  type AdminFeedbackItem,
  type AdminFeedbackPlatform,
  type AdminFeedbackStatus,
  type AdminFeedbackResponse,
  resolveAdminFeedback,
} from "@/lib/admin-feedback";
import { cn, formatDateTime } from "@/lib/utils";

const PAGE_SIZE = 25;

export function AdminFeedbackClient() {
  const [feedback, setFeedback] = useState<AdminFeedbackItem[]>([]);
  const [metrics, setMetrics] = useState<AdminFeedbackResponse["metrics"]>({ total: 0, open: 0, resolved: 0, recent: 0 });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AdminFeedbackStatus>("all");
  const [platform, setPlatform] = useState<AdminFeedbackPlatform>("all");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState("");
  const [resolvingId, setResolvingId] = useState("");

  const load = useCallback(async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    setMessage("");
    try {
      const result = await fetchAdminFeedback({ page, pageSize: PAGE_SIZE, query, status, platform });
      setFeedback(result.feedback);
      setMetrics(result.metrics);
      setPage(result.page);
      setTotalPages(result.totalPages);
      setTotalFiltered(result.totalFiltered);
      setExpandedId("");
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "反馈记录暂时无法读取，请稍后重试。");
    } finally {
      setRefreshing(false);
    }
  }, [page, platform, query, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), query ? 260 : 0);
    return () => window.clearTimeout(timer);
  }, [load, query]);

  function updateStatus(value: AdminFeedbackStatus) {
    setPage(1);
    setStatus(value);
  }

  function updatePlatform(value: AdminFeedbackPlatform) {
    setPage(1);
    setPlatform(value);
  }

  function updateQuery(value: string) {
    setPage(1);
    setQuery(value);
  }

  async function resolveFeedback(id: string) {
    setResolvingId(id);
    setMessage("");
    try {
      await resolveAdminFeedback(id);
      await load(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "反馈状态暂时无法保存，请稍后重试。");
    } finally {
      setResolvingId("");
    }
  }

  return (
    <div className="observatory-page space-y-7">
      <section className="page-hero">
        <div>
          <p className="page-kicker">产品支持</p>
          <h1 className="page-title">反馈管理</h1>
          <p className="page-description">集中查看用户提交的问题和建议，保留原始内容与来源，方便后续跟进。</p>
        </div>
        <div className="progress-summary grid grid-cols-2 gap-x-6 gap-y-3 px-5 py-3 sm:grid-cols-4">
          <AdminStat label="全部反馈" value={metrics.total} />
          <AdminStat label="待处理" value={metrics.open} tone="warn" />
          <AdminStat label="已处理" value={metrics.resolved} />
          <AdminStat label="近 7 天" value={metrics.recent} />
        </div>
      </section>

      <section className="grid gap-3 border-y border-[color:var(--line-ghost)] py-4 sm:grid-cols-[minmax(240px,1fr)_170px_170px_auto]">
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <Input className="pl-11" type="search" value={query} onChange={(event) => updateQuery(event.target.value)} placeholder="搜索反馈内容、类型或邮箱" />
        </div>
        <Select value={status} onChange={(event) => updateStatus(event.target.value as AdminFeedbackStatus)} aria-label="筛选处理状态">
          <option value="all">全部状态</option>
          <option value="open">待处理</option>
          <option value="resolved">已处理</option>
        </Select>
        <Select value={platform} onChange={(event) => updatePlatform(event.target.value as AdminFeedbackPlatform)} aria-label="筛选反馈来源">
          <option value="all">全部来源</option>
          <option value="web">网页</option>
          <option value="miniprogram">小程序</option>
        </Select>
        <Button variant="secondary" className="h-10 min-h-10 border border-[color:var(--line-ghost)] px-3" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />
          {refreshing ? "读取中" : "刷新"}
        </Button>
      </section>

      {state === "loading" ? <LoadingState />
        : state === "error" ? <div className="empty-state" role="alert"><div><h2>反馈读取失败</h2><p>{message}</p></div></div>
          : feedback.length === 0 ? <div className="empty-state"><div><h2>没有符合条件的反馈</h2><p>可以更换关键词、处理状态或来源。</p></div></div>
            : <FeedbackList feedback={feedback} expandedId={expandedId} resolvingId={resolvingId} onResolve={resolveFeedback} onToggle={(id) => setExpandedId((current) => current === id ? "" : id)} />}

      {message && state === "ready" ? <p className="text-sm text-[color:var(--text-danger)]" role="alert">{message}</p> : null}

      {state === "ready" && totalFiltered > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--line-ghost)] pt-4 text-sm text-ink-muted">
          <span>显示 {formatNumber((page - 1) * PAGE_SIZE + 1)} 至 {formatNumber(Math.min(page * PAGE_SIZE, totalFiltered))}，共 {formatNumber(totalFiltered)} 条</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="h-9 min-h-9 px-2.5" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || refreshing} aria-label="上一页"><ChevronLeft aria-hidden="true" className="size-4" /></Button>
            <span className="min-w-16 text-center text-xs tabular-nums">第 {page} / {totalPages} 页</span>
            <Button variant="secondary" className="h-9 min-h-9 px-2.5" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || refreshing} aria-label="下一页"><ChevronRight aria-hidden="true" className="size-4" /></Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FeedbackList({ feedback, expandedId, resolvingId, onResolve, onToggle }: { feedback: AdminFeedbackItem[]; expandedId: string; resolvingId: string; onResolve: (id: string) => void; onToggle: (id: string) => void }) {
  return (
    <div className="divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
      {feedback.map((item) => {
        const expanded = expandedId === item.id;
        return (
          <article key={item.id} className={cn("py-5", expanded && "bg-[color:var(--surface-read-bg)] px-4 sm:px-5")}>
            <div className="grid gap-4 lg:grid-cols-[minmax(185px,0.7fr)_minmax(280px,1.35fr)_minmax(180px,0.8fr)_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <MessageSquareText aria-hidden="true" className="size-4 text-[color:var(--aurora)]" />
                  <span className="text-sm font-semibold text-ink-primary">{item.category}</span>
                  <StatusBadge resolved={Boolean(item.resolvedAt)} />
                </div>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted"><PlatformIcon platform={item.platform} />{platformLabel(item.platform)} · {formatDateTime(item.createdAt)}</p>
              </div>
              <p className={cn("text-sm leading-6 text-ink-secondary", !expanded && "line-clamp-2")}>{item.content}</p>
              <div className="text-xs leading-5 text-ink-muted">
                <p className="flex items-center gap-1.5"><UserRound aria-hidden="true" className="size-3.5" />{item.userId ? "登录用户" : "游客反馈"}</p>
                <p className="mt-1 truncate">{item.contactEmail || "未留下邮箱"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-self-end">
                {!item.resolvedAt ? <Button variant="secondary" className="border border-[color:var(--line-ghost)] px-3" onClick={() => onResolve(item.id)} disabled={resolvingId === item.id} aria-label="解决反馈">
                  <CheckCircle2 aria-hidden="true" className="size-4" />
                  {resolvingId === item.id ? "保存中" : "解决反馈"}
                </Button> : null}
                <Button variant="secondary" className="border border-[color:var(--line-ghost)] px-3" onClick={() => onToggle(item.id)} aria-expanded={expanded} aria-label={expanded ? "收起反馈详情" : "展开反馈详情"}>
                  {expanded ? <X aria-hidden="true" className="size-4" /> : <Clock3 aria-hidden="true" className="size-4" />}
                  {expanded ? "收起" : "查看详情"}
                </Button>
              </div>
            </div>
            {expanded ? <FeedbackDetails item={item} /> : null}
          </article>
        );
      })}
    </div>
  );
}

function FeedbackDetails({ item }: { item: AdminFeedbackItem }) {
  return (
    <div className="mt-5 grid gap-5 border-t border-[color:var(--line-ghost)] pt-5 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div>
        <p className="mb-2 text-xs font-medium text-ink-muted">完整反馈</p>
        <p className="whitespace-pre-wrap text-sm leading-7 text-ink-primary">{item.content}</p>
      </div>
      <dl className="grid gap-3 border-l border-[color:var(--line-ghost)] pl-5 text-xs leading-5 text-ink-muted">
        <div><dt>反馈来源</dt><dd className="mt-0.5 font-medium text-ink-secondary">{platformLabel(item.platform)}</dd></div>
        <div><dt>提交时间</dt><dd className="mt-0.5 font-medium text-ink-secondary">{formatDateTime(item.createdAt)}</dd></div>
        <div><dt>联系邮箱</dt><dd className="mt-0.5 break-all font-medium text-ink-secondary">{item.contactEmail || "未留下邮箱"}</dd></div>
        <div><dt>处理状态</dt><dd className="mt-0.5 font-medium text-ink-secondary">{item.resolvedAt ? `已于 ${formatDateTime(item.resolvedAt)} 处理` : "待处理"}</dd></div>
      </dl>
    </div>
  );
}

function StatusBadge({ resolved }: { resolved: boolean }) {
  return resolved
    ? <span className="rounded-sm bg-[#e7f1ec] px-1.5 py-0.5 text-[10px] font-medium text-[#356a55]">已处理</span>
    : <span className="rounded-sm bg-[#fff1dc] px-1.5 py-0.5 text-[10px] font-medium text-[#8a5c1a]">待处理</span>;
}

function PlatformIcon({ platform }: { platform: AdminFeedbackItem["platform"] }) {
  return platform === "miniprogram"
    ? <Smartphone aria-hidden="true" className="size-3.5" />
    : <CheckCircle2 aria-hidden="true" className="size-3.5" />;
}

function platformLabel(platform: AdminFeedbackItem["platform"]) {
  return platform === "miniprogram" ? "小程序" : "网页";
}

function AdminStat({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "warn" }) {
  return <div><div className={cn("font-display text-2xl font-semibold tabular-nums", tone === "warn" ? "text-[#98652a]" : "text-ink-primary")}>{formatNumber(value)}</div><div className="mt-1 text-xs text-ink-muted">{label}</div></div>;
}

function LoadingState() {
  return <div className="space-y-5 border-y border-[color:var(--line-ghost)] py-5" aria-label="正在读取反馈" aria-busy="true"><div className="loading-line w-32" /><div className="loading-line w-3/4" /><div className="loading-line w-1/2" /></div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}
