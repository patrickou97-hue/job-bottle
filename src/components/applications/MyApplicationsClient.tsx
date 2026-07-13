"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, List, Orbit, RefreshCw, Search, Columns3 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { fetchMyApplications } from "@/lib/applications";
import {
  getMaterialReadiness,
  getApplicationStageLabel,
  getNextAction,
  getPipelineColumns,
  getWorkspaceTasks,
} from "@/lib/career-workspace";
import { getCurrentUserOrNull } from "@/lib/auth";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/utils";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { ApplicationOrbitSystem } from "@/components/applications/ApplicationOrbitSystem";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { ResumeDocument } from "@/lib/resume";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";
import { layoutTransition, motionDuration, motionEase } from "@/lib/motion";

type WorkspaceView = "list" | "board" | "map";

export function MyApplicationsClient({ loginNextPath = "/my-applications" }: { loginNextPath?: string }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [drawerApplication, setDrawerApplication] = useState<ApplicationWithJob | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [view, setView] = useState<WorkspaceView>("list");
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setMessage("请先配置数据库环境变量。");
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
      const [applicationRows, resumeResult] = await Promise.all([
        fetchMyApplications(supabase, user.id),
        fetchMyResumes(supabase).catch((error: unknown) => {
          if (isMissingResumeTableError(error)) return [];
          throw error;
        }),
      ]);
      setApplications(applicationRows);
      setResumes(resumeResult);
    } catch {
      setMessage("读取投递失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginNextPath]);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    return applications.filter((application) => {
      const matchesKeyword =
        !key ||
        application.job.company_name.toLowerCase().includes(key) ||
        (application.job.job_titles ?? "").toLowerCase().includes(key);
      return matchesKeyword && (!status || application.status === status);
    });
  }, [applications, keyword, status]);

  const tasks = useMemo(() => getWorkspaceTasks(applications).slice(0, 4), [applications]);
  const columns = useMemo(() => getPipelineColumns(filtered), [filtered]);
  const activeApplications = applications.filter(
    (application) => !["rejected", "withdrawn", "offer"].includes(application.status),
  );
  const materialReadyCount = applications.filter((application) =>
    getMaterialReadiness(application.job_id, resumes).ready,
  ).length;
  const needsMaterial = applications
    .filter((application) => !["rejected", "withdrawn"].includes(application.status))
    .filter((application) => !getMaterialReadiness(application.job_id, resumes).ready)
    .slice(0, 3);

  function handleApplicationChanged(nextApplication: ApplicationWithJob) {
    setApplications((current) =>
      current.map((application) =>
        application.id === nextApplication.id ? nextApplication : application,
      ),
    );
    setSelected((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
    setDrawerApplication((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
  }

  function handleApplicationDeleted(applicationId: string) {
    setApplications((current) => current.filter((application) => application.id !== applicationId));
    setSelected((current) => (current?.id === applicationId ? null : current));
    setDrawerApplication((current) => (current?.id === applicationId ? null : current));
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">当前阶段</p>
          <h1 className="page-title">投递管理</h1>
          <p className="page-description">{getApplicationPhase(applications)}</p>
        </div>
        <div className="progress-summary grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-3 md:grid-cols-4 md:px-5">
          <StatBlock value={applications.length} label="全部记录" />
          <StatBlock value={activeApplications.length} label="进行中" />
          <StatBlock value={tasks.length} label="待处理" />
          <StatBlock value={materialReadyCount} label="已绑简历" />
        </div>
      </section>

      {message ? <div className="message-banner text-sm">{message}</div> : null}

      {loading || redirecting ? (
        <div className="empty-state">
          <span className="loading-line">{redirecting ? "正在前往登录" : "正在读取投递"}</span>
        </div>
      ) : applications.length === 0 ? (
        <section className="empty-state border-y border-[color:var(--line-ghost)]">
          <div>
            <h2>从一个岗位开始</h2>
            <p>从岗位坐标添加岗位后，在这里更新投递状态</p>
            <Link href="/explore" className="gold-button mt-5 inline-flex rounded-lg px-4 py-2 text-sm font-medium">
              去岗位坐标
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
            <div className="list-surface">
              <div className="section-heading px-4 pt-4 sm:px-5">
                <div>
                  <h2 className="section-title">本周求职行动</h2>
                </div>
                <span className="section-meta">{tasks.length} 项</span>
              </div>
              {tasks.length === 0 ? (
                <div className="px-4 pb-5 text-sm text-ink-muted">当前没有需要处理的投递。</div>
              ) : (
                tasks.map((task) => (
                  <button
                    key={task.application.id}
                    type="button"
                    className="data-row grid w-full grid-cols-[minmax(0,1fr)_auto] gap-4 px-4 text-left sm:px-5"
                    onClick={() => setDrawerApplication(task.application)}
                  >
                    <span className="min-w-0 py-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink-primary">{task.application.job.company_name}</span>
                        <StatusPill status={task.application.status} label={getApplicationStageLabel(task.application)} />
                      </span>
                      <span className="mt-1 block text-sm text-ink-secondary">{task.title}</span>
                      <span className="mt-1 block truncate text-xs text-ink-muted">{task.detail}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="my-auto size-4 text-ink-muted" />
                  </button>
                ))
              )}
            </div>

            <aside className="border-l border-[color:var(--line-ghost)] pl-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">材料准备</h2>
                </div>
                <FileText aria-hidden="true" className="size-5 text-nebula-silver" />
              </div>
              <p className="mt-5 text-3xl font-semibold tabular-nums text-ink-primary">
                {materialReadyCount}<span className="ml-1 text-sm font-medium text-ink-muted">/ {applications.length}</span>
              </p>
              {needsMaterial.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {needsMaterial.map((application) => (
                    <Link key={application.id} href="/resume" className="block border-b border-[color:var(--line-ghost)] pb-3 last:border-b-0">
                      <p className="truncate text-sm font-medium text-ink-primary">{application.job.company_name}</p>
                      <p className="mt-1 text-xs text-ink-muted">{getMaterialReadiness(application.job_id, resumes).label}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink-secondary">进行中的岗位都已经关联简历版本。</p>
              )}
              <Link href="/resume" className="text-action mt-5 text-sm">
                管理简历
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </aside>
          </section>

          <section className="border-y border-[color:var(--line-ghost)] py-4">
            <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
              <div className="relative">
                <Search aria-hidden="true" className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70" />
                <Input className="pl-7" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索公司或岗位" />
              </div>
              <Select value={status} onChange={(event) => setStatus(event.target.value as ApplicationStatus | "")}>
                <option value="">全部阶段</option>
                {APPLICATION_STATUS.map((item) => <option key={item} value={item}>{APPLICATION_STATUS_LABELS[item]}</option>)}
              </Select>
              <Button variant="secondary" className="gap-2" onClick={loadData}>
                <RefreshCw aria-hidden="true" className="size-4" />
                刷新
              </Button>
            </div>
          </section>

          <section>
            <div className="section-heading">
              <div>
                <h2 className="section-title">投递记录</h2>
              </div>
              <div className="inline-flex rounded-lg bg-[color:var(--apple-control-bg)] p-1" aria-label="投递视图">
                <ViewButton active={view === "list"} icon={<List aria-hidden="true" className="size-3.5" />} label="列表" onClick={() => setView("list")} />
                <ViewButton active={view === "board"} icon={<Columns3 aria-hidden="true" className="size-3.5" />} label="看板" onClick={() => setView("board")} />
                <ViewButton active={view === "map"} icon={<Orbit aria-hidden="true" className="size-3.5" />} label="星图" onClick={() => setView("map")} />
              </div>
            </div>

            <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={view}
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
              transition={{ duration: reducedMotion ? motionDuration.instant : motionDuration.normal, ease: motionEase.enter }}
            >
            {view === "list" ? (
              filtered.length === 0 ? (
                <div className="empty-state border-y border-[color:var(--line-ghost)]">
                  <div><h3>没有匹配的投递</h3><p>调整搜索或阶段筛选后再查看。</p></div>
                </div>
              ) : (
                <div className="divide-y divide-[color:var(--line-ghost)] border-y border-[color:var(--line-ghost)]">
                  <AnimatePresence initial={false}>
                  {filtered.map((application) => (
                    <motion.div key={application.id} layout="position" transition={layoutTransition}>
                    <ApplicationListItem
                      application={application}
                      resumes={resumes}
                      onOpen={() => setDrawerApplication(application)}
                    />
                    </motion.div>
                  ))}
                  </AnimatePresence>
                </div>
              )
            ) : view === "board" ? (
              filtered.length === 0 ? (
                <div className="empty-state border-y border-[color:var(--line-ghost)]">
                  <div>
                    <h3>没有匹配的投递</h3>
                    <p>调整搜索或阶段筛选后再查看。</p>
                  </div>
                </div>
              ) : (
                <div className="grid overflow-hidden border-y border-[color:var(--line-ghost)] xl:grid-cols-4 xl:divide-x xl:divide-[color:var(--line-ghost)]">
                  {columns.map((column) => (
                    <section key={column.id} className="min-h-60 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-ink-primary">{column.label}</h3>
                          <p className="mt-1 text-xs leading-5 text-ink-muted">{column.description}</p>
                        </div>
                        <span className="text-sm tabular-nums text-ink-secondary">{column.applications.length}</span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {column.applications.length === 0 ? <p className="py-3 text-xs text-ink-muted">暂时没有记录</p> : null}
                        {column.applications.map((application) => <motion.div layout key={application.id} transition={layoutTransition}><PipelineItem application={application} resumes={resumes} onOpen={() => setDrawerApplication(application)} /></motion.div>)}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              <div className="visualization-boundary p-3 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm text-ink-secondary"><Orbit aria-hidden="true" className="size-4" /> 投递星图</div>
                <ApplicationOrbitSystem applications={filtered} selectedApplication={selected} onSelect={setSelected} onEdit={setDrawerApplication} />
              </div>
            )}
            </motion.div>
            </AnimatePresence>
          </section>
        </>
      )}

      <ProgressDrawer application={drawerApplication} open={Boolean(drawerApplication)} onClose={() => setDrawerApplication(null)} onChanged={handleApplicationChanged} onDeleted={handleApplicationDeleted} />
    </div>
  );
}

function getApplicationPhase(applications: ApplicationWithJob[]) {
  if (applications.length === 0) return "先建立候选岗位，再按优先级推进准备与投递";
  if (applications.some((item) => ["first_round", "second_round", "final_round"].includes(item.status))) return "跟进面试安排，及时记录下一步动作";
  if (applications.some((item) => item.status !== "opened")) return "处理近期节点，更新已投岗位的最新进展";
  return "评估候选岗位，绑定简历并完成投递准备";
}

function PipelineItem({ application, resumes, onOpen }: { application: ApplicationWithJob; resumes: ResumeDocument[]; onOpen: () => void }) {
  const nextAction = getNextAction(application);
  const material = getMaterialReadiness(application.job_id, resumes);
  return (
    <button type="button" className="w-full border-t border-[color:var(--line-ghost)] py-3 text-left first:border-t-0" onClick={onOpen}>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-ink-primary">{application.job.company_name}</span>
        <StatusPill status={application.status} label={getApplicationStageLabel(application)} className="px-2 py-1 text-[11px]" />
      </span>
      <span className="mt-2 block truncate text-xs text-ink-secondary">{nextAction.title}</span>
      <span className={material.ready ? "mt-1 block text-xs text-[#39725b]" : "mt-1 block text-xs text-ink-muted"}>{material.label}</span>
      <span className="mt-2 block text-[11px] text-ink-muted">更新于 {formatDateTime(application.updated_at)}</span>
    </button>
  );
}

function ApplicationListItem({ application, resumes, onOpen }: { application: ApplicationWithJob; resumes: ResumeDocument[]; onOpen: () => void }) {
  const nextAction = getNextAction(application);
  const material = getMaterialReadiness(application.job_id, resumes);
  return (
    <button
      type="button"
      className="data-row grid w-full gap-3 px-3 py-4 text-left sm:grid-cols-[minmax(220px,1fr)_minmax(180px,0.75fr)_minmax(170px,0.75fr)_auto] sm:items-center sm:px-4"
      onClick={onOpen}
    >
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-ink-primary">{application.job.company_name}</span>
        <span className="mt-1 block truncate text-xs text-ink-secondary">{application.job.job_titles || application.job.job_categories.join("、") || "岗位待补充"}</span>
      </span>
      <span className="flex items-center gap-2">
        <StatusPill status={application.status} label={getApplicationStageLabel(application)} className="px-2 py-1 text-[11px]" />
        <span className="text-xs text-ink-muted">优先级 {application.priority || "未设"}</span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-xs text-ink-secondary">{nextAction.title}</span>
        <span className={material.ready ? "mt-1 block text-xs text-[#39725b]" : "mt-1 block text-xs text-ink-muted"}>{material.label}</span>
      </span>
      <span className="flex items-center justify-between gap-3 sm:block sm:text-right">
        <span className="text-[11px] text-ink-muted">{formatDateTime(application.updated_at)}</span>
        <ArrowRight aria-hidden="true" className="size-4 text-ink-muted sm:ml-auto sm:mt-2" />
      </span>
    </button>
  );
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={active ? "inline-flex min-h-9 items-center gap-1.5 rounded-md bg-white px-3 text-xs text-ink-primary" : "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-xs text-ink-muted"}
      aria-pressed={active}
      onClick={onClick}
    >
      {icon}{label}
    </button>
  );
}

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold leading-none text-ink-primary tabular-nums md:text-3xl">{value}</div>
      <div className="mt-2 whitespace-nowrap text-xs text-ink-muted">{label}</div>
    </div>
  );
}
