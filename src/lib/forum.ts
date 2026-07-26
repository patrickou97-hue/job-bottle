import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ForumPost, ForumPostView } from "@/lib/types";

/* ── Fetch posts with author names ── */
export async function fetchPosts(
  _supabase: SupabaseClient<Database>,
  options?: { category?: string; limit?: number; offset?: number },
) {
  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  const response = await fetch(`/api/guide/posts?limit=${Math.min(limit + offset, 100)}`, {
    cache: "no-store",
  });
  const result = await response.json().catch(() => null) as {
    posts?: ForumPostView[];
    error?: string;
  } | null;
  if (!response.ok) throw new Error(result?.error ?? "指南内容读取失败。");
  const guidePosts = (result?.posts ?? [])
    .slice(offset, offset + limit)
    .map((post) => ({
      ...post,
      category: normalizeGuideCategory(post.category),
    }));

  if (options?.category && options.category !== "全部") {
    return guidePosts.filter((post) => post.category === options.category);
  }
  return guidePosts;
}

function normalizeGuideCategory(category: string) {
  if (category === "公告" || category === "教程" || category === "分享") return category;
  if (category === "经验") return "分享";
  if (category === "求助") return "教程";
  return "公告";
}

async function requestGuideMutation(method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
  const response = await fetch("/api/admin/forum/posts", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => null) as {
    error?: string;
    post?: ForumPost;
    deleted?: boolean;
  } | null;
  if (!response.ok) throw new Error(result?.error ?? "指南内容保存失败。");
  return result;
}

export async function createPost(
  data: {
    title: string;
    content: string;
    category: string;
    tags: string[];
    platformVisibility?: "both" | "web" | "miniprogram";
  },
) {
  const result = await requestGuideMutation("POST", data);
  if (!result?.post) throw new Error("指南内容发布失败。");
  return result.post;
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    content?: string;
    category?: string;
    tags?: string[];
    platformVisibility?: "both" | "web" | "miniprogram";
  },
) {
  await requestGuideMutation("PATCH", { postId, ...data });
}

export async function deletePost(postId: string) {
  await requestGuideMutation("DELETE", { postId });
}

/* ── Admin-only pinning (server rechecks the authenticated profile role) ── */
export async function setPostPinned(postId: string, isPinned: boolean) {
  const response = await fetch("/api/admin/forum/pin", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ postId, isPinned }),
  });
  const result = await response.json().catch(() => null) as {
    error?: string;
    post?: Pick<ForumPost, "id" | "is_pinned">;
  } | null;
  if (!response.ok || !result?.post) {
    throw new Error(result?.error ?? "置顶状态保存失败。");
  }
  return result.post;
}
