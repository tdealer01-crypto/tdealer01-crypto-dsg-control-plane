create table if not exists public.finance_transactions (
  id text primary key,
  org_id text not null,
  workflow_case_id text,
  vendor text not null,
  amount numeric(14,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_approval_requests (
  id text primary key,
  org_id text not null,
  transaction_id text not null references public.finance_transactions(id) on delete cascade,
  status text not null default 'pending',
  risk text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_approval_steps (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null references public.finance_approval_requests(id) on delete cascade,
  step_order int not null,
  approver_role text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create table if not exists public.finance_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null references public.finance_approval_requests(id) on delete cascade,
  decision text not null,
  reason text,
  actor text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_exceptions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null references public.finance_approval_requests(id) on delete cascade,
  status text not null default 'open',
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.finance_evidence_bundles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null references public.finance_approval_requests(id) on delete cascade,
  status text not null default 'ready',
  uri text,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_export_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  bundle_id uuid references public.finance_evidence_bundles(id) on delete set null,
  destination text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

insert into public.finance_transactions (id, org_id, workflow_case_id, vendor, amount, currency, status)
select c.id, c.org_id, c.id, c.vendor, c.amount, c.currency, c.status
from public.finance_workflow_cases c
on conflict (id) do nothing;

insert into public.finance_approval_requests (id, org_id, transaction_id, status, risk)
select a.id, a.org_id, a.case_id, a.status, a.risk
from public.finance_workflow_approvals a
where exists (select 1 from public.finance_transactions t where t.id = a.case_id)
on conflict (id) do nothing;
