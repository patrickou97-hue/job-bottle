import { NextResponse } from "next/server";
import { toMiniProgramJob } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("jobs")
      .select("*")
      .eq("id", id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "岗位不存在或已下线。" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { data: { job: toMiniProgramJob(data) } },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  } catch {
    return NextResponse.json(
      { error: "岗位暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}
