import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { adjustStarInterviewBalance } from "@/lib/star-interview-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const PRIMARY_ADMIN_EMAIL = "raywang6688@outlook.com";
const schema = z.object({
  userIds: z.array(z.string().uuid()).max(500).optional(),
  allUsers: z.boolean().optional(),
  amountFen: z.number().int().min(100).max(100_000),
  reason: z.string().trim().min(2).max(120),
  idempotencyKey: z.string().uuid(),
}).strict().refine((value) => value.allUsers === true || Boolean(value.userIds?.length), {
  message: "请选择发放对象。",
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.email?.toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
    return NextResponse.json({ error: "只有主管理员可以发放诘星余额。" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "发放参数无效。" }, { status: 400 });
  }

  try {
    const userIds = parsed.data.allUsers
      ? await listAllUserIds()
      : [...new Set(parsed.data.userIds ?? [])];
    let succeeded = 0;
    for (let index = 0; index < userIds.length; index += 20) {
      const chunk = userIds.slice(index, index + 20);
      const results = await Promise.all(chunk.map((userId) => adjustStarInterviewBalance({
        userId,
        amountFen: parsed.data.amountFen,
        entryType: "admin_grant",
        referenceKey: `admin:${parsed.data.idempotencyKey}:${userId}`,
        note: parsed.data.reason,
        actorUserId: user.id,
      })));
      succeeded += results.length;
    }
    return NextResponse.json({ succeeded, total: userIds.length });
  } catch {
    return NextResponse.json({ error: "余额发放失败，已成功的幂等记录不会重复入账。" }, { status: 500 });
  }
}

async function listAllUserIds() {
  const admin = createAdminClient();
  const ids: string[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw error;
    ids.push(...data.users.map((user) => user.id));
    if (data.users.length < 1_000) break;
  }
  return ids;
}
