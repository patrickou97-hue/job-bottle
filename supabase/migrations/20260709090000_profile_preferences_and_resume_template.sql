alter table public.profiles
  add column if not exists preferred_regions text[] not null default '{}',
  add column if not exists target_roles text[] not null default '{}';

alter table public.resumes
  alter column template_id set default 'compact';

alter table public.resumes
  drop constraint if exists resumes_template_id_check;

alter table public.resumes
  add constraint resumes_template_id_check
  check (template_id in ('compact', 'classic', 'modern'));

create index if not exists profiles_preferred_regions_idx
  on public.profiles using gin (preferred_regions);

create index if not exists profiles_target_roles_idx
  on public.profiles using gin (target_roles);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, preferred_regions, target_roles, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), '秋招用户'),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'preferred_regions', '[]'::jsonb))),
      '{}'
    ),
    coalesce(
      array(select jsonb_array_elements_text(coalesce(new.raw_user_meta_data->'target_roles', '[]'::jsonb))),
      '{}'
    ),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
