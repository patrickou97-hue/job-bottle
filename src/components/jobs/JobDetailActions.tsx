"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { getCurrentUserOrNull } from "@/lib/auth";
import { upsertApplication } from "@/lib/applications";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { isValidHttpUrl, safeOpenUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/applications/StatusPill";
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
  const loginHref = `/login?next=${encodeURIComponent(`/jobs/${job.id}`)}`;

  async function captureAndOpen() {
    setMessage("");
    if (!isSupabaseConfigured()) {
      setMessage("数据库暂未连接，稍后再捕获这颗星。");
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
        setMessage("登录后捕获这颗星。");
        return;
      }
      const nextApplication = await upsertApplication(supabase, user.id, job.id);
      setApplication(nextApplication);
      safeOpenUrl(job.apply_url);
      setMessage("已捕获 · 已加入你的星图。");
    } catch {
      setMessage("捕获失败，网络似乎断开了。重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-4 z-20 rounded-[22px] border border-white/[0.07] bg-[#040814]/88 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.36)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-primary">
            <Sparkles aria-hidden="true" className="size-4 text-nebula-silver" />
            {application ? "已在你的星图中" : "捕获后进入你的星图"}
          </div>
          <div className="mt-1 text-xs text-ink-muted">
            {application ? <StatusPill status={application.status} /> : "登录后捕获，不影响继续浏览。"}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {message === "登录后捕获这颗星。" ? (
            <Link
              href={loginHref}
              className="muted-button inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium"
            >
              登录后捕获
            </Link>
          ) : null}
          <Button className="gap-2" disabled={busy} onClick={captureAndOpen}>
            <ExternalLink aria-hidden="true" className="size-4" />
            {application ? "再次打开官网" : "捕获并去官网投递"}
          </Button>
        </div>
      </div>
      {message && message !== "登录后捕获这颗星。" ? (
        <p className="mt-3 text-xs text-nebula-silver">{message}</p>
      ) : null}
    </div>
  );
}
