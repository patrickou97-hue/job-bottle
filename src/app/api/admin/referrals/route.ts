import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";

export async function GET() {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;

  const { data, error } = await access.supabase.rpc("list_referral_codes_for_admin");
  if (error) {
    logAdminReferralError("list", error);
    return NextResponse.json({ error: "内推码审核记录读取失败，请稍后重试。" }, { status: 500 });
  }
  return NextResponse.json({ codes: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: NextRequest) {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;

  const body = await request.json().catch(() => null) as { id?: unknown; reason?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id.trim() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!id || reason.length < 2 || reason.length > 240) {
    return NextResponse.json({ error: "请选择记录并填写 2–240 字的下架原因。" }, { status: 400 });
  }

  const { data, error } = await access.supabase.rpc("deactivate_referral_code_as_admin", {
    p_id: id,
    p_reason: reason,
  });
  if (error) {
    logAdminReferralError("deactivate", error);
    return NextResponse.json({ error: "内推码下架失败，请稍后重试。" }, { status: 500 });
  }
  if (data !== true) return NextResponse.json({ error: "该内推码已下架或不存在。" }, { status: 409 });
  return NextResponse.json({ deactivated: true });
}

function logAdminReferralError(scope: string, error: unknown) {
  console.error(`[admin_referral_${scope}]`, {
    code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
  });
}
