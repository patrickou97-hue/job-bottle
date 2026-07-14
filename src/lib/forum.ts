import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ForumPost, ForumPostView, ProfileRole } from "@/lib/types";

/* ── Helper: batch-fetch display names for a set of user IDs ── */
async function fetchForumAuthors(
  _supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, { name: string; role: ProfileRole }>> {
  const map = new Map<string, { name: string; role: ProfileRole }>();
  if (userIds.length === 0) return map;
  const unique = [...new Set(userIds)];
  const response = await fetch("/api/forum/authors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userIds: unique }),
  }).catch(() => null);
  if (!response?.ok) return map;

  const result = (await response.json().catch(() => null)) as {
    authors?: Record<string, { name: string; role: ProfileRole }>;
  } | null;
  for (const [id, author] of Object.entries(result?.authors ?? {})) {
    map.set(id, author);
  }
  return map;
}

/* ── Fetch posts with author names ── */
export async function fetchPosts(
  supabase: SupabaseClient<Database>,
  options?: { category?: string; limit?: number; offset?: number },
) {
  let query = supabase
    .from("forum_posts")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  const posts = (data ?? []) as ForumPost[];
  const authors = await fetchForumAuthors(
    supabase,
    posts.map((p) => p.user_id),
  );

  const guidePosts = posts
    .filter((post) => authors.get(post.user_id)?.role === "admin")
    .map((post) => ({
      ...post,
      category: normalizeGuideCategory(post.category),
      author_name: "拾星官方",
      author_role: "admin" as const,
      like_count: 0,
      comment_count: 0,
    })) satisfies ForumPostView[];

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
  data: { title: string; content: string; category: string; tags: string[] },
) {
  const result = await requestGuideMutation("POST", data);
  if (!result?.post) throw new Error("指南内容发布失败。");
  return result.post;
}

export async function updatePost(
  postId: string,
  data: { title?: string; content?: string; category?: string; tags?: string[] },
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
