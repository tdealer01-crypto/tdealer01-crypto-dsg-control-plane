create table if not exists dsg_crud_proof_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  org_id uuid not null,
  title text not null,
  done boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dsg_crud_proof_tasks_workspace_idx
  on dsg_crud_proof_tasks (workspace_id);

create index if not exists dsg_crud_proof_tasks_org_idx
  on dsg_crud_proof_tasks (org_id);
