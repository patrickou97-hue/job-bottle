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

export type RefreshResponse = ApiEnvelope<{
  session: StarJobSession;
}>;
