export type ApplicationStatus =
  | "opened"
  | "applied"
  | "written_test"
  | "first_round"
  | "second_round"
  | "final_round"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ApplicationCandidateStage = "evaluating" | "saved" | "preparing";

export type Job = {
  id: string;
  companyName: string;
  jobTitles: string;
  jobCategories: string[];
  industry: string;
  batchType: string;
  locations: string;
  applyUrl: string;
  notes: string;
  responsibilities: string;
  mustHave: string;
  preferredQualifications: string;
  tags: string[];
  opensAt: string | null;
  closesAt: string | null;
  createdAt: string;
  updatedAt: string;
  isRecent: boolean;
};

export type JobQuery = {
  keyword?: string;
  location?: string;
  category?: string;
  batchType?: string;
  scope?: "all" | "recent" | "recent_preference";
};

export type UserApplication = {
  id: string;
  jobId: string;
  status: ApplicationStatus;
  candidateStage: ApplicationCandidateStage;
  priority: number;
  note: string;
  nextAction: string;
  nextActionAt: string | null;
  resumeId: string | null;
  updatedAt: string;
  job: Job;
};

export type ResumeSummary = {
  id: string;
  title: string;
  targetRole: string;
  templateId: string;
  updatedAt: string;
};

export type Profile = {
  id: string;
  displayName: string;
  city: string;
  school: string;
  major: string;
  graduationYear: string;
  preferredRegions: string[];
  targetRoles: string[];
};
