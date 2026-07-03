import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ApplicationStatus,
  ApplicationWithJob,
  Database,
  UserApplication,
} from "@/lib/types";

export async function fetchMyApplications(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("user_applications")
    .select("*, job:jobs(*)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ApplicationWithJob[];
}

export async function upsertApplication(
  supabase: SupabaseClient<Database>,
  userId: string,
  jobId: string,
) {
  const { data: existing, error: existingError } = await supabase
    .from("user_applications")
    .select("*")
    .eq("user_id", userId)
    .eq("job_id", jobId)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) return existing as UserApplication;

  const { data, error } = await supabase
    .from("user_applications")
    .insert({
      user_id: userId,
      job_id: jobId,
      status: "opened",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as UserApplication;
}

export async function updateApplication(
  supabase: SupabaseClient<Database>,
  id: string,
  values: { status: ApplicationStatus; progress_note: string | null },
) {
  const { data, error } = await supabase
    .from("user_applications")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as UserApplication;
}

export async function deleteApplication(
  supabase: SupabaseClient<Database>,
  id: string,
) {
  const { error } = await supabase.from("user_applications").delete().eq("id", id);
  if (error) throw error;
}
