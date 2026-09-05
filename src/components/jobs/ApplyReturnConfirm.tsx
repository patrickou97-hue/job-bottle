"use client";

import { Check, Clock3, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MotionDialog } from "@/components/ui/MotionDialog";

export function ApplyReturnConfirm({
  companyName,
  busy = false,
  initialPosition = "",
  onApplied,
  onLater,
  onWithdraw,
}: {
  companyName: string;
  busy?: boolean;
  initialPosition?: string;
  onApplied: (appliedPosition: string) => void;
  onLater: () => void;
  onWithdraw: () => void;
}) {
  const [appliedPosition, setAppliedPosition] = useState(initialPosition);

  return (
    <MotionDialog
      labelledBy="apply-return-confirm-title"
      describedBy="apply-return-confirm-description"
      className="max-w-lg p-0"
      onBackdropClick={busy ? undefined : onLater}
      onEscapeKeyDown={busy ? undefined : onLater}
    >
      <form
        className="p-5 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          onApplied(appliedPosition);
        }}
      >
        <div className="min-w-0">
          <h2 id="apply-return-confirm-title" className="text-xl font-semibold tracking-tight text-ink-primary">
            这次投递完成了吗？
          </h2>
          <p id="apply-return-confirm-description" className="mt-2 text-sm leading-6 text-ink-muted">
            {companyName} 当前仍在准备中。完成投递后，可以顺手记录这次实际申请的岗位。
          </p>
        </div>

        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium text-ink-secondary">实际投递岗位（可选）</span>
          <Input
            data-dialog-initial-focus
            value={appliedPosition}
            maxLength={160}
            placeholder="例如：产品经理（北京）"
            onChange={(event) => setAppliedPosition(event.target.value)}
          />
          <span className="mt-2 block text-xs leading-5 text-ink-muted">
            暂时不确定可以留空，之后仍可在投递详情中补充。
          </span>
        </label>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <Button type="submit" className="gap-1.5 sm:order-3" disabled={busy}>
            <Check aria-hidden="true" className="size-3.5" />
            {busy ? "正在记录" : "确认已投递"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-1.5 sm:order-2"
            disabled={busy}
            onClick={onLater}
          >
            <Clock3 aria-hidden="true" className="size-3.5" />
            暂未投递
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="gap-1.5 sm:order-1"
            disabled={busy}
            onClick={onWithdraw}
          >
            <X aria-hidden="true" className="size-3.5" />
            不再考虑
          </Button>
        </div>
      </form>
    </MotionDialog>
  );
}
