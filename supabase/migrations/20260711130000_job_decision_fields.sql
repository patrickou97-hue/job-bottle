-- Add optional, source-backed JD sections without rewriting existing notes.

alter table public.jobs
  add column if not exists responsibilities text,
  add column if not exists must_have text,
  add column if not exists preferred_qualifications text,
  add column if not exists keywords text[] not null default '{}';

alter table public.jobs
  drop constraint if exists jobs_decision_text_length_check,
  add constraint jobs_decision_text_length_check
    check (
      (responsibilities is null or char_length(responsibilities) <= 12000)
      and (must_have is null or char_length(must_have) <= 8000)
      and (preferred_qualifications is null or char_length(preferred_qualifications) <= 8000)
      and cardinality(keywords) <= 40
    );

create index if not exists jobs_keywords_idx on public.jobs using gin (keywords);
