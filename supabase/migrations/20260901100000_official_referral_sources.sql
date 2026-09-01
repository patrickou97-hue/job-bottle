-- Curated public referral codes published by StarJob itself.
-- This is intentionally separate from community referral_codes: no auth user
-- is impersonated, and the original platform/source URL remains auditable.

create table if not exists public.official_referral_sources (
  id uuid primary key default gen_random_uuid(),
  publisher_name text not null default '拾星小助手整理',
  company_name text not null,
  job_id uuid references public.jobs(id) on delete set null,
  applicable_roles text,
  code text not null,
  usage_note text,
  source_platform text not null,
  source_url text not null,
  published_at date,
  source_verified_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source_key text not null,
  constraint official_referral_sources_publisher_check check (publisher_name = '拾星小助手整理'),
  constraint official_referral_sources_company_length_check check (char_length(btrim(company_name)) between 1 and 80),
  constraint official_referral_sources_code_format_check check (code ~ '^[A-Za-z0-9_-]{2,64}={0,2}$'),
  constraint official_referral_sources_roles_length_check check (applicable_roles is null or char_length(applicable_roles) <= 160),
  constraint official_referral_sources_note_length_check check (usage_note is null or char_length(usage_note) <= 500),
  constraint official_referral_sources_platform_check check (source_platform in ('小红书', '牛客', '力扣')),
  constraint official_referral_sources_url_check check (source_url ~ '^https://'),
  constraint official_referral_sources_source_key_length_check check (char_length(source_key) between 32 and 128),
  constraint official_referral_sources_safe_text_check check (
    lower(coalesce(applicable_roles, '') || ' ' || coalesce(usage_note, ''))
      !~ '(微信|v信|qq|收费|付费|转账|红包|验证码|密码|身份证|银行卡)'
  )
);

create unique index if not exists official_referral_sources_source_key_unique
  on public.official_referral_sources (source_key);
create index if not exists official_referral_sources_company_active_idx
  on public.official_referral_sources (lower(company_name), is_active, source_verified_at desc);

drop trigger if exists official_referral_sources_set_updated_at on public.official_referral_sources;
create trigger official_referral_sources_set_updated_at
before update on public.official_referral_sources
for each row execute function public.set_updated_at();

alter table public.official_referral_sources enable row level security;

drop policy if exists "official_referral_sources_select_active" on public.official_referral_sources;
create policy "official_referral_sources_select_active"
on public.official_referral_sources for select
to anon, authenticated
using (is_active = true);

revoke all on table public.official_referral_sources from anon, authenticated;
grant select (
  id, publisher_name, company_name, job_id, applicable_roles, code, usage_note,
  source_platform, source_url, published_at, source_verified_at, is_active,
  created_at, updated_at
) on public.official_referral_sources to anon, authenticated;
grant select, insert, update, delete on public.official_referral_sources to service_role;
