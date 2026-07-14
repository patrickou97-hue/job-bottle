import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "请先登录管理员账号。" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      return NextResponse.json({ error: "管理员权限读取失败，请稍后重试。" }, { status: 500 });
    }
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "只有管理员可以置顶社区内容。" }, { status: 403 });
    }

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
    return NextResponse.json({ error: "置顶状态保存失败，请稍后重试。" }, { status: 500 });
  }
}
