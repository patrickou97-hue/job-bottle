import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
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

export async function GET(request: NextRequest) {
  const access = await requirePrimaryAdmin();
  if ("response" in access) return access.response;
  const query = request.nextUrl.searchParams.get("query")?.trim().toLowerCase() ?? "";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") ?? 1));
  const pageSize = 30;
  try {
    const admin = createAdminClient();
    const authUsers = await listAllUsers();
    const ids = authUsers.map((user) => user.id);
    const [{ data: profiles, error: profileError }, { data: wallets, error: walletError }] = await Promise.all([
      admin.from("profiles").select("id,display_name,role").in("id", ids),
      admin.from("star_interview_wallets").select("*").in("user_id", ids),
    ]);
    if (profileError || walletError) throw profileError ?? walletError;
    const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const walletById = new Map((wallets ?? []).map((wallet) => [wallet.user_id, wallet]));
    const matched = authUsers.filter((user) => {
      if (!query) return true;
      const profile = profileById.get(user.id);
      return [user.email, profile?.display_name, user.id]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const total = matched.length;
    const users = matched
      .slice((page - 1) * pageSize, page * pageSize)
      .map((user) => {
        const profile = profileById.get(user.id);
        const wallet = walletById.get(user.id);
        return {
          id: user.id,
          email: user.email ?? "微信账户",
          displayName: profile?.display_name || "拾星用户",
          accessMode: resolveAccessMode(user, profile?.role ?? "user"),
          balanceFen: wallet?.balance_fen ?? 0,
          totalSpentFen: wallet?.total_spent_fen ?? 0,
          nominalSpentFen: wallet?.nominal_spent_fen ?? 0,
          updatedAt: wallet?.updated_at ?? null,
        };
      });
    return NextResponse.json({
      users,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch {
    return NextResponse.json({ error: "诘星余额列表暂时无法读取。" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await requirePrimaryAdmin();
  if ("response" in access) return access.response;
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
        actorUserId: access.userId,
      })));
      succeeded += results.length;
    }
    return NextResponse.json({ succeeded, total: userIds.length });
  } catch {
    return NextResponse.json({ error: "余额发放失败，已成功的幂等记录不会重复入账。" }, { status: 500 });
  }
}

async function listAllUserIds() {
  return (await listAllUsers()).map((user) => user.id);
}

async function listAllUsers() {
  const admin = createAdminClient();
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1_000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1_000) break;
  }
  return users;
}

async function requirePrimaryAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || user.email?.toLowerCase() !== PRIMARY_ADMIN_EMAIL) {
    return { response: NextResponse.json({ error: "只有主管理员可以管理诘星余额。" }, { status: 403 }) };
  }
  return { userId: user.id };
}

function resolveAccessMode(user: User, role: string) {
  const explicit = user.app_metadata?.star_interview_unlimited_access;
  if (typeof explicit === "boolean") return explicit ? "unlimited" : "standard";
  return role === "admin" ? "unlimited" : "standard";
}
