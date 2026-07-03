-- Discussion Forum Schema
-- Run after schema.sql (profiles table must exist)

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default '讨论',
  tags text[] default '{}',
  like_count int not null default 0,
  comment_count int not null default 0,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forum_posts_category_check check (category in ('讨论', '经验', '求助', '分享'))
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_likes (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid references public.forum_posts(id) on delete cascade,
  comment_id uuid references public.forum_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint forum_likes_target_check check (
    (post_id is not null and comment_id is null) or
    (post_id is null and comment_id is not null)
  ),
  unique(user_id, post_id),
  unique(user_id, comment_id)
);

-- Indexes
create index if not exists forum_posts_created_at_idx
  on public.forum_posts (created_at desc);

create index if not exists forum_posts_category_idx
  on public.forum_posts (category);

create index if not exists forum_posts_user_id_idx
  on public.forum_posts (user_id);

create index if not exists forum_comments_post_id_created_at_idx
  on public.forum_comments (post_id, created_at);

create index if not exists forum_comments_user_id_idx
  on public.forum_comments (user_id);

-- updated_at triggers
drop trigger if exists forum_posts_set_updated_at on public.forum_posts;
create trigger forum_posts_set_updated_at
before update on public.forum_posts
for each row execute function public.set_updated_at();

drop trigger if exists forum_comments_set_updated_at on public.forum_comments;
create trigger forum_comments_set_updated_at
before update on public.forum_comments
for each row execute function public.set_updated_at();

-- RLS
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_likes enable row level security;

-- forum_posts: everyone can read
create policy "forum_posts_select_public"
  on public.forum_posts for select
  using (true);

-- forum_posts: authenticated can insert (own user_id)
create policy "forum_posts_insert_own"
  on public.forum_posts for insert
  to authenticated
  with check (user_id = auth.uid());

-- forum_posts: own user can update own posts
create policy "forum_posts_update_own"
  on public.forum_posts for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- forum_posts: own user can delete own posts
create policy "forum_posts_delete_own"
  on public.forum_posts for delete
  to authenticated
  using (user_id = auth.uid());

-- forum_comments: everyone can read
create policy "forum_comments_select_public"
  on public.forum_comments for select
  using (true);

-- forum_comments: authenticated can insert (own user_id)
create policy "forum_comments_insert_own"
  on public.forum_comments for insert
  to authenticated
  with check (user_id = auth.uid());

-- forum_comments: own user can update own comments
create policy "forum_comments_update_own"
  on public.forum_comments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- forum_comments: own user can delete own comments
create policy "forum_comments_delete_own"
  on public.forum_comments for delete
  to authenticated
  using (user_id = auth.uid());

-- forum_likes: everyone can read
create policy "forum_likes_select_public"
  on public.forum_likes for select
  using (true);

-- forum_likes: authenticated can insert own
create policy "forum_likes_insert_own"
  on public.forum_likes for insert
  to authenticated
  with check (user_id = auth.uid());

-- forum_likes: own user can delete own likes
create policy "forum_likes_delete_own"
  on public.forum_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- Functions to maintain like_count and comment_count
create or replace function public.forum_comments_count_trigger()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.forum_posts set comment_count = comment_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' then
    update public.forum_posts set comment_count = greatest(comment_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists forum_comments_count on public.forum_comments;
create trigger forum_comments_count
after insert or delete on public.forum_comments
for each row execute function public.forum_comments_count_trigger();

create or replace function public.forum_post_likes_count_trigger()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.post_id is not null then
    update public.forum_posts set like_count = like_count + 1 where id = NEW.post_id;
  elsif TG_OP = 'DELETE' and OLD.post_id is not null then
    update public.forum_posts set like_count = greatest(like_count - 1, 0) where id = OLD.post_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists forum_post_likes_count on public.forum_likes;
create trigger forum_post_likes_count
after insert or delete on public.forum_likes
for each row execute function public.forum_post_likes_count_trigger();

create or replace function public.forum_comment_likes_count_trigger()
returns trigger as $$
begin
  if TG_OP = 'INSERT' and NEW.comment_id is not null then
    update public.forum_comments set like_count = like_count + 1 where id = NEW.comment_id;
  elsif TG_OP = 'DELETE' and OLD.comment_id is not null then
    update public.forum_comments set like_count = greatest(like_count - 1, 0) where id = OLD.comment_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists forum_comment_likes_count on public.forum_likes;
create trigger forum_comment_likes_count
after insert or delete on public.forum_likes
for each row execute function public.forum_comment_likes_count_trigger();
