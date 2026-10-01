import type {
  Job,
  Profile,
  ResumeSummary,
  ResumeDetail,
  UserApplication,
} from "./domain";

export type ApiEnvelope<T> = {
  data: T;
  requestId?: string;
};

export type ApiErrorPayload = {
  error?: string;
  code?: string;
  requestId?: string;
};

export type JobListResponse = ApiEnvelope<{
  jobs: Job[];
  nextCursor: string | null;
  totalCount: number | null;
}>;

export type JobDetailResponse = ApiEnvelope<{
  job: Job;
}>;

export type ApplicationListResponse = ApiEnvelope<{
  applications: UserApplication[];
}>;

export type ApplicationUpdateResponse = ApiEnvelope<{
  application: UserApplication;
}>;

export type ResumeListResponse = ApiEnvelope<{
  resumes: ResumeSummary[];
}>;

export type ResumeCreateResponse = ApiEnvelope<{
  resume: ResumeSummary;
}>;

export type ResumeDetailResponse = ApiEnvelope<{
  resume: ResumeDetail;
}>;

export type ResumeUpdateResponse = ResumeDetailResponse;

export type ResumeDuplicateResponse = ResumeDetailResponse;

export type ResumeDeleteResponse = ApiEnvelope<{
  deletedId: string;
}>;

export type ResumeImportResponse = ApiEnvelope<{
  resume: ResumeDetail;
  summary: string;
  warnings: string[];
  mode: "program" | "ai";
}>;

export type ResumeTranslationResponse = ApiEnvelope<{
  resume: ResumeDetail;
  summary: string;
  warnings: string[];
}>;

export type ResumePolishResult = {
  summary: string;
  revised: {
    title: string;
    subtitle: string;
    bullets: string[];
  };
  changes: {
    type: "clarity" | "structure" | "relevance" | "wording" | "grammar";
    description: string;
  }[];
  suggestions: string[];
  warnings: string[];
  verificationItems: {
    detail: string;
    reason: string;
  }[];
};

export type ProfileResponse = ApiEnvelope<{
  profile: Profile;
}>;

export type WechatLoginResponse = ApiEnvelope<{
  session: StarJobSession;
  isNewUser: boolean;
  needsAccountBinding: boolean;
  authMethod?: "wechat";
}>;

export type EmailLoginResponse = ApiEnvelope<{
  session: StarJobSession;
  isNewUser: false;
  needsAccountBinding: false;
  authMethod: "email";
}>;

export type WebLoginCodeResponse = ApiEnvelope<{
  code: string;
  expiresAt: string;
}>;

export type SupportPost = {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  createdAt: string;
};

export type SupportResponse = ApiEnvelope<{
  posts: SupportPost[];
}>;

export type MiniReferralCode = {
  id: string;
  company_name: string;
  job_id: string | null;
  applicable_roles: string | null;
  code: string;
  usage_note: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  source_type?: "tencent_job_link" | "public_post";
  publisher_name?: string;
  source_job_ids?: string[];
  source_urls?: string[];
  source_platform?: string;
  source_url?: string;
  published_at?: string | null;
  source_verified_at?: string;
};

export type ReferralListResponse = ApiEnvelope<{
  items: MiniReferralCode[];
}>;

export type ReferralCompaniesResponse = ApiEnvelope<{
  companies: string[];
}>;

export type ReferralCompanyJobsResponse = ApiEnvelope<{
  jobs: { id: string; title: string }[];
}>;

export type ReferralCreateResponse = {
  item: MiniReferralCode;
  reviewStatus: "approved" | "removed" | "error" | "queued";
};

export type FeedbackResponse = ApiEnvelope<{
  submitted: true;
  id: string;
}>;

export type AccountStatusResponse = ApiEnvelope<{
  hasEmail: boolean;
  email: string;
  hasWechat: boolean;
  wechatIdentityId: string | null;
}>;

export type AccountBindingResponse = ApiEnvelope<{
  bound: true;
  session?: StarJobSession;
}>;

export type RefreshResponse = ApiEnvelope<{
  session: StarJobSession;
}>;
