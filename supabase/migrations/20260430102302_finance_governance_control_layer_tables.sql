create table if not exists public.finance_transactions (
  id text primary key,
  org_id text not null,
  workflow_case_id text,
  vendor text not null default 'Unknown vendor',
  amount numeric not null default 0,
  currency text not null default 'USD',
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_approval_requests (
  id text primary key,
  org_id text not null,
  transaction_id text not null references public.finance_transactions(id) on delete cascade,
  status text not null default 'Needs approver',
  risk text not null default 'medium',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_approval_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null references public.finance_approval_requests(id) on delete cascade,
  decision text not null,
  reason text,
  actor text not null default 'api',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint finance_approval_decisions_decision_chk
    check (decision in ('approve', 'reject', 'escalate', 'submit'))
);

create index if not exists idx_finance_transactions_org_created
  on public.finance_transactions (org_id, created_at desc);

create index if not exists idx_finance_transactions_org_workflow_case
  on public.finance_transactions (org_id, workflow_case_id);

create index if not exists idx_finance_approval_requests_org_status
  on public.finance_approval_requests (org_id, status, created_at desc);

create index if not exists idx_finance_approval_requests_org_transaction
  on public.finance_approval_requests (org_id, transaction_id);

create index if not exists idx_finance_approval_decisions_org_request
  on public.finance_approval_decisions (org_id, approval_request_id, created_at desc);

alter table public.finance_transactions enable row level security;
alter table public.finance_approval_requests enable row level security;
alter table public.finance_approval_decisions enable row level security;

drop policy if exists finance_transactions_org_select on public.finance_transactions;
create policy finance_transactions_org_select
on public.finance_transactions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_requests_org_select on public.finance_approval_requests;
create policy finance_approval_requests_org_select
on public.finance_approval_requests
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_decisions_org_select on public.finance_approval_decisions;
create policy finance_approval_decisions_org_select
on public.finance_approval_decisions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));