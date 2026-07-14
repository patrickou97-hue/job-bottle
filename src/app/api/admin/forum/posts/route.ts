import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GUIDE_CATEGORIES = ["公告", "教程", "分享"] as const;

type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

type GuideInput = {
  postId?: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: unknown;
};

async function getAdminUser() {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || profile?.role !== "admin") return null;
  return user;
}

function parseContentInput(input: GuideInput) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const content = typeof input.content === "string" ? input.content.trim() : "";
  const category = GUIDE_CATEGORIES.includes(input.category as GuideCategory)
    ? input.category as GuideCategory
    : null;
  const tags = Array.isArray(input.tags)
    ? input.tags.filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)
    : [];

  if (!title || title.length > 120 || !content || content.length > 5000 || !category) {
    return null;
  }
  return { title, content, category, tags };
}

function errorResponse(error: unknown, fallback: string) {
  console.error("[guide_admin]", {
    code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
  });
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "只有管理员可以发布指南内容。" }, { status: 403 });

  const input = await request.json().catch(() => null) as GuideInput | null;
  const content = input ? parseContentInput(input) : null;
  if (!content) return NextResponse.json({ error: "请检查标题、分类和正文。" }, { status: 400 });

  try {
    const { data: post, error } = await createAdminClient()
      .from("forum_posts")
      .insert({ user_id: user.id, ...content })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error, "指南内容发布失败，请稍后重试。");
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "只有管理员可以编辑指南内容。" }, { status: 403 });

  const input = await request.json().catch(() => null) as GuideInput | null;
  const content = input ? parseContentInput(input) : null;
  if (!input?.postId || !content) {
    return NextResponse.json({ error: "请检查内容编号、标题、分类和正文。" }, { status: 400 });
  }

  try {
    const { data: post, error } = await createAdminClient()
      .from("forum_posts")
      .update(content)
      .eq("id", input.postId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!post) return NextResponse.json({ error: "内容不存在或已被删除。" }, { status: 404 });
    return NextResponse.json({ post });
  } catch (error) {
    return errorResponse(error, "指南内容保存失败，请稍后重试。");
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "只有管理员可以删除指南内容。" }, { status: 403 });

  const input = await request.json().catch(() => null) as GuideInput | null;
  if (!input?.postId) return NextResponse.json({ error: "内容编号无效。" }, { status: 400 });

  try {
    const { data: post, error } = await createAdminClient()
      .from("forum_posts")
      .delete()
      .eq("id", input.postId)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!post) return NextResponse.json({ error: "内容不存在或已被删除。" }, { status: 404 });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return errorResponse(error, "指南内容删除失败，请稍后重试。");
  }
}
