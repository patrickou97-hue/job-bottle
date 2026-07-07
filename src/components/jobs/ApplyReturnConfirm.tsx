"use client";

import { Check, Clock3, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ApplyReturnConfirm({
  companyName,
  busy = false,
  onApplied,
  onLater,
  onWithdraw,
}: {
  companyName: string;
  busy?: boolean;
  onApplied: () => void;
  onLater: () => void;
  onWithdraw: () => void;
}) {
  return (
    <div className="liquid-panel px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink-primary">投递完成了吗？</div>
          <div className="mt-1 truncate text-xs text-ink-muted">
            {companyName} 已记录为“已浏览”，确认后会进入“已投递”。
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button className="h-8 gap-1.5 px-3 text-xs" disabled={busy} onClick={onApplied}>
            <Check aria-hidden="true" className="size-3.5" />
            已投递
          </Button>
          <Button
            variant="secondary"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={busy}
            onClick={onLater}
          >
            <Clock3 aria-hidden="true" className="size-3.5" />
            还没有
          </Button>
          <Button
            variant="secondary"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={busy}
            onClick={onWithdraw}
          >
            <X aria-hidden="true" className="size-3.5" />
            不投了
          </Button>
        </div>
      </div>
    </div>
  );
}
