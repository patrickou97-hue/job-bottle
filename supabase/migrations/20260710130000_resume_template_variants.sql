-- Extend the cloud resume enum-like check after the original repair migration
-- has already been applied in a hosted Supabase project.
alter table if exists public.resumes
  drop constraint if exists resumes_template_id_check;

alter table if exists public.resumes
  add constraint resumes_template_id_check
  check (template_id in ('compact', 'classic', 'modern', 'minimal', 'executive'));
