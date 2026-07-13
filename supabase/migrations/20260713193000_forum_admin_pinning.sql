alter table public.forum_posts
  add column if not exists is_pinned boolean not null default false;

create index if not exists forum_posts_pinned_created_at_idx
  on public.forum_posts (is_pinned desc, created_at desc);

create or replace function public.protect_forum_post_pinning()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (
    (tg_op = 'INSERT' and new.is_pinned)
    or (tg_op = 'UPDATE' and new.is_pinned is distinct from old.is_pinned)
  ) and coalesce(auth.role(), '') <> 'service_role'
    and not public.is_admin()
  then
    raise exception 'Only administrators can change forum pinning.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function public.protect_forum_post_pinning() from public;

drop trigger if exists forum_posts_protect_pinning on public.forum_posts;
create trigger forum_posts_protect_pinning
before insert or update of is_pinned on public.forum_posts
for each row execute function public.protect_forum_post_pinning();
