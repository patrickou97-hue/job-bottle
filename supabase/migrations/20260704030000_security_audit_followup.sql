create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  );
$$;

alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;

alter table public.forum_posts
  drop constraint if exists forum_posts_content_length_check;

alter table public.forum_posts
  add constraint forum_posts_content_length_check
  check (char_length(content) <= 5000)
  not valid;

alter table public.forum_comments
  drop constraint if exists forum_comments_content_length_check;

alter table public.forum_comments
  add constraint forum_comments_content_length_check
  check (char_length(content) <= 5000)
  not valid;

drop policy if exists "forum_posts_select_public" on public.forum_posts;
create policy "forum_posts_select_public"
on public.forum_posts
for select
to anon, authenticated
using (true);

drop policy if exists "forum_posts_insert_own" on public.forum_posts;
create policy "forum_posts_insert_own"
on public.forum_posts
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(content) <= 5000
);

drop policy if exists "forum_posts_update_own" on public.forum_posts;
create policy "forum_posts_update_own"
on public.forum_posts
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  (user_id = auth.uid() or public.is_admin())
  and char_length(content) <= 5000
);

drop policy if exists "forum_posts_delete_own" on public.forum_posts;
create policy "forum_posts_delete_own"
on public.forum_posts
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "forum_posts_delete_admin" on public.forum_posts;

drop policy if exists "forum_comments_select_public" on public.forum_comments;
create policy "forum_comments_select_public"
on public.forum_comments
for select
to anon, authenticated
using (true);

drop policy if exists "forum_comments_insert_own" on public.forum_comments;
create policy "forum_comments_insert_own"
on public.forum_comments
for insert
to authenticated
with check (
  user_id = auth.uid()
  and char_length(content) <= 5000
);

drop policy if exists "forum_comments_update_own" on public.forum_comments;
create policy "forum_comments_update_own"
on public.forum_comments
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (
  (user_id = auth.uid() or public.is_admin())
  and char_length(content) <= 5000
);

drop policy if exists "forum_comments_delete_own" on public.forum_comments;
create policy "forum_comments_delete_own"
on public.forum_comments
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "forum_comments_delete_admin" on public.forum_comments;

with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, job_id
      order by updated_at desc, applied_at desc, id desc
    ) as duplicate_rank
  from public.user_applications
)
delete from public.user_applications applications
using ranked
where applications.id = ranked.id
  and ranked.duplicate_rank > 1;

do $$
declare
  user_col smallint;
  job_col smallint;
  has_unique_pair boolean;
begin
  select attnum into user_col
  from pg_attribute
  where attrelid = 'public.user_applications'::regclass
    and attname = 'user_id'
    and not attisdropped;

  select attnum into job_col
  from pg_attribute
  where attrelid = 'public.user_applications'::regclass
    and attname = 'job_id'
    and not attisdropped;

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_applications'::regclass
      and contype = 'u'
      and conkey::smallint[] @> array[user_col, job_col]::smallint[]
      and array_length(conkey, 1) = 2
  ) into has_unique_pair;

  if not has_unique_pair then
    create unique index if not exists user_applications_user_job_uidx
      on public.user_applications (user_id, job_id);

    alter table public.user_applications
      add constraint user_applications_user_job_unique
      unique using index user_applications_user_job_uidx;
  end if;
end $$;
