"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, FileText, RefreshCw, Target } from "lucide-react";
import { StatusPill } from "@/components/applications/StatusPill";
import { UserShell } from "@/components/layout/UserShell";
import { Button } from "@/components/ui/Button";
import { fetchMyApplications } from "@/lib/applications";
import {
  getApplicationStageLabel,
  getDeadlineInfo,
  getFitLabel,
  getWorkspaceTasks,
} from "@/lib/career-workspace";
import { fetchActiveJobs } from "@/lib/jobs";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import type { ResumeDocument } from "@/lib/resume";
import type { ApplicationWithJob, Job, Profile } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export function HomeWorkspace({ userId }: { userId: string }) {
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (state === "ready") void track("home_workspace_view", { application_count: applications.length });
  }, [applications.length, state]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const supabase = createClient();
      setState("loading");
      setMessage("");
      void Promise.all([
        fetchMyApplications(supabase, userId),
        fetchActiveJobs(supabase),
        fetchMyResumes(supabase).catch((error: unknown) => {
          if (isMissingResumeTableError(error)) return [];
          throw error;
        }),
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      ]).then(([applicationRows, jobRows, resumeRows, profileResult]) => {
        if (cancelled) return;
        setApplications(applicationRows);
        setJobs(jobRows);
        setResumes(resumeRows);
        setProfile((profileResult.data as Profile | null) ?? null);
        setState("ready");
      }).catch(() => {
        if (cancelled) return;
        setState("error");
        setMessage("工作台读取失败，你的资料和投递记录没有改变。请检查网络后重试。");
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [revision, userId]);

  const tasks = useMemo(() => getWorkspaceTasks(applications).slice(0, 5), [applications]);
  const urgentDeadlines = useMemo(() => applications
    .map((application) => ({ application, deadline: getDeadlineInfo(application.job) }))
    .filter((item) => item.deadline?.urgent)
    .sort((a, b) => (a.deadline?.daysUntil ?? 999) - (b.deadline?.daysUntil ?? 999))
    .slice(0, 4), [applications]);
  const recommendedJobs = useMemo(() => {
    const recordedIds = new Set(applications.map((application) => application.job_id));
    const available = jobs.filter((job) => !recordedIds.has(job.id));
    const matched = available.filter((job) => getFitLabel(job, profile));
    return (matched.length > 0 ? matched : available).slice(0, 4);
  }, [applications, jobs, profile]);
  const recent = useMemo(() => [...applications]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5), [applications]);

  if (state === "loading") {
    return <UserShell><div className="empty-state"><span className="loading-line">正在整理求职工作台</span></div></UserShell>;
  }

  if (state === "error") {
    return (
      <UserShell>
        <div className="empty-state">
          <p>{message}</p>
          <Button className="mt-4" onClick={() => setRevision((value) => value + 1)}><RefreshCw aria-hidden="true" className="size-4" />重试</Button>
        </div>
      </UserShell>
    );
  }

  const phase = getCareerPhase(applications, resumes, profile);
  const appliedCount = applications.filter((application) => application.status !== "opened").length;
  const interviewCount = applications.filter((application) => ["first_round", "second_round", "final_round"].includes(application.status)).length;
  const offerCount = applications.filter((application) => application.status === "offer").length;

  return (
    <UserShell>
      <div className="observatory-page space-y-8">
        <section className="page-hero">
          <div>
            <p className="page-kicker">当前阶段</p>
            <h1 className="page-title">{phase.title}</h1>
            <p className="page-description">{phase.detail}</p>
            <Link href={phase.href} className="gold-button mt-5 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium">
              {phase.action}<ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <div className="progress-summary grid grid-cols-2 gap-x-6 gap-y-5 px-4 py-3 md:grid-cols-4 md:px-5">
            <HomeStat label="候选与投递" value={applications.length} />
            <HomeStat label="已投递" value={appliedCount} />
            <HomeStat label="面试中" value={interviewCount} />
            <HomeStat label="Offer" value={offerCount} />
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <div>
            <SectionHeader title="优先处理" meta={`${tasks.length} 项`} />
            <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
              {tasks.length === 0 ? <EmptyLine text="当前没有需要优先处理的投递。" href="/explore" action="继续找岗位" /> : tasks.map((task) => (
                <Link key={task.application.id} href="/my" className="data-row grid grid-cols-[minmax(0,1fr)_auto] gap-4 px-3 py-4 sm:px-4">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2"><strong className="truncate text-sm text-ink-primary">{task.application.job.company_name}</strong><StatusPill status={task.application.status} label={getApplicationStageLabel(task.application)} /></span>
                    <span className="mt-2 block text-sm text-ink-secondary">{task.title}</span>
                    <span className="mt-1 block truncate text-xs text-ink-muted">{task.detail}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="my-auto size-4 text-ink-muted" />
                </Link>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="即将截止" meta={`${urgentDeadlines.length} 个`} />
            <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
              {urgentDeadlines.length === 0 ? <p className="py-5 text-sm text-ink-muted">当前候选岗位没有三天内截止项。</p> : urgentDeadlines.map(({ application, deadline }) => (
                <Link key={application.id} href={`/jobs/${application.job_id}`} className="block py-4">
                  <span className="flex items-center justify-between gap-3 text-sm"><strong className="truncate text-ink-primary">{application.job.company_name}</strong><span className="shrink-0 text-[#d8a8b7]">{deadline?.label}</span></span>
                  <span className="mt-1 block truncate text-xs text-ink-muted">{application.job.job_titles || "岗位待补充"}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)]">
          <div>
            <SectionHeader title="推荐岗位" meta={profile && (profile.target_roles.length || profile.preferred_regions.length) ? "按求职偏好" : "待完善偏好"} />
            <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
              {recommendedJobs.length === 0 ? <EmptyLine text="暂时没有新的可推荐岗位。" href="/explore" action="查看全部岗位" /> : recommendedJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="data-row grid gap-2 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
                  <span className="min-w-0"><strong className="block truncate text-sm text-ink-primary">{job.company_name}</strong><span className="mt-1 block truncate text-xs text-ink-secondary">{job.job_titles || job.job_categories.join("、") || "岗位待补充"}</span></span>
                  <span className="text-xs text-nebula-silver">{getFitLabel(job, profile) || "最新收录"}</span>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="投递漏斗" meta="本季" />
            <div className="border-y border-white/[0.1] py-5">
              <FunnelRow label="候选岗位" value={applications.filter((item) => item.status === "opened").length} total={Math.max(1, applications.length)} />
              <FunnelRow label="已投递" value={appliedCount} total={Math.max(1, applications.length)} />
              <FunnelRow label="进入面试" value={interviewCount + offerCount} total={Math.max(1, applications.length)} />
              <FunnelRow label="Offer" value={offerCount} total={Math.max(1, applications.length)} />
            </div>
          </div>
        </section>

        <section>
          <SectionHeader title="最近更新" meta={`${recent.length} 条`} />
          <div className="divide-y divide-white/[0.1] border-y border-white/[0.1]">
            {recent.length === 0 ? <EmptyLine text="还没有操作记录。" href="/explore" action="添加第一个岗位" /> : recent.map((application) => (
              <Link key={application.id} href="/my" className="data-row grid gap-2 px-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
                <span className="min-w-0"><strong className="truncate text-sm text-ink-primary">{application.job.company_name}</strong><span className="mt-1 block text-xs text-ink-secondary">{getApplicationStageLabel(application)} · {application.job.job_titles || "岗位待补充"}</span></span>
                <span className="text-xs text-ink-muted">{formatDateTime(application.updated_at)}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-white/[0.1] pt-5">
          <Link href="/explore" className="text-action"><Target aria-hidden="true" className="size-4" />找岗位</Link>
          <Link href="/resume" className="text-action"><FileText aria-hidden="true" className="size-4" />准备简历</Link>
          <Link href="/galaxy" className="text-action"><CalendarClock aria-hidden="true" className="size-4" />进入岗位星图</Link>
        </div>
      </div>
    </UserShell>
  );
}

function getCareerPhase(applications: ApplicationWithJob[], resumes: ResumeDocument[], profile: Profile | null) {
  const profileReady = Boolean(profile?.preferred_regions.length || profile?.target_roles.length);
  if (!profileReady) return { title: "先明确求职方向", detail: "补充目标岗位和地区，岗位推荐会更有依据。", action: "完善求职档案", href: "/profile" };
  if (resumes.length === 0) return { title: "建立基础简历", detail: "先保存一份通用内容，再针对岗位创建版本。", action: "创建简历", href: "/resume" };
  if (applications.length === 0) return { title: "开始筛选岗位", detail: "求职档案和简历已经就绪，可以建立第一条候选记录。", action: "浏览岗位", href: "/explore" };
  if (applications.every((item) => item.status === "opened")) return { title: "评估并准备候选岗位", detail: "确定优先级，绑定岗位简历，再记录投递。", action: "处理候选岗位", href: "/my" };
  return { title: "推进本周求职行动", detail: "先处理截止时间和下一步动作，再更新最近投递。", action: "打开投递管理", href: "/my" };
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return <div className="section-heading"><h2 className="section-title">{title}</h2><span className="section-meta">{meta}</span></div>;
}

function HomeStat({ label, value }: { label: string; value: number }) {
  return <div><div className="font-display text-2xl font-semibold tabular-nums text-ink-primary md:text-3xl">{value}</div><div className="mt-2 text-xs text-ink-muted">{label}</div></div>;
}

function FunnelRow({ label, value, total }: { label: string; value: number; total: number }) {
  const percent = Math.max(value > 0 ? 4 : 0, Math.round((value / total) * 100));
  return <div className="mb-5 last:mb-0"><div className="flex items-center justify-between text-sm"><span className="text-ink-secondary">{label}</span><strong className="tabular-nums text-ink-primary">{value}</strong></div><div className="mt-2 h-1 bg-white/[0.08]"><div className="h-full bg-nebula-blue/75" style={{ width: `${percent}%` }} /></div></div>;
}

function EmptyLine({ text, href, action }: { text: string; href: string; action: string }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-ink-muted"><span>{text}</span><Link href={href} className="text-action">{action}<ArrowRight aria-hidden="true" className="size-4" /></Link></div>;
}
