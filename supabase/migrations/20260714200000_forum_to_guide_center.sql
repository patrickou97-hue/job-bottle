begin;

-- “求职社区”改为管理员策展的“拾星指南”。先清理非管理员内容；
-- 关联评论、点赞和举报通过外键级联删除。
delete from public.forum_posts post
where not exists (
  select 1
  from public.profiles profile
  where profile.id = post.user_id
    and profile.role = 'admin'
);

-- 指南不再承载社区互动，管理员历史内容上的互动也一并清空。
delete from public.forum_likes;
delete from public.forum_comments;
delete from public.reports;

update public.forum_posts
set category = case
  when category in ('经验', '分享') then '分享'
  when category = '求助' then '教程'
  else '公告'
end,
like_count = 0,
comment_count = 0;

-- 给现有官方内容建立清晰的首批栏目，避免迁移后全部堆在“分享”。
update public.forum_posts
set category = case
  when title like '%使用指南%' then '教程'
  when title like '%更新日志%' or title like '%项目说明%' or title like '%使用须知%' then '公告'
  else category
end;

-- 保留下来的管理员教程可能仍描述已经下线的社区互动。保留有效正文，
-- 同时把这些历史段落改成当前只读指南的说明。
update public.forum_posts
set content = replace(content,
  '4. 求职社区：阅读经验、提问、评论和分享。',
  '4. 拾星指南：查看产品公告、使用教程和求职经验。')
where content like '%4. 求职社区：阅读经验、提问、评论和分享。%';

update public.forum_posts
set content = replace(content,
  '六、求职社区：阅读、交流和分享经验',
  '六、拾星指南：查看公告、教程和经验分享')
where content like '%六、求职社区：阅读、交流和分享经验%';

update public.forum_posts
set content = replace(content,
  '求职社区目前提供讨论、经验、求助和分享四个分类。',
  '拾星指南目前提供公告、教程和分享三个分类，内容由拾星官方持续维护。')
where content like '%求职社区目前提供讨论、经验、求助和分享四个分类。%';

update public.forum_posts
set content = replace(content,
  '点击帖子后，正文和评论会在当前位置展开。登录后可以点赞、评论，也可以删除自己发布的评论。',
  '点击内容后，正文会在当前位置展开，便于连续阅读。')
where content like '%点击帖子后，正文和评论会在当前位置展开。登录后可以点赞、评论，也可以删除自己发布的评论。%';

update public.forum_posts
set content = replace(content,
  '发布帖子时，可以填写标题、分类、正文和标签。作者可以继续编辑自己的帖子，修改后原有的发布时间、点赞、评论和置顶状态会保留。',
  '公告、教程和经验分享由管理员统一发布、编辑和维护。')
where content like '%发布帖子时，可以填写标题、分类、正文和标签。作者可以继续编辑自己的帖子，修改后原有的发布时间、点赞、评论和置顶状态会保留。%';

update public.forum_posts
set content = replace(content,
  '为了保护隐私，普通用户的社区名称会经过脱敏处理，个人资料不会因为展示作者名称而被公开读取。',
  '指南仅展示拾星官方发布的内容，不开放普通用户发帖。')
where content like '%为了保护隐私，普通用户的社区名称会经过脱敏处理，个人资料不会因为展示作者名称而被公开读取。%';

update public.forum_posts
set content = replace(content,
  '管理员可以同时置顶多篇重要内容，例如新手指南、产品更新、社区规则和招聘提醒。',
  '管理员可以重点推荐多篇重要内容，例如新手指南、产品更新和招聘提醒。')
where content like '%管理员可以同时置顶多篇重要内容，例如新手指南、产品更新、社区规则和招聘提醒。%';

update public.forum_posts
set content = replace(content,
  '8. 在社区阅读经验、提出问题，也可以分享自己的复盘。',
  '8. 在拾星指南查看公告、教程和经验分享。')
where content like '%8. 在社区阅读经验、提出问题，也可以分享自己的复盘。%';

alter table public.forum_posts
  drop constraint if exists forum_posts_category_check;

alter table public.forum_posts
  add constraint forum_posts_category_check
  check (category in ('公告', '教程', '分享'));

create or replace function public.enforce_guide_admin_author()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.user_id and role = 'admin'
  ) then
    raise exception 'Only administrators can publish guide content.';
  end if;
  new.like_count := 0;
  new.comment_count := 0;
  return new;
end;
$$;

revoke all on function public.enforce_guide_admin_author() from public;

drop trigger if exists forum_posts_enforce_guide_admin on public.forum_posts;
create trigger forum_posts_enforce_guide_admin
before insert or update on public.forum_posts
for each row execute function public.enforce_guide_admin_author();

drop policy if exists "forum_posts_insert_own" on public.forum_posts;
drop policy if exists "forum_posts_update_own" on public.forum_posts;
drop policy if exists "forum_posts_delete_own" on public.forum_posts;
drop policy if exists "forum_posts_delete_admin" on public.forum_posts;
drop policy if exists "forum_posts_insert_admin" on public.forum_posts;
drop policy if exists "forum_posts_update_admin" on public.forum_posts;
drop policy if exists "forum_posts_delete_admin_only" on public.forum_posts;

create policy "forum_posts_insert_admin"
on public.forum_posts for insert
to authenticated
with check ((select auth.uid()) = user_id and public.is_admin());

create policy "forum_posts_update_admin"
on public.forum_posts for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "forum_posts_delete_admin_only"
on public.forum_posts for delete
to authenticated
using (public.is_admin());

-- 旧互动表保留是为了兼容历史迁移和外键，但不再允许新增、修改或删除。
drop policy if exists "forum_comments_insert_own" on public.forum_comments;
drop policy if exists "forum_comments_update_own" on public.forum_comments;
drop policy if exists "forum_comments_delete_own" on public.forum_comments;
drop policy if exists "forum_comments_delete_admin" on public.forum_comments;
drop policy if exists "forum_likes_insert_own" on public.forum_likes;
drop policy if exists "forum_likes_delete_own" on public.forum_likes;

commit;
