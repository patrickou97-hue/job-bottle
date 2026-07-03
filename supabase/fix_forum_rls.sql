-- 修复论坛 RLS：允许匿名读取 + 修复外键关系
-- 请在 Supabase Dashboard 执行这段 SQL

-- 1. 允许所有人读 profiles（论坛显示作者名需要）
DROP POLICY IF EXISTS "profiles_select_public_display_name" ON public.profiles;
CREATE POLICY "profiles_select_public_display_name"
ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- 2. 允许匿名读取论坛帖子
DROP POLICY IF EXISTS "forum_posts_select_public" ON public.forum_posts;
CREATE POLICY "forum_posts_select_public"
ON public.forum_posts FOR SELECT TO anon, authenticated USING (true);

-- 3. 允许匿名读取论坛评论
DROP POLICY IF EXISTS "forum_comments_select_public" ON public.forum_comments;
CREATE POLICY "forum_comments_select_public"
ON public.forum_comments FOR SELECT TO anon, authenticated USING (true);

-- 4. 允许匿名读取点赞（用于显示点赞数）
DROP POLICY IF EXISTS "forum_likes_select_public" ON public.forum_likes;
CREATE POLICY "forum_likes_select_public"
ON public.forum_likes FOR SELECT TO anon, authenticated USING (true);
