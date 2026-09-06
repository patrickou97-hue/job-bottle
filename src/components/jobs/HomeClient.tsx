"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, KeyRound, Sparkles } from "lucide-react";
import { EMPTY_JOB_FILTERS } from "@/lib/constants";
import { parseJobCategoriesParam, serializeJobCategories } from "@/lib/categories";
import {
  fetchActiveJobs,
  filterJobs,
  getJobFacetOptions,
  hasJobPreferences,
  isRecentlyListedJob,
  jobMatchesProfilePreferences,
} from "@/lib/jobs";
import { fetchMyApplications, normalizeAppliedPosition, updateApplication, upsertApplication } from "@/lib/applications";
import { getCandidateStage } from "@/lib/career-workspace";
import { getLocationFilterLabel } from "@/lib/locations";
import { getCurrentUserOrNull } from "@/lib/auth";
import { queueBottleDrop } from "@/lib/bottle-drop";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { track } from "@/lib/track";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { cn, isValidHttpUrl, safeOpenUrl, formatDateTime, sanitizeApplicationUrl } from "@/lib/utils";
import { JobFilterBar } from "@/components/jobs/JobFilterBar";
import { ApplyReturnConfirm } from "@/components/jobs/ApplyReturnConfirm";
import { ProgressDrawer } from "@/components/applications/ProgressDrawer";
import { StatusPill } from "@/components/applications/StatusPill";
import { Button } from "@/components/ui/Button";
import { EmptyConstellation } from "@/components/visuals/EmptyConstellation";
import { ChinaJobMap } from "@/components/jobs/ChinaJobMap";
import { VirtualJobList, type VirtualJobListHandle } from "@/components/jobs/VirtualJobList";
import { CaptureAnimation } from "@/components/capture/CaptureAnimation";
import { useCaptureMotion } from "@/components/capture/useCaptureMotion";
import { ReferralCodeDrawer } from "@/components/referrals/ReferralCodeHub";
import type {
  ApplicationWithJob,
  Job,
  JobDiscoveryScope,
  JobFilters,
  Profile,
  UserApplication,
} from "@/lib/types";
import type { ResumeDocument } from "@/lib/resume";

type JobViewMode = "all" | "unapplied" | "applied";
type PendingApplyConfirmation = {
  applicationId: string;
  jobId: string;
  companyName: string;
  progressNote: string | null;
  appliedPosition: string | null;
};

