create table if not exists dsg_app_builder_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  created_by text not null,
  status text not null default 'DRAFT',
  claim_status text not null default 'NOT_STARTED',
  goal jsonb,
  prd jsonb,
  proposed_plan jsonb,
  gate_result jsonb,
  approved_plan jsonb,
  plan_hash text,
  approval_hash text,
  runtime_job_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dsg_app_builder_jobs_status_check check (
    status in (
      'DRAFT', 'GOAL_LOCKED', 'PRD_READY', 'PLAN_READY',
      'WAITING_APPROVAL', 'APPROVED', 'READY_FOR_RUNTIME',
      'REJECTED', 'BLOCKED', 'FAILED', 'COMPLETED'
    )
  ),
  constraint dsg_app_builder_jobs_claim_status_check check (
    claim_status in (
      'NOT_STARTED', 'PLANNED_ONLY', 'APPROVED_ONLY',
      'PREVIEW_READY', 'DEPLOYABLE', 'PRODUCTION_BLOCKED',
      'PRODUCTION_VERIFIED'
    )
  )
);

create index if not exists dsg_app_builder_jobs_workspace_id_idx
  on dsg_app_builder_jobs(workspace_id);

create index if not exists dsg_app_builder_jobs_status_idx
  on dsg_app_builder_jobs(status);

create index if not exists dsg_app_builder_jobs_plan_hash_idx
  on dsg_app_builder_jobs(plan_hash);

create table if not exists dsg_app_builder_approvals (
  id uuid primary key default gen_random_uuid(),
  app_builder_job_id uuid not null references dsg_app_builder_jobs(id) on delete cascade,
  workspace_id uuid not null,
  decision text not null,
  decided_by text not null,
  reason text,
  plan_hash text,
  approval_hash text,
  gate_result jsonb,
  created_at timestamptz not null default now(),
  constraint dsg_app_builder_approvals_decision_check check (
    decision in ('APPROVE', 'REJECT', 'REQUEST_CHANGES')
  )
);

create index if not exists dsg_app_builder_approvals_job_id_idx
  on dsg_app_builder_approvals(app_builder_job_id);

create index if not exists dsg_app_builder_approvals_workspace_id_idx
  on dsg_app_builder_approvals(workspace_id);

create index if not exists dsg_app_builder_approvals_plan_hash_idx
  on dsg_app_builder_approvals(plan_hash);

alter table dsg_app_builder_jobs enable row level security;
alter table dsg_app_builder_approvals enable row level security;

comment on table dsg_app_builder_jobs is
  'DSG App Builder Step 15 planning source of truth. Runtime execution starts in Step 16.';

comment on table dsg_app_builder_approvals is
  'DSG App Builder approval ledger with plan hash and approval hash.';
