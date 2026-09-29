-- Extend one application row into a private dossier that can also represent
-- an externally captured job. Existing catalog-backed rows remain unchanged.

alter table public.user_applications
  alter column job_id drop not null,
  add column if not exists job_snapshot jsonb,
  add column if not exists resume_snapshot jsonb,
  add column if not exists form_answers jsonb not null default '[]'::jsonb,
  add column if not exists material_records jsonb not null default '[]'::jsonb;

alter table public.user_applications
  drop constraint if exists user_applications_dossier_shape_check,
  add constraint user_applications_dossier_shape_check check (
    (job_id is not null or (
      jsonb_typeof(job_snapshot) = 'object'
      and char_length(coalesce(job_snapshot->>'company_name', '')) between 1 and 120
      and char_length(coalesce(job_snapshot->>'job_titles', '')) between 1 and 240
    ))
    and (job_snapshot is null or (
      jsonb_typeof(job_snapshot) = 'object'
      and char_length(job_snapshot::text) <= 60000
    ))
    and (resume_snapshot is null or (
      jsonb_typeof(resume_snapshot) = 'object'
      and char_length(resume_snapshot::text) <= 160000
    ))
    and jsonb_typeof(form_answers) = 'array'
    and jsonb_array_length(form_answers) <= 20
    and char_length(form_answers::text) <= 120000
    and jsonb_typeof(material_records) = 'array'
    and jsonb_array_length(material_records) <= 20
    and char_length(material_records::text) <= 60000
  );

create unique index if not exists user_applications_user_external_url_uidx
  on public.user_applications (user_id, lower(job_snapshot->>'source_url'))
  where job_id is null and nullif(btrim(job_snapshot->>'source_url'), '') is not null;

comment on column public.user_applications.job_snapshot is
  'Private point-in-time job details; required for user-captured jobs with no catalog job_id.';
comment on column public.user_applications.resume_snapshot is
  'Point-in-time structured resume and template captured for this application.';
comment on column public.user_applications.form_answers is
  'User-confirmed application question and answer pairs.';
comment on column public.user_applications.material_records is
  'User-entered metadata for additional materials used in this application; files are not stored.';
