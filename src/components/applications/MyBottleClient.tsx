"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchMyApplications } from "@/lib/applications";
import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import { ApplicationBottle } from "@/components/applications/ApplicationBottle";
import type { ApplicationWithJob } from "@/lib/types";

export function MyBottleClient({ loginNextPath = "/bottle" }: { loginNextPath?: string }) {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
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
      const rows = await fetchMyApplications(supabase, user.id);
      setApplications(rows);
      void track("bottle_view", { count: rows.length });
    } catch {
      setMessage("加载失败，请稍后再试。");
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
  }, []);

  function handleApplicationChanged(nextApplication: ApplicationWithJob) {
    setApplications((current) =>
      current.map((application) =>
        application.id === nextApplication.id ? nextApplication : application,
      ),
    );
  }

  function handleApplicationDeleted(applicationId: string) {
    setApplications((current) =>
      current.filter((application) => application.id !== applicationId),
    );
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">投递记录</p>
          <h1 className="page-title">星瓶</h1>
        </div>
        <div className="progress-summary px-4 py-2 md:px-5 md:py-3">
          <p className="text-sm leading-7 text-ink-secondary">
            已收进 <span className="font-display text-3xl font-semibold text-ink-primary tabular-nums">{applications.length}</span> 颗星
          </p>
        </div>
      </section>

      {message ? (
        <div className="message-banner text-sm">
          {message}
        </div>
      ) : null}

      {loading || redirecting ? (
        <div className="empty-state">
          <span className="loading-line">{redirecting ? "正在前往登录" : "正在读取星瓶"}</span>
        </div>
      ) : (
        <div className="mx-auto max-w-5xl">
          <ApplicationBottle
            applications={applications}
            onChanged={handleApplicationChanged}
            onDeleted={handleApplicationDeleted}
          />
        </div>
      )}
    </div>
  );
}
