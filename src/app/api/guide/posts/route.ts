import { NextRequest, NextResponse } from "next/server";
import { getGuidePosts } from "@/lib/guide-server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") || 100);
    const posts = await getGuidePosts("web", limit);
    return NextResponse.json(
      { posts },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { error: "指南内容暂时无法读取。" },
      { status: 500 },
    );
  }
}
