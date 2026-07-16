import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationWithJob,
  Database,
  StatusHistory,
  UserApplication,
} from "@/lib/types";

export type ApplicationUpdateValues = Database["public"]["Tables"]["user_applications"]["Update"];
const APPLICATION_REQUEST_TIMEOUT_MS = 12_000;

const LEGACY_UPDATE_KEYS = ["status", "progress_note", "note", "interview_round", "applied_at"] as const;
const WORKFLOW_UPDATE_KEYS = [
  "candidate_stage",
  "priority",
  "application_channel",
  "application_account",
  "contact_name",
  "next_action",
  "next_action_at",
  "resume_id",
  "custom_stage_label",
  "review_note",
] as const;

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
  return (data ?? []) as unknown as ApplicationWithJob[];
}

export async function upsertApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
  candidateStage: "evaluating" | "saved" | "preparing" = "evaluating",
) {
  const { data: existing, error: existingError } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .abortSignal(signal)
    .maybeSingle());

  if (existingError) throw existingError;
  if (existing) return existing as UserApplication;

  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .insert({
      user_id: userId,
      job_id: jobId,
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

export async function updateApplication(
  supabase: SupabaseClient<Database>,
  id: string,
  values: ApplicationUpdateValues,
) {
  const { data, error } = await runApplicationRequest(async (signal) => await supabase
    .from("user_applications")
    .update(values)
    .eq("id", id)
    .select("*")
    .abortSignal(signal)
    .single());

  if (!error) return data as UserApplication;
  if (!isMissingApplicationWorkflowColumnsError(error)) throw error;

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
  const message = error instanceof Error
    ? error.message
    : typeof error === "object" && error && "message" in error
      ? String(error.message)
      : String(error ?? "");
  return /candidate_stage|priority|saved_at|application_channel|application_account|contact_name|next_action|resume_id|custom_stage_label|review_note/i.test(message)
    && /column|schema cache|does not exist|could not find/i.test(message);
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
