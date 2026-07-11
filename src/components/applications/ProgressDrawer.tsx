"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import {
  APPLICATION_CANDIDATE_STAGE,
  APPLICATION_CANDIDATE_STAGE_LABELS,
  APPLICATION_PRIORITY_LABELS,
  APPLICATION_PROGRESS_STATUS,
  APPLICATION_STATUS_LABELS,
  TERMINAL_APPLICATION_STATUS,
} from "@/lib/constants";
import { deleteApplication, fetchApplicationHistory, updateApplication } from "@/lib/applications";
import { getCandidateStage } from "@/lib/career-workspace";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, isValidHttpUrl } from "@/lib/utils";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import type { ResumeDocument } from "@/lib/resume";
import type { ApplicationCandidateStage, ApplicationStatus, ApplicationWithJob, StatusHistory } from "@/lib/types";

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
  const [candidateStage, setCandidateStage] = useState<ApplicationCandidateStage>("preparing");
  const [priority, setPriority] = useState(0);
  const [channel, setChannel] = useState("");
  const [account, setAccount] = useState("");
  const [contactName, setContactName] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextActionAt, setNextActionAt] = useState("");
  const [resumeId, setResumeId] = useState("");
  const [customStageLabel, setCustomStageLabel] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [savedWorkflowFingerprint, setSavedWorkflowFingerprint] = useState("");
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [historyState, setHistoryState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const messageTimerRef = useRef<number | null>(null);
  const saveRequestRef = useRef(0);

  useEffect(() => {
    if (!application) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setStatus(application.status);
      setSavedStatus(application.status);
      setNote(application.progress_note ?? "");
      setSavedNote(application.progress_note ?? "");
      const nextCandidateStage = getCandidateStage(application);
      const nextWorkflow = {
        account: application.application_account ?? "",
        candidateStage: nextCandidateStage,
        channel: application.application_channel ?? "",
        contactName: application.contact_name ?? "",
        customStageLabel: application.custom_stage_label ?? "",
        nextAction: application.next_action ?? "",
        nextActionAt: toDateTimeLocal(application.next_action_at),
        priority: application.priority ?? 0,
        resumeId: application.resume_id ?? "",
        reviewNote: application.review_note ?? "",
      };
      setCandidateStage(nextCandidateStage);
      setPriority(nextWorkflow.priority);
      setChannel(nextWorkflow.channel);
      setAccount(nextWorkflow.account);
      setContactName(nextWorkflow.contactName);
      setNextAction(nextWorkflow.nextAction);
      setNextActionAt(nextWorkflow.nextActionAt);
      setResumeId(nextWorkflow.resumeId);
      setCustomStageLabel(nextWorkflow.customStageLabel);
      setReviewNote(nextWorkflow.reviewNote);
      setSavedWorkflowFingerprint(JSON.stringify(nextWorkflow));
      setMessage("");
      setConfirmingDelete(false);
      setHistoryState("loading");
      const supabase = createClient();
      void Promise.allSettled([
        fetchApplicationHistory(supabase, application.id),
        fetchMyResumes(supabase),
      ]).then(([historyResult, resumeResult]) => {
        if (cancelled) return;
        if (historyResult.status === "fulfilled") {
          setHistory(historyResult.value);
          setHistoryState("ready");
        } else {
          setHistory([]);
          setHistoryState("error");
        }
        if (resumeResult.status === "fulfilled") {
          setResumes(resumeResult.value);
        } else if (!isMissingResumeTableError(resumeResult.reason)) {
          setResumes([]);
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
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
  const workflowFingerprint = JSON.stringify({
    account,
    candidateStage,
    channel,
    contactName,
    customStageLabel,
    nextAction,
    nextActionAt,
    priority,
    resumeId,
    reviewNote,
  });
  const workflowDirty = workflowFingerprint !== savedWorkflowFingerprint;
  const isDirty = status !== savedStatus || note.trim() !== savedNote.trim() || workflowDirty;

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
    const workflowValues = workflowDirty
      ? {
          candidate_stage: candidateStage,
          priority,
          application_channel: cleanOptional(channel),
          application_account: cleanOptional(account),
          contact_name: cleanOptional(contactName),
          next_action: cleanOptional(nextAction),
          next_action_at: fromDateTimeLocal(nextActionAt),
          resume_id: cleanOptional(resumeId),
          custom_stage_label: cleanOptional(customStageLabel),
          review_note: cleanOptional(reviewNote),
        }
      : {};
    const optimisticApplication: ApplicationWithJob = {
      ...application,
      status: nextStatus,
      progress_note: nextNote.trim() || null,
      ...workflowValues,
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
        ...workflowValues,
      });
      if (requestId !== saveRequestRef.current) return true;
      const confirmedApplication: ApplicationWithJob = {
        ...optimisticApplication,
        ...updated,
        job: application.job,
      };
      setSavedStatus(nextStatus);
      setSavedNote(nextNote);
      setSavedWorkflowFingerprint(workflowFingerprint);
      void onChanged(confirmedApplication);
      if (nextStatus !== savedStatus) {
        void fetchApplicationHistory(createClient(), application.id).then(setHistory).catch(() => setHistoryState("error"));
        void track("application_status_updated", { application_id: application.id, status: nextStatus });
        if (nextStatus === "written_test") void track("written_test_recorded", { application_id: application.id });
        if (["first_round", "second_round", "final_round"].includes(nextStatus)) void track("interview_recorded", { application_id: application.id, status: nextStatus });
        if (nextStatus === "offer") void track("offer_recorded", { application_id: application.id });
      }
      flashMessage(successMessage);
      setConfirmingDelete(false);
      return true;
    } catch (error) {
      if (requestId !== saveRequestRef.current) return false;
      setStatus(previousStatus);
      setNote(previousNote);
      void onChanged(previousApplication);
      setMessage(error instanceof Error
        ? error.message
        : "保存失败，你填写的内容仍保留在当前面板。请检查网络后重试。");
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
    <Drawer open={open} title="投递" onClose={onClose}>
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

        <section className="border-y border-white/[0.1] py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">优先级</span>
              <Select value={String(priority)} onChange={(event) => setPriority(Number(event.target.value))}>
                {Object.entries(APPLICATION_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">使用简历</span>
              <Select value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
                <option value="">暂未绑定</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>{resume.title || "未命名简历"}</option>
                ))}
              </Select>
            </label>
          </div>

          {status === "opened" ? (
            <div className="mt-5">
              <span className="mb-2 block text-sm text-ink-secondary">候选阶段</span>
              <div className="grid grid-cols-3 gap-1 bg-black/15 p-1">
                {APPLICATION_CANDIDATE_STAGE.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={candidateStage === item
                      ? "pressable min-h-10 bg-white/[0.09] px-2 text-xs font-medium text-ink-primary"
                      : "pressable min-h-10 px-2 text-xs text-ink-muted hover:text-ink-primary"}
                    onClick={() => setCandidateStage(item)}
                  >
                    {APPLICATION_CANDIDATE_STAGE_LABELS[item]}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>

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
                        <span className="h-3 w-3 rotate-45 rounded-[3px] bg-aurum-300 shadow-[0_0_18px_rgba(126,124,181,0.52)] motion-safe:animate-pulse" />
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

        <section>
          <div className="mb-4 text-sm font-medium text-ink-primary">投递信息</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <WorkflowField label="投递渠道">
              <Input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="官网、内推、招聘平台" />
            </WorkflowField>
            <WorkflowField label="投递账号">
              <Input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="邮箱或平台账号" />
            </WorkflowField>
            <WorkflowField label="联系人">
              <Input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="姓名或联系方式" />
            </WorkflowField>
            <WorkflowField label="自定义阶段">
              <Input value={customStageLabel} onChange={(event) => setCustomStageLabel(event.target.value)} placeholder="三面、HR 面、主管面" />
            </WorkflowField>
          </div>
        </section>

        <section>
          <div className="mb-4 text-sm font-medium text-ink-primary">下一步</div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
            <WorkflowField label="动作">
              <Input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="准备笔试、跟进 HR、整理面试题" />
            </WorkflowField>
            <WorkflowField label="计划时间">
              <Input type="datetime-local" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} />
            </WorkflowField>
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

        <label className="block">
          <span className="mb-2 block text-sm text-ink-secondary">复盘</span>
          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder="记录卡点、有效准备和下次调整"
            className="min-h-24 w-full resize-none border-0 border-b border-white/14 bg-transparent px-0 py-3 text-sm leading-6 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-nebula-blue/60 focus:bg-white/[0.04]"
          />
        </label>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink-primary">状态时间线</span>
            <span className="text-xs text-ink-muted">{history.length} 个节点</span>
          </div>
          {historyState === "loading" ? (
            <p className="text-sm text-ink-muted">正在读取状态记录</p>
          ) : historyState === "error" ? (
            <p className="text-sm leading-6 text-ink-muted">状态记录暂时无法读取，当前编辑内容不受影响。</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-ink-muted">还没有状态变化记录。</p>
          ) : (
            <ol className="border-l border-white/[0.12] pl-4">
              {history.map((item) => (
                <li key={item.id} className="relative pb-4 last:pb-0">
                  <span className="absolute -left-[19px] top-1.5 size-1.5 rounded-full bg-nebula-silver" />
                  <p className="text-sm text-ink-secondary">
                    {item.from_status ? `${APPLICATION_STATUS_LABELS[item.from_status]} → ` : "建立记录 · "}
                    <span className="text-ink-primary">{APPLICATION_STATUS_LABELS[item.to_status]}</span>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{formatDateTime(item.changed_at)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

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

function WorkflowField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-ink-secondary">{label}</span>
      {children}
    </label>
  );
}

function cleanOptional(value: string) {
  return value.trim() || null;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
