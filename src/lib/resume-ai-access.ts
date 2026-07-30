import "server-only";

import type { NextRequest } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ResumeAiAccess = {
  userId: string;
  client: "web" | "miniprogram";
  takeRateSlot: () => Promise<{
    data: boolean | null;
    error: unknown;
  }>;
};

export async function resolveResumeAiAccess(
  request: NextRequest,
): Promise<ResumeAiAccess | null> {
  const miniProgramIdentity = authenticateMiniProgramRequest(request);
  if (miniProgramIdentity) {
    return {
      userId: miniProgramIdentity.sub,
      client: "miniprogram",
      takeRateSlot: async () => {
        const { data, error } = await createAdminClient().rpc(
          "take_resume_ai_rate_slot_for_user",
          { target_user_id: miniProgramIdentity.sub },
        );
        return { data, error };
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return {
    userId: user.id,
    client: "web",
    takeRateSlot: async () => {
      const { data, error: rateError } = await supabase.rpc(
        "take_resume_ai_rate_slot",
      );
      return { data, error: rateError };
    },
  };
}
