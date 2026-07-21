-- Allow one complete resume import and multi-section polish workflow in a
-- single session while keeping the durable per-user ten-minute window.
create or replace function public.take_resume_ai_rate_slot()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_user_id uuid := auth.uid();
  active_count int;
begin
  if current_user_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(current_user_id::text, 0));

  delete from public.resume_ai_rate_events
  where user_id = current_user_id
    and created_at < now() - interval '10 minutes';

  select count(*) into active_count
  from public.resume_ai_rate_events
  where user_id = current_user_id
    and created_at >= now() - interval '10 minutes';

  if active_count >= 15 then
    return false;
  end if;

  insert into public.resume_ai_rate_events (user_id) values (current_user_id);
  return true;
end;
$$;

revoke all on function public.take_resume_ai_rate_slot() from public;
grant execute on function public.take_resume_ai_rate_slot() to authenticated;
