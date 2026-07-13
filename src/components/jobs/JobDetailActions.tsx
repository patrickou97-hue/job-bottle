"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { updateApplication, upsertApplication } from "@/lib/applications";
import { getApplicationStageLabel, getCandidateStage, getJobPrimaryAction } from "@/lib/career-workspace";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl } from "@/lib/utils";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/applications/StatusPill";
import { ApplyReturnConfirm } from "@/components/jobs/ApplyReturnConfirm";
import type { Job, UserApplication } from "@/lib/types";

export function JobDetailActions({
  job,
  initialApplication,
}: {
  job: Job;
  initialApplication?: UserApplication | null;
}) {
  const [application, setApplication] = useState<UserApplication | null>(initialApplication ?? null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showApplyConfirmation, setShowApplyConfirmation] = useState(false);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const applyConfirmationArmedRef = useRef(false);
  const applyPageWasHiddenRef = useRef(false);
  const applyConfirmFallbackRef = useRef<number | null>(null);
  const loginHref = `/login?next=${encodeURIComponent(`/jobs/${job.id}`)}`;

  useEffect(() => {
    void track("job_view", { job_id: job.id });
  }, [job.id]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (!application || !applyConfirmationArmedRef.current) return;
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
  }, [application]);

  useEffect(() => {
    return () => {
      if (applyConfirmFallbackRef.current) {
        window.clearTimeout(applyConfirmFallbackRef.current);
      }
    };
  }, []);

  async function handlePrimaryAction() {
    setMessage("");
    if (!isSupabaseConfigured()) {
      setMessage("数据库暂未连接，稍后再试。");
      return;
    }
    if (application?.status === "opened" && getCandidateStage(application) === "preparing") {
      if (!isValidHttpUrl(job.apply_url)) {
        setMessage("投递链接格式不正确，当前记录和已填内容都已保留。");
        return;
      }
      if (!safeOpenUrl(job.apply_url)) {
        setMessage("浏览器阻止了新窗口，请允许本站打开投递页面后重试。");
        return;
      }
      armApplyConfirmation();
      setMessage("官网已打开。返回后确认是否完成投递。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        setMessage("登录后收录岗位。");
        return;
      }
      if (!application) {
        const nextApplication = await upsertApplication(supabase, user.id, job.id, "evaluating");
        setApplication(nextApplication);
        void track("job_saved", { job_id: job.id });
        setMessage(
          nextApplication.candidate_stage === "evaluating"
            ? "已加入星瓶。先评估岗位，再决定是否投入准备。"
            : "已加入星瓶。当前数据库尚未升级，候选阶段暂按“准备中”显示。",
        );
        return;
      }

      if (application.status !== "opened") return;
      const candidateStage = getCandidateStage(application);
      const nextStage = candidateStage === "evaluating" ? "saved" : "preparing";
      const nextApplication = await updateApplication(supabase, application.id, { candidate_stage: nextStage });
      setApplication(nextApplication);
      void track("candidate_stage_updated", { job_id: job.id, stage: nextStage });
      if (nextStage === "saved") {
        setMessage("已保留为候选岗位。可以设置优先级，或继续开始准备。");
      } else {
        setMessage("已进入准备中。建议先创建岗位简历，再记录投递。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "岗位操作失败，当前记录和已填内容都已保留，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }

  function armApplyConfirmation() {
    if (applyConfirmFallbackRef.current) {
      window.clearTimeout(applyConfirmFallbackRef.current);
    }
    applyConfirmationArmedRef.current = true;
    applyPageWasHiddenRef.current = false;
    setShowApplyConfirmation(false);
    applyConfirmFallbackRef.current = window.setTimeout(() => {
      if (applyConfirmationArmedRef.current) {
        setShowApplyConfirmation(true);
      }
    }, 2200);
  }

  const primaryAction = getJobPrimaryAction(application);

  async function resolveApplyConfirmation(status: "applied" | "withdrawn" | "keep_opened") {
    if (!application) return;
    if (applyConfirmFallbackRef.current) {
      window.clearTimeout(applyConfirmFallbackRef.current);
      applyConfirmFallbackRef.current = null;
    }
    if (status === "keep_opened") {
      applyConfirmationArmedRef.current = false;
      setShowApplyConfirmation(false);
      setMessage("仍保留在“准备中”，可以稍后继续记录投递。");
      return;
    }

    setConfirmBusy(true);
    setMessage("");
    try {
      const nextApplication = await updateApplication(createClient(), application.id, {
        status,
        progress_note: application.progress_note,
      });
      setApplication(nextApplication);
      if (status === "applied") void track("application_recorded", { job_id: job.id });
      applyConfirmationArmedRef.current = false;
      setShowApplyConfirmation(false);
      setMessage(status === "applied" ? "已确认投递，岗位已出现在投递星图。" : "已标记为不投了。");
    } catch {
      setMessage("状态更新失败，请稍后再试。");
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="liquid-panel sticky bottom-4 z-20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
            <Archive aria-hidden="true" className="size-4 text-nebula-silver" />
            {application ? getApplicationStageLabel(application) : "先收藏，再决定是否投递"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {application ? <StatusPill status={application.status} label={getApplicationStageLabel(application)} /> : "登录后加入星瓶，不会直接打开官网。"}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {message === "登录后收录岗位。" ? (
            <Link
              href={loginHref}
              className="muted-button pressable inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium"
            >
              登录后收录
            </Link>
          ) : null}
          <Link
            href={{
              pathname: "/resume",
              query: {
                company: job.company_name,
                job: job.id,
                role: job.job_titles || "目标岗位",
              },
            }}
            className="muted-button pressable inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium"
          >
            准备岗位简历
          </Link>
          {primaryAction.kind === "progress" ? (
            <Link href="/my" className="gold-button inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium">
              更新进度
            </Link>
          ) : (
            <Button disabled={busy} onClick={handlePrimaryAction}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      </div>
      {application && showApplyConfirmation ? (
        <div className="mt-4">
          <ApplyReturnConfirm
            companyName={job.company_name}
            busy={confirmBusy}
            onApplied={() => void resolveApplyConfirmation("applied")}
            onLater={() => void resolveApplyConfirmation("keep_opened")}
            onWithdraw={() => void resolveApplyConfirmation("withdrawn")}
          />
        </div>
      ) : null}
        {message && message !== "登录后收录岗位。" ? (
        <p className="mt-3 text-xs text-nebula-silver">{message}</p>
      ) : null}
    </div>
  );
}
