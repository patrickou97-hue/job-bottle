"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Job } from "@/lib/types";

export function AdminJobTable({
  jobs,
  duplicateJobIds,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  jobs: Job[];
  duplicateJobIds?: Set<string>;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => Promise<void>;
  onToggleActive: (job: Job) => Promise<void>;
}) {
  if (jobs.length === 0) {
    return (
      <div className="empty-state">
        <div>
          <h2>暂无数据</h2>
          <p>新增岗位后会显示在这里。</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-job-table__desktop table-surface">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-[#eef0f3] text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-medium">公司</th>
              <th className="px-4 py-3 font-medium">岗位</th>
              <th className="px-4 py-3 font-medium">行业</th>
              <th className="px-4 py-3 font-medium">批次</th>
              <th className="px-4 py-3 font-medium">地点</th>
              <th className="px-4 py-3 font-medium">展示状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className={`border-b border-[color:var(--line-ghost)] text-ink-secondary transition hover:bg-[color:var(--surface-hover-bg)] ${
                  duplicateJobIds?.has(job.id) ? "bg-amber-100/[0.035]" : ""
                }`}
              >
                <td className="px-4 py-4 font-medium text-ink-primary">
                  <span className="inline-flex items-center gap-2">
                    {job.company_name}
                    {duplicateJobIds?.has(job.id) ? (
                      <span className="rounded-md bg-[#fff4e8] px-2 py-0.5 text-[10px] font-medium text-[#8a4b16]">疑似重复</span>
                    ) : null}
                  </span>
                </td>
                <td className="max-w-[280px] px-4 py-4">
                  <span className="line-clamp-2">{job.job_titles || "暂无"}</span>
                </td>
                <td className="px-4 py-4">{job.industry || "暂无"}</td>
                <td className="px-4 py-4">{job.batch_type || "暂无"}</td>
                <td className="px-4 py-4">{job.locations || "暂无"}</td>
                <td className="px-4 py-4">
                  <span
                    className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                      job.is_active
                        ? "status-pill text-nebula-silver"
                        : "status-pill text-slate-300"
                    }`}
                  >
                    {job.is_active ? "上架中" : "已下架"}
                  </span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" className="h-9 gap-1" onClick={() => onEdit(job)}>
                      <Pencil aria-hidden="true" className="size-4" />
                      编辑
                    </Button>
                    <Button
                      variant="secondary"
                      className="h-9"
                      onClick={() => onToggleActive(job)}
                    >
                      {job.is_active ? "下架" : "上架"}
                    </Button>
                    <Button
                      variant="danger"
                      className="h-9 gap-1"
                      onClick={() => {
                        if (window.confirm(`确认删除「${job.company_name}」吗？`)) {
                          void onDelete(job);
                        }
                      }}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div className="admin-job-table__mobile" aria-label="岗位列表">
        {jobs.map((job) => (
          <article key={job.id} className="admin-job-card">
            <div className="admin-job-card__heading">
              <div>
                <p className="admin-job-card__company">{job.company_name}</p>
                <h2>{job.job_titles || "暂无岗位名称"}</h2>
              </div>
              <span className={`status-pill admin-job-card__status ${job.is_active ? "admin-job-card__status--active" : ""}`}>
                {job.is_active ? "上架中" : "已下架"}
              </span>
            </div>

            <dl className="admin-job-card__meta">
              <div>
                <dt>行业</dt>
                <dd>{job.industry || "暂无"}</dd>
              </div>
              <div>
                <dt>批次</dt>
                <dd>{job.batch_type || "暂无"}</dd>
              </div>
              <div>
                <dt>地点</dt>
                <dd>{job.locations || "暂无"}</dd>
              </div>
            </dl>

            {duplicateJobIds?.has(job.id) ? <p className="admin-job-card__duplicate">疑似重复岗位，请优先核对。</p> : null}

            <div className="admin-job-card__actions">
              <Button variant="secondary" className="h-9 gap-1" onClick={() => onEdit(job)}>
                <Pencil aria-hidden="true" className="size-4" />
                编辑
              </Button>
              <Button variant="secondary" className="h-9" onClick={() => onToggleActive(job)}>
                {job.is_active ? "下架" : "上架"}
              </Button>
              <Button
                variant="danger"
                className="h-9 gap-1"
                onClick={() => {
                  if (window.confirm(`确认删除「${job.company_name}」吗？`)) {
                    void onDelete(job);
                  }
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                删除
              </Button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
