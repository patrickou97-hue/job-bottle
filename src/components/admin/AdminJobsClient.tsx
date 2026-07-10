"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search, Upload } from "lucide-react";
import { fetchAllJobsForAdmin } from "@/lib/jobs";
import { getCurrentUserOrNull } from "@/lib/auth";
import { findDuplicateJobGroups } from "@/lib/job-dedupe";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminJobForm } from "@/components/admin/AdminJobForm";
import { AdminJobTable } from "@/components/admin/AdminJobTable";
import type { Job } from "@/lib/types";

export function AdminJobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [editing, setEditing] = useState<Job | null>(null);
  const [keyword, setKeyword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duplicateOnly, setDuplicateOnly] = useState(false);
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setIsAdmin(false);
        setMessage("请先配置数据库环境变量。");
        return;
      }
      const supabase = createClient();
      const user = await getCurrentUserOrNull(supabase);
      if (!user) {
        setIsAdmin(false);
        setMessage("请先登录管理员账号。");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profile?.role !== "admin") {
        setIsAdmin(false);
        setMessage("无权限访问。");
        return;
      }
      setIsAdmin(true);
      setJobs(await fetchAllJobsForAdmin(supabase));
    } catch {
      setMessage("读取岗位失败，请确认数据库权限。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    if (!key) return jobs;
    return jobs.filter(
      (job) =>
        job.company_name.toLowerCase().includes(key) ||
        (job.job_titles ?? "").toLowerCase().includes(key) ||
        (job.industry ?? "").toLowerCase().includes(key) ||
        (job.locations ?? "").toLowerCase().includes(key),
    );
  }, [jobs, keyword]);

  const duplicateGroups = useMemo(() => findDuplicateJobGroups(jobs), [jobs]);
  const duplicateJobIds = useMemo(
    () => new Set(duplicateGroups.flatMap((group) => group.jobs.map((job) => job.id))),
    [duplicateGroups],
  );

  const visibleJobs = useMemo(
    () => (duplicateOnly ? filtered.filter((job) => duplicateJobIds.has(job.id)) : filtered),
    [duplicateJobIds, duplicateOnly, filtered],
  );

  async function saveJob(payload: Omit<Job, "id" | "created_at" | "updated_at">, id?: string) {
    if (!isSupabaseConfigured()) {
      setMessage("请先配置数据库环境变量。");
      return;
    }
    const supabase = createClient();
    if (id) {
      const { error } = await supabase.from("jobs").update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("jobs").insert(payload);
      if (error) throw error;
    }
    setEditing(null);
    await loadData();
  }

  async function deleteJob(job: Job) {
    if (!isSupabaseConfigured()) {
      setMessage("请先配置数据库环境变量。");
      return;
    }
    const { error } = await createClient().from("jobs").delete().eq("id", job.id);
    if (error) {
      setMessage("删除失败，请稍后再试。");
      return;
    }
    await loadData();
  }

  async function toggleActive(job: Job) {
    if (!isSupabaseConfigured()) {
      setMessage("请先配置数据库环境变量。");
      return;
    }
    const { error } = await createClient()
      .from("jobs")
      .update({ is_active: !job.is_active })
      .eq("id", job.id);
    if (error) {
      setMessage("状态更新失败，请稍后再试。");
      return;
    }
    await loadData();
  }

  return (
    <div className="observatory-page space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="page-kicker">管理员</p>
            <h1 className="page-title">岗位管理</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant={duplicateOnly ? "primary" : "secondary"}
              className="gap-2"
              disabled={!isAdmin || duplicateGroups.length === 0}
              onClick={() => setDuplicateOnly((current) => !current)}
              title={
                duplicateGroups.length > 0
                  ? `仅查看 ${duplicateGroups.length} 组重复岗位`
                  : "当前没有发现重复岗位"
              }
            >
              <Filter aria-hidden="true" className="size-4" />
              {duplicateOnly ? "显示全部岗位" : "筛选重复岗位"}
            </Button>
            <Link href="/admin/import">
              <Button className="gap-2">
                <Upload aria-hidden="true" className="size-4" />
                批量导入
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="info-banner text-sm">
          {message}
        </div>
      ) : null}

      {isAdmin ? (
        <>
          <AdminJobForm job={editing} onSubmit={saveJob} onCancel={() => setEditing(null)} />

          <section className="liquid-panel p-4">
            {duplicateGroups.length > 0 ? (
              <div className="mb-5 border-l-2 border-amber-200/55 px-4 py-1 text-sm leading-6 text-amber-50/85">
                发现 {duplicateGroups.length} 组疑似重复岗位。当前筛选不会删除数据，你可以逐条核验并保留一条。
              </div>
            ) : null}
            <div className="relative">
              <Search
                aria-hidden="true"
                className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
              />
              <Input
                className="pl-7"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索公司、岗位、行业或地点"
              />
            </div>
          </section>

          {duplicateOnly && duplicateGroups.length > 0 ? (
            <section className="space-y-3 border-t border-white/[0.09] pt-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="page-kicker">重复核验</p>
                  <h2 className="section-title mt-1">疑似重复岗位</h2>
                </div>
                <span className="section-meta">按公司、链接、岗位、地点和批次识别</span>
              </div>
              <div className="divide-y divide-white/[0.07]">
                {duplicateGroups.map((group, index) => (
                  <div key={group.fingerprint} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-primary">
                        {group.jobs[0]?.company_name || "未命名公司"}
                        <span className="ml-2 text-xs font-normal text-ink-muted">第 {index + 1} 组，共 {group.jobs.length} 条</span>
                      </p>
                      <p className="mt-1 truncate text-xs text-ink-muted">
                        {group.jobs.map((job) => job.job_titles || "岗位待补充").join(" / ")}
                      </p>
                    </div>
                    <Button variant="secondary" className="h-9" onClick={() => setEditing(group.jobs[0])}>
                      查看保留建议
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {loading ? (
            <div className="empty-state">
              <span className="loading-line">正在读取岗位</span>
            </div>
          ) : (
            <AdminJobTable
              jobs={visibleJobs}
              duplicateJobIds={duplicateJobIds}
              onEdit={setEditing}
              onDelete={deleteJob}
              onToggleActive={toggleActive}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
