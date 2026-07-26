import { NextResponse } from "next/server";
import { getGuidePosts } from "@/lib/guide-server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await getGuidePosts("miniprogram", 100);
    return NextResponse.json(
      {
        data: {
          posts: posts.map((post) => ({
            id: post.id,
            title: post.title,
            content: post.content,
            category: post.category,
            tags: post.tags,
            isPinned: post.is_pinned,
            createdAt: post.created_at,
          })),
        },
      },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
    );
  } catch {
    return NextResponse.json(
      { error: "指南内容暂时无法读取。" },
      { status: 500 },
    );
  }
}
