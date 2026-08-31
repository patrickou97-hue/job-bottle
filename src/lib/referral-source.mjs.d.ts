export type TencentReferralSourceJob = {
  id: string;
  company_name: string;
  batch_type: string | null;
  job_titles: string | null;
  apply_url: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type TencentReferralCodeSource = {
  id: string;
  company_name: string;
  job_id: string | null;
  applicable_roles: string | null;
  code: string;
  usage_note: string;
  expires_at: null;
  created_at: string;
  updated_at: string;
  source_type: "tencent_job_link";
  source_job_ids: string[];
  source_urls: string[];
};

export function extractReferralCodeFromUrl(rawUrl: string | null | undefined): {
  code: string;
  parameter: string;
  sourceUrl: string;
} | null;

export function deriveTencentReferralCodes(jobs: TencentReferralSourceJob[]): TencentReferralCodeSource[];
export function isSourceReferralCode(value: unknown): boolean;
