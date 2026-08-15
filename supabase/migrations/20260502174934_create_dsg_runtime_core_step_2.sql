create extension if not exists pgcrypto;

create or replace function public.dsg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.dsg_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dsg_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  actor_id text not null,
  role text not null check (role in ('OWNER','ADMIN','OPERATOR','AUDITOR','VIEWER')),
  created_at timestamptz not null default now(),
  unique (workspace_id, actor_id)
);

create table if not exists public.dsg_runtime_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  goal text not null,
  success_criteria jsonb not null default '[]'::jsonb,
  status text not null default 'QUEUED' check (status in ('QUEUED','GOAL_LOCKED','INSPECTING','PLANNING','WAITING_PERMISSION','WAITING_APPROVAL','RUNNING','VERIFYING','PASSED','BLOCKED','FAILED','KILLED','COMPLETED','RESET')),
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  current_wave_id text,
  current_step_id text,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  input_lock_id uuid,
  completion_report_id uuid,
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.dsg_input_locks (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  input_hash text not null,
  canonical_input jsonb not null,
  locked_by text not null,
  created_at timestamptz not null default now(),
  unique (job_id)
);

create table if not exists public.dsg_task_plans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  plan_hash text not null,
  tasks jsonb not null default '[]'::jsonb,
  dependency_edges jsonb not null default '[]'::jsonb,
  status text not null default 'DRAFT' check (status in ('DRAFT','READY','BLOCKED','APPROVED','REJECTED')),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (job_id, plan_hash)
);

create table if not exists public.dsg_wave_plans (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  task_plan_id uuid not null references public.dsg_task_plans(id) on delete cascade,
  wave_hash text not null,
  waves jsonb not null default '[]'::jsonb,
  current_wave_index integer not null default 0,
  status text not null default 'READY' check (status in ('READY','RUNNING','BLOCKED','PASSED','FAILED')),
  created_at timestamptz not null default now(),
  unique (job_id, wave_hash)
);

create table if not exists public.dsg_runtime_events (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  event_type text not null,
  message text not null,
  actor_id text not null,
  risk_level text not null default 'LOW' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dsg_approvals (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  step_id text not null,
  requested_by text not null,
  decided_by text,
  decision text not null default 'PENDING' check (decision in ('PENDING','APPROVED','REJECTED','EXPIRED')),
  reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.dsg_evidence_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  evidence_type text not null,
  uri text,
  content_hash text not null,
  summary text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique (job_id, content_hash)
);

create table if not exists public.dsg_evidence_manifests (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  manifest_hash text not null,
  evidence_ids uuid[] not null default array[]::uuid[],
  status text not null default 'DRAFT' check (status in ('DRAFT','COMPLETE','BLOCKED')),
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (job_id, manifest_hash)
);

create table if not exists public.dsg_audit_ledger (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.dsg_runtime_jobs(id) on delete set null,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  actor_id text not null,
  action text not null,
  decision text not null check (decision in ('PASS','BLOCK','REVIEW','UNSUPPORTED')),
  previous_hash text,
  current_hash text not null,
  evidence_ids uuid[] not null default array[]::uuid[],
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, current_hash)
);

create table if not exists public.dsg_audit_exports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  export_hash text not null,
  ledger_entry_ids uuid[] not null default array[]::uuid[],
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (job_id, export_hash)
);

create table if not exists public.dsg_replay_proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  replay_hash text not null,
  status text not null check (status in ('PASS','BLOCK','FAILED')),
  checked_by text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (job_id, replay_hash)
);

