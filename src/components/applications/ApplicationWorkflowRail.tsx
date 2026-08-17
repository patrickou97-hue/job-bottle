"use client";

import { AnimatePresence } from "motion/react";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { APPLICATION_PROGRESS_STATUS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import {
  MAX_APPLICATION_WORKFLOW_NODES,
  MIN_APPLICATION_WORKFLOW_NODES,
  cloneDefaultApplicationWorkflow,
  createApplicationWorkflowNode,
  getApplicationWorkflowNode,
  validateApplicationWorkflow,
  type ApplicationWorkflowNode,
} from "@/lib/application-workflow";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MotionDialog } from "@/components/ui/MotionDialog";
import { Select } from "@/components/ui/Select";
import type { ApplicationStatus, ApplicationWithJob } from "@/lib/types";

export function ApplicationWorkflowEditor({
  open,
  nodes,
  saving,
  companyName,
  onClose,
  onSave,
}: {
  open: boolean;
  nodes: ApplicationWorkflowNode[];
  saving: boolean;
  companyName: string;
  onClose: () => void;
  onSave: (nodes: ApplicationWorkflowNode[]) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(nodes);
  const [error, setError] = useState("");

  function updateNode(index: number, values: Partial<ApplicationWorkflowNode>) {
    setDraft((current) => current.map((node, nodeIndex) => nodeIndex === index
      ? { ...node, ...values, isCustom: true }
      : node));
    setError("");
  }

  function moveNode(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    setDraft((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeNode(index: number) {
    if (draft.length <= MIN_APPLICATION_WORKFLOW_NODES) {
      setError(`星轨至少保留 ${MIN_APPLICATION_WORKFLOW_NODES} 个节点。`);
      return;
    }
    setDraft((current) => current.filter((_, nodeIndex) => nodeIndex !== index));
  }

  function addNode() {
    if (draft.length >= MAX_APPLICATION_WORKFLOW_NODES) {
      setError(`星轨最多设置 ${MAX_APPLICATION_WORKFLOW_NODES} 个节点。`);
      return;
    }
    const previousStatus = draft.at(-1)?.status ?? "first_round";
    setDraft((current) => [...current, createApplicationWorkflowNode(previousStatus)]);
    setError("");
  }

  async function submit() {
    const validationMessage = validateApplicationWorkflow(draft);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }
    await onSave(draft.map((node) => ({ ...node, label: node.label.trim() })));
  }

  return (
    <AnimatePresence>
      {open ? (
        <MotionDialog
          labelledBy="application-workflow-editor-title"
          describedBy="application-workflow-editor-description"
          className="max-w-3xl p-5 sm:p-7"
          onBackdropClick={saving ? undefined : onClose}
          onEscapeKeyDown={saving ? undefined : onClose}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="application-workflow-editor-title" className="text-xl font-semibold text-ink-primary">编辑 {companyName} 的投递流程</h2>
              <p id="application-workflow-editor-description" className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
                这套节点只影响这家公司。节点名称和顺序由你决定，同时归入标准阶段以便筛选和记录历史。
              </p>
            </div>
            <button type="button" className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-ink-muted hover:bg-[color:var(--surface-hover-bg)]" onClick={onClose} aria-label="关闭星轨编辑">
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="mt-6 border-y border-[color:var(--line-ghost)]">
            {draft.map((node, index) => (
              <div key={node.id} className="grid gap-3 border-b border-[color:var(--line-ghost)] py-4 last:border-b-0 sm:grid-cols-[32px_minmax(140px,1fr)_minmax(150px,0.8fr)_auto] sm:items-center">
                <span className="flex size-7 items-center justify-center text-xs tabular-nums text-ink-muted">{index + 1}</span>
                <label>
                  <span className="sr-only">第 {index + 1} 个节点名称</span>
                  <Input
                    value={node.label}
                    maxLength={12}
                    onChange={(event) => updateNode(index, { label: event.target.value })}
                    aria-label={`第 ${index + 1} 个节点名称`}
                  />
                </label>
                <label>
                  <span className="sr-only">{node.label}归属阶段</span>
                  <Select value={node.status} onChange={(event) => updateNode(index, { status: event.target.value as ApplicationWorkflowNode["status"] })} aria-label={`${node.label}归属阶段`}>
                    {APPLICATION_PROGRESS_STATUS.map((status) => <option key={status} value={status}>{APPLICATION_STATUS_LABELS[status]}</option>)}
                  </Select>
                </label>
                <div className="flex items-center justify-end gap-1">
                  <IconButton label="上移" disabled={index === 0} onClick={() => moveNode(index, -1)}><ArrowUp className="size-4" /></IconButton>
                  <IconButton label="下移" disabled={index === draft.length - 1} onClick={() => moveNode(index, 1)}><ArrowDown className="size-4" /></IconButton>
                  <IconButton label="删除节点" disabled={draft.length <= MIN_APPLICATION_WORKFLOW_NODES} danger onClick={() => removeNode(index)}><Trash2 className="size-4" /></IconButton>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="text-action inline-flex items-center gap-2 text-sm" onClick={addNode} disabled={draft.length >= MAX_APPLICATION_WORKFLOW_NODES}>
              <Plus aria-hidden="true" className="size-4" />添加节点
            </button>
            <button type="button" className="inline-flex items-center gap-2 text-sm text-ink-muted hover:text-ink-primary" onClick={() => { setDraft(cloneDefaultApplicationWorkflow()); setError(""); }}>
              <RotateCcw aria-hidden="true" className="size-4" />恢复默认
            </button>
          </div>
          {error ? <p className="mt-4 text-sm text-[color:var(--text-danger)]" role="alert">{error}</p> : null}
          <div className="mt-7 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>取消</Button>
            <Button onClick={() => void submit()} disabled={saving}>{saving ? "保存中" : "保存星轨"}</Button>
          </div>
        </MotionDialog>
      ) : null}
    </AnimatePresence>
  );
}

export type ApplicationStageChange = {
  status: ApplicationStatus;
  workflowNodeId: string | null;
  customStageLabel: string | null;
  label: string;
};

export function ApplicationStageSelect({
  application,
  nodes,
  disabled,
  compact = false,
  onChange,
}: {
  application: ApplicationWithJob;
  nodes: ApplicationWorkflowNode[];
  disabled?: boolean;
  compact?: boolean;
  onChange: (change: ApplicationStageChange) => void;
}) {
  const currentNode = getApplicationWorkflowNode(application, nodes);
  const terminal = application.status === "rejected" || application.status === "withdrawn";
  const value = terminal ? `terminal:${application.status}` : currentNode?.id ?? "";

  return (
    <Select
      value={value}
      disabled={disabled}
      className={compact ? "min-h-9 py-1 text-xs" : undefined}
      aria-label={`修改 ${application.job.company_name} 的投递状态`}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (nextValue.startsWith("terminal:")) {
          const status = nextValue.slice(9) as ApplicationStatus;
          onChange({ status, workflowNodeId: null, customStageLabel: null, label: APPLICATION_STATUS_LABELS[status] });
          return;
        }
        const node = nodes.find((item) => item.id === nextValue);
        if (!node) return;
        onChange({
          status: node.status,
          workflowNodeId: node.isCustom ? node.id : null,
          customStageLabel: node.isCustom ? node.label : null,
          label: node.label,
        });
      }}
    >
      <optgroup label="投递星轨">
        {nodes.map((node) => <option key={node.id} value={node.id}>{node.isCustom ? `✦ ${node.label}` : node.label}</option>)}
      </optgroup>
      <optgroup label="结束轨道">
        <option value="terminal:rejected">未通过</option>
        <option value="terminal:withdrawn">已放弃</option>
      </optgroup>
    </Select>
  );
}

function IconButton({ label, disabled, danger, onClick, children }: { label: string; disabled?: boolean; danger?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className={danger
        ? "inline-flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-red-50 hover:text-[color:var(--text-danger)] disabled:opacity-25"
        : "inline-flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-[color:var(--surface-hover-bg)] hover:text-ink-primary disabled:opacity-25"}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
