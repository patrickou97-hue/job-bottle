alter table public.profiles
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists school text,
  add column if not exists major text,
  add column if not exists graduation_year text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id,
    display_name,
    phone,
    city,
    school,
    major,
    graduation_year,
    preferred_regions,
    target_roles,
    role
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), '秋招用户'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    nullif(new.raw_user_meta_data->>'city', ''),
    nullif(new.raw_user_meta_data->>'school', ''),
    nullif(new.raw_user_meta_data->>'major', ''),
    nullif(new.raw_user_meta_data->>'graduation_year', ''),
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
