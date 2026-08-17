import type { ApplicationStatus, UserApplication } from "@/lib/types";

const WORKFLOW_PROGRESS_STATUS = [
  "opened",
  "applied",
  "written_test",
  "first_round",
  "second_round",
  "final_round",
  "offer",
] as const;

const WORKFLOW_STATUS_LABELS: Record<(typeof WORKFLOW_PROGRESS_STATUS)[number], string> = {
  opened: "准备中",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
};

export type ApplicationWorkflowNode = {
  id: string;
  label: string;
  status: (typeof WORKFLOW_PROGRESS_STATUS)[number];
  isCustom: boolean;
};

export const MIN_APPLICATION_WORKFLOW_NODES = 2;
export const MAX_APPLICATION_WORKFLOW_NODES = 12;

export const DEFAULT_APPLICATION_WORKFLOW: ApplicationWorkflowNode[] = WORKFLOW_PROGRESS_STATUS.map((status) => ({
  id: `default-${status}`,
  label: WORKFLOW_STATUS_LABELS[status],
  status,
  isCustom: false,
}));

export function normalizeApplicationWorkflow(value: unknown): ApplicationWorkflowNode[] {
  if (!Array.isArray(value)) return cloneDefaultApplicationWorkflow();

  const seen = new Set<string>();
  const nodes = value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const status = typeof record.status === "string" ? record.status : "";
    if (
      !id || id.length > 80 || seen.has(id) ||
      !label || label.length > 12 ||
      !WORKFLOW_PROGRESS_STATUS.includes(status as (typeof WORKFLOW_PROGRESS_STATUS)[number])
    ) return [];
    seen.add(id);
    return [{
      id,
      label,
      status: status as (typeof WORKFLOW_PROGRESS_STATUS)[number],
      isCustom: Boolean(record.isCustom),
    }];
  }).slice(0, MAX_APPLICATION_WORKFLOW_NODES);

  return nodes.length >= MIN_APPLICATION_WORKFLOW_NODES
    ? nodes
    : cloneDefaultApplicationWorkflow();
}

export function cloneDefaultApplicationWorkflow() {
  return DEFAULT_APPLICATION_WORKFLOW.map((node) => ({ ...node }));
}

export function getApplicationWorkflow(
  application: Pick<UserApplication, "workflow_nodes">,
) {
  return application.workflow_nodes == null
    ? cloneDefaultApplicationWorkflow()
    : normalizeApplicationWorkflow(application.workflow_nodes);
}

export function getApplicationWorkflowNode(
  application: Pick<UserApplication, "custom_stage_label" | "status" | "workflow_node_id">,
  nodes: ApplicationWorkflowNode[],
) {
  const exact = application.workflow_node_id
    ? nodes.find((node) => node.id === application.workflow_node_id)
    : undefined;
  if (exact) return exact;

  const customLabel = application.custom_stage_label?.trim();
  if (customLabel) {
    const labelled = nodes.find((node) => node.label === customLabel && node.status === application.status);
    if (labelled) return labelled;
  }

  return nodes.find((node) => node.status === application.status) ?? null;
}

export function getApplicationWorkflowLabel(
  application: Pick<UserApplication, "custom_stage_label" | "status" | "workflow_node_id">,
  nodes: ApplicationWorkflowNode[],
) {
  return getApplicationWorkflowNode(application, nodes)?.label
    ?? application.custom_stage_label?.trim()
    ?? (isWorkflowProgressStatus(application.status) ? WORKFLOW_STATUS_LABELS[application.status] : application.status === "rejected" ? "未通过" : "已放弃");
}

export function isApplicationCustomStage(
  application: Pick<UserApplication, "custom_stage_label" | "status" | "workflow_node_id">,
  nodes: ApplicationWorkflowNode[],
) {
  const node = getApplicationWorkflowNode(application, nodes);
  return Boolean(node?.isCustom || application.custom_stage_label?.trim());
}

export function createApplicationWorkflowNode(
  status: ApplicationWorkflowNode["status"] = "first_round",
): ApplicationWorkflowNode {
  const id = typeof globalThis.crypto?.randomUUID === "function"
    ? `custom-${globalThis.crypto.randomUUID()}`
    : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    label: "新节点",
    status,
    isCustom: true,
  };
}

export function validateApplicationWorkflow(nodes: ApplicationWorkflowNode[]) {
  if (nodes.length < MIN_APPLICATION_WORKFLOW_NODES) return "星轨至少保留 2 个节点。";
  if (nodes.length > MAX_APPLICATION_WORKFLOW_NODES) return `星轨最多设置 ${MAX_APPLICATION_WORKFLOW_NODES} 个节点。`;
  const labels = nodes.map((node) => node.label.trim());
  if (labels.some((label) => !label)) return "每个节点都需要名称。";
  if (labels.some((label) => label.length > 12)) return "节点名称最多 12 个字。";
  if (new Set(labels).size !== labels.length) return "节点名称不能重复。";
  return "";
}

export function isWorkflowProgressStatus(status: ApplicationStatus): status is ApplicationWorkflowNode["status"] {
  return WORKFLOW_PROGRESS_STATUS.includes(status as ApplicationWorkflowNode["status"]);
}
