create or replace function public.job_merge_fingerprint(
  p_company_name text,
  p_apply_url text,
  p_job_titles text,
  p_locations text,
  p_batch_type text
)
returns text
language sql
immutable
as $$
  select concat_ws(
    '||',
    lower(regexp_replace(trim(coalesce(p_company_name, '')), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(regexp_replace(coalesce(p_apply_url, ''), '/+$', '')), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(coalesce(p_job_titles, '')), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(coalesce(p_locations, '')), '\s+', ' ', 'g')),
    lower(regexp_replace(trim(coalesce(p_batch_type, '')), '\s+', ' ', 'g'))
  );
$$;

create or replace function public.application_status_rank(p_status text)
returns integer
language sql
immutable
as $$
  select case p_status
    when 'offer' then 8
    when 'final_round' then 7
    when 'second_round' then 6
    when 'first_round' then 5
    when 'written_test' then 4
    when 'applied' then 3
    when 'opened' then 2
    when 'withdrawn' then 1
    when 'rejected' then 1
    else 0
  end;
$$;

create or replace function public.merge_duplicate_jobs()
returns table (
  groups_merged integer,
  jobs_removed integer,
  applications_moved integer,
  applications_removed integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  duplicate_group record;
  keeper_id uuid;
  duplicate_ids uuid[];
  duplicate_application record;
  keeper_application record;
  next_groups_merged integer := 0;
  next_jobs_removed integer := 0;
  next_applications_moved integer := 0;
  next_applications_removed integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Only admins can merge duplicate jobs';
  end if;

  for duplicate_group in
    select
      public.job_merge_fingerprint(company_name, apply_url, job_titles, locations, batch_type) as fingerprint,
      array_agg(id order by is_active desc, updated_at desc, created_at asc) as job_ids
    from public.jobs
    group by public.job_merge_fingerprint(company_name, apply_url, job_titles, locations, batch_type)
    having count(*) > 1
  loop
    keeper_id := duplicate_group.job_ids[1];
    duplicate_ids := duplicate_group.job_ids[2:array_length(duplicate_group.job_ids, 1)];
    next_groups_merged := next_groups_merged + 1;
    next_jobs_removed := next_jobs_removed + coalesce(array_length(duplicate_ids, 1), 0);

    for duplicate_application in
      select *
      from public.user_applications
      where job_id = any(duplicate_ids)
    loop
      select *
      into keeper_application
      from public.user_applications
      where user_id = duplicate_application.user_id
        and job_id = keeper_id
      limit 1;

      if not found then
        update public.user_applications
        set job_id = keeper_id,
            updated_at = greatest(public.user_applications.updated_at, duplicate_application.updated_at)
        where id = duplicate_application.id;
        next_applications_moved := next_applications_moved + 1;
      else
        if public.application_status_rank(duplicate_application.status) > public.application_status_rank(keeper_application.status)
          or (
            public.application_status_rank(duplicate_application.status) = public.application_status_rank(keeper_application.status)
            and duplicate_application.updated_at > keeper_application.updated_at
          ) then
          update public.user_applications
          set status = duplicate_application.status,
              progress_note = coalesce(duplicate_application.progress_note, keeper_application.progress_note),
              updated_at = greatest(duplicate_application.updated_at, keeper_application.updated_at)
          where id = keeper_application.id;
        end if;

        delete from public.user_applications
        where id = duplicate_application.id;
        next_applications_removed := next_applications_removed + 1;
      end if;
    end loop;

    update public.resumes
    set linked_job_id = keeper_id,
        updated_at = now()
    where linked_job_id = any(duplicate_ids);

    delete from public.jobs
    where id = any(duplicate_ids);
  end loop;

  groups_merged := next_groups_merged;
  jobs_removed := next_jobs_removed;
  applications_moved := next_applications_moved;
  applications_removed := next_applications_removed;
  return next;
  return;
end;
$$;
