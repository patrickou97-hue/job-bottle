"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ExternalLink } from "lucide-react";
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
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export function ProgressDrawer({
  application,
  open,
  onClose,
  onChanged,
  onDeleted,
}: {
  application: ApplicationWithJob | null;
  open: boolean;
  onClose: () => void;
  onChanged: (application: ApplicationWithJob) => Promise<void> | void;
  onDeleted: (applicationId: string) => Promise<void> | void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>("opened");
  const [savedStatus, setSavedStatus] = useState<ApplicationStatus>("opened");
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const messageTimerRef = useRef<number | null>(null);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    if (!application) return;
    const timer = window.setTimeout(() => {
      setStatus(application.status);
      setSavedStatus(application.status);
      setNote(application.progress_note ?? "");
      setSavedNote(application.progress_note ?? "");
      setMessage("");
      setConfirmingDelete(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [application]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    };
  }, []);

  const progressIndex = useMemo(
    () => APPLICATION_PROGRESS_STATUS.findIndex((item) => item === status),
    [status],
  );
  const ended = TERMINAL_APPLICATION_STATUS.includes(status as (typeof TERMINAL_APPLICATION_STATUS)[number]);
  const isDirty = status !== savedStatus || note.trim() !== savedNote.trim();

  async function saveProgress(nextStatus = status, nextNote = note, successMessage = "已保存") {
    if (!application) return false;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    const previousStatus = status;
    const previousNote = note;
    const previousApplication: ApplicationWithJob = {
      ...application,
      status: previousStatus,
      progress_note: previousNote.trim() || null,
    };
    const optimisticApplication: ApplicationWithJob = {
      ...application,
      status: nextStatus,
      progress_note: nextNote.trim() || null,
      updated_at: new Date().toISOString(),
    };
    setStatus(nextStatus);
    setNote(nextNote);
    setSaving(true);
    setMessage("");
    void onChanged(optimisticApplication);
    try {
      const updated = await updateApplication(createClient(), application.id, {
        status: nextStatus,
        progress_note: nextNote.trim() || null,
      });
      if (requestId !== saveRequestRef.current) return true;
      const confirmedApplication: ApplicationWithJob = {
        ...optimisticApplication,
        ...updated,
        job: application.job,
      };
      setSavedStatus(nextStatus);
      setSavedNote(nextNote);
      void onChanged(confirmedApplication);
      flashMessage(successMessage);
      setConfirmingDelete(false);
      return true;
    } catch {
      if (requestId !== saveRequestRef.current) return false;
      setStatus(previousStatus);
      setNote(previousNote);
      void onChanged(previousApplication);
      setMessage("保存失败，请检查网络后重试。");
      return false;
    } finally {
      if (requestId === saveRequestRef.current) setSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: ApplicationStatus) {
    if (nextStatus === status && note.trim() === savedNote.trim()) return;
    await saveProgress(nextStatus, note, "已保存");
  }

  async function handleNoteBlur() {
    if (note.trim() === savedNote.trim() && status === savedStatus) return;
    await saveProgress(status, note, "已保存");
  }

  async function handleDelete() {
    if (!application) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await deleteApplication(createClient(), application.id);
      await onDeleted(application.id);
      onClose();
    } catch {
      setMessage("删除失败，请检查网络后重试。");
    } finally {
      setSaving(false);
    }
  }

  function flashMessage(nextMessage: string) {
    setMessage(nextMessage);
    if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    messageTimerRef.current = window.setTimeout(() => {
      setMessage("");
      messageTimerRef.current = null;
    }, 1500);
  }

  if (!application) return null;
  const { job } = application;
  const meta = [job.locations, job.industry, job.batch_type].filter(Boolean).join(" · ");
  const categories = job.job_categories?.length ? job.job_categories.join("、") : job.job_titles || "岗位类别待补充";

  return (
    <Drawer open={open} title="投递轨道" onClose={onClose}>
      <div className="space-y-8">
        <header className="flex items-start gap-4">
          <CompanyBadge companyName={job.company_name} logoUrl={job.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 text-2xl font-semibold text-ink-primary">{job.company_name}</h3>
              {ended ? (
                <span className="shrink-0 rounded-full bg-white/[0.08] px-2 py-1 text-[10px] text-ink-muted">
                  已结束
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-nebula-silver">{categories}</p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{meta || "岗位信息待补充"}</p>
          </div>
        </header>

        <section className={ended ? "opacity-40 transition-opacity" : "transition-opacity"}>
          <div className="mb-4 text-sm font-medium text-ink-primary">状态轨道</div>
          <div className="relative px-1 pb-9 pt-4">
            <div className="absolute left-2 right-2 top-7 h-px bg-white/12" />
            <div
              className="absolute left-2 top-7 h-px bg-aurum-300/70 transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{
                width:
                  progressIndex <= 0
                    ? 0
                    : `calc(${(progressIndex / (APPLICATION_PROGRESS_STATUS.length - 1)) * 100}% - 16px)`,
              }}
            />
            <div className="relative flex items-start justify-between">
              {APPLICATION_PROGRESS_STATUS.map((item, index) => {
                const active = item === status;
                const done = progressIndex >= index && progressIndex >= 0;
                const distantOnNarrow = progressIndex >= 0 && Math.abs(index - progressIndex) > 1;
                return (
                  <button
                    key={item}
                    id={`progress-status-node-${item}`}
                    type="button"
                    className="group flex w-12 flex-col items-center gap-3 text-center outline-none"
                    aria-current={active ? "step" : undefined}
                    aria-label={`设为${APPLICATION_STATUS_LABELS[item]}`}
                    onClick={() => void handleStatusChange(item)}
                    onKeyDown={(event) => handleNodeKeyDown(event, index)}
                  >
                    <span className="flex h-6 items-center justify-center">
                      {active ? (
                        <span className="h-3 w-3 rotate-45 rounded-[3px] bg-aurum-300 shadow-[0_0_18px_rgba(255,217,142,0.48)] motion-safe:animate-pulse" />
                      ) : done ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-aurum-300" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full ring-1 ring-white/28" />
                      )}
                    </span>
                    <span
                      className={[
                        "whitespace-nowrap text-[11px] leading-4 transition group-focus-visible:text-ink-primary",
                        active ? "font-medium text-ink-primary" : "text-ink-muted",
                        distantOnNarrow ? "max-[400px]:sr-only" : "",
                      ].join(" ")}
                    >
                      {APPLICATION_STATUS_LABELS[item]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="text-xs text-ink-muted">
            结束这条轨道:
            {TERMINAL_APPLICATION_STATUS.map((item, index) => (
              <span key={item}>
                {index === 0 ? " " : " / "}
                <button
                  type="button"
                  className="text-action inline-flex text-xs"
                  onClick={() => void handleStatusChange(item)}
                >
                  {APPLICATION_STATUS_LABELS[item]}
                </button>
              </span>
            ))}
          </div>
        </section>

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">投递备注</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() => void handleNoteBlur()}
            placeholder="记录笔试时间、面试反馈或需要跟进的事项"
            className="min-h-28 w-full resize-none border-0 border-b border-white/14 bg-transparent px-0 py-3 text-sm leading-6 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-nebula-blue/60 focus:bg-white/[0.04]"
          />
        </label>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <a
              href={isValidHttpUrl(job.apply_url) ? job.apply_url : undefined}
              target="_blank"
              rel="noreferrer"
              className="text-action text-sm text-nebula-silver aria-disabled:pointer-events-none aria-disabled:opacity-40"
              aria-disabled={!isValidHttpUrl(job.apply_url)}
            >
              <ExternalLink aria-hidden="true" className="size-4" />
              打开官网
            </a>
            <Button onClick={() => void saveProgress()} disabled={saving || !isDirty}>
              {isDirty ? "保存进度" : "已保存"}
            </Button>
          </div>

          {message ? <p className="text-right text-xs text-nebula-silver">{message}</p> : null}

          <div className="flex items-center justify-between gap-3 pt-4">
            <span className="text-[10px] text-ink-muted">最近更新 {formatDateTime(application.updated_at)}</span>
            {confirmingDelete ? (
              <span className="text-xs text-red-100">
                确认删除?
                <button type="button" className="ml-2 text-red-200" onClick={() => void handleDelete()}>
                  删除
                </button>
                <button type="button" className="ml-2 text-ink-muted" onClick={() => setConfirmingDelete(false)}>
                  取消
                </button>
              </span>
            ) : (
              <button type="button" className="text-xs text-red-200/80 transition hover:text-red-100" onClick={() => void handleDelete()}>
                删除记录
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function handleNodeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const nextIndex =
    event.key === "ArrowLeft"
      ? Math.max(0, index - 1)
      : Math.min(APPLICATION_PROGRESS_STATUS.length - 1, index + 1);
  document.getElementById(`progress-status-node-${APPLICATION_PROGRESS_STATUS[nextIndex]}`)?.focus();
}
