import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { requireAdminAccess } from "@/lib/admin-access";
import { adjustStarInterviewBalance } from "@/lib/star-interview-billing";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const access = await requireAdminAccess({ primaryOnly: true });
  if ("response" in access) return access.response;
  const query = request.nextUrl.searchParams.get("query")?.trim().toLowerCase() ?? "";
  const selectedUserId = request.nextUrl.searchParams.get("userId")?.trim() ?? "";
  const summaryOnly = request.nextUrl.searchParams.get("summaryOnly") === "1";
  const requestedPage = Number(request.nextUrl.searchParams.get("page") ?? 1);
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 30;
  if (selectedUserId && !z.string().uuid().safeParse(selectedUserId).success) {
    return NextResponse.json({ error: "用户 ID 格式无效。" }, { status: 400 });
  }
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
    const allUsers = authUsers.map((user) => {
      const profile = profileById.get(user.id);
      const wallet = walletById.get(user.id);
      return {
        id: user.id,
        email: user.email ?? "微信账户",
        displayName: profile?.display_name || "拾星用户",
        accessMode: resolveAccessMode(user, profile?.role ?? "user"),
        balanceFen: wallet?.balance_fen ?? 0,
        totalGrantedFen: wallet?.total_granted_fen ?? 0,
        totalRechargedFen: wallet?.total_recharged_fen ?? 0,
        totalSpentFen: wallet?.total_spent_fen ?? 0,
        nominalSpentFen: wallet?.nominal_spent_fen ?? 0,
        updatedAt: wallet?.updated_at ?? null,
      };
    });
    const summary = {
      totalUsers: allUsers.length,
      fundedUsers: allUsers.filter((user) => user.balanceFen > 0).length,
      unlimitedUsers: allUsers.filter((user) => user.accessMode === "unlimited").length,
      totalBalanceFen: allUsers.reduce((sum, user) => sum + user.balanceFen, 0),
    };

    if (summaryOnly) {
      return NextResponse.json({ summary });
    }

    if (selectedUserId) {
      const selectedUser = allUsers.find((user) => user.id === selectedUserId);
      if (!selectedUser) {
        return NextResponse.json({ error: "没有找到这个用户。" }, { status: 404 });
      }
      const { data: ledger, error: ledgerError } = await admin
        .from("star_interview_ledger")
        .select("id,entry_type,amount_fen,nominal_amount_fen,balance_after_fen,feature,note,created_at")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: false })
        .limit(8);
      if (ledgerError) throw ledgerError;
      return NextResponse.json({ user: selectedUser, ledger: ledger ?? [] });
    }

    const matched = authUsers.filter((user) => {
      if (!query) return true;
      const profile = profileById.get(user.id);
      return [user.email, profile?.display_name, user.id]
        .some((value) => value?.toLowerCase().includes(query));
    });
    const total = matched.length;
    const matchedIds = new Set(
      matched
      .slice((page - 1) * pageSize, page * pageSize)
      .map((user) => user.id),
    );
    const users = allUsers.filter((user) => matchedIds.has(user.id));
    return NextResponse.json({
      users,
      summary,
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
  const access = await requireAdminAccess({ primaryOnly: true });
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

function resolveAccessMode(user: User, role: string) {
  const explicit = user.app_metadata?.star_interview_unlimited_access;
  if (typeof explicit === "boolean") return explicit ? "unlimited" : "standard";
  return role === "admin" ? "unlimited" : "standard";
}
