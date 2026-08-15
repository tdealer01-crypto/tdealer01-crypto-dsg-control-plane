create extension if not exists pgcrypto;

create table if not exists public.dsg_app_builder_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dsg_app_builder_jobs_status_check check (status in (
    'DRAFT',
    'GOAL_LOCKED',
    'PRD_READY',
    'PLAN_READY',
    'WAITING_APPROVAL',
    'APPROVED',
    'READY_FOR_RUNTIME',
    'ENVIRONMENT_READY',
    'EXECUTING',
    'PR_CREATED',
    'REJECTED',
    'BLOCKED',
    'FAILED',
    'COMPLETED'
  )),
  constraint dsg_app_builder_jobs_claim_status_check check (claim_status in (
    'NOT_STARTED',
    'PLANNED_ONLY',
    'APPROVED_ONLY',
    'ENVIRONMENT_READY',
    'IMPLEMENTED_UNVERIFIED',
    'PREVIEW_READY',
    'DEPLOYABLE',
    'PRODUCTION_BLOCKED',
    'PRODUCTION_VERIFIED'
  ))
);

create index if not exists dsg_app_builder_jobs_workspace_created_idx
  on public.dsg_app_builder_jobs(workspace_id, created_at desc);

create index if not exists dsg_app_builder_jobs_status_idx
  on public.dsg_app_builder_jobs(status);

alter table public.dsg_app_builder_jobs enable row level security;

create table if not exists public.dsg_app_builder_approvals (
  id uuid primary key default gen_random_uuid(),
  app_builder_job_id uuid not null references public.dsg_app_builder_jobs(id) on delete cascade,
  workspace_id text not null,
  decision text not null check (decision in ('APPROVE', 'REJECT', 'REQUEST_CHANGES')),
  decided_by text not null,
  reason text,
  plan_hash text,
  approval_hash text,
  gate_result jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dsg_app_builder_approvals_job_created_idx
  on public.dsg_app_builder_approvals(app_builder_job_id, created_at desc);

alter table public.dsg_app_builder_approvals enable row level security;

create table if not exists public.dsg_app_builder_tool_audits (
  id uuid primary key default gen_random_uuid(),
  app_builder_job_id uuid not null references public.dsg_app_builder_jobs(id) on delete cascade,
  workspace_id text not null,
  actor_id text not null,
  tool_name text not null,
  outcome text not null,
  evidence_refs jsonb not null default '[]'::jsonb,
  audit_event jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists dsg_app_builder_tool_audits_job_created_idx
  on public.dsg_app_builder_tool_audits(app_builder_job_id, created_at desc);

alter table public.dsg_app_builder_tool_audits enable row level security;

select pg_notify('pgrst', 'reload schema');;
