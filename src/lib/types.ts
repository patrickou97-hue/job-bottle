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

export type ForumPostWithComments = ForumPostView & {
  comments: ForumCommentView[];
};

export type Database = {
  public: {
    Tables: {
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
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ForumPost, "id" | "created_at">>;
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
      merge_duplicate_jobs: {
        Args: Record<string, never>;
        Returns: {
          groups_merged: number;
          jobs_removed: number;
          applications_moved: number;
          applications_removed: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
