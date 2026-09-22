"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter, Plus, Search, Upload, X } from "lucide-react";
import { fetchAdminJobsPage, fetchAllJobsForAdmin } from "@/lib/jobs";
import { findDuplicateJobGroups } from "@/lib/job-dedupe";
import { sanitizeApplicationUrl } from "@/lib/application-url";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { AdminJobForm } from "@/components/admin/AdminJobForm";
import { AdminJobTable } from "@/components/admin/AdminJobTable";
import type { Job } from "@/lib/types";

const PAGE_SIZE = 40;

export function AdminJobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [duplicateSource, setDuplicateSource] = useState<Job[] | null>(null);
  const [editing, setEditing] = useState<Job | null>(null);
  const [keyword, setKeyword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [duplicateOnly, setDuplicateOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [page, setPage] = useState(1);

  async function loadData() {
    setLoading(true);
    setMessage("");
    try {
      if (!isSupabaseConfigured()) {
        setIsAdmin(false);
        console.error("Supabase environment variables are not configured.");
        setMessage("岗位数据暂时无法读取，请稍后重试。");
        return;
      }
      const sessionResponse = await fetch("/api/admin/session", { cache: "no-store", credentials: "include" });
      const sessionPayload = await sessionResponse.json().catch(() => null) as { error?: string } | null;
      if (!sessionResponse.ok) {
        setIsAdmin(false);
        setMessage(sessionPayload?.error || (sessionResponse.status === 401 ? "请先登录管理员账号。" : "无权限访问。"));
        return;
      }
      setIsAdmin(true);
      const result = await fetchAdminJobsPage(createClient(), { page, pageSize: PAGE_SIZE, keyword });
      setJobs(result.jobs);
      setTotalJobs(result.total);
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
    // This initial session check intentionally runs once; subsequent query changes use the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAdmin || duplicateOnly) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void fetchAdminJobsPage(createClient(), { page, pageSize: PAGE_SIZE, keyword })
        .then((result) => {
          setJobs(result.jobs);
          setTotalJobs(result.total);
        })
        .catch(() => setMessage("读取岗位失败，请确认数据库权限。"))
        .finally(() => setLoading(false));
    }, keyword.trim() ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [isAdmin, keyword, page, duplicateOnly]);

  const duplicateFiltered = useMemo(() => {
    const key = keyword.trim().toLowerCase();
    const source = duplicateSource ?? [];
    if (!key) return source;
    return source.filter(
      (job) =>
        job.company_name.toLowerCase().includes(key) ||
        (job.job_titles ?? "").toLowerCase().includes(key) ||
        (job.industry ?? "").toLowerCase().includes(key) ||
        (job.locations ?? "").toLowerCase().includes(key),
    );
  }, [duplicateSource, keyword]);

  const duplicateGroups = useMemo(() => findDuplicateJobGroups(duplicateSource ?? []), [duplicateSource]);
  const duplicateJobIds = useMemo(
    () => new Set(duplicateGroups.flatMap((group) => group.jobs.map((job) => job.id))),
    [duplicateGroups],
  );

  const visibleJobs = useMemo(
    () => (duplicateOnly ? duplicateFiltered.filter((job) => duplicateJobIds.has(job.id)) : jobs),
    [duplicateFiltered, duplicateJobIds, duplicateOnly, jobs],
  );
  const totalPages = Math.max(1, Math.ceil((duplicateOnly ? visibleJobs.length : totalJobs) / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedJobs = useMemo(
    () => duplicateOnly ? visibleJobs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE) : jobs,
    [duplicateOnly, jobs, safePage, visibleJobs],
  );

  useEffect(() => {
    if (!editorOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditorOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorOpen]);

  async function saveJob(payload: Omit<Job, "id" | "created_at" | "updated_at">, id?: string) {
    if (!isSupabaseConfigured()) {
      console.error("Supabase environment variables are not configured.");
      setMessage("岗位暂未更新，请稍后重试。");
      return;
    }
    const supabase = createClient();
    const sanitizedPayload = {
      ...payload,
      apply_url: sanitizeApplicationUrl(payload.apply_url),
    };
    if (id) {
      const { error } = await supabase.from("jobs").update(sanitizedPayload).eq("id", id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("jobs").insert(sanitizedPayload);
      if (error) throw error;
    }
    setEditing(null);
    setEditorOpen(false);
    await loadData();
  }

  async function deleteJob(job: Job) {
    if (!isSupabaseConfigured()) {
      console.error("Supabase environment variables are not configured.");
      setMessage("岗位暂未更新，请稍后重试。");
      return;
    }
    const { error } = await createClient().from("jobs").delete().eq("id", job.id);
    if (error) {
      setMessage("删除失败，请稍后再试。");
      return;
    }
    setJobs((current) => current.filter((item) => item.id !== job.id));
    setTotalJobs((current) => Math.max(0, current - 1));
  }

  async function toggleActive(job: Job) {
    if (!isSupabaseConfigured()) {
      console.error("Supabase environment variables are not configured.");
      setMessage("岗位暂未删除，请稍后重试。");
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
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, is_active: !item.is_active } : item));
  }

  async function toggleDuplicateMode() {
    if (duplicateOnly) {
      setDuplicateOnly(false);
      setDuplicateSource(null);
      setPage(1);
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      setDuplicateSource(await fetchAllJobsForAdmin(createClient()));
      setDuplicateOnly(true);
      setPage(1);
    } catch {
      setMessage("重复岗位暂时无法读取，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page admin-page--jobs observatory-page space-y-8">
      <section className="page-hero">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="page-kicker">管理员</p>
            <h1 className="page-title">岗位管理</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="gap-2" disabled={!isAdmin} onClick={() => { setEditing(null); setEditorOpen(true); }}>
              <Plus aria-hidden="true" className="size-4" />
              新增岗位
            </Button>
            <Button
              variant={duplicateOnly ? "primary" : "secondary"}
              className="gap-2"
              disabled={!isAdmin || loading}
              onClick={() => void toggleDuplicateMode()}
              title={
                duplicateSource === null
                  ? "点击后扫描全部岗位的重复记录"
                  : duplicateGroups.length > 0
                  ? `仅查看 ${duplicateGroups.length} 组重复岗位`
                  : "当前没有发现重复岗位"
              }
            >
              <Filter aria-hidden="true" className="size-4" />
              {duplicateOnly ? "显示全部岗位" : "筛选重复岗位"}
            </Button>
            <Link href="/admin/import">
              <Button variant="secondary" className="gap-2">
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
          {editorOpen ? (
            <div
              className="admin-drawer-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.currentTarget === event.target) setEditorOpen(false);
              }}
            >
              <aside className="admin-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-job-editor-title">
                <div className="admin-drawer__header">
                  <div>
                    <p className="page-kicker">岗位内容</p>
                    <h2 id="admin-job-editor-title">{editing ? "编辑岗位" : "新增岗位"}</h2>
                  </div>
                  <button type="button" className="admin-drawer__close" onClick={() => setEditorOpen(false)} aria-label="关闭岗位编辑">
                    <X aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <AdminJobForm job={editing} onSubmit={saveJob} onCancel={() => setEditorOpen(false)} />
              </aside>
            </div>
          ) : null}

          <section className="form-section">
            {duplicateGroups.length > 0 ? (
              <div className="mb-5 ui-notice border-[#b86b28] px-4 py-1 text-sm leading-6 text-[#704018]">
                发现 {duplicateGroups.length} 组疑似重复岗位。当前筛选不会删除数据，你可以逐条核验并保留一条。
              </div>
            ) : null}
            <div className="admin-jobs-toolbar">
              <div className="relative min-w-0 flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-nebula-blue/70"
                />
                <Input
                  className="pl-11"
                  value={keyword}
                  onChange={(event) => { setKeyword(event.target.value); setPage(1); }}
                  placeholder="搜索公司、岗位、行业或地点"
                />
              </div>
              <span className="admin-jobs-toolbar__count">
                {duplicateOnly ? `${visibleJobs.length} 个重复岗位` : `${totalJobs} 个岗位`}
              </span>
            </div>
          </section>

          {duplicateOnly && duplicateGroups.length > 0 ? (
            <section className="space-y-3 border-t border-[color:var(--line-ghost)] pt-5">
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
            <JobsLoadingState />
          ) : (
            <AdminJobTable
              jobs={pagedJobs}
              duplicateJobIds={duplicateJobIds}
              onEdit={(job) => { setEditing(job); setEditorOpen(true); }}
              onDelete={deleteJob}
              onToggleActive={toggleActive}
            />
          )}

          {!loading && visibleJobs.length > 0 ? (
            <div className="admin-pagination" aria-label="岗位分页">
              <span>第 {safePage} / {totalPages} 页</span>
              <div className="admin-pagination__actions">
                <button type="button" onClick={() => setPage((current) => Math.max(1, Math.min(current, totalPages) - 1))} disabled={safePage <= 1} aria-label="上一页">
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, Math.min(current, totalPages) + 1))} disabled={safePage >= totalPages} aria-label="下一页">
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function JobsLoadingState() {
  return (
    <div className="admin-jobs-loading" aria-label="正在读取岗位" aria-busy="true">
      <div className="admin-jobs-loading__toolbar">
        <span className="admin-skeleton-block" />
        <span className="admin-skeleton-block" />
      </div>
      <div className="admin-jobs-loading__table">
        <span className="admin-skeleton-block admin-jobs-loading__header" />
        {Array.from({ length: 8 }, (_, index) => <span key={index} className="admin-skeleton-block admin-jobs-loading__row" />)}
      </div>
    </div>
  );
}
