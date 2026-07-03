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

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const frame = window.requestAnimationFrame(() => setLoading(false));
      return () => window.cancelAnimationFrame(frame);
    }
    const supabase = createClient();
    let mounted = true;
    const frame = window.requestAnimationFrame(() => {
      async function load() {
        const [jobRows, user] = await Promise.all([fetchActiveJobs(supabase), getCurrentUserOrNull(supabase)]);
        if (!mounted) return;
        setJobs(jobRows);
        if (user) setApplications(await fetchMyApplications(supabase, user.id));
        setLoading(false);
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
  const body = kind === "region" ? "选择一个地区星云，进入对应岗位星体。" : "选择一个行业星云，进入对应岗位星体。";

  return (
    <div className="space-y-8 pb-24">
      <section className="py-8">
        <h1 className="font-display text-4xl font-semibold text-ink-primary">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-secondary">
          {body}
        </p>
      </section>
      {loading ? <div className="text-center text-xs text-ink-muted">正在校准星云数量...</div> : null}
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
