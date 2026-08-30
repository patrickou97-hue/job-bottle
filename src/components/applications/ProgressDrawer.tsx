"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ExternalLink, Settings2 } from "lucide-react";
import {
  APPLICATION_CANDIDATE_STAGE,
  APPLICATION_CANDIDATE_STAGE_LABELS,
  APPLICATION_PRIORITY_LABELS,
  APPLICATION_STATUS_LABELS,
  TERMINAL_APPLICATION_STATUS,
} from "@/lib/constants";
import { deleteApplication, fetchApplicationHistory, updateApplication } from "@/lib/applications";
import { getCandidateStage } from "@/lib/career-workspace";
import { fetchMyResumes, isMissingResumeTableError } from "@/lib/resume-sync";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime, isValidHttpUrl, sanitizeApplicationUrl } from "@/lib/utils";
import { track } from "@/lib/track";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CompanyBadge } from "@/components/jobs/CompanyBadge";
import type { ResumeDocument } from "@/lib/resume";
import type { ApplicationCandidateStage, ApplicationStatus, ApplicationWithJob, StatusHistory } from "@/lib/types";
import {
  DEFAULT_APPLICATION_WORKFLOW,
  getApplicationWorkflowNode,
  type ApplicationWorkflowNode,
} from "@/lib/application-workflow";
import { StatusPill } from "@/components/applications/StatusPill";

