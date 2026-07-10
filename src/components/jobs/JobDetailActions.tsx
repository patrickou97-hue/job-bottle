"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Archive, ExternalLink } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { updateApplication, upsertApplication } from "@/lib/applications";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl } from "@/lib/utils";
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

  async function captureAndOpen() {
    setMessage("");
    if (!isSupabaseConfigured()) {
      setMessage("数据库暂未连接，稍后再试。");
      return;
    }
    if (!isValidHttpUrl(job.apply_url)) {
      setMessage("投递链接格式不正确，暂时无法打开官网。");
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
      const nextApplication = await upsertApplication(supabase, user.id, job.id);
      setApplication(nextApplication);
      safeOpenUrl(job.apply_url);
      if (nextApplication.status === "opened") {
        armApplyConfirmation();
        setMessage("已记录为“已浏览”，回来后可确认是否已投递。");
      } else {
        setMessage("已浏览，当前投递状态保持不变。");
      }
    } catch {
      setMessage("收录失败，网络似乎断开了。重试");
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

  async function resolveApplyConfirmation(status: "applied" | "withdrawn" | "keep_opened") {
    if (!application) return;
    if (applyConfirmFallbackRef.current) {
      window.clearTimeout(applyConfirmFallbackRef.current);
      applyConfirmFallbackRef.current = null;
    }
    if (status === "keep_opened") {
      applyConfirmationArmedRef.current = false;
      setShowApplyConfirmation(false);
      setMessage("已保留为“已浏览”，之后可继续更新进度。");
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
            {application ? "已收录" : "收录后再去官网投递"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {application ? <StatusPill status={application.status} /> : "登录后收录，不影响继续浏览。"}
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
          <Button className="gap-2" disabled={busy} onClick={captureAndOpen}>
            <ExternalLink aria-hidden="true" className="size-4" />
            {application ? "打开官网" : "收录并去官网投递"}
          </Button>
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
