import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ForumPost, Profile } from "@/lib/types";

export type GuidePlatform = "web" | "miniprogram";

export async function getGuidePosts(platform: GuidePlatform, limit = 100) {
  const admin = createAdminClient();
  const { data: posts, error } = await admin
    .from("forum_posts")
    .select("*")
    .in("platform_visibility", ["both", platform])
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw error;
  if (!posts?.length) return [];

  const authorIds = [...new Set(posts.map((post) => post.user_id))];
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id,role")
    .in("id", authorIds);
  if (profileError) throw profileError;
  const adminIds = new Set(
    (profiles as Pick<Profile, "id" | "role">[])
      .filter((profile) => profile.role === "admin")
      .map((profile) => profile.id),
  );
  return (posts as ForumPost[])
    .filter((post) => adminIds.has(post.user_id))
    .map((post) => ({
      ...post,
      author_name: "拾星官方",
      author_role: "admin" as const,
      like_count: 0,
      comment_count: 0,
    }));
}
