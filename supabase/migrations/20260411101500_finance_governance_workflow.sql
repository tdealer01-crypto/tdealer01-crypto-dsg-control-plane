create table if not exists public.finance_workflow_cases (
  id text primary key,
  org_id text not null,
  status text not null default 'pending',
  export_status text not null default 'Not ready',
  vendor text not null,
  amount numeric(14,2) not null default 0,
  currency text not null default 'USD',
  workflow text not null default 'Invoice approval governance',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_workflow_cases_status_chk check (status in ('pending', 'approved', 'rejected', 'escalated', 'compliance_review'))
);

create table if not exists public.finance_workflow_approvals (
  id text primary key,
  org_id text not null,
  case_id text not null references public.finance_workflow_cases(id) on delete cascade,
  vendor text not null,
  amount text not null,
  status text not null,
  risk text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_workflow_approvals_status_chk check (status in ('Needs approver', 'Exception open', 'Compliance review', 'approved', 'rejected', 'escalated'))
);

create table if not exists public.finance_workflow_action_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  case_id text,
  approval_id text,
  action text not null,
  message text not null,
  next_status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint finance_workflow_action_events_action_chk check (action in ('submit', 'approve', 'reject', 'escalate'))
);

create index if not exists idx_finance_workflow_cases_org_id_updated
  on public.finance_workflow_cases (org_id, updated_at desc);

create index if not exists idx_finance_workflow_approvals_org_id_status
  on public.finance_workflow_approvals (org_id, status, updated_at desc);

create index if not exists idx_finance_workflow_action_events_org_id_created
  on public.finance_workflow_action_events (org_id, created_at desc);
