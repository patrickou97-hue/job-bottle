import { NextResponse } from "next/server";
import { toMiniProgramJob } from "@/lib/miniprogram-api";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("jobs")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;

    return NextResponse.json(
      {
        data: {
          jobs: (data ?? []).map(toMiniProgramJob),
          nextCursor: null,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "岗位暂时无法读取，请稍后重试。" },
      { status: 500 },
    );
  }
}
