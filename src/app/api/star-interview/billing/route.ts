import { NextRequest, NextResponse } from "next/server";
import { authenticateStarInterviewAppRequest } from "@/lib/star-interview-auth";
import { resolveStarInterviewAccessMode } from "@/lib/star-interview-access";
import {
  getStarInterviewWallet,
  listStarInterviewLedger,
  STAR_INTERVIEW_PRICING,
} from "@/lib/star-interview-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWechatPayConfiguration } from "@/lib/wechat-pay";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const access = await authenticateStarInterviewAppRequest(request);
  if (!access) {
    return NextResponse.json(
      { error: "诘星登录状态已失效，请重新连接拾星。" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: auth }, wallet, ledger] = await Promise.all([
      admin.from("profiles").select("role").eq("id", access.sub).maybeSingle(),
      admin.auth.admin.getUserById(access.sub),
      getStarInterviewWallet(access.sub),
      listStarInterviewLedger(access.sub),
    ]);
    const mode = auth.user
      ? resolveStarInterviewAccessMode(auth.user, profile?.role ?? "user")
      : "standard";
    return NextResponse.json({
      wallet,
      ledger,
      accessMode: mode,
      pricing: STAR_INTERVIEW_PRICING,
      recharge: {
        available: Boolean(getWechatPayConfiguration()),
        provider: "wechat_native",
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "诘星账本暂时无法读取。" }, { status: 500 });
  }
}
