import { NextRequest, NextResponse } from "next/server";
import { requireAdminAccess } from "@/lib/admin-access";

const GUIDE_CATEGORIES = ["公告", "教程", "分享"] as const;
const PLATFORM_VISIBILITIES = ["both", "web", "miniprogram"] as const;

type GuideCategory = (typeof GUIDE_CATEGORIES)[number];

type GuideInput = {
  postId?: string;
  title?: string;
  content?: string;
  category?: string;
  tags?: unknown;
  platformVisibility?: unknown;
};

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
  const platformVisibility = PLATFORM_VISIBILITIES.includes(
    input.platformVisibility as (typeof PLATFORM_VISIBILITIES)[number],
  )
    ? input.platformVisibility as (typeof PLATFORM_VISIBILITIES)[number]
    : "both";

  if (!title || title.length > 120 || !content || content.length > 5000 || !category) {
    return null;
  }
  return {
    title,
    content,
    category,
    tags,
    platform_visibility: platformVisibility,
  };
}

function errorResponse(error: unknown, fallback: string) {
  console.error("[guide_admin]", {
    code: error && typeof error === "object" && "code" in error ? String(error.code) : undefined,
  });
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;
  const { user, supabase } = access;

  const input = await request.json().catch(() => null) as GuideInput | null;
  const content = input ? parseContentInput(input) : null;
  if (!content) return NextResponse.json({ error: "请检查标题、分类和正文。" }, { status: 400 });

  try {
    // Use the caller-scoped client so RLS re-runs guard-aware is_admin() at
    // statement time. A service-role write here would leave a revocation race
    // between the route's initial check and the database commit.
    const { data: post, error } = await supabase
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
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;
  const { supabase } = access;

  const input = await request.json().catch(() => null) as GuideInput | null;
  const content = input ? parseContentInput(input) : null;
  if (!input?.postId || !content) {
    return NextResponse.json({ error: "请检查内容编号、标题、分类和正文。" }, { status: 400 });
  }

  try {
    const { data: post, error } = await supabase
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
  const access = await requireAdminAccess();
  if ("response" in access) return access.response;
  const { supabase } = access;

  const input = await request.json().catch(() => null) as GuideInput | null;
  if (!input?.postId) return NextResponse.json({ error: "内容编号无效。" }, { status: 400 });

  try {
    const { data: post, error } = await supabase
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
