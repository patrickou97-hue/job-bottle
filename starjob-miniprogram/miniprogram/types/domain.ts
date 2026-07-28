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
  applicationChannel: string;
  applicationAccount: string;
  contactName: string;
  customStageLabel: string;
  reviewNote: string;
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

export type ResumeBasics = {
  name: string;
  englishName: string;
  phone: string;
  email: string;
  city: string;
  linkedin: string;
  github: string;
  website: string;
  targetRole: string;
};

export type ResumeEducation = {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  gpa: string;
  courses: string;
  honors: string;
};

export type ResumeExperience = {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  bullets: string[];
};

export type ResumeProject = {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  keywords: string;
};

export type ResumeSkillGroup = {
  id: string;
  category: string;
  skills: string[];
};

export type ResumeTextSection = {
  id: string;
  title: string;
  date?: string;
  bullets: string[];
};

export type ResumeContent = {
  basics: ResumeBasics;
  education: ResumeEducation[];
  work: ResumeExperience[];
  projects: ResumeProject[];
  skills: ResumeSkillGroup[];
  campus: ResumeTextSection[];
  awards: ResumeTextSection[];
  certifications: ResumeTextSection[];
  languages: ResumeTextSection[];
  customSections: ResumeTextSection[];
};

export type ResumeDetail = ResumeSummary & {
  jobTarget: string;
  linkedJobId: string | null;
  content: ResumeContent;
  createdAt: string;
};

export type Profile = {
  id: string;
  displayName: string;
  phone: string;
  city: string;
  school: string;
  major: string;
  graduationYear: string;
  preferredRegions: string[];
  targetRoles: string[];
};
