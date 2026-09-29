import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationWithJob,
  Database,
  Job,
  StatusHistory,
  UserApplication,
} from "@/lib/types";

export type ApplicationUpdateValues = Database["public"]["Tables"]["user_applications"]["Update"];
export type ApplicationUpdateResult = UserApplication & {
  /** Columns omitted only when the hosted schema has not received their migration yet. */
  omittedApplicationColumns?: readonly (keyof ApplicationUpdateValues)[];
};

export function normalizeAppliedPosition(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 160) : null;
}

export function getApplicationDisplayPosition(application: ApplicationWithJob) {
  return normalizeAppliedPosition(application.applied_position) ?? "";
}
const APPLICATION_REQUEST_TIMEOUT_MS = 12_000;

const LEGACY_UPDATE_KEYS = ["status", "progress_note", "note", "interview_round", "applied_at"] as const;
const WORKFLOW_UPDATE_KEYS = [
  "job_snapshot",
  "resume_snapshot",
  "form_answers",
  "material_records",
  "applied_position",
  "candidate_stage",
  "priority",
  "application_channel",
  "application_account",
  "contact_name",
  "next_action",
  "next_action_at",
  "resume_id",
  "custom_stage_label",
  "workflow_node_id",
  "workflow_nodes",
  "review_note",
] as const;

// `applied_position` was added after the rest of the workflow details. Keep
// saving the already-supported workflow fields when a hosted project is
// between those two migrations.
const COMPATIBLE_MISSING_UPDATE_KEYS = ["applied_position"] as const;

export async function fetchMyApplications(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .select("*, job:jobs(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .abortSignal(signal));

  if (error) throw error;
  return (data ?? []).map((row) => normalizeApplicationRow(row as unknown as UserApplication & { job?: Job | null }));
}

export function normalizeApplicationRow(
  row: UserApplication & { job?: Job | null },
): ApplicationWithJob {
  if (row.job) return { ...row, job: row.job } as ApplicationWithJob;
  const snapshot = row.job_snapshot;
  if (!snapshot) throw new Error("投递记录缺少岗位信息快照。");
  const timestamp = row.saved_at ?? row.updated_at;
  const job: Job = {
    id: row.job_id ?? `external-${row.id}`,
    company_name: snapshot.company_name,
    start_date: snapshot.start_date ?? null,
    industry: snapshot.industry ?? null,
    batch_type: snapshot.batch_type ?? "自建岗位",
    job_titles: snapshot.job_titles,
    job_categories: [],
    locations: snapshot.locations ?? null,
    apply_url: snapshot.apply_url || snapshot.source_url,
    notes: snapshot.notes ?? null,
    responsibilities: snapshot.responsibilities ?? null,
    must_have: snapshot.must_have ?? null,
    preferred_qualifications: snapshot.preferred_qualifications ?? null,
    keywords: snapshot.keywords ?? [],
    logo_url: null,
    tags: [],
    is_active: true,
    closes_at: snapshot.closes_at ?? null,
    created_at: timestamp,
    updated_at: row.updated_at,
  };
  return { ...row, job } as ApplicationWithJob;
}

export async function upsertApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
  candidateStage: "evaluating" | "saved" | "preparing" = "evaluating",
  jobSnapshot?: UserApplication["job_snapshot"],
) {
  const { data: existing, error: existingError } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .abortSignal(signal)
    .maybeSingle());

  if (existingError) throw existingError;
  if (existing) {
    if (jobSnapshot && !(existing as UserApplication).job_snapshot) {
      try {
        return await updateApplication(supabase, (existing as UserApplication).id, { job_snapshot: jobSnapshot });
      } catch (snapshotError) {
        if (!isMissingApplicationWorkspaceColumnsError(snapshotError)) throw snapshotError;
      }
    }
    return existing as UserApplication;
  }

  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .insert({
      user_id: userId,
      job_id: jobId,
      ...(jobSnapshot ? { job_snapshot: jobSnapshot } : {}),
      status: "opened",
      candidate_stage: candidateStage,
    })
    .select("*")
    .abortSignal(signal)
    .single());

  if (!error) return data as UserApplication;
  if (getErrorCode(error) === "23505") {
    return fetchExistingApplication(supabase, userId, jobId);
  }
  if (!isMissingApplicationWorkflowColumnsError(error)) throw error;

  const { data: legacyData, error: legacyError } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .insert({ user_id: userId, job_id: jobId, status: "opened" })
    .select("*")
    .abortSignal(signal)
    .single());

  if (legacyError && getErrorCode(legacyError) === "23505") {
    return fetchExistingApplication(supabase, userId, jobId);
  }
  if (legacyError) throw legacyError;
  return legacyData as UserApplication;
}

export async function createCustomApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  snapshot: NonNullable<UserApplication["job_snapshot"]>,
) {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .insert({
      user_id: userId,
      job_id: null,
      job_snapshot: snapshot,
      status: "opened",
      candidate_stage: "saved",
      saved_at: new Date().toISOString(),
    })
    .select("*, job:jobs(*)")
    .abortSignal(signal)
    .single());
  if (error) {
    if (isMissingApplicationWorkspaceColumnsError(error)) {
      throw new Error("自建岗位和投递档案需要先执行最新 Supabase migration。");
    }
    if (getErrorCode(error) === "23505") {
      throw new Error("这个岗位已经在你的投递列表中了。");
    }
    throw error;
  }
  return normalizeApplicationRow(data as unknown as UserApplication & { job?: Job | null });
}

