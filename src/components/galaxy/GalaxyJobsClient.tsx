"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyApplications, upsertApplication } from "@/lib/applications";
import { getCurrentUserOrNull } from "@/lib/auth";
import { queueBottleDrop } from "@/lib/bottle-drop";
import { fetchActiveJobs } from "@/lib/jobs";
import { filterJobsByGalaxy, getGalaxyGroup, type GalaxyKind } from "@/lib/galaxy-taxonomy";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl } from "@/lib/utils";
import { OpportunityStarfield } from "@/components/opportunity/OpportunityStarfield";
import { OpportunitySignalList } from "@/components/opportunity/OpportunitySignalList";
import { CaptureAnimation } from "@/components/capture/CaptureAnimation";
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
  const { capturedJob, startCapture, clearCapture } = useCaptureMotion();
  const group = getGalaxyGroup(kind, slug);

  async function loadData() {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
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
    setLoading(false);
  }

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      void loadData();
    });
    return () => window.cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, slug]);

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
    if (!isValidHttpUrl(job.apply_url)) {
      setMessage("投递链接格式不正确。");
      return;
    }
    const supabase = createClient();
    const alreadyCaptured = applications.some((application) => application.job_id === job.id);
    const application = await upsertApplication(supabase, currentUserId, job.id);
    if (!alreadyCaptured) {
      queueBottleDrop(application.id);
      startCapture(job);
    }
    safeOpenUrl(job.apply_url);
    setMessage("岗位已捕获，可在我的投递和星瓶中查看。");
    await loadData();
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
          <p className="page-subtitle">
            {loading ? "正在读取岗位" : `${jobs.length} 个岗位`}
          </p>
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
