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

do $$
begin
  if to_regclass('public.finance_workflow_cases') is not null then
    insert into public.finance_transactions (id, org_id, workflow_case_id, vendor, amount, currency, status)
    select c.id, c.org_id, c.id, c.vendor, c.amount, c.currency, c.status
    from public.finance_workflow_cases c
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.finance_workflow_approvals') is not null then
    insert into public.finance_approval_requests (id, org_id, transaction_id, status, risk)
    select a.id, a.org_id, a.case_id, a.status, a.risk
    from public.finance_workflow_approvals a
    where exists (select 1 from public.finance_transactions t where t.id = a.case_id)
    on conflict (id) do nothing;
  end if;
end $$;

create index if not exists idx_finance_transactions_org_status
  on public.finance_transactions (org_id, status, updated_at desc);
create index if not exists idx_finance_transactions_workflow_case_id
  on public.finance_transactions (workflow_case_id);
create index if not exists idx_finance_approval_requests_org_status
  on public.finance_approval_requests (org_id, status, updated_at desc);
create index if not exists idx_finance_approval_requests_org_transaction
  on public.finance_approval_requests (org_id, transaction_id);
create index if not exists idx_finance_approval_steps_org_approval
  on public.finance_approval_steps (org_id, approval_request_id, step_order);
create index if not exists idx_finance_approval_decisions_org_approval
  on public.finance_approval_decisions (org_id, approval_request_id, created_at desc);
create index if not exists idx_finance_exceptions_org_approval
  on public.finance_exceptions (org_id, approval_request_id, created_at desc);
create index if not exists idx_finance_evidence_bundles_org_approval
  on public.finance_evidence_bundles (org_id, approval_request_id, created_at desc);

alter table public.finance_transactions
  add constraint finance_transactions_amount_nonnegative check (amount >= 0) not valid;
alter table public.finance_transactions validate constraint finance_transactions_amount_nonnegative;

alter table public.finance_approval_requests
  add constraint finance_approval_requests_status_valid
  check (status in ('pending', 'approved', 'rejected', 'escalated', 'in_review')) not valid;
alter table public.finance_approval_requests validate constraint finance_approval_requests_status_valid;

alter table public.finance_approval_steps
  add constraint finance_approval_steps_status_valid
  check (status in ('pending', 'approved', 'rejected', 'skipped', 'in_progress')) not valid;
alter table public.finance_approval_steps validate constraint finance_approval_steps_status_valid;

alter table public.finance_approval_decisions
  add constraint finance_approval_decisions_decision_valid
  check (decision in ('approve', 'reject', 'escalate')) not valid;
alter table public.finance_approval_decisions validate constraint finance_approval_decisions_decision_valid;

alter table public.finance_exceptions
  add constraint finance_exceptions_status_valid check (status in ('open', 'resolved')) not valid;
alter table public.finance_exceptions validate constraint finance_exceptions_status_valid;

alter table public.finance_evidence_bundles
  add constraint finance_evidence_bundles_status_valid check (status in ('ready', 'building', 'failed')) not valid;
alter table public.finance_evidence_bundles validate constraint finance_evidence_bundles_status_valid;

create or replace function public.set_finance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_finance_transactions_updated_at on public.finance_transactions;
create trigger trg_finance_transactions_updated_at
before update on public.finance_transactions
for each row execute function public.set_finance_updated_at();

drop trigger if exists trg_finance_approval_requests_updated_at on public.finance_approval_requests;
create trigger trg_finance_approval_requests_updated_at
before update on public.finance_approval_requests
for each row execute function public.set_finance_updated_at();

alter table public.finance_transactions enable row level security;
alter table public.finance_approval_requests enable row level security;
alter table public.finance_approval_steps enable row level security;
alter table public.finance_approval_decisions enable row level security;
alter table public.finance_exceptions enable row level security;
alter table public.finance_evidence_bundles enable row level security;
alter table public.finance_export_jobs enable row level security;

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

drop policy if exists finance_approval_steps_org_select on public.finance_approval_steps;
create policy finance_approval_steps_org_select
on public.finance_approval_steps
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_decisions_org_select on public.finance_approval_decisions;
create policy finance_approval_decisions_org_select
on public.finance_approval_decisions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_exceptions_org_select on public.finance_exceptions;
create policy finance_exceptions_org_select
on public.finance_exceptions
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_evidence_bundles_org_select on public.finance_evidence_bundles;
create policy finance_evidence_bundles_org_select
on public.finance_evidence_bundles
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
