import { APPLICATION_CANDIDATE_STAGE_LABELS, APPLICATION_STATUS_LABELS } from "@/lib/constants";
import { daysUntilShanghai, formatShanghaiDate } from "@/lib/dates";
import type {
  ApplicationStatus,
  ApplicationWithJob,
  Job,
  Profile,
  UserApplication,
} from "@/lib/types";
import type { ResumeDocument } from "@/lib/resume";

export type WorkspaceTask = {
  application: ApplicationWithJob;
  title: string;
  detail: string;
  priority: number;
};

export type PipelineColumn = {
  id: "review" | "applied" | "process" | "outcome";
  label: string;
  description: string;
  applications: ApplicationWithJob[];
};

export type MaterialReadiness = {
  ready: boolean;
  label: string;
  detail: string;
  resumeTitle?: string;
};

export function getMaterialReadiness(
  jobId: string,
  resumes: ResumeDocument[],
): MaterialReadiness {
  const linkedResume = resumes.find((resume) => resume.linkedJobId === jobId);
  if (linkedResume) {
    return {
      ready: true,
      label: "已绑定简历",
      detail: linkedResume.title || "未命名简历",
      resumeTitle: linkedResume.title || "未命名简历",
    };
  }

  if (resumes.length > 0) {
    return {
      ready: false,
      label: "待绑定简历",
      detail: "已有简历版本，建议选择一份关联到该岗位。",
    };
  }

  return {
    ready: false,
    label: "待准备简历",
    detail: "先建立一份通用简历，再按岗位调整。",
  };
}

export function getNextAction(application: ApplicationWithJob) {
  const hasNote = Boolean(application.progress_note?.trim());
  const deadline = getDeadlineInfo(application.job);
  const daysSinceUpdate = Math.max(0, Math.floor((Date.now() - new Date(application.updated_at).getTime()) / 86_400_000));

  if (deadline?.daysUntil != null && deadline.daysUntil >= 0 && deadline.daysUntil <= 3 && application.status === "opened") {
    return {
      title: "岗位即将截止",
      detail: `${deadline.label}，先确认是否准备和投递。`,
      priority: 0,
    };
  }
  if (application.next_action?.trim()) {
    return {
      title: application.next_action.trim(),
      detail: application.next_action_at
        ? `计划时间 ${formatShanghaiDate(application.next_action_at)}`
        : "已记录下一步动作。",
      priority: getStoredPriority(application),
    };
  }

  if (application.status === "opened") {
    const candidateStage = getCandidateStage(application);
    if (candidateStage === "evaluating") {
      return { title: "评估是否保留", detail: "确认岗位要求、截止时间和投入价值。", priority: 1 };
    }
    if (candidateStage === "saved") {
      if (daysSinceUpdate >= 5) {
        return { title: "候选岗位尚未准备", detail: `已收藏 ${daysSinceUpdate} 天，决定开始准备或结束候选。`, priority: 0 };
      }
      return { title: "开始准备材料", detail: "设置优先级并选择对应简历版本。", priority: 1 };
    }
    return { title: "记录投递", detail: "材料准备完成后，打开官网并记录投递。", priority: 1 };
  }

  if (application.status === "applied" && daysSinceUpdate >= 7) {
    return { title: "投递已多日未更新", detail: `已有 ${daysSinceUpdate} 天没有记录进展。`, priority: 0 };
  }
  if (["first_round", "second_round", "final_round"].includes(application.status) && daysSinceUpdate >= 2) {
    return { title: "面试后待记录结果", detail: `最近一次更新在 ${daysSinceUpdate} 天前。`, priority: 0 };
  }

  const actions: Record<ApplicationStatus, { title: string; detail: string; priority: number }> = {
    opened: {
      title: "记录投递",
      detail: "材料准备完成后，打开官网并记录投递。",
      priority: 1,
    },
    applied: {
      title: hasNote ? "查看投递备注" : "补一条跟进备注",
      detail: hasNote ? "已记录下一步，可以继续跟进。" : "记录测评、笔试或后续联系信息。",
      priority: hasNote ? 4 : 2,
    },
    written_test: {
      title: "确认笔试安排",
      detail: hasNote ? "已写下笔试信息，及时回看。" : "在备注里补上笔试时间和准备事项。",
      priority: 2,
    },
    first_round: {
      title: "准备一面",
      detail: hasNote ? "已有面试记录，继续完善准备事项。" : "补充面试时间、题目和复盘要点。",
      priority: 2,
    },
    second_round: {
      title: "准备二面",
      detail: hasNote ? "已有面试记录，继续完善准备事项。" : "补充面试时间、题目和复盘要点。",
      priority: 2,
    },
    final_round: {
      title: "准备终面",
      detail: hasNote ? "已有终面记录，及时回看。" : "补充终面时间、问题和沟通事项。",
      priority: 1,
    },
    offer: {
      title: "记录 Offer 决策",
      detail: hasNote ? "已留下决策记录。" : "在备注里记录薪酬、截止时间或选择依据。",
      priority: hasNote ? 6 : 3,
    },
    rejected: {
      title: "沉淀复盘",
      detail: hasNote ? "复盘已留下。" : "记录这次流程的有效经验，便于下次调整。",
      priority: 7,
    },
    withdrawn: {
      title: "归档原因",
      detail: hasNote ? "已说明不投原因。" : "记录放弃原因，避免重复评估。",
      priority: 8,
    },
  };

  return actions[application.status];
}

