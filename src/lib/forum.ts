import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, ForumPost, ForumComment, ForumPostWithComments } from "@/lib/types";

/* ── Helper: batch-fetch display names for a set of user IDs ── */
async function fetchDisplayNames(
  supabase: SupabaseClient<Database>,
  userIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (userIds.length === 0) return map;
  const unique = [...new Set(userIds)];
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", unique);
  if (data) {
    for (const row of data as { id: string; display_name: string | null }[]) {
      map.set(row.id, row.display_name ?? "匿名用户");
    }
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

  if (options?.category && options.category !== "全部") {
    query = query.eq("category", options.category);
  }

  const limit = options?.limit ?? 20;
  const offset = options?.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;

  const posts = (data ?? []) as ForumPost[];
  const names = await fetchDisplayNames(
    supabase,
    posts.map((p) => p.user_id),
  );

  return posts.map((p) => ({
    ...p,
    author_name: names.get(p.user_id) ?? "匿名用户",
  }));
}

/* ── Fetch single post with comments ── */
export async function fetchPost(supabase: SupabaseClient<Database>, postId: string) {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("id", postId)
    .single();
  if (error) throw error;
  const post = data as ForumPost;

  const { data: commentRows, error: commentsError } = await supabase
    .from("forum_comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (commentsError) throw commentsError;

  const comments = (commentRows ?? []) as ForumComment[];
  const allUserIds = [post.user_id, ...comments.map((c) => c.user_id)];
  const names = await fetchDisplayNames(supabase, allUserIds);

  return {
    ...post,
    author_name: names.get(post.user_id) ?? "匿名用户",
    comments: comments.map((c) => ({
      ...c,
      author_name: names.get(c.user_id) ?? "匿名用户",
    })),
  } as ForumPostWithComments;
}

/* ── Create post ── */
export async function createPost(
  supabase: SupabaseClient<Database>,
  userId: string,
  data: { title: string; content: string; category: string; tags: string[] },
) {
  const { data: post, error } = await supabase
    .from("forum_posts")
    .insert({ user_id: userId, ...data })
    .select("*")
    .single();
  if (error) throw error;

  const names = await fetchDisplayNames(supabase, [userId]);
  return { ...(post as ForumPost), author_name: names.get(userId) ?? "匿名用户" };
}

/* ── Update post ── */
export async function updatePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
  data: { title?: string; content?: string; category?: string; tags?: string[] },
) {
  const { error } = await supabase
    .from("forum_posts")
    .update(data)
    .eq("id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ── Delete post ── */
export async function deletePost(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string) {
  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ── Create comment ── */
export async function createComment(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
  content: string,
) {
  const { data: comment, error } = await supabase
    .from("forum_comments")
    .insert({ post_id: postId, user_id: userId, content })
    .select("*")
    .single();
  if (error) throw error;

  const names = await fetchDisplayNames(supabase, [userId]);
  return { ...(comment as ForumComment), author_name: names.get(userId) ?? "匿名用户" };
}

/* ── Delete comment ── */
export async function deleteComment(
  supabase: SupabaseClient<Database>,
  userId: string,
  commentId: string,
) {
  const { error } = await supabase
    .from("forum_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);
  if (error) throw error;
}

/* ── Toggle like ── */
export async function toggleLike(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId?: string,
  commentId?: string,
) {
  if (postId) {
    const { data: existing, error: readError } = await supabase
      .from("forum_likes")
      .select("user_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await supabase.from("forum_likes").delete().eq("user_id", userId).eq("post_id", postId);
      if (error) throw error;
      return false;
    }
    const { error } = await supabase.from("forum_likes").insert({ user_id: userId, post_id: postId });
    if (error) throw error;
    return true;
  }
  if (commentId) {
    const { data: existing, error: readError } = await supabase
      .from("forum_likes")
      .select("user_id")
      .eq("user_id", userId)
      .eq("comment_id", commentId)
      .maybeSingle();
    if (readError) throw readError;
    if (existing) {
      const { error } = await supabase.from("forum_likes").delete().eq("user_id", userId).eq("comment_id", commentId);
      if (error) throw error;
      return false;
    }
    const { error } = await supabase.from("forum_likes").insert({ user_id: userId, comment_id: commentId });
    if (error) throw error;
    return true;
  }
  return false;
}

/* ── Fetch user like status ── */
export async function fetchUserLike(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId?: string,
  commentId?: string,
) {
  if (postId) {
    const { data, error } = await supabase
      .from("forum_likes")
      .select("user_id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  if (commentId) {
    const { data, error } = await supabase
      .from("forum_likes")
      .select("user_id")
      .eq("user_id", userId)
      .eq("comment_id", commentId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }
  return false;
}
