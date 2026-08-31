"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ChevronDown, ExternalLink, RefreshCw, Search, Settings2, SlidersHorizontal } from "lucide-react";
import { motion } from "motion/react";
import { APPLICATION_PRIORITY_LABELS } from "@/lib/constants";
import { fetchMyApplications, updateApplication } from "@/lib/applications";
import { getNextAction } from "@/lib/career-workspace";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDateTime, isValidHttpUrl, sanitizeApplicationUrl } from "@/lib/utils";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { ApplicationWorkflowEditor } from "@/components/applications/ApplicationWorkflowRail";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";
import { layoutTransition } from "@/lib/motion";
import {
  cloneDefaultApplicationWorkflow,
  getApplicationWorkflow,
  getApplicationWorkflowLabel,
  getApplicationWorkflowNode,
  isApplicationCustomStage,
  type ApplicationWorkflowNode,
} from "@/lib/application-workflow";

type StageGroup = "" | "preparing" | "waiting" | "interview" | "offer" | "ended";
type FreshnessFilter = "" | "today" | "within7" | "over7" | "over14" | "overdueAction";
type ApplicationSort = "attention" | "recent" | "company";

const INTERVIEW_STATUSES: ApplicationStatus[] = ["written_test", "first_round", "second_round", "final_round"];
const ENDED_STATUSES: ApplicationStatus[] = ["rejected", "withdrawn"];