export function getWorkspaceTasks(applications: ApplicationWithJob[]) {
  return applications
    .filter((application) => !["rejected", "withdrawn"].includes(application.status))
    .map((application) => ({ application, ...getNextAction(application) }))
    .sort((a, b) => {
      const aStoredPriority = getStoredPriority(a.application);
      const bStoredPriority = getStoredPriority(b.application);
      if (aStoredPriority !== bStoredPriority) return aStoredPriority - bStoredPriority;
      const aNext = a.application.next_action_at ? new Date(a.application.next_action_at).getTime() : Number.POSITIVE_INFINITY;
      const bNext = b.application.next_action_at ? new Date(b.application.next_action_at).getTime() : Number.POSITIVE_INFINITY;
      if (aNext !== bNext) return aNext - bNext;
      if (a.priority !== b.priority) return a.priority - b.priority;
      return new Date(a.application.updated_at).getTime() - new Date(b.application.updated_at).getTime();
    });
}

export function getCandidateStage(application: Pick<UserApplication, "candidate_stage">) {
  return application.candidate_stage ?? "preparing";
}

export function getApplicationStageLabel(
  application: Pick<UserApplication, "candidate_stage" | "custom_stage_label" | "status">,
) {
  if (application.status !== "opened") {
    return application.custom_stage_label?.trim() || APPLICATION_STATUS_LABELS[application.status];
  }
  return APPLICATION_CANDIDATE_STAGE_LABELS[getCandidateStage(application)];
}

export function getJobPrimaryAction(application?: UserApplication | null) {
  if (!application) return { kind: "capture" as const, label: "加入星瓶" };
  if (application.status !== "opened") return { kind: "progress" as const, label: "更新进度" };
  const candidateStage = getCandidateStage(application);
  if (candidateStage === "evaluating") return { kind: "save" as const, label: "保留候选" };
  if (candidateStage === "saved") return { kind: "prepare" as const, label: "开始准备" };
  return { kind: "apply" as const, label: "记录投递" };
}

function getStoredPriority(application: ApplicationWithJob) {
  const priority = application.priority ?? 0;
  return priority > 0 ? 4 - priority : 5;
}

export function getPipelineColumns(applications: ApplicationWithJob[]): PipelineColumn[] {
  const columns: PipelineColumn[] = [
    { id: "review", label: "待确认", description: "已浏览，决定是否投递", applications: [] },
    { id: "applied", label: "已投递", description: "等待测评或下一步通知", applications: [] },
    { id: "process", label: "笔试与面试", description: "持续准备和记录反馈", applications: [] },
    { id: "outcome", label: "结果归档", description: "Offer、结束或主动放弃", applications: [] },
  ];

  applications.forEach((application) => {
    if (application.status === "opened") {
      columns[0].applications.push(application);
      return;
    }
    if (application.status === "applied") {
      columns[1].applications.push(application);
      return;
    }
    if (["written_test", "first_round", "second_round", "final_round"].includes(application.status)) {
      columns[2].applications.push(application);
      return;
    }
    columns[3].applications.push(application);
  });

  columns.forEach((column) => {
    column.applications.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  });

  return columns;
}

export function getDeadlineInfo(job: Job) {
  if (!job.closes_at) return null;
  const days = daysUntilShanghai(job.closes_at);
  if (days === null) return null;
  if (days < 0) return { label: "报名已截止", urgent: false, daysUntil: days };
  if (days === 0) return { label: "今天截止", urgent: true, daysUntil: days };
  if (days <= 3) return { label: `${days} 天后截止`, urgent: true, daysUntil: days };
  return { label: `截止 ${formatShanghaiDate(job.closes_at)}`, urgent: false, daysUntil: days };
}

export function getFitLabel(job: Job, profile: Profile | null) {
  if (!profile) return null;
  const regions = profile.preferred_regions ?? [];
  const roles = profile.target_roles ?? [];
  if (regions.length === 0 && roles.length === 0) return null;

  const haystack = [
    job.company_name,
    job.job_titles ?? "",
    job.industry ?? "",
    job.locations ?? "",
    ...(job.job_categories ?? []),
  ].join(" ");
  const score = [...regions, ...roles].filter((item) => haystack.includes(item)).length;
  if (score >= 2) return "偏好匹配";
  if (score === 1) return "部分匹配";
  return null;
}

export function getStageLabel(status: ApplicationStatus) {
  return APPLICATION_STATUS_LABELS[status];
}
