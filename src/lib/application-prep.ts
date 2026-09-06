import type { ResumeDocument } from "@/lib/resume";

export type ApplicationPrepFieldKey =
  | "name"
  | "phone"
  | "email"
  | "city"
  | "targetRole"
  | "birthDate"
  | "gender"
  | "nationality"
  | "preferredLocations";

export type ApplicationPrepField = {
  key: ApplicationPrepFieldKey;
  label: string;
  value: string;
  required: boolean;
  filled: boolean;
};

export type ApplicationPrepSummary = {
  fields: ApplicationPrepField[];
  filledCount: number;
  totalCount: number;
  requiredFilledCount: number;
  requiredTotalCount: number;
  optionalFilledCount: number;
  optionalTotalCount: number;
  percent: number;
  hasMinimumProfile: boolean;
  sectionCounts: {
    education: number;
    experience: number;
    projects: number;
    skills: number;
  };
};

const PREP_FIELD_DEFINITIONS: Array<Pick<ApplicationPrepField, "key" | "label" | "required">> = [
  { key: "name", label: "姓名", required: true },
  { key: "phone", label: "手机号", required: true },
  { key: "email", label: "邮箱", required: true },
  { key: "city", label: "所在城市", required: false },
  { key: "targetRole", label: "目标岗位", required: false },
  { key: "birthDate", label: "出生日期", required: false },
  { key: "gender", label: "性别", required: false },
  { key: "nationality", label: "国籍/地区", required: false },
  { key: "preferredLocations", label: "期望工作地点", required: false },
];

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function countMeaningfulRecords(records: unknown[]) {
  return records.filter((record) => {
    if (!record || typeof record !== "object") return false;
    return Object.entries(record).some(([key, value]) => {
      if (key === "id") return false;
      if (Array.isArray(value)) return value.some((item) => text(item));
      return Boolean(text(value));
    });
  }).length;
}

function getBasicsValue(resume: ResumeDocument, key: ApplicationPrepFieldKey) {
  if (key === "targetRole") return text(resume.content.basics.targetRole) || text(resume.targetRole);
  return text(resume.content.basics[key]);
}

export function getApplicationPrepSummary(resume: ResumeDocument): ApplicationPrepSummary {
  const fields = PREP_FIELD_DEFINITIONS.map((definition) => {
    const value = getBasicsValue(resume, definition.key);
    return { ...definition, value, filled: Boolean(value) };
  });
  const required = fields.filter((field) => field.required);
  const optional = fields.filter((field) => !field.required);
  const filledCount = fields.filter((field) => field.filled).length;

  return {
    fields,
    filledCount,
    totalCount: fields.length,
    requiredFilledCount: required.filter((field) => field.filled).length,
    requiredTotalCount: required.length,
    optionalFilledCount: optional.filter((field) => field.filled).length,
    optionalTotalCount: optional.length,
    percent: Math.round((filledCount / fields.length) * 100),
    hasMinimumProfile: required.every((field) => field.filled),
    sectionCounts: {
      education: countMeaningfulRecords(resume.content.education),
      experience: countMeaningfulRecords(resume.content.work),
      projects: countMeaningfulRecords(resume.content.projects),
      skills: countMeaningfulRecords(resume.content.skills),
    },
  };
}
