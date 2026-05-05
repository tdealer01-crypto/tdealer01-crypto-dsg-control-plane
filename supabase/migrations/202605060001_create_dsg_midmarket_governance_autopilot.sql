-- DSG Mid-Market Governance Autopilot
-- Non-destructive migration. Tables are service-role/RBAC owned by default.

create table if not exists public.dsg_midmarket_autopilot_assessments (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  customer_name text,
  company_size text not null default 'mid-market',
  automation_mode text not null check (automation_mode in ('shadow', 'gated', 'autopilot')),
  request_payload jsonb not null,
  result_payload jsonb not null,
  decision text not null check (decision in ('PASS', 'REVIEW', 'BLOCK')),
  overall_risk text not null check (overall_risk in ('low', 'medium', 'high', 'critical')),
  value_score integer not null check (value_score >= 0 and value_score <= 100),
  request_hash text not null,
  decision_hash text not null unique,
  created_by text not null default 'system',
  created_at timestamptz not null default now()
);

create index if not exists idx_dsg_midmarket_assessments_workspace_created
  on public.dsg_midmarket_autopilot_assessments (workspace_id, created_at desc);

create index if not exists idx_dsg_midmarket_assessments_decision
  on public.dsg_midmarket_autopilot_assessments (decision, overall_risk);

create table if not exists public.dsg_midmarket_runtime_monitor_bindings (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  assessment_id uuid references public.dsg_midmarket_autopilot_assessments(id) on delete cascade,
  monitor_title text not null,
  metric text not null,
  threshold text not null,
  action text not null check (action in ('observe', 'review', 'block')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_dsg_midmarket_monitor_bindings_workspace
  on public.dsg_midmarket_runtime_monitor_bindings (workspace_id, is_active);

alter table public.dsg_midmarket_autopilot_assessments enable row level security;
alter table public.dsg_midmarket_runtime_monitor_bindings enable row level security;

comment on table public.dsg_midmarket_autopilot_assessments is
  'DB-backed source of truth for DSG mid-market governance autopilot assessments. No customer-system mutation is executed by this table.';

comment on table public.dsg_midmarket_runtime_monitor_bindings is
  'Runtime monitor card bindings generated from mid-market governance autopilot assessments.';
