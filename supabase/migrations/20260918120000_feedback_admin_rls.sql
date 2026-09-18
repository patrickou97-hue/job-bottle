-- Feedback is written through the caller-scoped admin client. Keep the
-- service-role insert path, but let an authenticated admin read and resolve
-- rows only when the same database-side admin guard passes.
grant select on table public.feedback_submissions to authenticated;
grant update (resolved_at) on table public.feedback_submissions to authenticated;

drop policy if exists feedback_admin_select on public.feedback_submissions;
create policy feedback_admin_select
  on public.feedback_submissions
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists feedback_admin_update on public.feedback_submissions;
create policy feedback_admin_update
  on public.feedback_submissions
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
