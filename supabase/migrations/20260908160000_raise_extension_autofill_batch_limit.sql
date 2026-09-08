begin;

alter table public.extension_autofill_rate_operations
  drop constraint if exists extension_autofill_rate_operations_batch_count_check;

alter table public.extension_autofill_rate_operations
  add constraint extension_autofill_rate_operations_batch_count_check
  check (batch_count between 1 and 100);

create or replace function public.take_extension_autofill_rate_slot(
  p_user_id uuid,
  p_operation_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_batch_count smallint;
  active_operation_count integer;
  active_batch_count integer;
  operation_exists boolean;
  operation_active boolean;
begin
  if p_user_id is null or p_operation_id is null then
    return false;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  delete from public.extension_autofill_rate_batches
  where user_id = p_user_id
    and created_at < now() - interval '10 minutes';

  delete from public.extension_autofill_rate_operations as operation
  where operation.user_id = p_user_id
    and operation.updated_at < now() - interval '7 days'
    and not exists (
      select 1
      from public.extension_autofill_rate_batches as batch
      where batch.user_id = operation.user_id
        and batch.operation_id = operation.operation_id
    );

  select batch_count into current_batch_count
  from public.extension_autofill_rate_operations
  where user_id = p_user_id
    and operation_id = p_operation_id
  for update;
  operation_exists := found;

  select count(distinct operation_id)::integer, count(*)::integer
  into active_operation_count, active_batch_count
  from public.extension_autofill_rate_batches
  where user_id = p_user_id
    and created_at >= now() - interval '10 minutes';

  select exists (
    select 1
    from public.extension_autofill_rate_batches
    where user_id = p_user_id
      and operation_id = p_operation_id
      and created_at >= now() - interval '10 minutes'
  ) into operation_active;

  if operation_exists then
    -- Requests are serialized per user. Batch 100 is accepted from a count of
    -- 99; batch 101 observes 100 and fails without calling the model.
    if current_batch_count >= 100
      or active_batch_count >= 100
      or (not operation_active and active_operation_count >= 5) then
      return false;
    end if;

    update public.extension_autofill_rate_operations
    set batch_count = batch_count + 1,
        updated_at = now()
    where user_id = p_user_id
      and operation_id = p_operation_id;

    insert into public.extension_autofill_rate_batches (user_id, operation_id)
    values (p_user_id, p_operation_id);
    return true;
  end if;

  if active_operation_count >= 5 or active_batch_count >= 100 then
    return false;
  end if;

  insert into public.extension_autofill_rate_operations (
    user_id,
    operation_id,
    batch_count
  ) values (
    p_user_id,
    p_operation_id,
    1
  );

  insert into public.extension_autofill_rate_batches (user_id, operation_id)
  values (p_user_id, p_operation_id);
  return true;
end;
$$;

revoke all on function public.take_extension_autofill_rate_slot(uuid, uuid) from public, anon, authenticated;
grant execute on function public.take_extension_autofill_rate_slot(uuid, uuid) to service_role;

commit;
