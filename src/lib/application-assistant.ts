import { z } from "zod";
import { APPLICATION_STATUS } from "./constants";
import { getApplicationWorkflow, getApplicationWorkflowLabel } from "./application-workflow";
import type { ApplicationWithJob, UserApplication } from "./types";
import type { ApplicationUpdateValues } from "./applications";

export const assistantEdit = z.object({
  stage: z.string().trim().min(1).max(20).optional(),
  position: z.string().trim().min(1).max(160).optional(),
  appendNote: z.string().trim().min(1).max(600).optional(),
  nextAction: z.string().trim().min(1).max(200).optional(),
  nextActionAt: z.iso.datetime({ offset: true }).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

const selector = z.object({
  company: z.string().trim().max(120).optional(),
  position: z.string().trim().max(160).optional(),
  statuses: z.array(z.enum(APPLICATION_STATUS)).max(APPLICATION_STATUS.length).optional(),
  staleDays: z.number().int().min(1).max(730).optional(),
  overdue: z.boolean().optional(),
  // One-based position in the preceding reply, never a database identifier.
  reference: z.number().int().min(1).max(1000).optional(),
  previousResults: z.boolean().optional(),
}).strict();

export const assistantCreate = z.object({
  company: z.string().trim().min(1).max(120),
  position: z.string().trim().min(1).max(160),
  status: z.enum(APPLICATION_STATUS),
  appliedDate: z.iso.date().optional(),
}).strict();
export type AssistantCreate = z.infer<typeof assistantCreate>;

export const assistantIntent = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), draft: assistantCreate }).strict(),
  z.object({ action: z.literal("query"), filter: selector }).strict(),
  z.object({ action: z.literal("update"), filter: selector, edit: assistantEdit }).strict(),
  z.object({ action: z.literal("delete"), filter: selector }).strict(),
  z.object({ action: z.literal("clarify"), question: z.string().trim().min(1).max(250) }).strict(),
]);
export type AssistantIntent = z.infer<typeof assistantIntent>;
export type AssistantEdit = z.infer<typeof assistantEdit>;

export function matchAssistantRecords(rows: ApplicationWithJob[], filter: z.infer<typeof selector>, previousIds: string[], now = Date.now()) {
  const prior = filter.reference ? previousIds.slice(filter.reference - 1, filter.reference) : previousIds;
  const pool = filter.reference || filter.previousResults
    ? prior.flatMap((id) => rows.find((row) => row.id === id) ?? [])
    : rows;
  return pool.filter((row) => {
    const active = !["offer", "withdrawn", "rejected"].includes(row.status);
    const role = row.applied_position?.trim() || row.job.job_titles || "";
    return (!filter.company || row.job.company_name.toLowerCase().includes(filter.company.toLowerCase()))
      && (!filter.position || role.toLowerCase().includes(filter.position.toLowerCase()))
      && (!filter.statuses?.length || filter.statuses.includes(row.status))
      && (!filter.staleDays || (active && now - Date.parse(row.updated_at) >= filter.staleDays * 86_400_000))
      && (!filter.overdue || (active && !!row.next_action_at && Date.parse(row.next_action_at) < now));
  });
}

export function assistantRecordTitle(row: ApplicationWithJob) {
  return [row.job.company_name, row.applied_position?.trim() || row.job.job_titles].filter(Boolean).join(" · ");
}

export function editorPatch(row: Pick<UserApplication, "workflow_nodes" | "progress_note">, edit: AssistantEdit): ApplicationUpdateValues {
  const patch: ApplicationUpdateValues = {};
  const stage = edit.stage;
  if (stage) {
    const node = getApplicationWorkflow(row).find((item) => item.label.toLowerCase() === stage.toLowerCase());
    const ended = stage === "未通过" ? "rejected" : stage === "已放弃" ? "withdrawn" : undefined;
    if (!node && !ended) throw new Error("这条投递没有这个阶段，请在投递详情中查看它的流程。");
    patch.status = node?.status ?? ended;
    patch.workflow_node_id = node?.isCustom ? node.id : null;
    patch.custom_stage_label = node?.isCustom ? node.label : null;
  }
  if (edit.position) patch.applied_position = edit.position;
  if (edit.appendNote) patch.progress_note = [row.progress_note, edit.appendNote].filter(Boolean).join("\n");
  if (edit.nextAction) patch.next_action = edit.nextAction;
  if (edit.nextActionAt) patch.next_action_at = edit.nextActionAt;
  return patch;
}

export function describeEdit(edit: AssistantEdit) {
  return [
    edit.stage && `阶段改为「${edit.stage}」`,
    edit.position && `岗位名改为「${edit.position}」`,
    edit.appendNote && `追加备注「${edit.appendNote}」`,
    edit.nextAction && `跟进事项改为「${edit.nextAction}」`,
    edit.nextActionAt && `跟进时间改为 ${new Date(edit.nextActionAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false })}（北京时间）`,
  ].filter(Boolean).join("；");
}

export function recordDetail(row: ApplicationWithJob) {
  const stage = getApplicationWorkflowLabel(row, getApplicationWorkflow(row));
  const date = row.next_action_at ? new Date(row.next_action_at).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }) : "";
  return [stage, row.next_action, date || `最近更新 ${row.updated_at.slice(0, 10)}`].filter(Boolean).join(" · ");
}
