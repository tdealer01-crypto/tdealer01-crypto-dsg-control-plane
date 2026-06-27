create table if not exists public.finance_governance_audit_ledger (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  case_id text,
  approval_id text,
  action text not null,
  actor text not null default 'api',
  result text not null default 'ok',
  target text,
  message text not null,
  next_status text not null,
  request_hash text not null,
  record_hash text not null unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint finance_governance_audit_ledger_action_chk
    check (action in ('submit', 'approve', 'reject', 'escalate')),
  constraint finance_governance_audit_ledger_result_chk
    check (result in ('ok', 'error', 'denied'))
);

create index if not exists idx_finance_governance_audit_ledger_org_created
  on public.finance_governance_audit_ledger (org_id, created_at desc);

create index if not exists idx_finance_governance_audit_ledger_org_action
  on public.finance_governance_audit_ledger (org_id, action, created_at desc);

create index if not exists idx_finance_governance_audit_ledger_org_approval
  on public.finance_governance_audit_ledger (org_id, approval_id, created_at desc);

alter table public.finance_governance_audit_ledger enable row level security;

drop policy if exists finance_governance_audit_ledger_org_select on public.finance_governance_audit_ledger;
create policy finance_governance_audit_ledger_org_select
on public.finance_governance_audit_ledger
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
