import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile } from "@/lib/types";

type ProfileClient = SupabaseClient<Database>;

export type ProfilePreferencesInput = {
  city: string;
  displayName: string;
  graduationYear: string;
  major: string;
  phone: string;
  preferredRegions: string[];
  school: string;
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
      phone: normalizeOptionalText(input.phone),
      city: normalizeOptionalText(input.city),
      school: normalizeOptionalText(input.school),
      major: normalizeOptionalText(input.major),
      graduation_year: normalizeOptionalText(input.graduationYear),
      preferred_regions: normalizePreferenceList(input.preferredRegions),
      target_roles: normalizePreferenceList(input.targetRoles),
    })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Profile;
}

export function isProfileSchemaError(error: unknown) {
  const code = typeof error === "object" && error ? String("code" in error ? error.code : "") : "";
  const message = typeof error === "object" && error ? String("message" in error ? error.message : "") : "";

  return (
    code === "PGRST204" ||
    code === "42703" ||
    message.includes("Could not find the") ||
    message.includes("preferred_regions") ||
    message.includes("target_roles") ||
    message.includes("graduation_year")
  );
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

function normalizeOptionalText(value: string) {
  return value.trim() || null;
}
