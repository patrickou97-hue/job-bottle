import { createClient } from "@supabase/supabase-js";
import {
  getReferralMimoConfiguration,
  reviewReferralCodeWithMimo,
} from "../src/lib/referral-moderation.ts";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const mimo = getReferralMimoConfiguration();

if (!supabaseUrl || !serviceRoleKey || !mimo) {
  throw new Error("Referral review environment is incomplete.");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: claimed, error: claimError } = await admin.rpc("claim_referral_codes_for_review", { p_limit: 100 });
if (claimError) throw claimError;

const counters = { claimed: claimed?.length ?? 0, approved: 0, rejected: 0, error: 0 };
for (const batch of chunk(claimed ?? [], 4)) {
  await Promise.all(batch.map(async (record) => {
    let result;
    try {
      result = await reviewReferralCodeWithMimo(record, mimo);
    } catch {
      result = {
        outcome: "error",
        category: "upstream_error",
        confidence: null,
        reason: "智能审核未完成，已转人工复核",
      };
    }

    const { data: completed, error: completeError } = await admin.rpc("complete_referral_code_review", {
      p_id: record.id,
      p_outcome: result.outcome,
      p_category: result.category,
      p_confidence: result.confidence,
      p_reason: result.reason,
    });
    if (completeError || completed !== true) throw completeError ?? new Error("Referral review completion was not persisted.");
    counters[result.outcome] += 1;
  }));
}

console.log(JSON.stringify(counters));

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));
  return groups;
}
