import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireAdminAccess();
    if ("response" in access) return access.response;
    const { supabase } = access;

    const input = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!input || typeof input.postId !== "string" || !input.postId || typeof input.isPinned !== "boolean") {
      return NextResponse.json({ error: "请求格式无效。" }, { status: 400 });
    }

    const { data: post, error: updateError } = await supabase
      .from("forum_posts")
      .update({ is_pinned: input.isPinned })
      .eq("id", input.postId)
      .select("id, is_pinned")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!post) {
      return NextResponse.json({ error: "帖子不存在或已被删除。" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("[forum_pin]", {
      code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
    });
    return NextResponse.json({ error: "重点状态保存失败，请稍后重试。" }, { status: 500 });
  }
}
