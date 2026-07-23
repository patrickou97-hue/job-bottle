import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramProfile } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", identity.sub)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "用户资料尚未建立。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { profile: toMiniProgramProfile(data) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "用户资料暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}
