import { NextResponse } from "next/server";
import { resolveStarInterviewAccessMode } from "@/lib/star-interview-access";
import {
  getStarInterviewWallet,
  listStarInterviewLedger,
  STAR_INTERVIEW_PRICING,
} from "@/lib/star-interview-billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: "请先登录拾星查看诘星余额。" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const [{ data: profile }, { data: auth }, wallet, ledger] = await Promise.all([
      admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
      admin.auth.admin.getUserById(user.id),
      getStarInterviewWallet(user.id),
      listStarInterviewLedger(user.id),
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
        available: hasWechatPayConfiguration(),
        provider: "wechat_native",
      },
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "诘星账本暂时无法读取。" }, { status: 500 });
  }
}

function hasWechatPayConfiguration() {
  return [
    "WECHAT_PAY_MCH_ID",
    "WECHAT_PAY_APP_ID",
    "WECHAT_PAY_CERT_SERIAL_NO",
    "WECHAT_PAY_PRIVATE_KEY",
    "WECHAT_PAY_API_V3_KEY",
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY",
    "WECHAT_PAY_PLATFORM_SERIAL_NO",
  ].every((name) => Boolean(process.env[name]));
}