export async function updateApplication(
  supabase: SupabaseClient<Database>,
  id: string,
  values: ApplicationUpdateValues,
): Promise<ApplicationUpdateResult> {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .update(values)
    .eq("id", id)
    .select("*")
    .abortSignal(signal)
    .single());

  if (!error) return data as UserApplication;
  if (!isMissingApplicationWorkflowColumnsError(error)) throw error;

  const compatibleMissingKeys = getCompatibleMissingUpdateKeys(error, values);
  if (compatibleMissingKeys.length > 0) {
    const compatibleValues = omitApplicationUpdateKeys(values, compatibleMissingKeys);
    if (Object.keys(compatibleValues).length === 0) {
      throw new Error("投递工作台的数据结构尚未升级。请先执行最新 Supabase migration，再保存这些信息。");
    }

    const { data: compatibleData, error: compatibleError } = await runApplicationRequest(async (signal) => await supabase
      .from("user_applications")
      .update(compatibleValues)
      .eq("id", id)
      .select("*")
      .abortSignal(signal)
      .single());

    if (!compatibleError) {
      return {
        ...(compatibleData as UserApplication),
        omittedApplicationColumns: compatibleMissingKeys,
      };
    }
    if (isMissingApplicationWorkflowColumnsError(compatibleError)) {
      throw new Error("投递工作台的数据结构尚未升级，你填写的内容仍保留在当前页面。请先执行最新 Supabase migration 后重试。");
    }
    throw compatibleError;
  }

  if (WORKFLOW_UPDATE_KEYS.some((key) => key in values)) {
    throw new Error("投递详情字段尚未升级，你填写的内容仍保留在当前页面。请先执行最新 Supabase migration 后重试。");
  }

  const legacyValues = Object.fromEntries(
    LEGACY_UPDATE_KEYS
      .filter((key) => key in values)
      .map((key) => [key, values[key]]),
  ) as ApplicationUpdateValues;

  if (Object.keys(legacyValues).length === 0) {
    throw new Error("投递详情字段尚未升级。请先执行最新 Supabase migration，再保存这些信息。");
  }

  const { data: legacyData, error: legacyError } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .update(legacyValues)
    .eq("id", id)
    .select("*")
    .abortSignal(signal)
    .single());

  if (legacyError) throw legacyError;
  return legacyData as UserApplication;
}

export async function fetchApplicationHistory(
  supabase: SupabaseClient<Database>,
  applicationId: string,
) {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("status_history")
    .select("*")
    .eq("application_id", applicationId)
    .order("changed_at", { ascending: false })
    .abortSignal(signal));

  if (error) throw error;
  return (data ?? []) as StatusHistory[];
}

export async function fetchApplicationHistories(
  supabase: SupabaseClient<Database>,
  userId: string,
  applicationIds: string[],
) {
  if (applicationIds.length === 0) return [] as StatusHistory[];
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("status_history")
    .select("*")
    .eq("user_id", userId)
    .in("application_id", applicationIds)
    .order("changed_at", { ascending: true })
    .abortSignal(signal));
  if (error) throw error;
  return (data ?? []) as StatusHistory[];
}

export async function deleteApplication(
  supabase: SupabaseClient<Database>,
  id: string,
) {
  const { error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .delete()
    .eq("id", id)
    .abortSignal(signal));
  if (error) throw error;
}

export function isMissingApplicationWorkflowColumnsError(error: unknown) {
  const message = getErrorMessage(error);
  return /job_snapshot|resume_snapshot|form_answers|material_records|applied_position|candidate_stage|priority|saved_at|application_channel|application_account|contact_name|next_action|resume_id|custom_stage_label|workflow_node_id|workflow_nodes|review_note/i.test(message)
    && /column|schema cache|does not exist|could not find/i.test(message);
}

export function isMissingApplicationWorkspaceColumnsError(error: unknown) {
  const message = getErrorMessage(error);
  return /job_snapshot|resume_snapshot|form_answers|material_records/i.test(message)
    && /column|schema cache|does not exist|could not find/i.test(message);
}

function getCompatibleMissingUpdateKeys(
  error: unknown,
  values: ApplicationUpdateValues,
) {
  const message = getErrorMessage(error).toLowerCase();
  return COMPATIBLE_MISSING_UPDATE_KEYS.filter((key) => key in values && message.includes(key));
}

function omitApplicationUpdateKeys(
  values: ApplicationUpdateValues,
  omittedKeys: readonly (keyof ApplicationUpdateValues)[],
) {
  return Object.fromEntries(
    Object.entries(values).filter(([key]) => !omittedKeys.includes(key as keyof ApplicationUpdateValues)),
  ) as ApplicationUpdateValues;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : String(error ?? "");
}

function getErrorCode(error: unknown) {
  return typeof error === "object" && error && "code" in error ? String(error.code) : "";
}

async function fetchExistingApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .abortSignal(signal)
    .single());
  if (error) throw error;
  return data as UserApplication;
}

async function runApplicationRequest<T>(operation: (signal: AbortSignal) => PromiseLike<T>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), APPLICATION_REQUEST_TIMEOUT_MS);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("网络响应超时，你填写的内容仍保留在当前页面。请检查网络后重试。");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
