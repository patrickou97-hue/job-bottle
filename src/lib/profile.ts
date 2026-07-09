import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";

type ProfileClient = SupabaseClient<Database>;

export type ProfilePreferencesInput = {
  displayName: string;
  preferredRegions: string[];
  targetRoles: string[];
};

export async function updateMyProfilePreferences(
  supabase: ProfileClient,
  userId: string,
  input: ProfilePreferencesInput,
) {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: input.displayName.trim() || "秋招用户",
      preferred_regions: normalizePreferenceList(input.preferredRegions),
      target_roles: normalizePreferenceList(input.targetRoles),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export function normalizePreferenceList(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12),
    ),
  );
}

export function parsePreferenceInput(value: string) {
  return normalizePreferenceList(value.split(/[、,，/\s]+/));
}

export function formatPreferenceInput(values: string[] | null | undefined) {
  return (values ?? []).join("、");
}
