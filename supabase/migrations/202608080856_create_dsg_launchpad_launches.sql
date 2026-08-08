create table if not exists dsg_launchpad_launches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  created_by text not null,
  sections jsonb not null default '[]'::jsonb,
  source text not null default 'DSG_LAUNCHPAD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dsg_launchpad_launches_name_check check (
    char_length(btrim(name)) between 1 and 200
  ),
  constraint dsg_launchpad_launches_sections_array_check check (
    jsonb_typeof(sections) = 'array'
  )
);

create index if not exists dsg_launchpad_launches_workspace_updated_idx
  on dsg_launchpad_launches(workspace_id, updated_at desc);

create index if not exists dsg_launchpad_launches_created_by_idx
  on dsg_launchpad_launches(created_by);

alter table dsg_launchpad_launches enable row level security;

comment on table dsg_launchpad_launches is
  'Workspace-scoped persistent storage for DSG LaunchPad project launch checklists. Access is mediated by verified DSG API routes; direct anonymous access is denied by RLS.';

comment on column dsg_launchpad_launches.sections is
  'Checklist sections/items persisted as JSONB using the LaunchPad client data model.';
