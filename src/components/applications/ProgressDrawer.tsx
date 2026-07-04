"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import {
  APPLICATION_PROGRESS_STATUS,
  APPLICATION_STATUS_LABELS,
  TERMINAL_APPLICATION_STATUS,
} from "@/lib/constants";
import { updateApplication, deleteApplication } from "@/lib/applications";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, isValidHttpUrl } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Textarea } from "@/components/ui/Textarea";
import { StatusSelect } from "@/components/applications/StatusSelect";
import { StatusPill } from "@/components/applications/StatusPill";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import { DeadlineChip } from "@/components/jobs/DeadlineChip";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export function ProgressDrawer({
  application,
  open,
  onClose,
  onChanged,
}: {
  application: ApplicationWithJob | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>("opened");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (!application) return;
    const timer = window.setTimeout(() => {
      setStatus(application.status);
      setNote(application.progress_note ?? "");
      setMessage("");
      setConfirmingDelete(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [application]);

  const progressIndex = useMemo(
    () => APPLICATION_PROGRESS_STATUS.findIndex((item) => item === status),
    [status],
  );

  async function handleSave() {
    if (!application) return;
    setSaving(true);
    setMessage("");
    try {
      await updateApplication(createClient(), application.id, {
        status,
        progress_note: note.trim() || null,
      });
      await onChanged();
      setMessage("进度已保存。");
      setConfirmingDelete(false);
    } catch {
      setMessage("保存失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!application) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      setMessage("再次点击确认删除这条投递记录。");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await deleteApplication(createClient(), application.id);
      await onChanged();
      onClose();
    } catch {
      setMessage("删除失败，请稍后再试。");
    } finally {
      setSaving(false);
    }
  }

  if (!application) return null;
  const { job } = application;

  return (
    <Drawer open={open} title="投递轨道" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <CompanyBadge companyName={job.company_name} logoUrl={job.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-semibold text-ink-primary">{job.company_name}</h3>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">{job.job_titles}</p>
            <div className="mt-3">
              <StatusPill status={status} />
            </div>
          </div>
        </div>

        <div className="grid gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4 text-sm text-ink-secondary">
          <div>工作地点：{job.locations || "暂无"}</div>
          <div>所在行业：{job.industry || "暂无"}</div>
          <div>批次类型：{job.batch_type || "暂无"}</div>
          <div className="flex items-center gap-2">
            <span>截止时间：</span>
            <DeadlineChip job={job} compact />
          </div>
          <div>最近更新：{formatDateTime(application.updated_at)}</div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-ink-primary">状态轨道</span>
            <span className="text-xs text-ink-muted">拒绝和放弃为终止状态</span>
          </div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {APPLICATION_PROGRESS_STATUS.map((item, index) => {
              const active = item === status;
              const done = progressIndex >= index && progressIndex >= 0;
              return (
                <button
                  key={item}
                  type="button"
                  className={`rounded-2xl border px-2 py-2 text-xs transition ${
                    active
                      ? "border-nebula-blue/36 bg-nebula-blue/14 text-nebula-silver shadow-star-sm"
                      : done
                        ? "border-nebula-blue/22 bg-nebula-blue/8 text-nebula-silver"
                        : "border-white/10 bg-white/[0.03] text-ink-muted"
                  }`}
                  onClick={() => setStatus(item)}
                >
                  {APPLICATION_STATUS_LABELS[item]}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex gap-2">
            {TERMINAL_APPLICATION_STATUS.map((item) => (
              <button
                key={item}
                type="button"
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  status === item
                    ? "border-aurum-300/42 bg-aurum-300/12 text-aurum-300"
                    : "border-white/10 bg-white/[0.04] text-ink-muted"
                }`}
                onClick={() => setStatus(item)}
              >
                {APPLICATION_STATUS_LABELS[item]}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">投递状态</span>
          <StatusSelect value={status} onChange={setStatus} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">投递备注</span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="记录笔试时间、面试反馈或需要跟进的事项"
          />
        </label>

        {message ? <p className="text-sm text-nebula-silver">{message}</p> : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            保存进度
          </Button>
          <Button
            variant="secondary"
            className="gap-2"
            disabled={!isValidHttpUrl(job.apply_url)}
            onClick={() => window.open(job.apply_url, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            打开官网
          </Button>
          <Button variant="danger" className="gap-2" onClick={handleDelete} disabled={saving}>
            <Trash2 aria-hidden="true" className="size-4" />
            {confirmingDelete ? "确认删除" : "删除记录"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