export function MyApplicationsClient({ loginNextPath = "/my-applications" }: { loginNextPath?: string }) {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [drawerApplication, setDrawerApplication] = useState<ApplicationWithJob | null>(null);
  const [workflowEditorApplication, setWorkflowEditorApplication] = useState<ApplicationWithJob | null>(null);
  const [keyword, setKeyword] = useState("");
  const [stageGroup, setStageGroup] = useState<StageGroup>("");
  const [freshness, setFreshness] = useState<FreshnessFilter>("");
  const [sort, setSort] = useState<ApplicationSort>("recent");
  const [workflowSaving, setWorkflowSaving] = useState(false);
  const [endedExpanded, setEndedExpanded] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const loadRequestRef = useRef(0);

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    setLoadError("");
    try {
      if (!isSupabaseConfigured()) {
        setLoadError("投递记录暂时无法读取，请稍后重试。");
        return;
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        setRedirecting(true);
        router.replace(`/login?next=${encodeURIComponent(loginNextPath)}`);
        return;
      }
      setRedirecting(false);
      const applicationRows = await fetchMyApplications(supabase, user.id);
      if (requestId !== loadRequestRef.current) return;
      setApplications(applicationRows);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setLoadError("投递记录暂时无法读取，请稍后重试。");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => {
      window.clearTimeout(timer);
      loadRequestRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginNextPath]);

  const stageCounts = useMemo(() => ({
    all: applications.length,
    preparing: applications.filter((item) => item.status === "opened").length,
    waiting: applications.filter((item) => item.status === "applied").length,
    interview: applications.filter((item) => INTERVIEW_STATUSES.includes(item.status)).length,
    offer: applications.filter((item) => item.status === "offer").length,
    ended: applications.filter((item) => ENDED_STATUSES.includes(item.status)).length,
  }), [applications]);

  const staleCount = applications.filter((application) => isActive(application) && getDaysSinceUpdate(application) >= 7).length;

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return applications
      .filter((application) => {
        const workflow = getApplicationWorkflow(application);
        const matchesKeyword = !key || [
          application.job.company_name,
          application.applied_position ?? "",
          application.job.job_titles ?? "",
          application.job.job_categories.join("、"),
          getApplicationWorkflowLabel(application, workflow),
        ].some((value) => value.toLowerCase().includes(key));
        return matchesKeyword
          && matchesStageGroup(application, stageGroup)
          && matchesFreshness(application, freshness);
      })
      .sort((a, b) => compareApplications(a, b, sort));
  }, [applications, freshness, keyword, sort, stageGroup]);

  const activeApplications = useMemo(
    () => filtered.filter((application) => isActive(application)),
    [filtered],
  );
  const endedApplications = useMemo(
    () => filtered.filter((application) => !isActive(application)),
    [filtered],
  );

  function handleApplicationChanged(nextApplication: ApplicationWithJob) {
    setApplications((current) => current.map((application) => application.id === nextApplication.id ? nextApplication : application));
    setDrawerApplication((current) => current?.id === nextApplication.id ? nextApplication : current);
    setWorkflowEditorApplication((current) => current?.id === nextApplication.id ? nextApplication : current);
  }

  function handleApplicationDeleted(applicationId: string) {
    setApplications((current) => current.filter((application) => application.id !== applicationId));
    setDrawerApplication((current) => current?.id === applicationId ? null : current);
    setWorkflowEditorApplication((current) => current?.id === applicationId ? null : current);
  }

  function openWorkflowEditor(application: ApplicationWithJob) {
    setDrawerApplication(null);
    setWorkflowEditorApplication(application);
  }

  async function handleWorkflowSave(nodes: ApplicationWorkflowNode[]) {
    const application = workflowEditorApplication;
    if (!application || workflowSaving) return;
    const previousNodes = getApplicationWorkflow(application);
    const previousCurrentNode = getApplicationWorkflowNode(application, previousNodes);
    const nextCurrentNode = ENDED_STATUSES.includes(application.status)
      ? null
      : nodes.find((node) => node.id === previousCurrentNode?.id)
        ?? nodes.find((node) => node.status === application.status)
        ?? null;
    const optimistic: ApplicationWithJob = {
      ...application,
      workflow_nodes: nodes,
      workflow_node_id: nextCurrentNode?.id ?? null,
      custom_stage_label: nextCurrentNode?.isCustom ? nextCurrentNode.label : null,
      updated_at: new Date().toISOString(),
    };
    setWorkflowSaving(true);
    setWorkspaceMessage("");
    handleApplicationChanged(optimistic);
    try {
      const updated = await updateApplication(createClient(), application.id, {
        workflow_nodes: nodes,
        workflow_node_id: optimistic.workflow_node_id,
        custom_stage_label: optimistic.custom_stage_label,
      });
      handleApplicationChanged({ ...optimistic, ...updated, job: application.job });
      setWorkflowEditorApplication(null);
      setWorkspaceMessage(`${application.job.company_name} · ${getApplicationJobLabel(application)} 的独立投递流程已保存。`);
    } catch (error) {
      handleApplicationChanged(application);
      setWorkspaceMessage(error instanceof Error ? error.message : "岗位流程保存失败，请稍后重试。");
    } finally {
      setWorkflowSaving(false);
    }
  }

  function clearFilters() {
    setKeyword("");
    setStageGroup("");
    setFreshness("");
    setSort("recent");
  }

  const filtersActive = Boolean(keyword || stageGroup || freshness || sort !== "recent");
  const endedOpen = endedExpanded || stageGroup === "ended";

  return (
    <div className="observatory-page space-y-7">
      <section className="page-hero">
        <div>
          <p className="page-kicker">投递总览</p>
          <h1 className="page-title">投递管理</h1>
          <p className="page-description">一条投递对应一家公司与一个岗位，进度和跟进信息独立保存。</p>
        </div>
        <div className="progress-summary grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-3 md:grid-cols-4 md:px-5">
          <StatBlock value={applications.length} label="全部岗位" />
          <StatBlock value={stageCounts.interview} label="笔试 / 面试" />
          <StatBlock value={stageCounts.offer} label="收到 Offer" />
          <StatBlock value={staleCount} label="7 天以上无进展" urgent={staleCount > 0} />
        </div>
      </section>

      {loading || redirecting ? (
        <div className="empty-state"><span className="loading-line">{redirecting ? "正在前往登录" : "正在整理投递记录"}</span></div>
      ) : loadError ? (
        <section className="empty-state border-y border-[color:var(--line-ghost)]" role="alert">
          <div><h2>投递记录暂时无法读取</h2><p>{loadError}</p><Button className="mt-5" onClick={loadData}>重试</Button></div>
        </section>
      ) : applications.length === 0 ? (
        <section className="empty-state border-y border-[color:var(--line-ghost)]">
          <div><h2>还没有投递记录</h2><p>先从岗位坐标收录一个岗位，再在这里补充实际投递岗位并管理进度。</p><Link href="/explore" className="gold-button mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-medium">去岗位坐标</Link></div>
        </section>
      ) : (
        <>
          {workspaceMessage ? <div className="info-banner px-4 py-3 text-sm" role="status">{workspaceMessage}</div> : null}

          <section className="border-y border-[color:var(--line-ghost)]">
            <div className="flex flex-wrap items-end justify-between gap-4 px-1 py-4">
              <div>
                <h2 className="section-title">投递记录</h2>
                <p className="mt-1 text-xs text-ink-muted">最近进展按该投递最后一次状态或信息更新时间计算。</p>
              </div>
              <span className="text-sm tabular-nums text-ink-muted">{filtered.length} / {applications.length}</span>
            </div>

            <div className="flex gap-1 overflow-x-auto border-y border-[color:var(--line-ghost)] py-2" role="group" aria-label="按投递进程筛选">
              <StageFilterButton label="全部" count={stageCounts.all} active={!stageGroup} onClick={() => setStageGroup("")} />
              <StageFilterButton label="准备投递" count={stageCounts.preparing} active={stageGroup === "preparing"} onClick={() => setStageGroup("preparing")} />
              <StageFilterButton label="已投待反馈" count={stageCounts.waiting} active={stageGroup === "waiting"} onClick={() => setStageGroup("waiting")} />
              <StageFilterButton label="笔试 / 面试" count={stageCounts.interview} active={stageGroup === "interview"} onClick={() => setStageGroup("interview")} />
              <StageFilterButton label="Offer" count={stageCounts.offer} active={stageGroup === "offer"} onClick={() => setStageGroup("offer")} />
              <StageFilterButton label="已结束" count={stageCounts.ended} active={stageGroup === "ended"} onClick={() => setStageGroup("ended")} />
            </div>

            <div className="grid gap-3 py-4 md:grid-cols-[minmax(220px,1fr)_210px_180px_auto]">
              <div className="relative">
                <label htmlFor="application-search" className="sr-only">搜索公司、岗位或自定义进程</label>
                <Search aria-hidden="true" className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70" />
                <Input id="application-search" type="search" autoComplete="off" className="pl-7" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索公司、岗位或进程" />
              </div>
              <Select value={freshness} onChange={(event) => setFreshness(event.target.value as FreshnessFilter)} aria-label="按最近进展筛选">
                <option value="">全部更新时间</option>
                <option value="today">今天有进展</option>
                <option value="within7">7 天内有进展</option>
                <option value="over7">7 天以上无进展</option>
                <option value="over14">14 天以上无进展</option>
                <option value="overdueAction">下一步已逾期</option>
              </Select>
              <Select value={sort} onChange={(event) => setSort(event.target.value as ApplicationSort)} aria-label="投递记录排序">
                <option value="recent">最近更新优先（默认）</option>
                <option value="attention">需要关注优先</option>
                <option value="company">按公司名称</option>
              </Select>
              <div className="flex gap-2">
                {filtersActive ? <Button variant="secondary" className="gap-2" onClick={clearFilters}><SlidersHorizontal aria-hidden="true" className="size-4" />清除</Button> : null}
                <Button variant="secondary" className="gap-2" onClick={loadData}><RefreshCw aria-hidden="true" className="size-4" />刷新</Button>
              </div>
            </div>
          </section>

          {filtered.length === 0 ? (
            <div className="empty-state border-y border-[color:var(--line-ghost)]"><div><h3>没有符合条件的投递</h3><p>调整进程、更新时间或搜索条件后再试。</p><Button variant="secondary" className="mt-4" onClick={clearFilters}>清除筛选</Button></div></div>
          ) : (
            <section aria-label="投递岗位清单" className="space-y-7">
              {activeApplications.length > 0 ? (
                <div>
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[color:var(--line-ghost)] pb-3">
                    <div>
                      <h2 className="section-title">进行中的投递</h2>
                      <p className="mt-1 text-xs text-ink-muted">每一行就是一条投递，可单独记录实际岗位与进度。</p>
                    </div>
                    <span className="text-xs tabular-nums text-ink-muted">{activeApplications.length} 条投递</span>
                  </div>
                  <div className="mt-4 divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
                    {activeApplications.map((application) => (
                      <motion.div key={application.id} layout="position" transition={layoutTransition}>
                        <ApplicationListRow
                          application={application}
                          onOpen={() => setDrawerApplication(application)}
                          onEditWorkflow={() => openWorkflowEditor(application)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : null}

              {endedApplications.length > 0 ? (
                <section className="border-y border-[color:var(--line-ghost)]" aria-label="已结束的投递">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center justify-between gap-4 px-1 py-3 text-left"
                    aria-expanded={endedOpen}
                    onClick={() => setEndedExpanded((expanded) => !expanded)}
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink-primary">已结束</span>
                      <span className="mt-1 block text-xs text-ink-muted">{endedApplications.length} 条投递 · 默认收起，按需查看</span>
                    </span>
                    <ChevronDown aria-hidden="true" className={`size-5 shrink-0 text-ink-muted transition-transform ${endedOpen ? "rotate-180" : ""}`} />
                  </button>
                  {endedOpen ? (
                    <div className="divide-y divide-[color:var(--line-ghost)] border-t border-[color:var(--line-ghost)]">
                      {endedApplications.map((application) => (
                        <motion.div key={application.id} layout="position" transition={layoutTransition}>
                          <ApplicationListRow
                            application={application}
                            ended
                            onOpen={() => setDrawerApplication(application)}
                            onEditWorkflow={() => openWorkflowEditor(application)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : null}
                </section>
              ) : null}
            </section>
          )}
        </>
      )}

      <ProgressDrawer
        application={drawerApplication}
        workflowNodes={drawerApplication ? getApplicationWorkflow(drawerApplication) : cloneDefaultApplicationWorkflow()}
        open={Boolean(drawerApplication)}
        onClose={() => setDrawerApplication(null)}
        onChanged={handleApplicationChanged}
        onDeleted={handleApplicationDeleted}
        onEditWorkflow={openWorkflowEditor}
      />
      {workflowEditorApplication ? (
        <ApplicationWorkflowEditor
          open
          companyName={`${workflowEditorApplication.job.company_name} · ${getApplicationJobLabel(workflowEditorApplication)}`}
          nodes={getApplicationWorkflow(workflowEditorApplication)}
          saving={workflowSaving}
          onClose={() => setWorkflowEditorApplication(null)}
          onSave={handleWorkflowSave}
        />
      ) : null}
    </div>
  );
}

function ApplicationListRow({ application, ended = false, onOpen, onEditWorkflow }: {
  application: ApplicationWithJob;
  ended?: boolean;
  onOpen: () => void;
  onEditWorkflow: () => void;
}) {
  const workflow = getApplicationWorkflow(application);
  const nextAction = getNextAction(application);
  const recency = getRecencyInfo(application);
  const priorityKey = (application.priority ?? 0) as keyof typeof APPLICATION_PRIORITY_LABELS;
  const priorityLabel = APPLICATION_PRIORITY_LABELS[priorityKey] ?? APPLICATION_PRIORITY_LABELS[0];
  const jobMeta = [application.job.locations, application.job.industry, application.job.batch_type].filter(Boolean).join(" · ");
  const jobTitle = getApplicationJobLabel(application);
  const officialUrl = isValidHttpUrl(application.job.apply_url) ? sanitizeApplicationUrl(application.job.apply_url) : undefined;
  return (
    <article className={`data-row grid gap-4 px-3 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,1fr)_minmax(215px,0.75fr)] lg:items-center lg:px-4 ${ended ? "opacity-80" : ""}`}>
      <button type="button" className="min-w-0 text-left" onClick={onOpen}>
        <span className="block truncate text-lg font-semibold leading-6 tracking-tight text-ink-primary">{application.job.company_name}</span>
        <span className="mt-0.5 block truncate text-sm font-normal leading-5 text-ink-secondary">{jobTitle}</span>
        <span className="mt-1 block truncate text-xs text-ink-secondary">{jobMeta || application.job.job_categories.join("、") || "岗位信息待补充"}</span>
      </button>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <button type="button" className="min-w-0 text-left" onClick={onOpen}>
          <div className="flex items-center gap-2">
            <StatusPill status={application.status} label={getApplicationWorkflowLabel(application, workflow)} custom={isApplicationCustomStage(application, workflow)} className="px-2 py-1 text-[11px]" />
            <span className="text-[10px] text-ink-muted">{workflow.length} 节点</span>
          </div>
          <span className={recency.urgent ? "mt-2 block text-xs font-medium text-[color:var(--text-danger)]" : "mt-2 block text-xs font-medium text-ink-secondary"}>{recency.label}</span>
          <span className="mt-1 block text-[10px] text-ink-muted">{formatDateTime(application.updated_at)}</span>
        </button>

        <button type="button" className="min-w-0 text-left" onClick={onOpen}>
          <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted">下一步</span>
          <span className="mt-1 block truncate text-xs font-medium text-ink-secondary">{nextAction.title}</span>
          <span className="mt-1 block truncate text-[10px] text-ink-muted">{application.next_action_at ? `计划 ${formatDateTime(application.next_action_at)}` : nextAction.detail}</span>
          {priorityLabel !== "未设置" ? <span className="mt-1 block text-[10px] text-ink-muted">{priorityLabel}</span> : null}
        </button>
      </div>

      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1 lg:justify-items-end">
        {officialUrl ? (
          <a href={officialUrl} target="_blank" rel="noreferrer" className="gold-button inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold">
            <ExternalLink aria-hidden="true" className="size-3.5" />打开官网
          </a>
        ) : (
          <span className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[color:var(--surface-subtle-bg)] px-3 text-center text-[10px] text-ink-muted">官网链接待补充</span>
        )}
        <button type="button" className="text-action inline-flex min-h-9 justify-center gap-1.5 rounded-lg px-2 text-xs" onClick={onOpen} aria-label={`查看 ${application.job.company_name} ${jobTitle} 详情`}>
          查看详情<ArrowRight aria-hidden="true" className="size-3.5" />
        </button>
        <button type="button" className="text-action col-span-2 justify-self-end px-2 text-[11px]" onClick={onEditWorkflow}>
          <Settings2 aria-hidden="true" className="size-3.5" />编辑当前岗位流程
        </button>
      </div>
    </article>
  );
}

function StageFilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" className={active ? "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md bg-[color:var(--aurora)] px-3 text-xs text-[color:var(--text-inverse)]" : "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs text-ink-secondary hover:bg-[color:var(--surface-hover-bg)]"} aria-pressed={active} onClick={onClick}>
      {label}<span className={active ? "tabular-nums opacity-65" : "tabular-nums text-ink-muted"}>{count}</span>
    </button>
  );
}

function StatBlock({ value, label, urgent = false }: { value: number; label: string; urgent?: boolean }) {
  return <div><div className={urgent ? "font-display text-2xl font-semibold leading-none tabular-nums text-[color:var(--text-danger)] md:text-3xl" : "font-display text-2xl font-semibold leading-none tabular-nums text-ink-primary md:text-3xl"}>{value}</div><div className="mt-2 whitespace-nowrap text-xs text-ink-muted">{label}</div></div>;
}

function getApplicationJobLabel(application: ApplicationWithJob) {
  return application.applied_position?.trim() || application.job.job_titles?.trim() || application.job.job_categories.join("、") || "岗位待补充";
}

function matchesStageGroup(application: ApplicationWithJob, group: StageGroup) {
  if (!group) return true;
  if (group === "preparing") return application.status === "opened";
  if (group === "waiting") return application.status === "applied";
  if (group === "interview") return INTERVIEW_STATUSES.includes(application.status);
  if (group === "offer") return application.status === "offer";
  return ENDED_STATUSES.includes(application.status);
}

function matchesFreshness(application: ApplicationWithJob, filter: FreshnessFilter) {
  if (!filter) return true;
  const days = getDaysSinceUpdate(application);
  if (filter === "today") return days === 0;
  if (filter === "within7") return days <= 7;
  if (filter === "over7") return isActive(application) && days >= 7;
  if (filter === "over14") return isActive(application) && days >= 14;
  return isActive(application) && Boolean(application.next_action_at) && new Date(application.next_action_at as string).getTime() < Date.now();
}

function compareApplications(a: ApplicationWithJob, b: ApplicationWithJob, sort: ApplicationSort) {
  if (sort === "company") return a.job.company_name.localeCompare(b.job.company_name, "zh-CN");
  if (sort === "recent") return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  const aNeedsAttention = isActive(a) ? getDaysSinceUpdate(a) : -1;
  const bNeedsAttention = isActive(b) ? getDaysSinceUpdate(b) : -1;
  if (aNeedsAttention !== bNeedsAttention) return bNeedsAttention - aNeedsAttention;
  const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
  if (priorityDelta !== 0) return priorityDelta;
  return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
}

function getDaysSinceUpdate(application: ApplicationWithJob) {
  return Math.max(0, Math.floor((Date.now() - new Date(application.updated_at).getTime()) / 86_400_000));
}

function getRecencyInfo(application: ApplicationWithJob) {
  const days = getDaysSinceUpdate(application);
  if (days === 0) return { label: "今天有进展", urgent: false };
  if (days < 7) return { label: `${days} 天前更新`, urgent: false };
  if (isActive(application)) return { label: `${days} 天无新进展`, urgent: true };
  return { label: `${days} 天前结束`, urgent: false };
}

function isActive(application: ApplicationWithJob) {
  return !["offer", "rejected", "withdrawn"].includes(application.status);
}