create table if not exists public.dsg_completion_reports (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null unique references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  claim_status text not null check (claim_status in ('BUILDABLE','IMPLEMENTED','VERIFIED','DEPLOYABLE','PRODUCTION','BLOCKED')),
  evidence_manifest_id uuid references public.dsg_evidence_manifests(id) on delete restrict,
  audit_export_id uuid references public.dsg_audit_exports(id) on delete restrict,
  replay_proof_id uuid references public.dsg_replay_proofs(id) on delete restrict,
  block_reasons text[] not null default array[]::text[],
  report_hash text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.dsg_connectors (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  provider text not null,
  name text not null,
  risk_level text not null default 'MEDIUM' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  auth_type text not null default 'NONE',
  config jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dsg_tool_registry (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  connector_id uuid references public.dsg_connectors(id) on delete cascade,
  tool_name text not null,
  description text not null,
  method text,
  path text,
  risk_level text not null default 'MEDIUM' check (risk_level in ('LOW','MEDIUM','HIGH','CRITICAL')),
  requires_approval boolean not null default true,
  schema jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workspace_id, tool_name)
);

create table if not exists public.dsg_deployment_proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  environment text not null,
  deployment_url text not null,
  proof_hash text not null,
  status text not null check (status in ('PASS','BLOCK','FAILED')),
  checked_by text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.dsg_production_flow_proofs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.dsg_runtime_jobs(id) on delete cascade,
  workspace_id uuid not null references public.dsg_workspaces(id) on delete cascade,
  flow_name text not null,
  proof_hash text not null,
  status text not null check (status in ('PASS','BLOCK','FAILED')),
  checked_by text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_dsg_runtime_jobs_workspace on public.dsg_runtime_jobs(workspace_id, created_at desc);
create index if not exists idx_dsg_runtime_events_job on public.dsg_runtime_events(job_id, created_at desc);
create index if not exists idx_dsg_audit_ledger_workspace on public.dsg_audit_ledger(workspace_id, created_at desc);
create index if not exists idx_dsg_evidence_items_job on public.dsg_evidence_items(job_id, created_at desc);
create index if not exists idx_dsg_tool_registry_workspace on public.dsg_tool_registry(workspace_id, tool_name);

create or replace function public.dsg_current_actor_id()
returns text
language sql
stable
as $$
  select coalesce(auth.uid()::text, current_setting('request.jwt.claim.sub', true), current_setting('request.jwt.claims', true)::jsonb->>'sub')
$$;

create or replace function public.dsg_is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.dsg_workspace_members m
    where m.workspace_id = target_workspace_id
      and m.actor_id = public.dsg_current_actor_id()
  )
$$;

create or replace function public.dsg_compute_audit_hash(
  previous_hash text,
  actor_id text,
  action text,
  decision text,
  payload jsonb
)
returns text
language sql
immutable
as $$
  select 'sha256:' || encode(digest(coalesce(previous_hash, '') || '|' || actor_id || '|' || action || '|' || decision || '|' || payload::text, 'sha256'), 'hex')
$$;

alter table public.dsg_workspaces enable row level security;
alter table public.dsg_workspace_members enable row level security;
alter table public.dsg_runtime_jobs enable row level security;
alter table public.dsg_input_locks enable row level security;
alter table public.dsg_task_plans enable row level security;
alter table public.dsg_wave_plans enable row level security;
alter table public.dsg_runtime_events enable row level security;
alter table public.dsg_approvals enable row level security;
alter table public.dsg_evidence_items enable row level security;
alter table public.dsg_evidence_manifests enable row level security;
alter table public.dsg_audit_ledger enable row level security;
alter table public.dsg_audit_exports enable row level security;
alter table public.dsg_replay_proofs enable row level security;
alter table public.dsg_completion_reports enable row level security;
alter table public.dsg_connectors enable row level security;
alter table public.dsg_tool_registry enable row level security;
alter table public.dsg_deployment_proofs enable row level security;
alter table public.dsg_production_flow_proofs enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'dsg_runtime_jobs','dsg_input_locks','dsg_task_plans','dsg_wave_plans','dsg_runtime_events','dsg_approvals','dsg_evidence_items','dsg_evidence_manifests','dsg_audit_ledger','dsg_audit_exports','dsg_replay_proofs','dsg_completion_reports','dsg_connectors','dsg_tool_registry','dsg_deployment_proofs','dsg_production_flow_proofs'
  ] loop
    execute format('drop policy if exists "dsg_workspace_member_select" on public.%I', t);
    execute format('create policy "dsg_workspace_member_select" on public.%I for select to authenticated using (public.dsg_is_workspace_member(workspace_id))', t);
  end loop;
end $$;

drop policy if exists "dsg_workspace_member_self_select" on public.dsg_workspace_members;
create policy "dsg_workspace_member_self_select" on public.dsg_workspace_members
for select to authenticated
using (actor_id = public.dsg_current_actor_id());

drop policy if exists "dsg_workspace_select_for_members" on public.dsg_workspaces;
create policy "dsg_workspace_select_for_members" on public.dsg_workspaces
for select to authenticated
using (public.dsg_is_workspace_member(id));

drop trigger if exists trg_dsg_workspaces_touch on public.dsg_workspaces;
create trigger trg_dsg_workspaces_touch before update on public.dsg_workspaces for each row execute function public.dsg_touch_updated_at();

drop trigger if exists trg_dsg_runtime_jobs_touch on public.dsg_runtime_jobs;
create trigger trg_dsg_runtime_jobs_touch before update on public.dsg_runtime_jobs for each row execute function public.dsg_touch_updated_at();

drop trigger if exists trg_dsg_connectors_touch on public.dsg_connectors;
create trigger trg_dsg_connectors_touch before update on public.dsg_connectors for each row execute function public.dsg_touch_updated_at();;
