-- Keep the catalog job separate from the exact position the user applied for.
-- This is optional so existing applications remain readable without backfill.

alter table public.user_applications
  add column if not exists applied_position text;

alter table public.user_applications
  drop constraint if exists user_applications_applied_position_length_check,
  add constraint user_applications_applied_position_length_check
    check (applied_position is null or char_length(applied_position) <= 160);
