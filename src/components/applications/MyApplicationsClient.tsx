"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, Orbit, RefreshCw, Search } from "lucide-react";
import { APPLICATION_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { fetchMyApplications } from "@/lib/applications";
import {
  getMaterialReadiness,
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

type WorkspaceView = "board" | "map";

export function MyApplicationsClient({ loginNextPath = "/my-applications" }: { loginNextPath?: string }) {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [selected, setSelected] = useState<ApplicationWithJob | null>(null);
  const [drawerApplication, setDrawerApplication] = useState<ApplicationWithJob | null>(null);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<ApplicationStatus | "">("");
  const [view, setView] = useState<WorkspaceView>("board");
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
      setMessage("读取投递工作台失败，请稍后再试。");
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
          <p className="page-kicker">投递工作台</p>
          <h1 className="page-title">把下一步办完</h1>
          <p className="page-subtitle mt-4">把岗位判断、材料准备和流程更新放在同一个工作区。</p>
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
        <section className="empty-state collection-surface">
          <div>
            <h2>从一个岗位开始</h2>
            <p>先把想投的岗位收进工作台，再记录材料和每一步进展。</p>
            <Link href="/explore" className="gold-button mt-5 inline-flex rounded-full px-4 py-2 text-sm font-medium">
              去岗位池
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_320px]">
            <div className="collection-surface overflow-hidden">
              <div className="section-heading px-4 pt-4 sm:px-5">
                <div>
                  <h2 className="section-title">今日待办</h2>
                  <p className="mt-1 text-xs text-ink-muted">根据当前阶段、备注和最近更新生成。</p>
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
                        <StatusPill status={task.application.status} />
                      </span>
                      <span className="mt-1 block text-sm text-ink-secondary">{task.title}</span>
                      <span className="mt-1 block truncate text-xs text-ink-muted">{task.detail}</span>
                    </span>
                    <ArrowRight aria-hidden="true" className="my-auto size-4 text-ink-muted" />
                  </button>
                ))
              )}
            </div>

            <aside className="collection-surface p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="section-title">材料准备</h2>
                  <p className="mt-1 text-xs text-ink-muted">简历与岗位的绑定状态。</p>
                </div>
                <FileText aria-hidden="true" className="size-5 text-nebula-silver" />
              </div>
              <p className="mt-5 text-3xl font-semibold tabular-nums text-ink-primary">
                {materialReadyCount}<span className="ml-1 text-sm font-medium text-ink-muted">/ {applications.length}</span>
              </p>
              {needsMaterial.length > 0 ? (
                <div className="mt-5 space-y-3">
                  {needsMaterial.map((application) => (
                    <Link key={application.id} href="/resume" className="block border-b border-white/[0.08] pb-3 last:border-b-0">
                      <p className="truncate text-sm font-medium text-ink-primary">{application.job.company_name}</p>
                      <p className="mt-1 text-xs text-ink-muted">{getMaterialReadiness(application.job_id, resumes).label}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink-secondary">进行中的岗位都已经关联简历版本。</p>
              )}
              <Link href="/resume" className="text-action mt-5 text-sm">
                管理简历与材料
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </aside>
          </section>

          <section className="filter-rail p-4">
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
                <h2 className="section-title">投递阶段</h2>
                <p className="mt-1 text-xs text-ink-muted">先处理看板中的下一步，需要时再切换到星图回顾。</p>
              </div>
              <div className="inline-flex rounded-full bg-black/15 p-1">
                <button type="button" className={view === "board" ? "rounded-full bg-white/[0.09] px-3 py-1.5 text-xs text-ink-primary" : "rounded-full px-3 py-1.5 text-xs text-ink-muted"} onClick={() => setView("board")}>看板</button>
                <button type="button" className={view === "map" ? "rounded-full bg-white/[0.09] px-3 py-1.5 text-xs text-ink-primary" : "rounded-full px-3 py-1.5 text-xs text-ink-muted"} onClick={() => setView("map")}>星图</button>
              </div>
            </div>

            {view === "board" ? (
              filtered.length === 0 ? (
                <div className="empty-state collection-surface">
                  <div>
                    <h3>没有匹配的投递</h3>
                    <p>调整搜索或阶段筛选后再查看。</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-px overflow-hidden bg-white/[0.08] xl:grid-cols-4">
                  {columns.map((column) => (
                    <section key={column.id} className="min-h-60 bg-[rgba(7,14,31,0.72)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-ink-primary">{column.label}</h3>
                          <p className="mt-1 text-xs leading-5 text-ink-muted">{column.description}</p>
                        </div>
                        <span className="text-sm tabular-nums text-ink-secondary">{column.applications.length}</span>
                      </div>
                      <div className="mt-4 space-y-2">
                        {column.applications.length === 0 ? <p className="py-3 text-xs text-ink-muted">暂时没有记录</p> : null}
                        {column.applications.map((application) => <PipelineItem key={application.id} application={application} resumes={resumes} onOpen={() => setDrawerApplication(application)} />)}
                      </div>
                    </section>
                  ))}
                </div>
              )
            ) : (
              <div className="collection-surface p-3 sm:p-5">
                <div className="mb-3 flex items-center gap-2 text-sm text-ink-secondary"><Orbit aria-hidden="true" className="size-4" /> 星图用于回顾阶段分布，编辑仍从岗位条目进入。</div>
                <ApplicationOrbitSystem applications={filtered} selectedApplication={selected} onSelect={setSelected} onEdit={setDrawerApplication} />
              </div>
            )}
          </section>
        </>
      )}

      <ProgressDrawer application={drawerApplication} open={Boolean(drawerApplication)} onClose={() => setDrawerApplication(null)} onChanged={handleApplicationChanged} onDeleted={handleApplicationDeleted} />
    </div>
  );
}

function PipelineItem({ application, resumes, onOpen }: { application: ApplicationWithJob; resumes: ResumeDocument[]; onOpen: () => void }) {
  const nextAction = getNextAction(application);
  const material = getMaterialReadiness(application.job_id, resumes);
  return (
    <button type="button" className="w-full border-t border-white/[0.08] py-3 text-left first:border-t-0" onClick={onOpen}>
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-sm font-medium text-ink-primary">{application.job.company_name}</span>
        <StatusPill status={application.status} className="px-2 py-1 text-[11px]" />
      </span>
      <span className="mt-2 block truncate text-xs text-ink-secondary">{nextAction.title}</span>
      <span className={material.ready ? "mt-1 block text-xs text-emerald-200/80" : "mt-1 block text-xs text-ink-muted"}>{material.label}</span>
      <span className="mt-2 block text-[11px] text-ink-muted">更新于 {formatDateTime(application.updated_at)}</span>
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
