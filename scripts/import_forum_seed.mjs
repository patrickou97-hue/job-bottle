import { readFile } from "node:fs/promises";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const seedPath = process.argv[2];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!seedPath) {
  throw new Error("用法：node scripts/import_forum_seed.mjs <forum_seed.sql>");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，无法安全导入论坛数据。",
  );
}

const sql = await readFile(seedPath, "utf8");
const importedAt = new Date();

function decodeSqlText(value) {
  return value.replaceAll("''", "'");
}

function parseTags(value) {
  return Array.from(value.matchAll(/'((?:''|[^'])*)'/g), (match) =>
    decodeSqlText(match[1]),
  );
}

function timestampFromInterval(value) {
  const match = value.match(
    /^(\d+) days (\d+) hours (\d+) minutes$/,
  );

  if (!match) {
    throw new Error(`无法解析时间间隔：${value}`);
  }

  const [, days, hours, minutes] = match.map(Number);
  const milliseconds =
    (((days * 24 + hours) * 60 + minutes) * 60) * 1000;

  return new Date(importedAt.getTime() - milliseconds).toISOString();
}

const postPattern =
  /insert into public\.forum_posts[\s\S]*?select '([^']+)', id, '((?:''|[^'])*)', '((?:''|[^'])*)', '((?:''|[^'])*)', ARRAY\[([\s\S]*?)\], (\d+), (\d+), (true|false), now\(\) - interval '([^']+)', now\(\) - interval '([^']+)'\s+from auth\.users where raw_user_meta_data->>'username' = '(\d{5})';/g;

const commentPattern =
  /insert into public\.forum_comments[\s\S]*?select '([^']+)', '([^']+)', id, '((?:''|[^'])*)', (\d+), now\(\) - interval '([^']+)', now\(\) - interval '([^']+)'\s+from auth\.users where raw_user_meta_data->>'username' = '(\d{5})';/g;

const parsedPosts = Array.from(sql.matchAll(postPattern), (match) => ({
  id: match[1],
  username: match[11],
  title: decodeSqlText(match[2]),
  content: decodeSqlText(match[3]),
  category: decodeSqlText(match[4]),
  tags: parseTags(match[5]),
  like_count: Number(match[6]),
  comment_count: Number(match[7]),
  is_pinned: match[8] === "true",
  created_at: timestampFromInterval(match[9]),
  updated_at: timestampFromInterval(match[10]),
}));

const parsedComments = Array.from(sql.matchAll(commentPattern), (match) => ({
  id: match[1],
  post_id: match[2],
  username: match[7],
  content: decodeSqlText(match[3]),
  like_count: Number(match[4]),
  created_at: timestampFromInterval(match[5]),
  updated_at: timestampFromInterval(match[6]),
}));

const expectedPostCount = (sql.match(/insert into public\.forum_posts/g) ?? [])
  .length;
const expectedCommentCount = (
  sql.match(/insert into public\.forum_comments/g) ?? []
).length;

if (
  parsedPosts.length !== expectedPostCount ||
  parsedComments.length !== expectedCommentCount
) {
  throw new Error(
    `种子 SQL 未完整解析：帖子 ${parsedPosts.length}/${expectedPostCount}，评论 ${parsedComments.length}/${expectedCommentCount}`,
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const usersByUsername = new Map();
let page = 1;

while (true) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: 1000,
  });

  if (error) throw error;

  for (const user of data.users) {
    const username = user.user_metadata?.username;
    if (typeof username === "string") {
      usersByUsername.set(username, user.id);
    }
  }

  if (data.users.length < 1000) break;
  page += 1;
}

const referencedUsernames = new Set([
  ...parsedPosts.map((post) => post.username),
  ...parsedComments.map((comment) => comment.username),
]);
const missingUsernames = [...referencedUsernames].filter(
  (username) => !usersByUsername.has(username),
);

if (missingUsernames.length > 0) {
  throw new Error(`以下账号尚未创建：${missingUsernames.join(", ")}`);
}

const posts = parsedPosts.map(({ username, ...post }) => ({
  ...post,
  user_id: usersByUsername.get(username),
}));
const comments = parsedComments.map(({ username, ...comment }) => ({
  ...comment,
  user_id: usersByUsername.get(username),
}));

const { error: postError } = await supabase
  .from("forum_posts")
  .upsert(posts, { onConflict: "id" });

if (postError) throw postError;

const { error: commentError } = await supabase
  .from("forum_comments")
  .upsert(comments, { onConflict: "id" });

if (commentError) throw commentError;

const postIds = posts.map((post) => post.id);
const commentIds = comments.map((comment) => comment.id);
const likeFilters = [`post_id.in.(${postIds.join(",")})`];
if (commentIds.length > 0) likeFilters.push(`comment_id.in.(${commentIds.join(",")})`);
const [storedCommentsResult, storedLikesResult] = await Promise.all([
  supabase
    .from("forum_comments")
    .select("id,post_id")
    .in("post_id", postIds),
  supabase
    .from("forum_likes")
    .select("post_id,comment_id")
    .or(likeFilters.join(",")),
]);

if (storedCommentsResult.error) throw storedCommentsResult.error;
if (storedLikesResult.error) throw storedLikesResult.error;

const storedComments = storedCommentsResult.data ?? [];
const storedLikes = storedLikesResult.data ?? [];
const countUpdates = [
  ...posts.map((post) =>
    supabase
      .from("forum_posts")
      .update({
        comment_count: storedComments.filter((comment) => comment.post_id === post.id).length,
        like_count: storedLikes.filter((like) => like.post_id === post.id).length,
      })
      .eq("id", post.id),
  ),
  ...comments.map((comment) =>
    supabase
      .from("forum_comments")
      .update({
        like_count: storedLikes.filter((like) => like.comment_id === comment.id).length,
      })
      .eq("id", comment.id),
  ),
];
const countResults = await Promise.all(countUpdates);
const countError = countResults.find((result) => result.error)?.error;
if (countError) throw countError;

const [{ count: postCount, error: postCountError }, { count: commentCount, error: commentCountError }] =
  await Promise.all([
    supabase
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .in("id", postIds),
    supabase
      .from("forum_comments")
      .select("id", { count: "exact", head: true })
      .in("id", commentIds),
  ]);

if (postCountError) throw postCountError;
if (commentCountError) throw commentCountError;

if (postCount !== posts.length || commentCount !== comments.length) {
  throw new Error(
    `导入后核验失败：帖子 ${postCount}/${posts.length}，评论 ${commentCount}/${comments.length}`,
  );
}

process.stdout.write(
  `${JSON.stringify({ posts: postCount, comments: commentCount, users: referencedUsernames.size })}\n`,
);
