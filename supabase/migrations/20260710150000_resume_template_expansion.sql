-- Add three role-oriented layouts while preserving every historical template ID.
alter table if exists public.resumes
  drop constraint if exists resumes_template_id_check;

alter table if exists public.resumes
  add constraint resumes_template_id_check
  check (template_id in (
    'compact', 'classic', 'modern',
    'consulting', 'technical', 'academic',
    'english_classic', 'english_modern',
    'minimal', 'executive'
  ));
