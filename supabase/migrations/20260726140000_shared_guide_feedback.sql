alter table public.forum_posts
  add column if not exists platform_visibility text not null default 'both';

update public.forum_posts
set platform_visibility = 'both'
where platform_visibility is null;

alter table public.forum_posts
  drop constraint if exists forum_posts_platform_visibility_check,
  add constraint forum_posts_platform_visibility_check
    check (platform_visibility in ('both', 'web', 'miniprogram'));

create index if not exists forum_posts_visibility_pinned_created_idx
  on public.forum_posts (platform_visibility, is_pinned desc, created_at desc);

create table if not exists public.feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  platform text not null,
  category text not null,
  content text not null,
  contact_email text,
  fingerprint_hash text not null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint feedback_submissions_platform_check
    check (platform in ('web', 'miniprogram')),
  constraint feedback_submissions_category_length_check
    check (char_length(category) between 1 and 40),
  constraint feedback_submissions_content_length_check
    check (char_length(content) between 5 and 5000),
  constraint feedback_submissions_contact_length_check
    check (contact_email is null or char_length(contact_email) <= 160)
);

alter table public.feedback_submissions enable row level security;

revoke all on table public.feedback_submissions from anon, authenticated;
grant all on table public.feedback_submissions to service_role;

create index if not exists feedback_submissions_created_idx
  on public.feedback_submissions (created_at desc);

create index if not exists feedback_submissions_user_created_idx
  on public.feedback_submissions (user_id, created_at desc)
  where user_id is not null;

create index if not exists feedback_submissions_fingerprint_created_idx
  on public.feedback_submissions (fingerprint_hash, created_at desc);

create or replace function public.merge_wechat_user_into_email_user(
  source_user_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if source_user_id = target_user_id then
    return true;
  end if;

  if not exists (
    select 1 from public.wechat_identities where user_id = source_user_id
  ) then
    return false;
  end if;

  if exists (
    select 1 from public.wechat_identities where user_id = target_user_id
  ) then
    return false;
  end if;

  update public.user_applications source_application
  set user_id = target_user_id
  where source_application.user_id = source_user_id
    and not exists (
      select 1
      from public.user_applications target_application
      where target_application.user_id = target_user_id
        and target_application.job_id = source_application.job_id
    );

  delete from public.user_applications
  where user_id = source_user_id;

  update public.resumes
  set user_id = target_user_id
  where user_id = source_user_id;

  update public.feedback_submissions
  set user_id = target_user_id
  where user_id = source_user_id;

  update public.profiles target_profile
  set display_name = coalesce(nullif(target_profile.display_name, ''), source_profile.display_name),
      phone = coalesce(nullif(target_profile.phone, ''), source_profile.phone),
      city = coalesce(nullif(target_profile.city, ''), source_profile.city),
      school = coalesce(nullif(target_profile.school, ''), source_profile.school),
      major = coalesce(nullif(target_profile.major, ''), source_profile.major),
      graduation_year = coalesce(nullif(target_profile.graduation_year, ''), source_profile.graduation_year),
      preferred_regions = case
        when cardinality(target_profile.preferred_regions) = 0 then source_profile.preferred_regions
        else target_profile.preferred_regions
      end,
      target_roles = case
        when cardinality(target_profile.target_roles) = 0 then source_profile.target_roles
        else target_profile.target_roles
      end,
      updated_at = now()
  from public.profiles source_profile
  where target_profile.id = target_user_id
    and source_profile.id = source_user_id;

  update public.wechat_identities
  set user_id = target_user_id,
      updated_at = now(),
      last_login_at = now()
  where user_id = source_user_id;

  update public.miniprogram_sessions
  set revoked_at = coalesce(revoked_at, now())
  where user_id = source_user_id;

  delete from public.profiles where id = source_user_id;
  return true;
end;
$$;

revoke all on function public.merge_wechat_user_into_email_user(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.merge_wechat_user_into_email_user(uuid, uuid)
  to service_role;
