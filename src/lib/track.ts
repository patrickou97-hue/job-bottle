import { getCurrentUserOrNull } from "@/lib/auth";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

type TrackProps = Record<string, unknown>;

export async function track(event: string, props: TrackProps = {}) {
  if (!isSupabaseConfigured()) return;

  try {
    const supabase = createClient();
    const user = await getCurrentUserOrNull(supabase);
    if (!user) return;

    const { error } = await supabase.from("events").insert({
      user_id: user.id,
      event,
      props,
    });
    if (error) {
      console.warn("[analytics_write]", { code: error.code });
    }
  } catch {
    // Analytics must never block product actions.
  }
}
