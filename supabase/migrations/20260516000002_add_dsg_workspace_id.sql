-- Link each organization to its DSG One v1 workspace
alter table public.organizations
  add column if not exists dsg_workspace_id uuid;
