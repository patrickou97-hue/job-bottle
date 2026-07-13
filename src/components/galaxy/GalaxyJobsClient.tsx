"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyApplications, updateApplication, upsertApplication } from "@/lib/applications";
import { getCurrentUserOrNull } from "@/lib/auth";
import { getCandidateStage } from "@/lib/career-workspace";
import { queueBottleDrop } from "@/lib/bottle-drop";
import { fetchActiveJobs } from "@/lib/jobs";
import { filterJobsByGalaxy, getGalaxyGroup, type GalaxyKind } from "@/lib/galaxy-taxonomy";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl } from "@/lib/utils";
import { OpportunityStarfield } from "@/components/opportunity/OpportunityStarfield";
import { OpportunitySignalList } from "@/components/opportunity/OpportunitySignalList";
import { CaptureAnimation } from "@/components/capture/CaptureAnimation";
import { ApplyReturnConfirm } from "@/components/jobs/ApplyReturnConfirm";
import { useCaptureMotion } from "@/components/capture/useCaptureMotion";
import type { ApplicationWithJob, Job, UserApplication } from "@/lib/types";

export function GalaxyJobsClient({ kind, slug }: { kind: GalaxyKind; slug: string }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<ApplicationWithJob | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const pageWasHiddenRef = useRef(false);
  const confirmationTimerRef = useRef<number | null>(null);
  const { capturedJob, startCapture, clearCapture } = useCaptureMotion();
  const group = getGalaxyGroup(kind, slug);

  async function loadData() {
    if (!isSupabaseConfigured()) {
      setMessage("请先配置数据库环境变量，再读取岗位数据库。");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const [jobRows, user] = await Promise.all([fetchActiveJobs(supabase), getCurrentUserOrNull(supabase)]);
      setJobs(filterJobsByGalaxy(jobRows, kind, slug));
      if (user) {
        setCurrentUserId(user.id);
        setApplications(await fetchMyApplications(supabase, user.id));
      } else {
        setCurrentUserId(null);
        setApplications([]);
      }
    } catch {
      setJobs([]);
      setApplications([]);
      setMessage("岗位读取失败，请检查网络后重试。");
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
  }, [kind, slug]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!pendingConfirmation) return;
      if (document.visibilityState === "hidden") {
        pageWasHiddenRef.current = true;
      } else if (pageWasHiddenRef.current) {
        setShowConfirmation(true);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pendingConfirmation]);

  useEffect(() => () => {
    if (confirmationTimerRef.current) window.clearTimeout(confirmationTimerRef.current);
  }, []);

  const applicationByJobId = useMemo(() => {
    const map = new Map<string, UserApplication>();
    applications.forEach((application) => map.set(application.job_id, application));
    return map;
  }, [applications]);

  async function handleApply(job: Job) {
    setMessage("");
    if (!currentUserId) {
      router.push(`/login?next=${encodeURIComponent(`/galaxy/${kind}/${slug}`)}`);
      return;
    }
    try {
      const supabase = createClient();
      const existing = applications.find((application) => application.job_id === job.id);
      if (!existing) {
        const application = await upsertApplication(supabase, currentUserId, job.id, "evaluating");
        queueBottleDrop(application.id);
        startCapture(job);
        setMessage("已加入星瓶。先评估岗位，再决定是否投入准备。");
        await loadData();
        return;
      }
      if (existing.status !== "opened") {
        router.push("/my");
        return;
      }
      const candidateStage = getCandidateStage(existing);
      if (candidateStage !== "preparing") {
        const nextStage = candidateStage === "evaluating" ? "saved" : "preparing";
        await updateApplication(supabase, existing.id, { candidate_stage: nextStage });
        setMessage(nextStage === "saved" ? "已保留为候选岗位。" : "已进入准备中，建议先绑定岗位简历。");
        await loadData();
        return;
      }
      if (!isValidHttpUrl(job.apply_url)) {
        setMessage("投递链接格式不正确，当前记录和已填内容都已保留。");
        return;
      }
      if (!safeOpenUrl(job.apply_url)) {
        setMessage("浏览器阻止了新窗口，请允许本站打开投递页面后重试。");
        return;
      }
      setPendingConfirmation(existing);
      setShowConfirmation(false);
      pageWasHiddenRef.current = false;
      if (confirmationTimerRef.current) window.clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = window.setTimeout(() => setShowConfirmation(true), 2200);
      setMessage("官网已打开。返回后确认是否完成投递。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "岗位操作失败，当前记录和已填内容都已保留，请稍后重试。");
    }
  }

  async function resolveApplyConfirmation(status: "applied" | "withdrawn" | "keep_opened") {
    if (!pendingConfirmation) return;
    if (confirmationTimerRef.current) window.clearTimeout(confirmationTimerRef.current);
    if (status === "keep_opened") {
      setPendingConfirmation(null);
      setShowConfirmation(false);
      setMessage("仍保留在“准备中”，可以稍后继续记录投递。");
      return;
    }
    setConfirmBusy(true);
    try {
      await updateApplication(createClient(), pendingConfirmation.id, {
        status,
        progress_note: pendingConfirmation.progress_note,
      });
      setPendingConfirmation(null);
      setShowConfirmation(false);
      setMessage(status === "applied" ? "已确认投递，接下来可以记录笔试或面试安排。" : "已结束这条候选记录。");
      await loadData();
    } catch {
      setMessage("状态更新失败，候选记录仍保留。请检查网络后重试。");
    } finally {
      setConfirmBusy(false);
    }
  }

  function focusJob(job: Job) {
    setFocusedJobId(job.id);
    window.setTimeout(() => {
      document.getElementById(`job-row-${job.id}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 60);
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">岗位星图</p>
          <h1 className="page-title">{group.label}</h1>
        </div>
        <div className="liquid-panel p-5">
          <div className="font-display text-3xl font-semibold text-ink-primary tabular-nums">{jobs.length}</div>
          <div className="mt-2 text-xs text-ink-muted">当前结果</div>
        </div>
      </section>
      {message ? (
        <div className="info-banner text-sm">
          {message}
        </div>
      ) : null}
      {pendingConfirmation && showConfirmation ? (
        <ApplyReturnConfirm
          companyName={pendingConfirmation.job.company_name}
          busy={confirmBusy}
          onApplied={() => void resolveApplyConfirmation("applied")}
          onLater={() => void resolveApplyConfirmation("keep_opened")}
          onWithdraw={() => void resolveApplyConfirmation("withdrawn")}
        />
      ) : null}
      {loading ? (
        <div className="empty-state">
          <span className="loading-line">正在读取岗位</span>
        </div>
      ) : (
        <>
          <OpportunityStarfield
            jobs={jobs}
            applicationByJobId={applicationByJobId}
            onApply={handleApply}
            kind={kind}
            title={`${group.label}岗位星`}
            hoveredJobId={hoveredJobId}
            focusedJobId={focusedJobId}
            onHoverJob={(job) => setHoveredJobId(job?.id ?? null)}
            onFocusJob={focusJob}
          />
          <OpportunitySignalList
            jobs={jobs}
            applicationByJobId={applicationByJobId}
            onApply={handleApply}
            hoveredJobId={hoveredJobId}
            focusedJobId={focusedJobId}
            onHoverJob={(job) => setHoveredJobId(job?.id ?? null)}
            onFocusJob={focusJob}
          />
        </>
      )}
      <CaptureAnimation job={capturedJob} onDone={clearCapture} />
    </div>
  );
}
