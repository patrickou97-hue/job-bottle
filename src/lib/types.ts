import type { APPLICATION_STATUS, PROFILE_ROLES } from "@/lib/constants";

export type ApplicationStatus = (typeof APPLICATION_STATUS)[number];
export type ApplicationCandidateStage = "evaluating" | "saved" | "preparing";
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export type Profile = {
  id: string;
  display_name: string | null;
  phone: string | null;
  city: string | null;
  school: string | null;
  major: string | null;
  graduation_year: string | null;
  preferred_regions: string[];
  target_roles: string[];
  role: ProfileRole;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  company_name: string;
  start_date: string | null;
  industry: string | null;
  batch_type: string | null;
  job_titles: string | null;
  job_categories: string[];
  locations: string | null;
  apply_url: string;
  notes: string | null;
  responsibilities?: string | null;
  must_have?: string | null;
  preferred_qualifications?: string | null;
  keywords?: string[];
  logo_url: string | null;
  tags: string[];
  is_active: boolean;
  opens_at?: string | null;
  closes_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type JobFormValues = {
  company_name: string;
  start_date: string;
  industry: string;
  batch_type: string;
  job_titles: string;
  locations: string;
  apply_url: string;
  notes: string;
  responsibilities: string;
  must_have: string;
  preferred_qualifications: string;
  keywords: string;
  logo_url: string;
  tags: string;
  is_active: boolean;
};

export type UserApplication = {
  id: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  candidate_stage?: ApplicationCandidateStage | null;
  priority?: number | null;
  interview_round?: number | null;
  note?: string | null;
  progress_note: string | null;
  saved_at?: string | null;
  applied_at: string | null;
  application_channel?: string | null;
  application_account?: string | null;
  contact_name?: string | null;
  next_action?: string | null;
  next_action_at?: string | null;
  resume_id?: string | null;
  custom_stage_label?: string | null;
  review_note?: string | null;
  updated_at: string;
};

export type ApplicationWithJob = UserApplication & {
  job: Job;
};

export type JobFilters = {
  keyword: string;
  industry: string;
  batchType: string;
  location: string;
  categories: string[];
  tags: string[];
  sortBy: "start_date_desc" | "updated_desc" | "start_date_asc" | "company_asc";
};

export type JobDiscoveryScope = "all" | "recent" | "recent_preference";

export type JobWithApplication = Job & {
  application?: UserApplication | null;
};

export type CsvImportPreviewRow = {
  rowNumber: number;
  company_name: string;
  start_date: string | null;
  industry: string | null;
  batch_type: string | null;
  job_titles: string | null;
  job_categories: string[];
  locations: string | null;
  apply_url: string;
  notes: string | null;
  tags: string[];
  isValid: boolean;
  errors: string[];
  duplicateOfRowNumber?: number;
};

export type ForumPost = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  like_count: number;
  comment_count: number;
  is_pinned: boolean;
  platform_visibility: "both" | "web" | "miniprogram";
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null } | null;
};

export type ForumComment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  like_count: number;
  created_at: string;
  updated_at: string;
  profiles?: { display_name: string | null } | null;
};

export type ForumPostView = ForumPost & {
  author_name: string;
  author_role: ProfileRole;
};

export type ForumCommentView = ForumComment & {
  author_name: string;
  author_role: ProfileRole;
};

export type ForumLike = {
  user_id: string;
  post_id: string | null;
  comment_id: string | null;
  created_at: string;
};

export type StatusHistory = {
  id: string;
  application_id: string;
  user_id: string;
  from_status: ApplicationStatus | null;
  to_status: ApplicationStatus;
  changed_at: string;
};

