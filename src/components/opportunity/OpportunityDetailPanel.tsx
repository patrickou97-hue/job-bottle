"use client";

import { ExternalLink } from "lucide-react";
import { StatusPill } from "@/components/applications/StatusPill";
import { Button } from "@/components/ui/Button";
import type { Job, UserApplication } from "@/lib/types";

export function OpportunityDetailPanel({
  job,
  application,
  onApply,
}: {
  job: Job | null;
  application?: UserApplication | null;
  onApply: (job: Job) => void | Promise<void>;
}) {
  if (!job) {
    return (
      <aside className="surface-plain p-5 text-sm text-ink-muted">
        选择一个岗位查看详情。
      </aside>
    );
  }

  return (
    <aside className="surface-readable p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-ink-primary">{job.company_name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-nebula-silver">{job.job_titles || "岗位待补充"}</p>
        </div>
        {application ? <StatusPill status={application.status} /> : null}
      </div>

      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">行业</dt>
          <dd className="mt-1 text-ink-secondary">{job.industry || "暂无"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">地点</dt>
          <dd className="mt-1 text-ink-secondary">{job.locations || "暂无"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">批次</dt>
          <dd className="mt-1 text-ink-secondary">{job.batch_type || "暂无"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">开启时间</dt>
          <dd className="mt-1 text-ink-secondary">{job.start_date || "暂无"}</dd>
        </div>
      </dl>

      <Button className="mt-5 w-full gap-2" onClick={() => onApply(job)}>
        <ExternalLink aria-hidden="true" className="size-4" />
        {application ? "再次打开官网" : "捕获并去官网投递"}
      </Button>
    </aside>
  );
}
