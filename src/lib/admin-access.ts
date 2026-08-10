import { NextResponse } from "next/server";
import { isPrimaryAdminEmail } from "@/lib/admin-user-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function requireAdminAccess(options: { primaryOnly?: boolean } = {}) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return {
        response: NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 }),
      };
    }

    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError) {
      return {
        response: NextResponse.json(
          { error: "管理员权限读取失败，请稍后重试。" },
          { status: 500 },
        ),
      };
    }
    if (isAdmin !== true) {
      return {
        response: NextResponse.json(
          {
            error: "管理员权限已停用、变更或存在未完成的安全操作。",
            code: "ADMIN_ACCESS_SUSPENDED",
          },
          { status: 403 },
        ),
      };
    }

    const isPrimaryAdmin = isPrimaryAdminEmail(user.email);
    if (options.primaryOnly && !isPrimaryAdmin) {
      return {
        response: NextResponse.json(
          { error: "只有主管理员可以执行此操作。" },
          { status: 403 },
        ),
      };
    }
    return { userId: user.id, isPrimaryAdmin, user, supabase };
  } catch {
    return {
      response: NextResponse.json(
        { error: "管理员鉴权服务暂时不可用。" },
        { status: 503 },
      ),
    };
  }
}

/**
 * Recovery is the only admin operation allowed to bypass the caller's own
 * guard. SQL revalidates the same primary-admin conditions before restoring a
 * snapshot, so a stale session cannot use this path.
 */
export async function requirePrimaryAdminRecoveryAccess() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user || !isPrimaryAdminEmail(user.email)) {
      return {
        response: NextResponse.json(
          { error: "只有主管理员可以恢复账户安全操作。" },
          { status: 403 },
        ),
      };
    }

    const admin = createAdminClient();
    const [{ data: authData, error: authError }, { data: profile, error: profileError }] = await Promise.all([
      admin.auth.admin.getUserById(user.id),
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);
    if (authError || profileError || !authData.user) {
      return {
        response: NextResponse.json(
          { error: "主管理员状态读取失败，请稍后重试。" },
          { status: 500 },
        ),
      };
    }
    if (profile?.role !== "admin" || isFutureDate(authData.user.banned_until)) {
      return {
        response: NextResponse.json(
          { error: "主管理员账号已停用或权限已变化。" },
          { status: 403 },
        ),
      };
    }
    return { userId: user.id, user };
  } catch {
    return {
      response: NextResponse.json(
        { error: "管理员恢复鉴权服务暂时不可用。" },
        { status: 503 },
      ),
    };
  }
}

function isFutureDate(value: string | null | undefined) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
}