export type ResumeRow = {
  id: string;
  user_id: string;
  title: string;
  target_role: string | null;
  job_target: string | null;
  linked_job_id: string | null;
  template_id: "compact" | "classic" | "modern" | "consulting" | "technical" | "academic" | "english_classic" | "english_modern" | "minimal" | "executive";
  content_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Report = {
  id: string;
  post_id: string;
  reporter_id: string;
  reason: string;
  created_at: string;
  resolved: boolean;
};

export type AnalyticsEvent = {
  id: string;
  user_id: string | null;
  event: string;
  props: Record<string, unknown>;
  created_at: string;
};

export type WechatIdentity = {
  id: string;
  user_id: string;
  openid_hash: string;
  unionid_hash: string | null;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

export type MiniProgramSession = {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  last_used_at: string;
};

export type StarInterviewAuthCode = {
  id: string;
  code_hash: string;
  user_id: string;
  install_id_hash: string;
  pkce_challenge: string;
  state_hash: string;
  scopes: string[];
  selected_resume_ids: string[];
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export type StarInterviewSession = {
  id: string;
  user_id: string;
  install_id_hash: string;
  refresh_token_hash: string;
  scopes: string[];
  selected_resume_ids: string[];
  expires_at: string;
  revoked_at: string | null;
  last_used_at: string;
  created_at: string;
};

export type WechatWebLoginCode = {
  id: string;
  user_id: string;
  code_hash: string;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type WechatWebLoginAttempt = {
  fingerprint_hash: string;
  window_started_at: string;
  attempts: number;
  updated_at: string;
};

export type StarInterviewWallet = {
  user_id: string;
  balance_fen: number;
  total_granted_fen: number;
  total_recharged_fen: number;
  total_spent_fen: number;
  nominal_spent_fen: number;
  currency: "CNY";
  created_at: string;
  updated_at: string;
};

export type StarInterviewLedgerEntry = {
  id: string;
  user_id: string;
  entry_type: "usage" | "admin_grant" | "recharge" | "refund" | "correction";
  amount_fen: number;
  nominal_amount_fen: number;
  balance_after_fen: number;
  feature: "asr" | "completion" | null;
  units: number | null;
  reference_key: string;
  note: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ForumPostWithComments = ForumPostView & {
  comments: ForumCommentView[];
};

export type Database = {
  public: {
    Tables: {
      admin_user_mutation_guards: {
        Row: {
          target_user_id: string;
          reservation_token: string;
          actor_user_id: string;
          mutation_kind: "profile_auth" | "star_interview_access";
          actor_is_primary: boolean;
          actor_auth_updated_at: string;
          actor_profile_updated_at: string;
          target_is_primary: boolean;
          previous_role: ProfileRole;
          previous_display_name: string | null;
          previous_banned_until: string | null;
          previous_access_key_present: boolean;
          previous_access_value: unknown;
          next_role: ProfileRole;
          next_disabled: boolean;
          mutate_access_key: boolean;
          next_access_value: boolean;
          reserved_at: string;
          recovery_requested_at: string | null;
          recovery_requested_by_user_id: string | null;
          recovery_reason: string | null;
          updated_at: string;
        };
        Insert: {
          target_user_id: string;
          reservation_token?: string;
          actor_user_id: string;
          mutation_kind: "profile_auth" | "star_interview_access";
          actor_is_primary: boolean;
          actor_auth_updated_at: string;
          actor_profile_updated_at: string;
          target_is_primary: boolean;
          previous_role: ProfileRole;
          previous_display_name?: string | null;
          previous_banned_until?: string | null;
          previous_access_key_present: boolean;
          previous_access_value?: unknown;
          next_role: ProfileRole;
          next_disabled: boolean;
          mutate_access_key: boolean;
          next_access_value: boolean;
          reserved_at?: string;
          recovery_requested_at?: string | null;
          recovery_requested_by_user_id?: string | null;
          recovery_reason?: string | null;
          updated_at?: string;
        };
        Update: {
          recovery_requested_at?: string | null;
          recovery_requested_by_user_id?: string | null;
          recovery_reason?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          phone?: string | null;
          city?: string | null;
          school?: string | null;
          major?: string | null;
          graduation_year?: string | null;
          preferred_regions?: string[];
          target_roles?: string[];
          role?: ProfileRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          phone?: string | null;
          city?: string | null;
          school?: string | null;
          major?: string | null;
          graduation_year?: string | null;
          preferred_regions?: string[];
          target_roles?: string[];
          role?: ProfileRole;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: Job;
        Insert: {
          id?: string;
          company_name: string;
          start_date?: string | null;
          industry?: string | null;
          batch_type?: string | null;
          job_titles?: string | null;
          job_categories?: string[];
          locations?: string | null;
          apply_url: string;
          notes?: string | null;
          responsibilities?: string | null;
          must_have?: string | null;
          preferred_qualifications?: string | null;
          keywords?: string[];
          logo_url?: string | null;
          tags?: string[];
          is_active?: boolean;
          opens_at?: string | null;
          closes_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Job, "id" | "created_at">>;
        Relationships: [];
      };
      user_applications: {
        Row: UserApplication;
        Insert: {
          id?: string;
          user_id: string;
          job_id: string;
          status?: ApplicationStatus;
          candidate_stage?: ApplicationCandidateStage;
          priority?: number;
          interview_round?: number | null;
          note?: string | null;
          progress_note?: string | null;
          saved_at?: string;
          applied_at?: string | null;
          application_channel?: string | null;
          application_account?: string | null;
          contact_name?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          resume_id?: string | null;
          custom_stage_label?: string | null;
          review_note?: string | null;
          updated_at?: string;
        };
        Update: {
          status?: ApplicationStatus;
          candidate_stage?: ApplicationCandidateStage;
          priority?: number;
          interview_round?: number | null;
          note?: string | null;
          progress_note?: string | null;
          saved_at?: string;
          applied_at?: string | null;
          application_channel?: string | null;
          application_account?: string | null;
          contact_name?: string | null;
          next_action?: string | null;
          next_action_at?: string | null;
          resume_id?: string | null;
          custom_stage_label?: string | null;
          review_note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      status_history: {
        Row: StatusHistory;
        Insert: {
          id?: string;
          application_id: string;
          user_id: string;
          from_status?: ApplicationStatus | null;
          to_status: ApplicationStatus;
          changed_at?: string;
        };
        Update: Partial<Omit<StatusHistory, "id">>;
        Relationships: [];
      };
      resumes: {
        Row: ResumeRow;
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          target_role?: string | null;
          job_target?: string | null;
          linked_job_id?: string | null;
          template_id?: "compact" | "classic" | "modern" | "consulting" | "technical" | "academic" | "english_classic" | "english_modern" | "minimal" | "executive";
          content_json?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          target_role?: string | null;
          job_target?: string | null;
          linked_job_id?: string | null;
          template_id?: "compact" | "classic" | "modern" | "consulting" | "technical" | "academic" | "english_classic" | "english_modern" | "minimal" | "executive";
          content_json?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      forum_posts: {
        Row: ForumPost;
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content: string;
          category?: string;
          tags?: string[];
          like_count?: number;
          comment_count?: number;
          is_pinned?: boolean;
          platform_visibility?: "both" | "web" | "miniprogram";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ForumPost, "id" | "created_at">>;
        Relationships: [];
      };
      feedback_submissions: {
        Row: {
          id: string;
          user_id: string | null;
          platform: "web" | "miniprogram";
          category: string;
          content: string;
          contact_email: string | null;
          fingerprint_hash: string;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          platform: "web" | "miniprogram";
          category: string;
          content: string;
          contact_email?: string | null;
          fingerprint_hash: string;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          category?: string;
          content?: string;
          contact_email?: string | null;
          resolved_at?: string | null;
        };
        Relationships: [];
      };
      forum_comments: {
        Row: ForumComment;
        Insert: {
          id?: string;
          post_id: string;
          user_id: string;
          content: string;
          like_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ForumComment, "id" | "created_at">>;
        Relationships: [];
      };
      forum_likes: {
        Row: ForumLike;
        Insert: {
          user_id: string;
          post_id?: string | null;
          comment_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<ForumLike, "created_at">>;
        Relationships: [];
      };
      reports: {
        Row: Report;
        Insert: {
          id?: string;
          post_id: string;
          reporter_id: string;
          reason: string;
          created_at?: string;
          resolved?: boolean;
        };
        Update: {
          reason?: string;
          resolved?: boolean;
        };
        Relationships: [];
      };
      events: {
        Row: AnalyticsEvent;
        Insert: {
          id?: string;
          user_id?: string | null;
          event: string;
          props?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          event?: string;
          props?: Record<string, unknown>;
        };
        Relationships: [];
      };
      wechat_identities: {
        Row: WechatIdentity;
        Insert: {
          id?: string;
          user_id: string;
          openid_hash: string;
          unionid_hash?: string | null;
          created_at?: string;
          updated_at?: string;
          last_login_at?: string;
        };
        Update: {
          unionid_hash?: string | null;
          updated_at?: string;
          last_login_at?: string;
        };
        Relationships: [];
      };
      miniprogram_sessions: {
        Row: MiniProgramSession;
        Insert: {
          id?: string;
          user_id: string;
          refresh_token_hash: string;
          expires_at: string;
          revoked_at?: string | null;
          created_at?: string;
          last_used_at?: string;
        };
        Update: {
          refresh_token_hash?: string;
          expires_at?: string;
          revoked_at?: string | null;
          last_used_at?: string;
        };
        Relationships: [];
      };
      star_interview_auth_codes: {
        Row: StarInterviewAuthCode;
        Insert: {
          id?: string;
          code_hash: string;
          user_id: string;
          install_id_hash: string;
          pkce_challenge: string;
          state_hash: string;
          scopes?: string[];
          selected_resume_ids?: string[];
          expires_at: string;
          consumed_at?: string | null;
          created_at?: string;
        };
        Update: {
          consumed_at?: string | null;
        };
        Relationships: [];
      };
      star_interview_sessions: {
        Row: StarInterviewSession;
        Insert: {
          id?: string;
          user_id: string;
          install_id_hash: string;
          refresh_token_hash: string;
          scopes?: string[];
          selected_resume_ids?: string[];
          expires_at: string;
          revoked_at?: string | null;
          last_used_at?: string;
          created_at?: string;
        };
        Update: {
          refresh_token_hash?: string;
          expires_at?: string;
          revoked_at?: string | null;
          last_used_at?: string;
        };
        Relationships: [];
      };
      star_interview_wallets: {
        Row: StarInterviewWallet;
        Insert: {
          user_id: string;
          balance_fen?: number;
          total_granted_fen?: number;
          total_recharged_fen?: number;
          total_spent_fen?: number;
          nominal_spent_fen?: number;
          currency?: "CNY";
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<StarInterviewWallet, "user_id" | "created_at">>;
        Relationships: [];
      };
      star_interview_ledger: {
        Row: StarInterviewLedgerEntry;
        Insert: Omit<StarInterviewLedgerEntry, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<StarInterviewLedgerEntry, "id" | "user_id" | "created_at">>;
        Relationships: [];
      };
      star_interview_usage_meters: {
        Row: {
          user_id: string;
          feature: "asr" | "completion";
          meter_key: string;
          max_units: number;
          nominal_cost_fen: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          feature: "asr" | "completion";
          meter_key: string;
          max_units?: number;
          nominal_cost_fen?: number;
          updated_at?: string;
        };
        Update: {
          max_units?: number;
          nominal_cost_fen?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      star_interview_asr_requests: {
        Row: {
          id: string;
          user_id: string;
          meter_key: string;
          state: "reserved" | "succeeded" | "consumed" | "failed";
          reservation_token: string | null;
          lease_expires_at: string | null;
          units: number;
          unlimited: boolean;
          reserved_fen: number;
          actual_charge_fen: number;
          nominal_charge_fen: number;
          attempt_count: number;
          last_error: string | null;
          response_body: string | null;
          completed_at: string | null;
          cache_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meter_key: string;
          state?: "reserved" | "succeeded" | "consumed" | "failed";
          reservation_token?: string | null;
          lease_expires_at?: string | null;
          units: number;
          unlimited?: boolean;
          reserved_fen?: number;
          actual_charge_fen?: number;
          nominal_charge_fen?: number;
          attempt_count?: number;
          last_error?: string | null;
          response_body?: string | null;
          completed_at?: string | null;
          cache_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: "reserved" | "succeeded" | "consumed" | "failed";
          reservation_token?: string | null;
          lease_expires_at?: string | null;
          units?: number;
          unlimited?: boolean;
          reserved_fen?: number;
          actual_charge_fen?: number;
          nominal_charge_fen?: number;
          attempt_count?: number;
          last_error?: string | null;
          response_body?: string | null;
          completed_at?: string | null;
          cache_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      star_interview_completion_requests: {
        Row: {
          id: string;
          user_id: string;
          meter_key: string;
          request_hash: string;
          stream: boolean;
          state: "reserved" | "streaming" | "succeeded" | "failed" | "consumed";
          reservation_token: string | null;
          lease_expires_at: string | null;
          reserved_fen: number;
          actual_charge_fen: number;
          nominal_charge_fen: number;
          response_body: string | null;
          response_content_type: string | null;
          last_error: string | null;
          attempt_count: number;
          completed_at: string | null;
          cache_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          meter_key: string;
          request_hash: string;
          stream: boolean;
          state?: "reserved" | "streaming" | "succeeded" | "failed" | "consumed";
          reservation_token?: string | null;
          lease_expires_at?: string | null;
          reserved_fen?: number;
          actual_charge_fen?: number;
          nominal_charge_fen?: number;
          response_body?: string | null;
          response_content_type?: string | null;
          last_error?: string | null;
          attempt_count?: number;
          completed_at?: string | null;
          cache_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          state?: "reserved" | "streaming" | "succeeded" | "failed" | "consumed";
          reservation_token?: string | null;
          lease_expires_at?: string | null;
          reserved_fen?: number;
          actual_charge_fen?: number;
          response_body?: string | null;
          response_content_type?: string | null;
          last_error?: string | null;
          attempt_count?: number;
          completed_at?: string | null;
          cache_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      star_interview_recharge_orders: {
        Row: {
          id: string;
          user_id: string;
          amount_fen: number;
          status: "pending" | "paid" | "closed" | "refunded";
          provider: "wechat_native";
          provider_order_id: string | null;
          provider_transaction_id: string | null;
          client_request_id: string | null;
          code_url: string | null;
          provider_trade_state: string | null;
          provider_last_checked_at: string | null;
          expires_at: string;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount_fen: number;
          status?: "pending" | "paid" | "closed" | "refunded";
          provider?: "wechat_native";
          provider_order_id?: string | null;
          provider_transaction_id?: string | null;
          client_request_id?: string | null;
          code_url?: string | null;
          provider_trade_state?: string | null;
          provider_last_checked_at?: string | null;
          expires_at: string;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: "pending" | "paid" | "closed" | "refunded";
          provider_order_id?: string | null;
          provider_transaction_id?: string | null;
          client_request_id?: string | null;
          code_url?: string | null;
          provider_trade_state?: string | null;
          provider_last_checked_at?: string | null;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      wechat_web_login_codes: {
        Row: WechatWebLoginCode;
        Insert: {
          id?: string;
          user_id: string;
          code_hash: string;
          expires_at: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          code_hash?: string;
          expires_at?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      wechat_web_login_attempts: {
        Row: WechatWebLoginAttempt;
        Insert: {
          fingerprint_hash: string;
          window_started_at?: string;
          attempts?: number;
          updated_at?: string;
        };
        Update: {
          window_started_at?: string;
          attempts?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      take_resume_ai_rate_slot: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      take_resume_ai_rate_slot_for_user: {
        Args: { target_user_id: string };
        Returns: boolean;
      };
      take_extension_autofill_rate_slot: {
        Args: { p_user_id: string; p_operation_id: string };
        Returns: boolean;
      };
      reserve_admin_user_mutation: {
        Args: {
          p_actor_user_id: string;
          p_target_user_id: string;
          p_mutation_kind: "profile_auth" | "star_interview_access";
          p_next_role: ProfileRole | null;
          p_next_disabled: boolean | null;
          p_next_star_interview_access: boolean | null;
        };
        Returns: Record<string, unknown>;
      };
      finalize_admin_user_mutation: {
        Args: {
          p_reservation_token: string;
          p_actor_user_id: string;
          p_target_user_id: string;
          p_display_name: string;
        };
        Returns: Record<string, unknown>;
      };
      cancel_admin_user_mutation: {
        Args: {
          p_reservation_token: string;
          p_actor_user_id: string;
          p_target_user_id: string;
        };
        Returns: boolean;
      };
      recover_admin_user_mutation: {
        Args: {
          p_primary_user_id: string;
          p_target_user_id: string;
          p_reservation_token: string;
          p_reason: string;
        };
        Returns: Record<string, unknown>;
      };
      reserve_wechat_web_login_code: {
        Args: {
          p_user_id: string;
          p_code_hash: string;
          p_expires_at: string;
        };
        Returns: boolean;
      };
      take_wechat_web_login_attempt_slot: {
        Args: { p_fingerprint_hash: string };
        Returns: boolean;
      };
      consume_wechat_web_login_code: {
        Args: { p_code_hash: string };
        Returns: string | null;
      };
      merge_wechat_user_into_email_user: {
        Args: { source_user_id: string; target_user_id: string };
        Returns: boolean;
      };
      merge_duplicate_jobs: {
        Args: Record<string, never>;
        Returns: {
          groups_merged: number;
          jobs_removed: number;
          applications_moved: number;
          applications_removed: number;
        }[];
      };
      get_star_interview_wallet: {
        Args: { p_user_id: string };
        Returns: Record<string, unknown>;
      };
      consume_star_interview_usage: {
        Args: {
          p_user_id: string;
          p_feature: "asr" | "completion";
          p_meter_key: string;
          p_units: number;
          p_unlimited: boolean;
        };
        Returns: Record<string, unknown>;
      };
      reserve_star_interview_asr: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_units: number;
          p_unlimited: boolean;
        };
        Returns: Record<string, unknown>;
      };
      confirm_star_interview_asr_dispatch: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_reservation_token: string;
        };
        Returns: Record<string, unknown>;
      };
      complete_star_interview_asr: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_reservation_token: string;
          p_response_body: string | null;
          p_consumed?: boolean;
        };
        Returns: Record<string, unknown>;
      };
      fail_star_interview_asr: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_reservation_token: string;
          p_reason: string;
        };
        Returns: Record<string, unknown>;
      };
      reconcile_star_interview_asr_leases: {
        Args: { p_limit?: number };
        Returns: Record<string, unknown>;
      };
      reserve_star_interview_completion: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_stream: boolean;
          p_unlimited: boolean;
        };
        Returns: Record<string, unknown>;
      };
      purge_star_interview_completion_cache: {
        Args: Record<string, never>;
        Returns: number;
      };
      reconcile_star_interview_completion_leases: {
        Args: { p_limit?: number };
        Returns: Record<string, unknown>;
      };
      get_star_interview_completion: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
        };
        Returns: Record<string, unknown>;
      };
      mark_star_interview_completion_dispatched: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_reservation_token: string;
        };
        Returns: Record<string, unknown>;
      };
      mark_star_interview_completion_dispatch_intent: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_reservation_token: string;
        };
        Returns: Record<string, unknown>;
      };
      commit_star_interview_completion_stream: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_reservation_token: string;
        };
        Returns: Record<string, unknown>;
      };
      complete_star_interview_completion: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_reservation_token: string;
          p_response_body: string;
          p_response_content_type: string;
        };
        Returns: Record<string, unknown>;
      };
      fail_star_interview_completion: {
        Args: {
          p_user_id: string;
          p_meter_key: string;
          p_request_hash: string;
          p_reservation_token: string;
          p_reason: string;
          p_refund: boolean;
        };
        Returns: Record<string, unknown>;
      };
      adjust_star_interview_balance: {
        Args: {
          p_user_id: string;
          p_amount_fen: number;
          p_entry_type: "admin_grant" | "recharge" | "refund" | "correction";
          p_reference_key: string;
          p_note: string;
          p_actor_user_id: string | null;
        };
        Returns: Record<string, unknown>;
      };
      adjust_star_interview_admin_grant: {
        Args: {
          p_user_id: string;
          p_amount_fen: number;
          p_reference_key: string;
          p_note: string;
          p_actor_user_id: string;
        };
        Returns: Record<string, unknown>;
      };
      complete_star_interview_recharge: {
        Args: {
          p_order_id: string;
          p_provider_order_id: string;
          p_transaction_id: string;
        };
        Returns: Record<string, unknown>;
      };
      create_star_interview_recharge_order: {
        Args: {
          p_order_id: string;
          p_user_id: string;
          p_amount_fen: number;
          p_provider_order_id: string;
          p_client_request_id: string;
          p_expires_at: string;
        };
        Returns: Record<string, unknown>;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
