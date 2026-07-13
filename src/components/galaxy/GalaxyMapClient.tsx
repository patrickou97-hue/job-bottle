"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserOrNull } from "@/lib/auth";
import { fetchMyApplications } from "@/lib/applications";
import { fetchActiveJobs } from "@/lib/jobs";
import { buildGalaxyStats, getGalaxyGroups, type GalaxyKind } from "@/lib/galaxy-taxonomy";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { NebulaNode } from "@/components/galaxy/NebulaNode";
import type { ApplicationWithJob, Job } from "@/lib/types";

export function GalaxyMapClient({ kind }: { kind: GalaxyKind }) {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const frame = window.requestAnimationFrame(() => {
        setMessage("请先配置数据库环境变量，再读取岗位星系。");
        setLoading(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const supabase = createClient();
    let mounted = true;
    const frame = window.requestAnimationFrame(() => {
      async function load() {
        try {
          const [jobRows, user] = await Promise.all([fetchActiveJobs(supabase), getCurrentUserOrNull(supabase)]);
          const applicationRows = user ? await fetchMyApplications(supabase, user.id) : [];
          if (!mounted) return;
          setJobs(jobRows);
          setApplications(applicationRows);
        } catch {
          if (!mounted) return;
          setJobs([]);
          setApplications([]);
          setMessage("岗位星系读取失败，请检查网络后重试。");
        } finally {
          if (mounted) setLoading(false);
        }
      }
      void load();
    });
    return () => {
      mounted = false;
      window.cancelAnimationFrame(frame);
    };
  }, []);

  const capturedJobIds = useMemo(
    () => new Set(applications.map((application) => application.job_id)),
    [applications],
  );
  const stats = useMemo(() => buildGalaxyStats(jobs, capturedJobIds, kind), [capturedJobIds, jobs, kind]);
  const title = kind === "region" ? "地区星系" : "行业星系";

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div>
          <p className="page-kicker">岗位星系</p>
          <h1 className="page-title">{title}</h1>
        </div>
      </section>
      {message ? <div className="message-banner text-sm">{message}</div> : null}
      {loading ? <div className="empty-state"><span className="loading-line">正在读取岗位数量</span></div> : null}
      <section className="flex flex-wrap items-center justify-center gap-7">
        {(stats.length ? stats : getGalaxyGroups(kind).map((group) => ({ ...group, jobCount: 0, capturedCount: 0 }))).map((group) => (
          <NebulaNode
            key={group.slug}
            id={group.slug}
            name={group.label}
            count={group.jobCount}
            capturedCount={group.capturedCount}
            imageSrc={kind === "region" ? "/assets/nebula/nebula-region.png" : "/assets/nebula/nebula-industry.png"}
            variant={kind}
            onClick={() => router.push(`/galaxy/${kind}/${group.slug}`)}
          />
        ))}
      </section>
    </div>
  );
}