export function ProgressDrawer({
  application,
  workflowNodes = DEFAULT_APPLICATION_WORKFLOW,
  open,
  onClose,
  onChanged,
  onDeleted,
  onEditWorkflow,
}: {
  application: ApplicationWithJob | null;
  workflowNodes?: ApplicationWorkflowNode[];
  open: boolean;
  onClose: () => void;
  onChanged: (application: ApplicationWithJob) => Promise<void> | void;
  onDeleted: (applicationId: string) => Promise<void> | void;
  onEditWorkflow?: (application: ApplicationWithJob) => void;
}) {
  const [status, setStatus] = useState<ApplicationStatus>("opened");
  const [savedStatus, setSavedStatus] = useState<ApplicationStatus>("opened");
  const [appliedPosition, setAppliedPosition] = useState("");
  const [savedAppliedPosition, setSavedAppliedPosition] = useState("");
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
  const [workflowNodeId, setWorkflowNodeId] = useState("");
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
  const applicationId = application?.id ?? null;

  useEffect(() => {
    if (!open) return;
    const currentApplication = application;
    if (!currentApplication) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      setStatus(currentApplication.status);
      setSavedStatus(currentApplication.status);
      setAppliedPosition(currentApplication.applied_position ?? "");
      setSavedAppliedPosition(currentApplication.applied_position ?? "");
      setNote(currentApplication.progress_note ?? "");
      setSavedNote(currentApplication.progress_note ?? "");
      const nextCandidateStage = getCandidateStage(currentApplication);
      const nextWorkflow = {
        appliedPosition: currentApplication.applied_position ?? "",
        account: currentApplication.application_account ?? "",
        candidateStage: nextCandidateStage,
        channel: currentApplication.application_channel ?? "",
        contactName: currentApplication.contact_name ?? "",
        customStageLabel: currentApplication.custom_stage_label ?? "",
        workflowNodeId: currentApplication.workflow_node_id ?? "",
        nextAction: currentApplication.next_action ?? "",
        nextActionAt: toDateTimeLocal(currentApplication.next_action_at),
        priority: currentApplication.priority ?? 0,
        resumeId: currentApplication.resume_id ?? "",
        reviewNote: currentApplication.review_note ?? "",
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
      setWorkflowNodeId(nextWorkflow.workflowNodeId);
      setReviewNote(nextWorkflow.reviewNote);
      setSavedWorkflowFingerprint(JSON.stringify(nextWorkflow));
      setMessage("");
      setConfirmingDelete(false);
      setHistoryState("loading");
      const supabase = createClient();
      void Promise.allSettled([
        fetchApplicationHistory(supabase, currentApplication.id),
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
    // Rehydrate only when the drawer opens or switches records. Parent-level
    // optimistic updates replace the object for the same id and must not wipe
    // fields the user typed while the request was in flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, open]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) window.clearTimeout(messageTimerRef.current);
    };
  }, []);

  const progressIndex = useMemo(() => {
    const currentNode = getApplicationWorkflowNode({
      status,
      workflow_node_id: workflowNodeId || null,
      custom_stage_label: customStageLabel || null,
    }, workflowNodes);
    return currentNode ? workflowNodes.findIndex((node) => node.id === currentNode.id) : -1;
  }, [customStageLabel, status, workflowNodeId, workflowNodes]);
  const ended = TERMINAL_APPLICATION_STATUS.includes(status as (typeof TERMINAL_APPLICATION_STATUS)[number]);
  const workflowFingerprint = JSON.stringify({
    appliedPosition,
    account,
    candidateStage,
    channel,
    contactName,
    customStageLabel,
    workflowNodeId,
    nextAction,
    nextActionAt,
    priority,
    resumeId,
    reviewNote,
  });
  const workflowDirty = workflowFingerprint !== savedWorkflowFingerprint;
  const isDirty = status !== savedStatus || appliedPosition.trim() !== savedAppliedPosition.trim() || note.trim() !== savedNote.trim() || workflowDirty;

  async function saveProgress(
    nextStatus = status,
    nextNote = note,
    successMessage = "已保存",
    selectedWorkflowNode?: ApplicationWorkflowNode | null,
  ) {
    if (!application || saving) return false;
    const requestId = saveRequestRef.current + 1;
    saveRequestRef.current = requestId;
    const previousStatus = status;
    const previousNote = note;
    const previousWorkflowNodeId = workflowNodeId;
    const previousCustomStageLabel = customStageLabel;
    const nextWorkflowNodeId = selectedWorkflowNode === undefined
      ? workflowNodeId
      : selectedWorkflowNode?.isCustom ? selectedWorkflowNode.id : "";
    const nextCustomStageLabel = selectedWorkflowNode === undefined
      ? customStageLabel
      : selectedWorkflowNode?.isCustom ? selectedWorkflowNode.label : "";
    const nextWorkflowSnapshot = {
      appliedPosition,
      account,
      candidateStage,
      channel,
      contactName,
      customStageLabel: nextCustomStageLabel,
      workflowNodeId: nextWorkflowNodeId,
      nextAction,
      nextActionAt,
      priority,
      resumeId,
      reviewNote,
    };
    const shouldPersistWorkflowNode = application.workflow_nodes != null
      || application.workflow_node_id != null
      || Boolean(selectedWorkflowNode?.isCustom);
    const workflowValues = workflowDirty || selectedWorkflowNode !== undefined
      ? {
          candidate_stage: candidateStage,
          applied_position: cleanOptional(appliedPosition),
          priority,
          application_channel: cleanOptional(channel),
          application_account: cleanOptional(account),
          contact_name: cleanOptional(contactName),
          next_action: cleanOptional(nextAction),
          next_action_at: fromDateTimeLocal(nextActionAt),
          resume_id: cleanOptional(resumeId),
          custom_stage_label: cleanOptional(nextCustomStageLabel),
          ...(shouldPersistWorkflowNode ? { workflow_node_id: cleanOptional(nextWorkflowNodeId) } : {}),
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
    setWorkflowNodeId(nextWorkflowNodeId);
    setCustomStageLabel(nextCustomStageLabel);
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
      const { omittedApplicationColumns = [], ...serverApplication } = updated;
      const omittedAppliedPosition = omittedApplicationColumns.includes("applied_position");
      const mergedApplication: ApplicationWithJob = {
        ...optimisticApplication,
        ...serverApplication,
        job: application.job,
      };
      const confirmedApplication = omittedAppliedPosition
        ? withoutAppliedPosition(mergedApplication)
        : mergedApplication;
      setSavedStatus(nextStatus);
      const savedPositionSnapshot = omittedAppliedPosition ? savedAppliedPosition : appliedPosition.trim();
      setSavedAppliedPosition(savedPositionSnapshot);
      setSavedNote(nextNote);
      setSavedWorkflowFingerprint(JSON.stringify({
        ...nextWorkflowSnapshot,
        appliedPosition: savedPositionSnapshot,
      }));
      void onChanged(confirmedApplication);
      if (nextStatus !== savedStatus) {
        void fetchApplicationHistory(createClient(), application.id).then(setHistory).catch(() => setHistoryState("error"));
        void track("application_status_updated", { application_id: application.id, status: nextStatus });
        if (nextStatus === "written_test") void track("written_test_recorded", { application_id: application.id });
        if (["first_round", "second_round", "final_round"].includes(nextStatus)) void track("interview_recorded", { application_id: application.id, status: nextStatus });
        if (nextStatus === "offer") void track("offer_recorded", { application_id: application.id });
      }
      flashMessage(omittedAppliedPosition && appliedPosition.trim()
        ? "投递流程已保存；实际投递岗位暂未同步，请先完成最新数据库升级。"
        : successMessage);
      setConfirmingDelete(false);
      return true;
    } catch (error) {
      if (requestId !== saveRequestRef.current) return false;
      setStatus(previousStatus);
      setNote(previousNote);
      setWorkflowNodeId(previousWorkflowNodeId);
      setCustomStageLabel(previousCustomStageLabel);
      void onChanged(application);
      setMessage(error instanceof Error
        ? error.message
        : "保存未完成。你填写的内容仍在当前面板中，请检查网络后重试。");
      return false;
    } finally {
      if (requestId === saveRequestRef.current) setSaving(false);
    }
  }

  async function handleStatusChange(nextStatus: ApplicationStatus, node?: ApplicationWorkflowNode | null) {
    if (saving) return;
    const nextWorkflowNodeId = node === undefined ? workflowNodeId : node?.isCustom ? node.id : "";
    if (nextStatus === status && nextWorkflowNodeId === workflowNodeId && note.trim() === savedNote.trim()) return;
    await saveProgress(nextStatus, note, "已保存", node);
  }

  async function handleNoteBlur() {
    if (saving) return;
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
      setMessage("删除未完成，请检查网络后重试。");
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
  const jobTitle = appliedPosition.trim() || job.job_titles?.trim() || "岗位待补充";
  const currentWorkflowNode = getApplicationWorkflowNode({
    status,
    workflow_node_id: workflowNodeId || null,
    custom_stage_label: customStageLabel || null,
  }, workflowNodes);
  const currentStageLabel = currentWorkflowNode?.label
    ?? (customStageLabel.trim() || APPLICATION_STATUS_LABELS[status]);

  return (
    <Drawer open={open} title="投递详情" onClose={onClose} size="wide">
      <div className="space-y-6">
        <header className="flex items-start gap-4">
          <CompanyBadge companyName={job.company_name} logoUrl={job.logo_url} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h3 className="min-w-0 font-display text-3xl font-semibold leading-tight tracking-tight text-ink-primary md:text-4xl">{job.company_name}</h3>
              {ended ? (
                <span className="shrink-0 rounded-md bg-[color:var(--surface-hover-bg)] px-2 py-1 text-[10px] text-ink-muted">
                  {APPLICATION_STATUS_LABELS[status]}
                </span>
              ) : null}
            </div>
            <div className="mt-3">
              <StatusPill
                status={status}
                label={currentStageLabel}
                custom={Boolean(currentWorkflowNode?.isCustom || customStageLabel.trim())}
              />
            </div>
            <p className="mt-3 text-sm font-medium leading-6 text-ink-secondary">
              <span className="mr-2 text-xs font-semibold tracking-wide text-ink-muted">{appliedPosition.trim() ? "实际投递岗位" : "岗位方向"}</span>
              {jobTitle}
            </p>
            <p className="mt-2 text-sm leading-6 text-ink-muted">{meta || "岗位信息待补充"}</p>
          </div>
        </header>

        <section className="border-y border-[color:var(--line-ghost)] py-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_180px_220px]">
            <WorkflowField label="我实际投递的岗位">
              <Input value={appliedPosition} onChange={(event) => setAppliedPosition(event.target.value)} placeholder="例如：产品经理（北京）" maxLength={160} />
              <span className="mt-2 block text-xs leading-5 text-ink-muted">这条投递中你实际申请的职位，可与招聘信息中的岗位方向不同。</span>
            </WorkflowField>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">优先级</span>
              <Select value={String(priority)} onChange={(event) => setPriority(Number(event.target.value))}>
                {Object.entries(APPLICATION_PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm text-ink-secondary">所用简历</span>
              <Select value={resumeId} onChange={(event) => setResumeId(event.target.value)}>
                <option value="">尚未绑定</option>
                {resumes.map((resume) => (
                  <option key={resume.id} value={resume.id}>{resume.title || "未命名简历"}</option>
                ))}
              </Select>
            </label>
          </div>

          {status === "opened" ? (
            <div className="mt-5 max-w-xl">
              <span className="mb-2 block text-sm text-ink-secondary">候选阶段</span>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-[color:var(--apple-control-bg)] p-1">
                {APPLICATION_CANDIDATE_STAGE.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={candidateStage === item
                      ? "pressable min-h-10 rounded-md bg-white px-2 text-xs font-medium text-ink-primary"
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
          <div className="mb-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-center">
            <div>
              <span className="block text-sm font-medium text-ink-primary">当前投递进度</span>
              <span className="mt-1 block text-xs text-ink-muted">只影响这一条投递记录，点击节点也可以直接推进。</span>
            </div>
            {ended ? (
              <div className="flex min-h-11 items-center rounded-lg bg-[color:var(--surface-subtle-bg)] px-3 text-sm text-ink-secondary">{currentStageLabel}</div>
            ) : (
              <Select
                value={currentWorkflowNode?.id ?? status}
                aria-label="当前投递进度"
                onChange={(event) => {
                  const nextNode = workflowNodes.find((node) => node.id === event.target.value);
                  if (nextNode) void handleStatusChange(nextNode.status, nextNode);
                }}
                disabled={saving}
              >
                {workflowNodes.map((node) => <option key={node.id} value={node.id}>{node.label}</option>)}
              </Select>
            )}
          </div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-ink-secondary">进度轨道</span>
            {onEditWorkflow ? (
                <button type="button" className="text-action inline-flex items-center gap-1.5 text-xs" onClick={() => onEditWorkflow(application)}>
                <Settings2 aria-hidden="true" className="size-3.5" />编辑该岗位流程
              </button>
            ) : <span className="text-[10px] text-ink-muted">点击节点即可推进</span>}
          </div>
          <div className="overflow-x-auto pb-2">
            <div className="relative px-1 pb-7 pt-4" style={{ minWidth: `${Math.max(460, workflowNodes.length * 64)}px` }}>
            <div className="absolute left-7 right-7 top-7 h-[2px] rounded-full bg-[color:var(--line-strong)]" />
            <div
              className="absolute left-7 top-7 h-[2px] rounded-full bg-[color:var(--aurora)] shadow-[0_0_12px_var(--glow-cold)] transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{
                width:
                  progressIndex <= 0
                    ? 0
                    : `calc(${(progressIndex / Math.max(1, workflowNodes.length - 1)) * 100}% - ${(progressIndex / Math.max(1, workflowNodes.length - 1)) * 56}px)`,
              }}
            />
            <div className="relative flex items-start justify-between">
              {workflowNodes.map((node, index) => {
                const active = index === progressIndex && !ended;
                const done = progressIndex >= index && progressIndex >= 0;
                const distantOnNarrow = progressIndex >= 0 && Math.abs(index - progressIndex) > 1;
                return (
                  <button
                    key={node.id}
                    id={`progress-status-node-${node.id}`}
                    type="button"
                    className="group flex w-12 flex-col items-center gap-3 rounded-md text-center outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--aurora)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
                    aria-current={active ? "step" : undefined}
                    aria-label={`设为${node.label}`}
                    disabled={saving}
                    onClick={() => void handleStatusChange(node.status, node)}
                    onKeyDown={(event) => handleNodeKeyDown(event, index, workflowNodes)}
                  >
                    <span className="flex h-6 items-center justify-center">
                      {active ? (
                        <span className="h-3.5 w-3.5 rotate-45 rounded-[3px] border border-[color:var(--light-ice)] bg-[color:var(--aurora)] shadow-[0_0_18px_var(--glow-cold-hi)]" />
                      ) : done ? (
                        <span className="h-2.5 w-2.5 rounded-full border border-[color:var(--light-silver)] bg-[color:var(--aurora)] shadow-[0_0_8px_var(--glow-cold)]" />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-[color:var(--surface-read-bg-strong)] ring-1 ring-[color:var(--line-strong)]" />
                      )}
                    </span>
                    <span
                      className={[
                        "whitespace-nowrap text-[11px] leading-4 transition group-focus-visible:text-ink-primary",
                        active ? "font-medium text-ink-primary" : "text-ink-muted",
                        distantOnNarrow ? "max-[400px]:sr-only" : "",
                      ].join(" ")}
                    >
                      {node.label}
                    </span>
                    {node.isCustom ? <span className="max-[400px]:sr-only text-[9px] font-medium text-[color:var(--aurora)]">自定义</span> : null}
                  </button>
                );
              })}
            </div>
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
                  disabled={saving}
                  onClick={() => void handleStatusChange(item, null)}
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
              <Input value={channel} onChange={(event) => setChannel(event.target.value)} placeholder="官网、内推或招聘平台" />
            </WorkflowField>
            <WorkflowField label="投递账号">
              <Input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="邮箱或平台账号" />
            </WorkflowField>
            <WorkflowField label="联系人">
              <Input value={contactName} onChange={(event) => setContactName(event.target.value)} placeholder="姓名或联系方式" />
            </WorkflowField>
            <WorkflowField label="当前节点补充名称">
              <Input value={customStageLabel} onChange={(event) => setCustomStageLabel(event.target.value)} placeholder="可临时覆盖当前节点名称" />
            </WorkflowField>
          </div>
        </section>

        <section>
          <div className="mb-4 text-sm font-medium text-ink-primary">下一步动作</div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]">
            <WorkflowField label="下一步动作">
              <Input value={nextAction} onChange={(event) => setNextAction(event.target.value)} placeholder="准备笔试、联系 HR、整理面试问题" />
            </WorkflowField>
            <WorkflowField label="计划时间">
              <Input type="datetime-local" value={nextActionAt} onChange={(event) => setNextActionAt(event.target.value)} />
            </WorkflowField>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">投递备注</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              onBlur={() => void handleNoteBlur()}
              placeholder="记录笔试时间、面试反馈与待跟进事项"
              className="min-h-28 w-full resize-none border-0 border-b border-[color:var(--line)] bg-transparent px-0 py-3 text-sm leading-6 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-[color:var(--aurora)] focus:bg-[color:var(--surface-hover-bg)]"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-ink-secondary">复盘</span>
            <textarea
              value={reviewNote}
              onChange={(event) => setReviewNote(event.target.value)}
              placeholder="记录卡点、有效准备与下次调整"
              className="min-h-24 w-full resize-none border-0 border-b border-[color:var(--line)] bg-transparent px-0 py-3 text-sm leading-6 text-ink-primary outline-none transition placeholder:text-ink-muted focus:border-[color:var(--aurora)] focus:bg-[color:var(--surface-hover-bg)]"
            />
          </label>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink-primary">进展时间线</span>
            <span className="text-xs text-ink-muted">{history.length} 个节点</span>
          </div>
          {historyState === "loading" ? (
            <p className="text-sm text-ink-muted">正在读取进展记录</p>
          ) : historyState === "error" ? (
            <p className="text-sm leading-6 text-ink-muted">进展记录暂时无法读取；当前编辑内容不受影响。</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-ink-muted">还没有进展记录。</p>
          ) : (
            <ol className="border-l border-[color:var(--line)] pl-4">
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
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            {isValidHttpUrl(job.apply_url) ? (
              <a
                href={sanitizeApplicationUrl(job.apply_url)}
                target="_blank"
                rel="noreferrer"
                className="text-action inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[color:var(--surface-selected-bg)] px-4 text-sm font-semibold text-[color:var(--aurora)] hover:bg-[color:var(--surface-hover-bg)]"
              >
                <ExternalLink aria-hidden="true" className="size-4" />
                打开官网投递
              </a>
            ) : (
              <span className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[color:var(--surface-subtle-bg)] px-4 text-sm text-ink-muted">官网链接待补充</span>
            )}
            <Button className="min-w-28" onClick={() => void saveProgress()} disabled={saving || !isDirty}>
              {isDirty ? "保存进度" : "已保存"}
            </Button>
          </div>

          {message ? <p className="text-right text-xs text-nebula-silver">{message}</p> : null}

          <div className="flex items-center justify-between gap-3 pt-4">
            <span className="text-[10px] text-ink-muted">最近更新 {formatDateTime(application.updated_at)}</span>
            {confirmingDelete ? (
              <span className="text-xs text-[color:var(--text-danger)]">
                确认删除?
                <button type="button" className="ml-2 text-[color:var(--text-danger)]" onClick={() => void handleDelete()}>
                  删除
                </button>
                <button type="button" className="ml-2 text-ink-muted" onClick={() => setConfirmingDelete(false)}>
                  取消
                </button>
              </span>
            ) : (
              <button type="button" className="text-xs text-[color:var(--text-danger)] transition" onClick={() => void handleDelete()}>
                删除记录
              </button>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function handleNodeKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number, nodes: ApplicationWorkflowNode[]) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  const nextIndex =
    event.key === "ArrowLeft"
      ? Math.max(0, index - 1)
      : Math.min(nodes.length - 1, index + 1);
  document.getElementById(`progress-status-node-${nodes[nextIndex]?.id}`)?.focus();
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

function withoutAppliedPosition(application: ApplicationWithJob) {
  const next = { ...application };
  delete next.applied_position;
  return next;
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
