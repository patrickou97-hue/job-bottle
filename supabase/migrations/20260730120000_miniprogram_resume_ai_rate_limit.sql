-- The native WeChat client uses a StarJob access token rather than a Supabase
-- browser session. Allow the service-role API bridge to consume the same
-- durable per-user resume AI quota without exposing this function to clients.
create or replace function public.take_resume_ai_rate_slot_for_user(
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_count int;
begin
  if target_user_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_user_id::text, 0));

  delete from public.resume_ai_rate_events
  where user_id = target_user_id
    and created_at < now() - interval '10 minutes';

  select count(*) into active_count
  from public.resume_ai_rate_events
  where user_id = target_user_id
    and created_at >= now() - interval '10 minutes';

  if active_count >= 15 then
    return false;
  end if;

  insert into public.resume_ai_rate_events (user_id) values (target_user_id);
  return true;
end;
$$;

revoke all on function public.take_resume_ai_rate_slot_for_user(uuid) from public;
grant execute on function public.take_resume_ai_rate_slot_for_user(uuid) to service_role;
