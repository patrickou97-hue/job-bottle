import { ExternalLink } from "lucide-react";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime, isValidHttpUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { StatusPill } from "@/components/applications/StatusPill";
import type { ApplicationWithJob } from "@/lib/types";

export function ApplicationOrbitDetail({
  application,
  onEdit,
}: {
  application: ApplicationWithJob | null;
  onEdit: (application: ApplicationWithJob) => void;
}) {
  if (!application) {
    return (
      <aside className="surface-plain p-5 text-sm text-ink-muted">
        选择一条投递记录查看详情。
      </aside>
    );
  }

  return (
    <aside className="surface-readable p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-ink-primary">{application.job.company_name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-nebula-silver">{application.job.job_titles || "岗位待补充"}</p>
        </div>
        <StatusPill status={application.status} />
      </div>
      <dl className="grid gap-3 text-sm">
        <div>
          <dt className="text-xs text-ink-muted">当前轨道</dt>
          <dd className="mt-1 text-ink-secondary">{APPLICATION_STATUS_LABELS[application.status]}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">地点</dt>
          <dd className="mt-1 text-ink-secondary">{application.job.locations || "暂无"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">行业</dt>
          <dd className="mt-1 text-ink-secondary">{application.job.industry || "暂无"}</dd>
        </div>
        <div>
          <dt className="text-xs text-ink-muted">最近更新</dt>
          <dd className="mt-1 text-ink-secondary">{formatDateTime(application.updated_at)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-col gap-2">
        <Button onClick={() => onEdit(application)}>查看 / 修改进度</Button>
        <Button
          variant="secondary"
          className="gap-2"
          disabled={!isValidHttpUrl(application.job.apply_url)}
          onClick={() => window.open(application.job.apply_url, "_blank", "noopener,noreferrer")}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          打开官网
        </Button>
      </div>
    </aside>
  );
}
