"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronDown,
  Download,
  FileText,
  Gauge,
  Layers3,
  RefreshCw,
  ShieldCheck,
  Target,
  UserRoundPlus,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  fetchAdminAnalytics,
  type AdminAnalyticsRange,
  type AdminAnalyticsRank,
  type AdminAnalyticsResponse,
} from "@/lib/admin-analytics";
import type { ApplicationStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type TrendMetric = "activeUsers" | "newUsers" | "events";

const RANGE_OPTIONS: Array<{ value: AdminAnalyticsRange; label: string }> = [
  { value: 7, label: "近 7 天" },
  { value: 14, label: "近 14 天" },
  { value: 30, label: "近 30 天" },
  { value: 90, label: "近 90 天" },
];

const TREND_OPTIONS: Array<{ value: TrendMetric; label: string }> = [
  { value: "activeUsers", label: "活跃用户" },
  { value: "newUsers", label: "新增用户" },
  { value: "events", label: "关键动作" },
];

const statusTone: Record<ApplicationStatus, string> = {
  opened: "#718096",
  applied: "#45678D",
  written_test: "#3567A8",
  first_round: "#4C78B5",
  second_round: "#5F8FCB",
  final_round: "#6F9DD2",
  offer: "#3F7658",
  rejected: "#B14B57",
  withdrawn: "#9BAAC0",
};

export function AdminAnalyticsClient() {
  const [range, setRange] = useState<AdminAnalyticsRange>(30);
  const [data, setData] = useState<AdminAnalyticsResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setState("loading");
    setMessage("");
    try {
      const result = await fetchAdminAnalytics(range);
      setData(result);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "分析数据暂时无法读取，请稍后重试。");
    } finally {
      setRefreshing(false);
    }
  }, [range]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function exportCsv() {
    if (!data) return;
    const header = ["日期", "新增用户", "活跃用户", "关键动作", "投递记录", "新建简历"];
    const rows = data.trend.map((item) => [item.date, item.newUsers, item.activeUsers, item.events, item.applications, item.resumes]);
    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `starjob-analytics-${data.period.rangeDays}d.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  if (state === "loading" && !data) return <AnalyticsSkeleton />;

  if (state === "error" && !data) {
    return (
      <section className="analytics-empty rounded-2xl border border-[#e2e6ed] bg-white px-6 py-16 text-center shadow-[0_12px_32px_rgba(18,41,78,0.05)]">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-[#E8EDF4] text-[#12294E]">
          <Activity aria-hidden="true" className="size-5" />
        </div>
        <h1 className="mt-5 text-lg font-semibold text-[#12294E]">数据分析暂时不可用</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e6e73]">{message || "请确认管理员权限和数据服务状态。"}</p>
        <Button className="mt-6" onClick={() => void load()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          刷新数据
        </Button>
      </section>
    );
  }

  if (!data) return null;

  const periodLabel = RANGE_OPTIONS.find((option) => option.value === data.period.rangeDays)?.label ?? "统计周期";

  return (
    <div className="space-y-7 pb-12">
      <section className="flex flex-col gap-5 border-b border-[#dfe4eb] pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="page-kicker">数据洞察</p>
          <h1 className="page-title">运营总览</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#626b78]">查看用户增长、使用路径和投递行为，快速定位需要关注的产品信号。</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="analytics-range">统计周期</label>
          <div className="relative">
            <select
              id="analytics-range"
              value={range}
              onChange={(event) => setRange(Number(event.target.value) as AdminAnalyticsRange)}
              className="h-10 appearance-none rounded-lg border border-[#D7DEE8] bg-white px-3 pr-9 text-sm font-medium text-[#40536F] outline-none transition focus:border-[#3567A8] focus:ring-2 focus:ring-[#3567A8]/15"
            >
              {RANGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#6e7785]" />
          </div>
          <Button variant="secondary" className="h-10 min-h-10 border border-[#d7dde6] bg-white px-3 text-[#3a4656] hover:bg-[#f4f6f8]" onClick={() => void load(true)} disabled={refreshing}>
            <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />
            {refreshing ? "读取中" : "刷新"}
          </Button>
          <Button variant="secondary" className="h-10 min-h-10 border border-[#d7dde6] bg-white px-3 text-[#3a4656] hover:bg-[#f4f6f8]" onClick={exportCsv}>
            <Download aria-hidden="true" className="size-4" />
            导出趋势
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#6e7785]">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rounded-full bg-[#2c866d]" />
          <span>数据已更新</span>
          <span className="text-[#a1a8b2]">{formatDateTime(data.generatedAt)}</span>
        </div>
        <span>{periodLabel} · 仅管理员可见</span>
      </div>

      {data.warnings.length > 0 ? (
        <div className="border-l-2 border-[#b27b2c] bg-[#fff8eb] px-4 py-3 text-sm leading-6 text-[#704018]" role="status">
          部分数据源未纳入统计：{data.warnings.join(" ")}
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="核心指标">
        <MetricCard icon={UsersRound} label="用户总量" value={formatNumber(data.summary.totalUsers)} note={`本期新增 ${formatNumber(data.summary.newUsers)} 人`} />
        <MetricCard icon={Activity} label={`${periodLabel}活跃`} value={formatNumber(data.summary.activeUsers)} comparison={compare(data.summary.activeUsers, data.summary.previousActiveUsers)} note="有事件记录的去重用户" />
        <MetricCard icon={UserRoundPlus} label="新增用户" value={formatNumber(data.summary.newUsers)} comparison={compare(data.summary.newUsers, data.summary.previousNewUsers)} note="按注册时间统计" />
        <MetricCard icon={Gauge} label="关键动作" value={formatNumber(data.summary.events)} comparison={compare(data.summary.events, data.summary.previousEvents)} note={`人均 ${formatAverage(data.summary.events, data.summary.activeUsers)} 次`} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <TrendPanel data={data} />
        <Panel title="用户活跃分层" icon={UsersRound} meta={`${periodLabel}用户状态`}>
          <div className="space-y-5">
            {data.activeSegments.map((segment, index) => (
              <SegmentRow key={segment.label} segment={segment} index={index} />
            ))}
          </div>
          <div className="mt-6 border-t border-[#edf0f4] pt-4 text-xs leading-5 text-[#7a8491]">
            回访用户指前后两个同长度周期均有事件记录的用户。
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="使用链路" icon={Target} meta="本期去重用户">
          <div className="space-y-4">
            {data.funnel.map((step) => (
              <div key={step.label} className="grid grid-cols-[92px_minmax(0,1fr)_52px] items-center gap-3 text-sm">
                <span className="truncate text-[#596474]">{step.label}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]">
                <div className="h-full rounded-full bg-[#3567A8] transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(step.rate, step.value > 0 ? 2 : 0))}%` }} />
                </div>
                <span className="text-right font-mono text-xs text-[#25364e]">{formatNumber(step.value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#edf0f4] pt-4 text-xs text-[#7a8491] sm:grid-cols-4">
            <SmallStat label="新建简历" value={formatNumber(data.summary.resumes)} />
            <SmallStat label="投递记录" value={formatNumber(data.summary.applications)} />
            <SmallStat label="内推码" value={formatNumber(data.summary.referralCodes)} />
            <SmallStat label="反馈" value={formatNumber(data.summary.feedback)} />
          </div>
        </Panel>
        <ApplicationStatusPanel data={data} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(300px,0.86fr)]">
        <RankPanel title="目标岗位" icon={Target} items={data.topRoles} empty="用户暂未填写目标岗位" />
        <RankPanel title="意向地区" icon={BriefcaseBusiness} items={data.topRegions} empty="用户暂未填写意向地区" />
        <Panel title="运营提醒" icon={ShieldCheck} meta="需要人工关注">
          <div className="space-y-1">
            <SignalRow label="活跃岗位" value={formatNumber(data.summary.activeJobs)} detail={`共 ${formatNumber(data.summary.totalJobs)} 条`} tone="neutral" />
            <SignalRow label="待审核内推码" value={formatNumber(data.moderation.queuedReferralCodes)} detail="当前周期" tone={data.moderation.queuedReferralCodes > 0 ? "warn" : "neutral"} />
            <SignalRow label="未解决反馈" value={formatNumber(data.moderation.unresolvedFeedback)} detail="当前周期" tone={data.moderation.unresolvedFeedback > 0 ? "warn" : "neutral"} />
            <SignalRow label="已下架内推码" value={formatNumber(data.moderation.rejectedReferralCodes)} detail="当前周期" tone="neutral" />
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <RankPanel title="投递热度" icon={BriefcaseBusiness} items={data.topCompanies} empty="本期还没有投递记录" showUsers />
        <EventPanel events={data.events} />
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, note, comparison }: { icon: LucideIcon; label: string; value: string; note: string; comparison?: Comparison }) {
  return (
    <article className="rounded-[14px] border border-[#dde3eb] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(18,41,78,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[#626b78]">{label}</span>
        <span className="flex size-8 items-center justify-center rounded-lg bg-[#E8EDF4] text-[#3567A8]"><Icon aria-hidden="true" className="size-4" /></span>
      </div>
      <div className="mt-5 flex flex-wrap items-baseline gap-2">
        <strong className="font-mono text-[2rem] font-medium leading-none tracking-[-0.05em] text-[#12294E]">{value}</strong>
        {comparison ? <ComparisonBadge comparison={comparison} /> : null}
      </div>
      <p className="mt-3 text-xs text-[#8a929e]">{note}</p>
    </article>
  );
}

