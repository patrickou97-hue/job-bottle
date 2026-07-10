-- Consolidate overlapping Chinese variants and add two English no-photo layouts.
-- Keep old IDs in the check only so existing rows remain readable and can be
-- normalized in the client without a destructive data rewrite.
alter table if exists public.resumes
  drop constraint if exists resumes_template_id_check;

alter table if exists public.resumes
  add constraint resumes_template_id_check
  check (template_id in (
    'compact', 'classic', 'modern', 'english_classic', 'english_modern',
    'minimal', 'executive'
  ));
