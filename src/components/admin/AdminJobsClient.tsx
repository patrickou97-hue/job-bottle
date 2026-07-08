"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Upload } from "lucide-react";
import { fetchAllJobsForAdmin } from "@/lib/jobs";
import { getCurrentUserOrNull } from "@/lib/auth";
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
          <Link href="/admin/import">
            <Button className="gap-2">
              <Upload aria-hidden="true" className="size-4" />
              批量导入
            </Button>
          </Link>
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

          {loading ? (
            <div className="empty-state">
              <span className="loading-line">正在读取岗位</span>
            </div>
          ) : (
            <AdminJobTable
              jobs={filtered}
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
