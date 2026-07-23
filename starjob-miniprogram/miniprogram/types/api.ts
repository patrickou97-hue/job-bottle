import type {
  Job,
  Profile,
  ResumeSummary,
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

export type ResumeListResponse = ApiEnvelope<{
  resumes: ResumeSummary[];
}>;

export type ProfileResponse = ApiEnvelope<{
  profile: Profile;
}>;

export type WechatLoginResponse = ApiEnvelope<{
  session: StarJobSession;
  isNewUser: boolean;
  needsAccountBinding: boolean;
}>;

export type RefreshResponse = ApiEnvelope<{
  session: StarJobSession;
}>;
