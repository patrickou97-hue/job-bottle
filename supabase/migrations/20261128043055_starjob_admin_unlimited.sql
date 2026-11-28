-- Service-side identity lookup also supports the authenticated mini-program bridge.
create function public.starjob_admin_unlimited(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = p_user_id and p.role = 'admin'
      and (u.banned_until is null or u.banned_until <= now())
      and not exists (select 1 from public.admin_user_mutation_guards g where g.target_user_id = p.id)
  );
$$;
revoke all on function public.starjob_admin_unlimited(uuid) from public, anon, authenticated;
grant execute on function public.starjob_admin_unlimited(uuid) to service_role;

alter function public.starjob_vip_available_uses(uuid) rename to starjob_vip_metered_status;
create function public.starjob_vip_available_uses(p_user_id uuid)
returns jsonb language sql stable set search_path = '' as $$
  select case when public.starjob_admin_unlimited(p_user_id) then jsonb_build_object(
    'active', true, 'plan', 'full', 'unlimited', true,
    'basicHourlyRemaining', 0, 'basicWeeklyRemaining', 0, 'composeRemaining', 0,
    'composeWeeklyRemaining', 0, 'advancedHourlyRemaining', 0, 'advancedWeeklyRemaining', 0,
    'composeResetAt', null, 'weeklyResetAt', null, 'advancedHourlyResetAt', null
  ) else public.starjob_vip_metered_status(p_user_id) end;
$$;

alter function public.reserve_starjob_vip_use(uuid,uuid,text) rename to reserve_starjob_vip_metered_use;
create function public.reserve_starjob_vip_use(p_user_id uuid, p_id uuid, p_task text)
returns text language plpgsql set search_path = '' as $$
begin
  if p_id is null or p_task is null or p_task not in ('compose','advanced','flash','standard') then
    raise exception 'Invalid VIP task';
  end if;
  if public.starjob_admin_unlimited(p_user_id) then return 'unlimited'; end if;
  return public.reserve_starjob_vip_metered_use(p_user_id, p_id, p_task);
end;
$$;
revoke all on function public.starjob_vip_available_uses(uuid), public.reserve_starjob_vip_use(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.starjob_vip_available_uses(uuid), public.reserve_starjob_vip_use(uuid,uuid,text) to service_role;

create or replace function public.claim_my_starjob_vip_free() returns boolean
language sql security definer set search_path = '' as $$
  select case when public.starjob_admin_unlimited(auth.uid()) then true
    else public.claim_starjob_vip_free(auth.uid()) end;
$$;

-- The two chat assistants and resume import share this rate limiter.
alter function public.take_resume_ai_rate_slot_for_user(uuid) rename to take_resume_ai_metered_slot;
create function public.take_resume_ai_rate_slot_for_user(target_user_id uuid)
returns boolean language sql security definer set search_path = '' as $$
  select case when public.starjob_admin_unlimited(target_user_id) then true
    else public.take_resume_ai_metered_slot(target_user_id) end;
$$;
revoke all on function public.take_resume_ai_rate_slot_for_user(uuid), public.take_resume_ai_metered_slot(uuid) from public, anon, authenticated;
grant execute on function public.take_resume_ai_rate_slot_for_user(uuid), public.take_resume_ai_metered_slot(uuid) to service_role;
create or replace function public.take_resume_ai_rate_slot() returns boolean
language sql security definer set search_path = '' as $$
  select public.take_resume_ai_rate_slot_for_user(auth.uid());
$$;
