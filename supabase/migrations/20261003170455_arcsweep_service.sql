-- ArcSweep is an advisory service. Only the service role can reach these tables/RPCs.
create table public.arcsweep_auth_codes (
 code_hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 challenge text not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.arcsweep_sessions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 access_hash text unique not null, refresh_hash text unique not null,
 access_expires_at timestamptz not null, refresh_expires_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.arcsweep_budgets (
 user_id uuid not null references auth.users(id) on delete cascade, day date not null,
 used integer not null default 0 check (used >= 0), minute timestamptz not null default now(),
 minute_used integer not null default 0, primary key(user_id,day)
);
create table public.arcsweep_requests (
 user_id uuid not null references auth.users(id) on delete cascade, request_id text not null,
 fingerprint text not null, state text not null check(state in ('pending','done','failed')),
 lease uuid not null, lease_until timestamptz not null, charged_day date not null,
 response jsonb, created_at timestamptz not null default now(), primary key(user_id,request_id)
);
-- These two user_id references do not lead their own primary/unique indexes;
-- index them so account deletion and per-user authorization-code cleanup stay bounded.
create index arcsweep_auth_codes_user_created_idx on public.arcsweep_auth_codes(user_id,created_at desc);
create index arcsweep_sessions_user_id_idx on public.arcsweep_sessions(user_id);
alter table public.arcsweep_auth_codes enable row level security;
alter table public.arcsweep_sessions enable row level security;
alter table public.arcsweep_budgets enable row level security;
alter table public.arcsweep_requests enable row level security;
revoke all on public.arcsweep_auth_codes, public.arcsweep_sessions, public.arcsweep_budgets, public.arcsweep_requests from anon, authenticated;
grant all on public.arcsweep_auth_codes, public.arcsweep_sessions, public.arcsweep_budgets, public.arcsweep_requests to service_role;

-- DELETE ... RETURNING claims a code exactly once, within the same transaction as session creation.
create function public.arcsweep_exchange(p_code text,p_challenge text,p_access text,p_refresh text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare u uuid;
begin
 delete from public.arcsweep_auth_codes where code_hash=p_code and challenge=p_challenge and expires_at>now() returning user_id into u;
 if u is null then return null; end if;
 insert into public.arcsweep_sessions(user_id,access_hash,refresh_hash,access_expires_at,refresh_expires_at)
 values(u,p_access,p_refresh,now()+interval '15 minutes',now()+interval '30 days');
 return u;
end $$;
create function public.arcsweep_refresh(p_user uuid,p_refresh text,p_access text,p_next_refresh text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare u uuid;
begin
 update public.arcsweep_sessions set access_hash=p_access,refresh_hash=p_next_refresh,
 access_expires_at=now()+interval '15 minutes'
 where user_id=p_user and refresh_hash=p_refresh and refresh_expires_at>now() returning user_id into u;
 return u;
end $$;

-- Per-user transaction lock coordinates budget, idempotency and leases across Vercel instances.
create function public.arcsweep_reserve(p_user uuid,p_request text,p_fingerprint text,p_lease uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r public.arcsweep_requests%rowtype; b public.arcsweep_budgets%rowtype; d date := (now() at time zone 'UTC')::date;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,917));
 select * into r from public.arcsweep_requests where user_id=p_user and request_id=p_request;
 if found then
  if r.fingerprint<>p_fingerprint then return jsonb_build_object('status','conflict'); end if;
  if r.state='done' then return jsonb_build_object('status','cached','response',r.response); end if;
  if r.state='pending' and r.lease_until>now() then return jsonb_build_object('status','busy'); end if;
  if r.state='pending' then
   update arcsweep_requests set lease=p_lease,lease_until=now()+interval '90 seconds' where user_id=p_user and request_id=p_request;
   return jsonb_build_object('status','reserved','day',r.charged_day);
  end if;
 end if;
 insert into public.arcsweep_budgets(user_id,day) values(p_user,d) on conflict do nothing;
 select * into b from public.arcsweep_budgets where user_id=p_user and day=d for update;
 if b.used>=100 then return jsonb_build_object('status','quota'); end if;
 if b.minute>now()-interval '1 minute' and b.minute_used>=6 then return jsonb_build_object('status','rate'); end if;
 update public.arcsweep_budgets set used=used+1,
 minute_used=case when minute<=now()-interval '1 minute' then 1 else minute_used+1 end,
 minute=case when minute<=now()-interval '1 minute' then now() else minute end where user_id=p_user and day=d;
 insert into public.arcsweep_requests(user_id,request_id,fingerprint,state,lease,lease_until,charged_day)
 values(p_user,p_request,p_fingerprint,'pending',p_lease,now()+interval '90 seconds',d)
 on conflict(user_id,request_id) do update set state='pending',lease=p_lease,lease_until=excluded.lease_until,charged_day=d;
 return jsonb_build_object('status','reserved','day',d);
end $$;
create function public.arcsweep_finish(p_user uuid,p_request text,p_lease uuid,p_response jsonb)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare d date;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,917));
 update public.arcsweep_requests set state=case when p_response is null then 'failed' else 'done' end,response=p_response
 where user_id=p_user and request_id=p_request and lease=p_lease and state='pending' returning charged_day into d;
 if d is null then return false; end if;
 if p_response is null then update public.arcsweep_budgets set used=greatest(0,used-1) where user_id=p_user and day=d; end if;
 return true;
end $$;
revoke all on function public.arcsweep_exchange(text,text,text,text),public.arcsweep_refresh(uuid,text,text,text),public.arcsweep_reserve(uuid,text,text,uuid),public.arcsweep_finish(uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.arcsweep_exchange(text,text,text,text),public.arcsweep_refresh(uuid,text,text,text),public.arcsweep_reserve(uuid,text,text,uuid),public.arcsweep_finish(uuid,text,uuid,jsonb) to service_role;