function TrendPanel({ data }: { data: AdminAnalyticsResponse }) {
  const [metric, setMetric] = useState<TrendMetric>("activeUsers");
  const points = useMemo(() => data.trend.map((item) => item[metric]), [data.trend, metric]);
  const max = Math.max(...points, 1);
  const width = 720;
  const height = 244;
  const padding = { top: 16, right: 8, bottom: 28, left: 8 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const getX = (index: number) => padding.left + (points.length <= 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const getY = (value: number) => padding.top + innerHeight - (value / max) * innerHeight;
  const linePoints = points.map((value, index) => `${getX(index)},${getY(value)}`).join(" ");
  const areaPoints = `${padding.left},${padding.top + innerHeight} ${linePoints} ${padding.left + innerWidth},${padding.top + innerHeight}`;
  const labelStep = Math.max(1, Math.ceil(data.trend.length / 6));
  const metricLabel = TREND_OPTIONS.find((option) => option.value === metric)?.label ?? "趋势";

  return (
    <Panel title="增长趋势" icon={Layers3} meta={`${data.period.rangeDays} 天 · 每日汇总`}>
      <div className="flex flex-col gap-3 border-b border-[#edf0f4] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[#626b78]">{metricLabel}变化</p>
        <div className="flex w-fit rounded-lg bg-[#f2f4f7] p-1" role="group" aria-label="趋势指标">
          {TREND_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMetric(option.value)}
              aria-pressed={metric === option.value}
              className={cn(
                "rounded-md px-2.5 py-1.5 text-xs font-medium text-[#7a8491] transition",
                metric === option.value ? "bg-white text-[#12294E] shadow-sm" : "hover:text-[#40536F]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {points.length > 0 ? (
        <div className="mt-5">
          <div className="relative h-[244px] w-full">
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between text-[10px] font-mono text-[#9aa3af]">
              <span>{formatNumber(max)}</span>
              <span>{formatNumber(Math.round(max / 2))}</span>
              <span>0</span>
            </div>
            <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${metricLabel}趋势图`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="admin-analytics-area" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#3567A8" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#3567A8" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {[0, 0.5, 1].map((ratioValue) => <line key={ratioValue} x1={padding.left} x2={padding.left + innerWidth} y1={getY(max * ratioValue)} y2={getY(max * ratioValue)} stroke="#E5E9F0" strokeWidth="1" />)}
              <polygon points={areaPoints} fill="url(#admin-analytics-area)" />
              <polyline points={linePoints} fill="none" stroke="#3567A8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              {points.map((value, index) => (
                <circle key={data.trend[index]?.date} cx={getX(index)} cy={getY(value)} r="3.5" fill="#ffffff" stroke="#3567A8" strokeWidth="2">
                  <title>{`${data.trend[index]?.label ?? ""}，${metricLabel} ${formatNumber(value)}`}</title>
                </circle>
              ))}
            </svg>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-[#9aa3af]">
              {data.trend.filter((_, index) => index % labelStep === 0 || index === data.trend.length - 1).map((item) => <span key={item.date}>{item.label}</span>)}
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 divide-x divide-[#edf0f4] border-t border-[#edf0f4] pt-4">
            <SmallStat label="关键动作" value={formatNumber(data.summary.events)} />
            <SmallStat label="投递记录" value={formatNumber(data.summary.applications)} />
            <SmallStat label="新建简历" value={formatNumber(data.summary.resumes)} />
          </div>
        </div>
      ) : <EmptyPanel text="本期没有可展示的趋势数据" />}
    </Panel>
  );
}

function ApplicationStatusPanel({ data }: { data: AdminAnalyticsResponse }) {
  return (
    <Panel title="投递状态" icon={FileText} meta={`${data.summary.applications} 条本期记录`}>
      {data.applicationStatuses.length > 0 ? (
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {data.applicationStatuses.map((item) => (
            <div key={item.status} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-[#596474]"><span aria-hidden="true" className="size-2 rounded-full" style={{ background: statusTone[item.status] }} />{item.label}</span>
                <span className="shrink-0 font-mono text-[#25364e]">{formatNumber(item.value)} <span className="text-[#9aa3af]">{formatPercent(item.share)}</span></span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full" style={{ width: `${Math.min(100, item.share)}%`, background: statusTone[item.status] }} /></div>
            </div>
          ))}
        </div>
      ) : <EmptyPanel text="本期还没有投递记录" />}
    </Panel>
  );
}

function RankPanel({ title, icon: Icon, items, empty, showUsers = false }: { title: string; icon: LucideIcon; items: AdminAnalyticsRank[]; empty: string; showUsers?: boolean }) {
  return (
    <Panel title={title} icon={Icon} meta="按用户填写或使用记录">
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.label} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3">
              <span className="font-mono text-xs text-[#9aa3af]">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-[#3d4858]">{item.label}</span>
                  <span className="shrink-0 font-mono text-xs text-[#25364e]">{formatNumber(item.value)}</span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full bg-[#7593bb]" style={{ width: `${Math.min(100, item.share)}%` }} /></div>
              </div>
              <span className="w-20 text-right text-[11px] text-[#89929e]">{showUsers && item.users ? `${formatNumber(item.users)} 人` : formatPercent(item.share)}</span>
            </div>
          ))}
        </div>
      ) : <EmptyPanel text={empty} />}
    </Panel>
  );
}

function EventPanel({ events }: { events: AdminAnalyticsResponse["events"] }) {
  return (
    <Panel title="功能使用" icon={Activity} meta="埋点事件排名">
      {events.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead className="text-[#9199a4]">
              <tr><th className="pb-3 font-medium">事件</th><th className="pb-3 text-right font-medium">次数</th><th className="pb-3 text-right font-medium">用户</th><th className="pb-3 text-right font-medium">最近发生</th></tr>
            </thead>
            <tbody className="divide-y divide-[#edf0f4]">
              {events.map((event) => <tr key={event.name}><td className="py-3 font-medium text-[#3d4858]">{event.label}</td><td className="py-3 text-right font-mono text-[#25364e]">{formatNumber(event.count)}</td><td className="py-3 text-right font-mono text-[#6e7785]">{formatNumber(event.users)}</td><td className="py-3 text-right text-[#89929e]">{event.lastSeen ? formatDateTime(event.lastSeen) : "暂无"}</td></tr>)}
            </tbody>
          </table>
        </div>
      ) : <EmptyPanel text="本期还没有事件记录" />}
    </Panel>
  );
}

function Panel({ title, icon: Icon, meta, children }: { title: string; icon: LucideIcon; meta: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[14px] border border-[#dde3eb] bg-white px-5 py-5 shadow-[0_8px_24px_rgba(18,41,78,0.04)] sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E8EDF4] text-[#3567A8]"><Icon aria-hidden="true" className="size-4" /></span>
          <div className="min-w-0"><h2 className="truncate text-[15px] font-semibold text-[#25364e]">{title}</h2><p className="mt-1 truncate text-[11px] text-[#929aa5]">{meta}</p></div>
        </div>
      </div>
      {children}
    </section>
  );
}

function SegmentRow({ segment, index }: { segment: AdminAnalyticsRank; index: number }) {
  const colors = ["#12294E", "#3567A8", "#6F9DD2", "#D8DEE8"];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm"><span className="text-[#596474]">{segment.label}</span><span className="font-mono text-xs text-[#25364e]">{formatNumber(segment.value)} <span className="text-[#9aa3af]">{formatPercent(segment.share)}</span></span></div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf1f5]"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.min(100, segment.share)}%`, background: colors[index] }} /></div>
    </div>
  );
}

function SignalRow({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "neutral" | "warn" }) {
  return <div className="flex items-center justify-between gap-4 border-b border-[#edf0f4] py-3 last:border-b-0"><div><p className="text-sm text-[#596474]">{label}</p><p className="mt-1 text-[11px] text-[#9aa3af]">{detail}</p></div><span className={cn("font-mono text-lg", tone === "warn" ? "text-[#9b661f]" : "text-[#25364e]")}>{value}</span></div>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="px-3 first:pl-0 last:pr-0"><p className="text-[11px] text-[#929aa5]">{label}</p><p className="mt-1 font-mono text-sm text-[#25364e]">{value}</p></div>;
}

function ComparisonBadge({ comparison }: { comparison: Comparison }) {
  if (comparison.kind === "new") return <span className="text-[11px] font-medium text-[#2c866d]">新</span>;
  if (comparison.kind === "flat") return <span className="font-mono text-[11px] text-[#89929e]">0%</span>;
  const positive = comparison.value > 0;
  return <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium", positive ? "text-[#2c866d]" : "text-[#b85e66")}><span aria-hidden="true">{positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}</span>{Math.abs(comparison.value).toFixed(1)}%</span>;
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="grid min-h-36 place-items-center rounded-lg bg-[#f7f8fa] px-4 text-center text-xs text-[#89929e]">{text}</div>;
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-7" aria-label="正在读取分析数据" aria-busy="true">
      <div className="flex items-end justify-between border-b border-[#dfe4eb] pb-6"><div className="space-y-3"><div className="h-3 w-16 animate-pulse rounded bg-[#dfe4eb]" /><div className="h-9 w-40 animate-pulse rounded bg-[#dfe4eb]" /><div className="h-4 w-72 animate-pulse rounded bg-[#e8ebf0]" /></div><div className="hidden h-10 w-28 animate-pulse rounded-lg bg-[#e8ebf0] sm:block" /></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-36 animate-pulse rounded-[14px] border border-[#e5e9ef] bg-white" />)}</div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]"><div className="h-[430px] animate-pulse rounded-[14px] border border-[#e5e9ef] bg-white" /><div className="h-[430px] animate-pulse rounded-[14px] border border-[#e5e9ef] bg-white" /></div>
    </div>
  );
}

type Comparison = { kind: "new" | "flat" | "change"; value: number };

function compare(current: number, previous: number): Comparison {
  if (previous === 0) return current > 0 ? { kind: "new", value: 0 } : { kind: "flat", value: 0 };
  return { kind: "change", value: ((current - previous) / previous) * 100 };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

function formatAverage(value: number, users: number) {
  if (!users) return "0";
  return (value / users).toFixed(1);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
