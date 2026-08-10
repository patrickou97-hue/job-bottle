import "server-only";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export async function takeExtensionAutofillRateSlot(
  userId: string,
  operationId?: string,
) {
  const { data, error } = await createAdminClient().rpc(
    "take_extension_autofill_rate_slot",
    {
      p_user_id: userId,
      // Legacy clients send no operation id. Giving each old request a fresh
      // durable id preserves their former one-request-per-operation behavior.
      p_operation_id: operationId ?? randomUUID(),
    },
  );
  if (error) throw error;
  return data === true;
}
