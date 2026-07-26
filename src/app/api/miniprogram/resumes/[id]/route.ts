import { NextRequest, NextResponse } from "next/server";
import { authenticateMiniProgramRequest } from "@/lib/miniprogram-auth";
import { toMiniProgramResumeDetail } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const identity = authenticateMiniProgramRequest(request);
  if (!identity) {
    return NextResponse.json(
      { error: "登录状态已失效，请重新登录。" },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("resumes")
      .select("*")
      .eq("id", id)
      .eq("user_id", identity.sub)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "简历不存在或已删除。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { resume: toMiniProgramResumeDetail(data) } },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "简历暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}