export function HomeClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>(() => ({
    ...EMPTY_JOB_FILTERS,
    categories: parseJobCategoriesParam(searchParams.get("cats")),
  }));
  const [jobView, setJobView] = useState<JobViewMode>("all");
  const [discoveryScope, setDiscoveryScope] = useState<JobDiscoveryScope>("all");
  const [filterResetVersion, setFilterResetVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedApplication, setSelectedApplication] =
    useState<ApplicationWithJob | null>(null);
  const [drawerApplication, setDrawerApplication] =
    useState<ApplicationWithJob | null>(null);
  const [referralJob, setReferralJob] = useState<Job | null>(null);
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [focusedJobId, setFocusedJobId] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [pendingApplyConfirmation, setPendingApplyConfirmation] =
    useState<PendingApplyConfirmation | null>(null);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const applyPageWasHiddenRef = useRef(false);
  const applyConfirmFallbackRef = useRef<number | null>(null);
  const loadRequestRef = useRef(0);
  const virtualJobListRef = useRef<VirtualJobListHandle>(null);
  const { capturedJob, startCapture, clearCapture } = useCaptureMotion();

  async function loadData() {
    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setLoading(true);
    setLoadError("");
    setMessage("");
    if (!isSupabaseConfigured()) {
      setJobs([]);
      setApplications([]);
      console.error("Supabase environment variables are not configured.");
      setLoadError("岗位暂时无法读取，请稍后重试。");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const userPromise = getCurrentUserOrNull(supabase).catch(() => null);

    try {
      // The public catalogue is the first paint. Private workspace state is
      // hydrated afterwards, so an auth/profile request cannot hold the list
      // behind a loading screen.
      const jobRows = await fetchActiveJobs(supabase);
      if (requestId !== loadRequestRef.current) return;
      setJobs(jobRows);
      setLoading(false);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setLoadError(typeof navigator !== "undefined" && !navigator.onLine
        ? "当前网络不可用，筛选条件已保留。联网后可重新加载岗位。"
        : "岗位暂时无法读取，请检查网络后重试。");
      setLoading(false);
      return;
    }

    const user = await userPromise;
    if (requestId !== loadRequestRef.current) return;

    if (!user) {
      setCurrentUserId(null);
      setApplications([]);
      setResumes([]);
      setProfile(null);
      return;
    }

    setCurrentUserId(user.id);
    try {
      const [profileResult, applicationRows, resumeRows] = await Promise.all([
        supabase.from("profiles").select("id,display_name,phone,city,school,major,graduation_year,preferred_regions,target_roles,role,created_at,updated_at").eq("id", user.id).maybeSingle(),
        fetchMyApplications(supabase, user.id),
        fetchMyResumes(supabase).catch((error: unknown) => {
          if (isMissingResumeTableError(error)) return [];
          throw error;
        }),
      ]);
      if (requestId !== loadRequestRef.current) return;
      setProfile(profileResult.data as Profile | null);
      setApplications(applicationRows);
      setResumes(resumeRows);
    } catch {
      if (requestId !== loadRequestRef.current) return;
      setMessage("岗位已加载；个人投递状态暂时无法同步，请稍后重试。");
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      loadRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!pendingApplyConfirmation) return;
      if (document.visibilityState === "hidden") {
        applyPageWasHiddenRef.current = true;
        return;
      }
      if (applyPageWasHiddenRef.current) {
        setShowApplyConfirmation(true);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [pendingApplyConfirmation]);

  useEffect(() => {
    return () => {
      if (applyConfirmFallbackRef.current) {
        window.clearTimeout(applyConfirmFallbackRef.current);
      }
    };
  }, []);

  const applicationByJobId = useMemo(() => {
    const map = new Map<string, UserApplication>();
    applications.forEach((item) => map.set(item.job_id, item));
    return map;
  }, [applications]);

  const facets = useMemo(() => getJobFacetOptions(jobs), [jobs]);
  const recentJobs = useMemo(() => jobs.filter((job) => isRecentlyListedJob(job)), [jobs]);
  const preferenceAvailable = hasJobPreferences(profile);
  const recentPreferenceJobs = useMemo(
    () => recentJobs.filter((job) => jobMatchesProfilePreferences(job, profile)),
    [profile, recentJobs],
  );
  const discoveryJobs = discoveryScope === "recent"
    ? recentJobs
    : discoveryScope === "recent_preference"
      ? recentPreferenceJobs
      : jobs;
  const matchingJobs = useMemo(
    () => filterJobs(discoveryJobs, filters),
    [discoveryJobs, filters],
  );
  const mapMatchingJobs = useMemo(
    () => filterJobs(discoveryJobs, { ...filters, location: "" }),
    [discoveryJobs, filters],
  );
  const baseVisibleJobs = useMemo(() => {
    if (jobView === "applied") {
      return matchingJobs.filter((job) => applicationByJobId.has(job.id));
    }
    if (jobView === "unapplied") {
      return matchingJobs.filter((job) => !applicationByJobId.has(job.id));
    }
    return matchingJobs;
  }, [applicationByJobId, jobView, matchingJobs]);
  const mapVisibleJobs = useMemo(() => {
    if (jobView === "applied") {
      return mapMatchingJobs.filter((job) => applicationByJobId.has(job.id));
    }
    if (jobView === "unapplied") {
      return mapMatchingJobs.filter((job) => !applicationByJobId.has(job.id));
    }
    return mapMatchingJobs;
  }, [applicationByJobId, jobView, mapMatchingJobs]);
  const filteredJobs = baseVisibleJobs;
  const activeFilterChips = useMemo(
    () => getActiveFilterChips(filters, jobView, discoveryScope),
    [discoveryScope, filters, jobView],
  );
  const radarStats = useMemo(() => {
    const companyCount = new Set(filteredJobs.map((job) => job.company_name)).size;
    return {
      totalJobs: jobs.length,
      matchingJobs: matchingJobs.length,
      visibleJobs: filteredJobs.length,
      savedJobs: applications.length,
      companyCount,
      recentJobs: recentJobs.length,
    };
  }, [applications.length, filteredJobs, jobs.length, matchingJobs.length, recentJobs.length]);

  async function handleApply(job: Job) {
    setMessage("");
    let applyWindow: Window | null = null;
    let applyWindowNavigated = false;
    try {
      if (!isSupabaseConfigured()) {
        console.error("Supabase environment variables are not configured.");
        setMessage("操作未完成；当前记录与已填内容均已保留。请稍后重试。");
        return;
      }
      if (!currentUserId) {
        router.push(`/login?next=${encodeURIComponent("/explore")}`);
        return;
      }
      const existingBeforeAuth = applications.find((item) => item.job_id === job.id);
      if (
        (!existingBeforeAuth || (
          existingBeforeAuth.status === "opened"
          && getCandidateStage(existingBeforeAuth) === "preparing"
        ))
        && isValidHttpUrl(job.apply_url)
      ) {
        applyWindow = window.open("", "_blank");
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);

      if (!user) {
        applyWindow?.close();
        setCurrentUserId(null);
        router.push(`/login?next=${encodeURIComponent("/explore")}`);
        return;
      }

      const existing = applications.find((item) => item.job_id === job.id);
      if (!existing) {
        if (!isValidHttpUrl(job.apply_url)) {
          applyWindow?.close();
          setMessage("投递链接无法识别，岗位尚未收入星瓶。请通过反馈告知我们。");
          return;
        }
        const application = await upsertApplication(supabase, user.id, job.id, "preparing");
        setApplications((current) => [{ ...application, job }, ...current]);
        queueBottleDrop(application.id);
        startCapture(job);
        void track("job_saved", { job_id: job.id });
        if (!openApplicationWebsite(job, applyWindow)) return;
        applyWindowNavigated = Boolean(applyWindow);
        armApplyConfirmation({
          applicationId: application.id,
          jobId: job.id,
          companyName: job.company_name,
          progressNote: application.progress_note,
          appliedPosition: application.applied_position ?? null,
        });
        setMessage("岗位已收入星瓶，投递官网已打开。返回后，请确认是否完成投递。");
        return;
      }

      if (existing.status !== "opened") {
        setDrawerApplication(existing);
        return;
      }

      const candidateStage = getCandidateStage(existing);
      if (candidateStage !== "preparing") {
        const nextStage = candidateStage === "evaluating" ? "saved" : "preparing";
        const updated = await updateApplication(supabase, existing.id, { candidate_stage: nextStage });
        const nextApplication = { ...existing, ...updated, job };
        handleApplicationChanged(nextApplication);
        void track("candidate_stage_updated", { job_id: job.id, stage: nextStage });
        setMessage(
          nextStage === "saved"
            ? "已列入候选。你可以设置优先级，或开始准备。"
            : "已进入准备阶段。建议先建立岗位简历，再记录投递。",
        );
        return;
      }

      if (!isValidHttpUrl(job.apply_url)) {
        setMessage("投递链接无法识别；当前记录与已填内容均已保留。");
        return;
      }

      if (!openApplicationWebsite(job, applyWindow)) return;
      applyWindowNavigated = Boolean(applyWindow);
      armApplyConfirmation({
        applicationId: existing.id,
        jobId: job.id,
        companyName: job.company_name,
        progressNote: existing.progress_note,
        appliedPosition: existing.applied_position ?? null,
      });
      setMessage("投递官网已打开。返回后，请确认是否完成投递。");
    } catch (error) {
      if (!applyWindowNavigated) applyWindow?.close();
      setMessage(error instanceof Error ? error.message : "操作未完成；当前记录与已填内容均已保留。请稍后重试。");
    }
  }

  function openApplicationWebsite(job: Job, applyWindow: Window | null) {
    if (applyWindow) {
      applyWindow.opener = null;
      applyWindow.document.title = "正在前往投递官网";
      applyWindow.document.body.style.margin = "0";
      applyWindow.document.body.style.background = "#000001";
      applyWindow.document.body.style.color = "#FFF9E3";
      applyWindow.document.body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif';
      applyWindow.document.body.innerHTML = '<main style="min-height:100vh;display:grid;place-items:center;text-align:center;"><div><p style="font-size:15px;">正在前往投递官网</p><p style="font-size:12px;color:#9BAAC0;">返回后确认投递结果</p></div></main>';
      applyWindow.location.href = sanitizeApplicationUrl(job.apply_url);
      return true;
    }
    if (safeOpenUrl(job.apply_url)) return true;
    setMessage("浏览器拦截了新窗口。请允许拾星打开投递页面后重试。");
    return false;
  }

  function handleFiltersChange(nextFilters: JobFilters) {
    setFilters(nextFilters);
    updateCategoryUrl(nextFilters.categories);
  }

  function clearAllFilters() {
    setFilters(EMPTY_JOB_FILTERS);
    setDiscoveryScope("all");
    setJobView("all");
    setFocusedJobId(null);
    setFilterResetVersion((current) => current + 1);
    updateCategoryUrl([]);
  }

  function updateCategoryUrl(categories: string[]) {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (categories.length > 0) {
      url.searchParams.set("cats", serializeJobCategories(categories));
    } else {
      url.searchParams.delete("cats");
    }
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }

  function armApplyConfirmation(nextConfirmation: PendingApplyConfirmation) {
    if (applyConfirmFallbackRef.current) {
      window.clearTimeout(applyConfirmFallbackRef.current);
    }
    applyPageWasHiddenRef.current = false;
    setPendingApplyConfirmation(nextConfirmation);
    setShowApplyConfirmation(false);
    applyConfirmFallbackRef.current = window.setTimeout(() => {
      setShowApplyConfirmation(true);
    }, 2200);
  }

  async function resolveApplyConfirmation(
    status: "applied" | "withdrawn" | "keep_opened",
    appliedPosition = "",
  ) {
    if (!pendingApplyConfirmation) return;
    if (status === "keep_opened") {
      if (applyConfirmFallbackRef.current) {
        window.clearTimeout(applyConfirmFallbackRef.current);
        applyConfirmFallbackRef.current = null;
      }
      setPendingApplyConfirmation(null);
      setShowApplyConfirmation(false);
      setMessage("仍保留在“准备中”，之后可以继续更新。");
      return;
    }

    setConfirmBusy(true);
    setMessage("");
    try {
      if (applyConfirmFallbackRef.current) {
        window.clearTimeout(applyConfirmFallbackRef.current);
        applyConfirmFallbackRef.current = null;
      }
      const normalizedAppliedPosition = normalizeAppliedPosition(appliedPosition);
      const updated = await updateApplication(createClient(), pendingApplyConfirmation.applicationId, {
        status,
        progress_note: pendingApplyConfirmation.progressNote,
        ...(status === "applied" ? { applied_position: normalizedAppliedPosition } : {}),
      });
      setPendingApplyConfirmation(null);
      setShowApplyConfirmation(false);
      if (status === "applied") {
        void track("application_recorded", {
          job_id: pendingApplyConfirmation.jobId,
        });
      }
      await loadData();
      const positionWasOmitted = updated.omittedApplicationColumns?.includes("applied_position");
      setMessage(
        status === "applied"
          ? normalizedAppliedPosition && positionWasOmitted
            ? "投递已记录；实际投递岗位暂未同步，请稍后在投递详情中补充。"
            : normalizedAppliedPosition
              ? "投递和实际岗位已记录，这颗星已进入你的投递星图。"
              : "投递已记录，实际投递岗位暂时留空，可之后在投递详情中补充。"
          : "已标记为不投了。",
      );
    } catch {
      setMessage("状态暂未更新，请稍后重试。");
    } finally {
      setConfirmBusy(false);
    }
  }

  function openProgressByJob(job: Job) {
    const application = applications.find((item) => item.job_id === job.id);
    if (application) setSelectedApplication(application);
  }

  function focusJob(job: Job) {
    setFocusedJobId(job.id);
    virtualJobListRef.current?.scrollToJob(job.id);
  }

  function handleApplicationChanged(nextApplication: ApplicationWithJob) {
    setApplications((current) =>
      current.map((application) =>
        application.id === nextApplication.id ? nextApplication : application,
      ),
    );
    setSelectedApplication((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
    setDrawerApplication((current) =>
      current?.id === nextApplication.id ? nextApplication : current,
    );
  }

  function handleApplicationDeleted(applicationId: string) {
    setApplications((current) =>
      current.filter((application) => application.id !== applicationId),
    );
    setSelectedApplication((current) =>
      current?.id === applicationId ? null : current,
    );
    setDrawerApplication((current) =>
      current?.id === applicationId ? null : current,
    );
  }

  return (
    <div className="observatory-page space-y-6 lg:space-y-8">
      {loadError && jobs.length > 0 ? (
        <div className="info-banner flex flex-wrap items-center justify-between gap-3 text-sm" role="alert">
          <span>{loadError}</span>
          <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={loadData}>
            重试
          </Button>
        </div>
      ) : message ? (
        <div className="info-banner text-sm" role="status" aria-live="polite">
          {message}
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {pendingApplyConfirmation && showApplyConfirmation ? (
          <ApplyReturnConfirm
            key={pendingApplyConfirmation.applicationId}
            companyName={pendingApplyConfirmation.companyName}
            busy={confirmBusy}
            initialPosition={pendingApplyConfirmation.appliedPosition ?? ""}
            onApplied={(appliedPosition) => void resolveApplyConfirmation("applied", appliedPosition)}
            onLater={() => void resolveApplyConfirmation("keep_opened")}
            onWithdraw={() => void resolveApplyConfirmation("withdrawn")}
          />
        ) : null}
      </AnimatePresence>

      <JobRadarHeader
        stats={radarStats}
        jobView={jobView}
        onJobViewChange={(nextView) => {
          setJobView(nextView);
        }}
        activeFilterChips={activeFilterChips}
        onClear={clearAllFilters}
      />

      <section id="job-map" className="job-map-section border-t border-[color:var(--line-ghost)] pt-4 lg:pt-6">
        <div className="section-heading items-end">
          <div>
            <h2 className="section-title">岗位分布</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-secondary">
              按省份查看当前筛选下的岗位分布，点选地图后，右侧预览和下方清单会同步更新。
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {filters.location ? (
              <span className="hidden text-xs text-ink-muted sm:inline">当前地区 · {getLocationFilterLabel(filters.location)}</span>
            ) : null}
            <button
              type="button"
              className="text-action pressable px-2 py-1 text-xs md:hidden"
              aria-expanded={mapExpanded}
              aria-controls="job-map-body"
              onClick={() => setMapExpanded((current) => !current)}
            >
              {mapExpanded ? "收起地图" : "打开地图"}
            </button>
          </div>
        </div>
        <div id="job-map-body" className={cn("job-map-body", !mapExpanded && "hidden md:block")}>
          {loading ? (
            <div className="grid min-h-[320px] place-items-center border-y border-[color:var(--line-ghost)] text-sm text-ink-muted md:min-h-[360px] lg:min-h-[390px]">
              <span className="loading-line">正在绘制岗位地图</span>
            </div>
          ) : loadError && jobs.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center border-y border-[color:var(--line-ghost)] px-5 text-center md:min-h-[360px] lg:min-h-[390px]" role="alert">
              <div>
                <p className="text-sm text-ink-secondary">{loadError}</p>
                <Button variant="secondary" className="mt-4" onClick={loadData}>重试</Button>
              </div>
            </div>
          ) : (
            <ChinaJobMap
              jobs={mapVisibleJobs}
              selectedJobs={filteredJobs}
              selectedLocation={filters.location}
              onSelectJob={focusJob}
              onLocationChange={(location) => {
                setFocusedJobId(null);
                handleFiltersChange({ ...filters, location });
              }}
            />
          )}
        </div>
      </section>

      <div className="grid gap-8 xl:grid-cols-[300px_minmax(0,1fr)]">
        <JobFilterBar
          filters={filters}
          facets={facets}
          onChange={handleFiltersChange}
          discoveryScope={discoveryScope}
          onDiscoveryScopeChange={setDiscoveryScope}
          recentCount={recentJobs.length}
          recentPreferenceCount={recentPreferenceJobs.length}
          hasPreferences={preferenceAvailable}
          isAuthenticated={Boolean(currentUserId)}
          resetVersion={filterResetVersion}
        />

        <section id="job-list" className="min-w-0">
          <div className="section-heading">
            <div className="flex items-baseline gap-2">
              <h2 className="section-title">
                {loading ? "正在整理岗位" : filters.location ? `${getLocationFilterLabel(filters.location)} · ${filteredJobs.length} 个岗位` : `岗位清单 · ${filteredJobs.length} 个`}
              </h2>
              {!loading && filteredJobs.length !== jobs.length && (
                <span className="text-xs text-ink-muted">
                  共 {jobs.length} 个
                </span>
              )}
            </div>
            <MiniBottleSvg />
          </div>

          {loading ? (
            <div className="empty-state">
              <span className="loading-line">正在整理岗位</span>
            </div>
          ) : loadError && jobs.length === 0 ? (
            <EmptyState
              title="岗位暂时无法读取"
              body={loadError}
              action={<Button onClick={loadData}>重试</Button>}
            />
          ) : jobs.length === 0 ? (
            <EmptyState
              title="暂时没有开放岗位"
              body="当前没有可展示的岗位，稍后再来看看。"
              action={<Button onClick={loadData}>刷新</Button>}
            />
          ) : filteredJobs.length === 0 ? (
            <EmptyState
              title="没有找到合适的岗位"
              body="试着减少筛选条件，或换一个关键词。"
              action={
                <Button variant="secondary" onClick={clearAllFilters}>
                  清空筛选
                </Button>
              }
            />
          ) : (
            <VirtualJobList
              ref={virtualJobListRef}
              jobs={filteredJobs}
              applicationByJobId={applicationByJobId}
              profile={profile}
              resumes={resumes}
              hoveredJobId={hoveredJobId}
              focusedJobId={focusedJobId}
              onApply={handleApply}
              onOpenProgress={openProgressByJob}
              onOpenReferral={setReferralJob}
              onHover={(target) => setHoveredJobId(target?.id ?? null)}
              onFocusJob={(target) => setFocusedJobId(target.id)}
            />
          )}
        </section>
      </div>

      <ProgressDrawer
        application={drawerApplication}
        open={Boolean(drawerApplication)}
        onClose={() => setDrawerApplication(null)}
        onChanged={handleApplicationChanged}
        onDeleted={handleApplicationDeleted}
      />
      <ReferralCodeDrawer
        open={Boolean(referralJob)}
        companyName={referralJob?.company_name ?? ""}
        jobId={referralJob?.id ?? null}
        jobTitle={referralJob?.job_titles}
        currentUserId={currentUserId}
        jobs={jobs}
        onClose={() => setReferralJob(null)}
      />

      {/* Bottom detail card for selected application */}
      {selectedApplication ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4 sm:px-6">
          <div className="action-bar mx-auto max-w-2xl p-4">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink-primary">
                  {selectedApplication.job.company_name}
                </div>
                <div className="mt-0.5 truncate text-xs text-ink-muted">
                  {selectedApplication.job.job_titles || "岗位待补充"}
                </div>
              </div>
              <StatusPill status={selectedApplication.status} />
              <span className="hidden shrink-0 text-xs text-ink-muted sm:inline">
                {formatDateTime(selectedApplication.updated_at)}
              </span>
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => {
                  setDrawerApplication(selectedApplication);
                  setSelectedApplication(null);
                }}
              >
                查看进度
              </Button>
              <button
                type="button"
                  className="shrink-0 rounded-lg p-1.5 text-ink-muted transition hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-secondary"
                onClick={() => setSelectedApplication(null)}
                aria-label="关闭"
              >
                <svg viewBox="0 0 16 16" fill="none" className="size-4">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CaptureAnimation job={capturedJob} onDone={clearCapture} />

    </div>
  );
}

function JobRadarHeader({
  stats,
  jobView,
  onJobViewChange,
  activeFilterChips,
  onClear,
}: {
  stats: {
    totalJobs: number;
    matchingJobs: number;
    visibleJobs: number;
    savedJobs: number;
    companyCount: number;
    recentJobs: number;
  };
  jobView: JobViewMode;
  onJobViewChange: (mode: JobViewMode) => void;
  activeFilterChips: string[];
  onClear: () => void;
}) {
  const modes: { value: JobViewMode; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "unapplied", label: "未投递" },
    { value: "applied", label: "已投递" },
  ];

  return (
    <section className="page-hero page-hero--radar">
      <div className="min-w-0">
        <h1 className="page-title">岗位坐标</h1>
      </div>

      <div className="progress-summary px-4 py-2 md:px-5 md:py-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
          <StatNumber value={stats.visibleJobs} label="开放岗位" />
          <StatNumber value={stats.companyCount} label="覆盖公司" />
          <StatNumber value={stats.savedJobs} label="已收入星瓶" />
          <StatNumber value={stats.recentJobs} label="近 7 日新增" />
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {activeFilterChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilterChips.map((chip) => (
                <span
                  key={chip}
                  className="status-pill whitespace-nowrap rounded-md px-2.5 py-1 text-xs text-ink-secondary"
                >
                  {chip}
                </span>
              ))}
              <button
                type="button"
                className="chip-button"
                onClick={onClear}
              >
                清空
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-grid grid-cols-3 rounded-lg bg-[color:var(--apple-control-bg)] p-1" role="group" aria-label="岗位视图">
            {modes.map((mode) => (
              <button
                key={mode.value}
                type="button"
                className={cn(
                  "pressable rounded-md px-3 py-1.5 text-xs transition",
                  jobView === mode.value
                    ? "bg-[#E8EDF4] text-[#12294E]"
                    : "text-ink-muted hover:text-ink-secondary",
                )}
                aria-pressed={jobView === mode.value}
                onClick={() => onJobViewChange(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Link
              href="/referrals"
              className="text-action pressable px-3 py-2 text-xs"
            >
              <KeyRound aria-hidden="true" className="size-4" />
              内推码
            </Link>
            <Link
              href="/my"
              className="text-action pressable px-3 py-2 text-xs"
            >
              <Archive aria-hidden="true" className="size-4" />
              投递
            </Link>
            <Link
              href="/bottle"
              className="text-action pressable rounded-lg bg-nebula-blue/8 px-3 py-2 text-xs text-nebula-silver hover:bg-nebula-blue/12"
            >
              <Sparkles aria-hidden="true" className="size-4" />
              星瓶
            </Link>
          </div>
        </div>
      </div>

      {stats.matchingJobs !== stats.visibleJobs ? (
        <div className="mt-3 text-xs text-ink-muted/70">
          当前筛选匹配 {stats.matchingJobs} 个岗位，已按投递视图收窄为 {stats.visibleJobs} 个。
        </div>
      ) : null}
      </div>
    </section>
  );
}

function StatNumber({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-semibold leading-none text-ink-primary tabular-nums md:text-3xl">
        {value}
      </div>
      <div className="mt-2 whitespace-nowrap text-xs text-ink-muted">{label}</div>
    </div>
  );
}

function getActiveFilterChips(
  filters: JobFilters,
  jobView: JobViewMode,
  discoveryScope: JobDiscoveryScope,
) {
  const chips: string[] = [];
  const keyword = filters.keyword.trim();
  if (keyword) chips.push(`关键词：${keyword}`);
  if (filters.industry) chips.push(`行业：${filters.industry}`);
  if (filters.batchType) chips.push(`批次：${filters.batchType}`);
  if (filters.location) chips.push(`地点：${getLocationFilterLabel(filters.location)}`);
  filters.categories.forEach((category) => chips.push(`类别：${category}`));
  if (filters.sortBy === "start_date_desc") chips.push("最新开放");
  if (filters.sortBy === "start_date_asc") chips.push("最早开放");
  if (filters.sortBy === "company_asc") chips.push("按公司名称");
  if (discoveryScope === "recent") chips.push("近 7 日新增");
  if (discoveryScope === "recent_preference") chips.push("近 7 日新增 · 符合偏好");
  if (jobView === "unapplied") chips.push("只看未投递");
  if (jobView === "applied") chips.push("只看已投递");
  return chips;
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <EmptyConstellation />
      <h3>{title}</h3>
      <p className="mx-auto max-w-md">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/* ── Miniature decorative bottle icon ── */
function MiniBottleSvg() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 40"
      className="size-6 shrink-0 text-nebula-blue/40"
      fill="none"
    >
      <path
        d="M10 4C10 2.5 11 1 12 1C13 1 14 2.5 14 4V8C14 9 15.5 10.5 17 12C20.5 15.5 22 20 22 26C22 34 18 38 12 38C6 38 2 34 2 26C2 20 3.5 15.5 7 12C8.5 10.5 10 9 10 8V4Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <rect x="9.5" y="0.5" width="5" height="2" rx="1" fill="currentColor" fillOpacity="0.25" />
      <path
        d="M5 18C8 16 11 15.5 15 17C18 18.5 20 17 21 15"
        stroke="currentColor"
        strokeOpacity="0.12"
        strokeWidth="0.5"
      />
      <circle cx="8" cy="24" r="0.8" fill="currentColor" fillOpacity="0.3" />
      <circle cx="14" cy="28" r="1" fill="currentColor" fillOpacity="0.25" />
      <circle cx="11" cy="32" r="0.7" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}
