"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { updateApplication, upsertApplication } from "@/lib/applications";
import { getApplicationStageLabel, getCandidateStage, getJobPrimaryAction } from "@/lib/career-workspace";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl, sanitizeApplicationUrl } from "@/lib/utils";
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
    let applyWindow: Window | null = null;
    let applyWindowNavigated = false;
    if (!isSupabaseConfigured()) {
      console.error("Supabase environment variables are not configured.");
      setMessage("操作未完成；当前记录与已填内容均已保留。请稍后重试。");
      return;
    }
    if (!application && isValidHttpUrl(job.apply_url)) {
      applyWindow = window.open("", "_blank");
    }
    if (application?.status === "opened" && getCandidateStage(application) === "preparing") {
      if (!isValidHttpUrl(job.apply_url)) {
        setMessage("投递链接无法识别；当前记录与已填内容均已保留。");
        return;
      }
      if (!safeOpenUrl(job.apply_url)) {
        setMessage("浏览器拦截了新窗口。请允许拾星打开投递页面后重试。");
        return;
      }
      armApplyConfirmation();
      setMessage("投递官网已打开。返回后，请确认是否完成投递。");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        applyWindow?.close();
        setMessage("登录后，即可收录岗位。");
        return;
      }
      if (!application) {
        if (!isValidHttpUrl(job.apply_url)) {
          applyWindow?.close();
          setMessage("投递链接无法识别，岗位尚未收入星瓶。请通过反馈告知我们。");
          return;
        }
        const nextApplication = await upsertApplication(supabase, user.id, job.id, "preparing");
        setApplication(nextApplication);
        void track("job_saved", { job_id: job.id });
        if (applyWindow) {
          applyWindow.opener = null;
          applyWindow.location.href = sanitizeApplicationUrl(job.apply_url);
          applyWindowNavigated = true;
        } else if (!safeOpenUrl(job.apply_url)) {
          setMessage("岗位已收入星瓶，但投递页面被浏览器拦截。请允许打开新窗口后重试。");
          return;
        }
        armApplyConfirmation();
        setMessage("岗位已收入星瓶，投递官网已打开。返回后，请确认是否完成投递。");
        return;
      }

      if (application.status !== "opened") return;
      const candidateStage = getCandidateStage(application);
      const nextStage = candidateStage === "evaluating" ? "saved" : "preparing";
      const nextApplication = await updateApplication(supabase, application.id, { candidate_stage: nextStage });
      setApplication(nextApplication);
      void track("candidate_stage_updated", { job_id: job.id, stage: nextStage });
      if (nextStage === "saved") {
        setMessage("已列入候选。你可以设置优先级，或开始准备。");
      } else {
        setMessage("已进入准备阶段。建议先建立岗位简历，再记录投递。");
      }
    } catch (error) {
      if (!applyWindowNavigated) applyWindow?.close();
      setMessage(error instanceof Error ? error.message : "操作未完成；当前记录与已填内容均已保留。请稍后重试。");
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
      setMessage("仍保留在“准备中”，之后可以继续更新。");
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
      setMessage(status === "applied" ? "投递已记录，这颗星已进入你的投递星图。" : "已结束这次考虑。");
    } catch {
      setMessage("状态暂未更新，请稍后重试。");
    } finally {
      setConfirmBusy(false);
    }
  }

  return (
    <div className="action-bar sticky bottom-4 z-20 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
            <Archive aria-hidden="true" className="size-4 text-nebula-silver" />
            {application ? getApplicationStageLabel(application) : "先收入星瓶，再决定是否奔赴。"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {application ? <StatusPill status={application.status} label={getApplicationStageLabel(application)} /> : "登录后即可收入星瓶，并前往企业投递页面。"}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {message === "登录后，即可收录岗位。" ? (
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
        {message && message !== "登录后，即可收录岗位。" ? (
        <p className="mt-3 text-xs text-nebula-silver">{message}</p>
      ) : null}
    </div>
  );
}
