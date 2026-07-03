alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.user_applications enable row level security;

drop policy if exists "company_logos_select_public" on storage.objects;
create policy "company_logos_select_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'company-logos');

drop policy if exists "company_logos_insert_admin" on storage.objects;
create policy "company_logos_insert_admin"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'company-logos' and public.is_admin());

drop policy if exists "company_logos_update_admin" on storage.objects;
create policy "company_logos_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'company-logos' and public.is_admin())
with check (bucket_id = 'company-logos' and public.is_admin());

drop policy if exists "company_logos_delete_admin" on storage.objects;
create policy "company_logos_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'company-logos' and public.is_admin());

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles_select_admin_all" on public.profiles;
create policy "profiles_select_admin_all"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "profiles_insert_own_user" on public.profiles;
create policy "profiles_insert_own_user"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() and role = 'user');

drop policy if exists "profiles_update_own_display_name" on public.profiles;
create policy "profiles_update_own_display_name"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = (
    select role
    from public.profiles current_profile
    where current_profile.id = auth.uid()
  )
);

drop policy if exists "jobs_select_active" on public.jobs;
create policy "jobs_select_active"
on public.jobs
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "jobs_select_admin_all" on public.jobs;
create policy "jobs_select_admin_all"
on public.jobs
for select
to authenticated
using (public.is_admin());

drop policy if exists "jobs_insert_admin" on public.jobs;
create policy "jobs_insert_admin"
on public.jobs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "jobs_update_admin" on public.jobs;
create policy "jobs_update_admin"
on public.jobs
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "jobs_delete_admin" on public.jobs;
create policy "jobs_delete_admin"
on public.jobs
for delete
to authenticated
using (public.is_admin());

drop policy if exists "user_applications_select_own" on public.user_applications;
create policy "user_applications_select_own"
on public.user_applications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_applications_insert_own" on public.user_applications;
create policy "user_applications_insert_own"
on public.user_applications
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "user_applications_update_own" on public.user_applications;
create policy "user_applications_update_own"
on public.user_applications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "user_applications_delete_own" on public.user_applications;
create policy "user_applications_delete_own"
on public.user_applications
for delete
to authenticated
using (user_id = auth.uid());
