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
    <div className="space-y-6 pb-24">
      <section className="surface-subtle rounded-[28px] p-6">
        <p className="text-xs tracking-[0.2em] text-ink-muted">季节容器</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-ink-primary">
          我的星瓶
        </h1>
      </section>

      {message ? (
        <div className="rounded-[22px] border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
          {message}
        </div>
      ) : null}

      {loading || redirecting ? (
        <div className="py-12 text-center text-sm text-ink-secondary">
          {redirecting ? "正在前往登录..." : "读取投递记录..."}
        </div>
      ) : (
        <div className="mx-auto max-w-4xl">
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
