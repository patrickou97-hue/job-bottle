import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResume } from "@/lib/miniprogram-api";
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
      .from("resumes")
      .select("*")
      .eq("user_id", identity.sub)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json(
      { data: { resumes: (data ?? []).map(toMiniProgramResume) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}
