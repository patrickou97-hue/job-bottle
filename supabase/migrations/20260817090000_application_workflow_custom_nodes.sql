-- Each company can have its own application track. Canonical status remains
-- the reporting/history compatibility layer for existing clients.

alter table public.user_applications
  add column if not exists workflow_nodes jsonb,
  add column if not exists workflow_node_id text;

alter table public.user_applications
  drop constraint if exists user_applications_workflow_nodes_shape_check,
  add constraint user_applications_workflow_nodes_shape_check check (
    workflow_nodes is null
    or (
      jsonb_typeof(workflow_nodes) = 'array'
      and jsonb_array_length(workflow_nodes) between 2 and 12
    )
  ),
  drop constraint if exists user_applications_workflow_node_id_length_check,
  add constraint user_applications_workflow_node_id_length_check
    check (workflow_node_id is null or char_length(workflow_node_id) <= 80);

create index if not exists user_applications_user_workflow_node_idx
  on public.user_applications (user_id, workflow_node_id)
  where workflow_node_id is not null;
