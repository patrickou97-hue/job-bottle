-- Separate candidate intent from application progress and add structured follow-up fields.

alter table public.user_applications
  add column if not exists candidate_stage text,
  add column if not exists priority smallint not null default 0,
  add column if not exists saved_at timestamptz,
  add column if not exists application_channel text,
  add column if not exists application_account text,
  add column if not exists contact_name text,
  add column if not exists next_action text,
  add column if not exists next_action_at timestamptz,
  add column if not exists resume_id uuid references public.resumes(id) on delete set null,
  add column if not exists custom_stage_label text,
  add column if not exists review_note text;

-- Existing opened rows came from the former "start applying" action, so retain
-- that meaning. New rows explicitly start in evaluating.
update public.user_applications
set candidate_stage = 'preparing'
where candidate_stage is null;

update public.user_applications
set saved_at = coalesce(applied_at, updated_at, now())
where saved_at is null;

alter table public.user_applications
  alter column candidate_stage set default 'evaluating',
  alter column candidate_stage set not null,
  alter column saved_at set default now(),
  alter column saved_at set not null,
  alter column applied_at drop default,
  alter column applied_at drop not null;

-- opened means the user has not confirmed an application yet.
update public.user_applications
set applied_at = null
where status = 'opened';

alter table public.user_applications
  drop constraint if exists user_applications_candidate_stage_check,
  add constraint user_applications_candidate_stage_check
    check (candidate_stage in ('evaluating', 'saved', 'preparing')),
  drop constraint if exists user_applications_priority_check,
  add constraint user_applications_priority_check
    check (priority between 0 and 3),
  drop constraint if exists user_applications_workflow_text_length_check,
  add constraint user_applications_workflow_text_length_check
    check (
      (application_channel is null or char_length(application_channel) <= 80)
      and (application_account is null or char_length(application_account) <= 160)
      and (contact_name is null or char_length(contact_name) <= 120)
      and (next_action is null or char_length(next_action) <= 300)
      and (custom_stage_label is null or char_length(custom_stage_label) <= 40)
      and (review_note is null or char_length(review_note) <= 3000)
    );

create index if not exists user_applications_user_candidate_priority_idx
  on public.user_applications (user_id, candidate_stage, priority desc, updated_at desc);

create index if not exists user_applications_user_next_action_idx
  on public.user_applications (user_id, next_action_at)
  where next_action_at is not null;

create or replace function public.set_application_applied_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status <> 'opened' and new.applied_at is null then
    new.applied_at = now();
  elsif new.status = 'opened' then
    new.applied_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists user_applications_set_applied_at on public.user_applications;
create trigger user_applications_set_applied_at
before insert or update of status on public.user_applications
for each row execute function public.set_application_applied_at();
