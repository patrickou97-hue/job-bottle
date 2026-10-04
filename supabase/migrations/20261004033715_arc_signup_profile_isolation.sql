-- Preserve the shared Auth identity while keeping new Arc-only signups out of
-- the StarJob job-seeker profile table. This metadata selects data placement
-- only; it is user-editable and must never authorize access or privileges.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.raw_user_meta_data->>'account_surface' = 'arc' then
    return new;
  end if;

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
