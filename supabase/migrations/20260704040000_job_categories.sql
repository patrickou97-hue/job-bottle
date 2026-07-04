alter table public.jobs
  add column if not exists job_categories text[] not null default '{}';

create index if not exists jobs_job_categories_gin_idx
  on public.jobs using gin (job_categories);

create or replace function public.normalize_job_categories_from_titles(value text)
returns text[]
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  token text;
  normalized text;
  result text[] := '{}';
  has_unknown boolean := false;
begin
  for token in
    select trim(part)
    from regexp_split_to_table(coalesce(value, ''), '[,，]') as part
  loop
    normalized := trim(
      regexp_replace(
        regexp_replace(token, '（[^）]*）', '', 'g'),
        '\([^)]*\)',
        '',
        'g'
      )
    );

    if normalized = '' then
      continue;
    elsif normalized in (
      '软件研发类',
      '硬件工程类',
      '产品类',
      '运营类',
      '市场类',
      '销售类',
      '生产制造类',
      '财务类',
      '人力类',
      '职能类',
      '设计类',
      '管培生',
      '教师类',
      '咨询类',
      '其他'
    ) then
      result := array_append(result, normalized);
    elsif normalized = '软件研发' then
      result := array_append(result, '软件研发类');
    elsif normalized = '硬件工程' then
      result := array_append(result, '硬件工程类');
    elsif normalized = '产品' then
      result := array_append(result, '产品类');
    elsif normalized = '运营' then
      result := array_append(result, '运营类');
    elsif normalized = '市场' then
      result := array_append(result, '市场类');
    elsif normalized = '销售' then
      result := array_append(result, '销售类');
    elsif normalized = '生产制造' then
      result := array_append(result, '生产制造类');
    elsif normalized = '财务' then
      result := array_append(result, '财务类');
    elsif normalized = '人力' then
      result := array_append(result, '人力类');
    elsif normalized = '职能' then
      result := array_append(result, '职能类');
    elsif normalized = '设计' then
      result := array_append(result, '设计类');
    elsif normalized = '教师' then
      result := array_append(result, '教师类');
    elsif normalized = '咨询' then
      result := array_append(result, '咨询类');
    else
      has_unknown := true;
    end if;
  end loop;

  select coalesce(array_agg(distinct item), '{}')
  into result
  from unnest(result) as item;

  if has_unknown and not ('其他' = any(result)) then
    result := array_append(result, '其他');
  end if;

  return coalesce(result, '{}');
end;
$$;

update public.jobs
set job_categories = public.normalize_job_categories_from_titles(job_titles)
where coalesce(array_length(job_categories, 1), 0) = 0;

drop function public.normalize_job_categories_from_titles(text);
