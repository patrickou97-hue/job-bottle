import { NextRequest, NextResponse } from "next/server";
import { isWechatInternalEmail } from "@/lib/account-identity";
import { authenticateStarInterviewRequest } from "@/lib/star-interview-auth";
import { resolveStarInterviewAccessMode } from "@/lib/star-interview-access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await authenticateStarInterviewRequest(request);
  if (!access || !access.scopes.includes("profile:read")) {
    return NextResponse.json({ error: "登录状态已失效，请重新连接拾星。" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const [{ data: profile, error }, { data: auth }] = await Promise.all([
      admin.from("profiles").select("display_name,city,school,major,role").eq("id", access.sub).maybeSingle(),
      admin.auth.admin.getUserById(access.sub),
    ]);
    if (error) throw error;
    const rawEmail = auth.user?.email ?? "";
    const role = profile?.role ?? "user";
    const starInterviewAccessMode = auth.user
      ? resolveStarInterviewAccessMode(auth.user, role)
      : "standard";
    return NextResponse.json(
      {
        data: {
          user: {
            id: access.sub,
            displayName: profile?.display_name || "拾星用户",
            email: isWechatInternalEmail(rawEmail) ? "" : rawEmail,
            city: profile?.city ?? "",
            school: profile?.school ?? "",
            major: profile?.major ?? "",
          },
          starInterviewAccess: {
            mode: starInterviewAccessMode,
            usagePolicy: starInterviewAccessMode === "unlimited"
              ? "unlimited"
              : "metered_not_enforced",
          },
        },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "用户资料暂时无法读取。" }, { status: 500 });
  }
}
