import { APPLICATION_PROGRESS_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { hashString } from "@/lib/galaxy-taxonomy";
import { CapturedStar } from "@/components/capture/CapturedStar";
import type { ApplicationWithJob } from "@/lib/types";

export function CaptureOrbit({
  applications,
  onSelect,
}: {
  applications: ApplicationWithJob[];
  onSelect?: (application: ApplicationWithJob) => void;
}) {
  const stageWidth = 100 / APPLICATION_PROGRESS_STATUS.length;

  return (
    <section className="relative overflow-hidden px-1 py-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink-primary">投递星图</h2>
          <p className="mt-1 text-xs text-ink-muted">捕获后的岗位会停在当前进度附近。</p>
        </div>
        <span className="text-xs text-ink-muted">{applications.length} 颗星</span>
      </div>

      <div className="relative h-40 overflow-hidden rounded-[18px]">
        <div className="absolute left-4 right-4 top-1/2 h-px bg-gradient-to-r from-transparent via-nebula-silver/16 to-transparent" />
        {APPLICATION_PROGRESS_STATUS.map((status, index) => (
          <div
            key={status}
            className="absolute top-1/2 flex -translate-y-1/2 flex-col items-center gap-2"
            style={{ left: `calc(${index * stageWidth + stageWidth / 2}% - 28px)`, width: 56 }}
          >
            <span className="size-2 rounded-full bg-nebula-silver/35 shadow-[0_0_18px_rgba(180,205,240,0.18)]" />
            <span className="text-[11px] text-ink-muted">{APPLICATION_STATUS_LABELS[status]}</span>
          </div>
        ))}

        {applications.map((application) => {
          const statusIndex = Math.max(
            0,
            APPLICATION_PROGRESS_STATUS.indexOf(application.status as (typeof APPLICATION_PROGRESS_STATUS)[number]),
          );
          const hash = hashString(application.id);
          const offsetX = ((hash % 100) / 100 - 0.5) * 6;
          const offsetY = (((hash >>> 8) % 100) / 100 - 0.5) * 54;
          const left = statusIndex * stageWidth + stageWidth / 2 + offsetX;
          const top = 50 + offsetY;
          return (
            <button
              key={application.id}
              type="button"
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%`, top: `${top}%` }}
              onClick={() => onSelect?.(application)}
              aria-label={`${application.job.company_name} 进度`}
            >
              <CapturedStar application={application} />
            </button>
          );
        })}

        {applications.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">
            暂无捕获记录
          </div>
        ) : null}
      </div>
    </section>
  );
}
