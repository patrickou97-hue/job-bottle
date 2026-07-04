export const SITE_NAME = "秋招星瓶";

export const APPLICATION_STATUS = [
  "opened",
  "applied",
  "written_test",
  "first_round",
  "second_round",
  "final_round",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export const APPLICATION_STATUS_LABELS = {
  opened: "已打开官网",
  applied: "已投递",
  written_test: "笔试",
  first_round: "一面",
  second_round: "二面",
  final_round: "终面",
  offer: "Offer",
  rejected: "已拒绝",
  withdrawn: "已放弃",
} as const;

export const PROFILE_ROLES = ["user", "admin"] as const;

export const APPLICATION_PROGRESS_STATUS = [
  "opened",
  "applied",
  "written_test",
  "first_round",
  "second_round",
  "final_round",
  "offer",
] as const;

export const TERMINAL_APPLICATION_STATUS = ["rejected", "withdrawn"] as const;

export const EMPTY_JOB_FILTERS = {
  keyword: "",
  industry: "",
  batchType: "",
  location: "",
  tags: [] as string[],
  sortBy: "deadline_asc" as const,
};

export const JOB_FIELD_LABELS = {
  company_name: "公司名称",
  start_date: "开启时间",
  industry: "所在行业",
  batch_type: "批次类型",
  job_titles: "招聘岗位",
  locations: "工作地点",
  apply_url: "投递链接",
  notes: "备注",
  logo_url: "公司标识",
  tags: "岗位标签",
  is_active: "展示状态",
} as const;
