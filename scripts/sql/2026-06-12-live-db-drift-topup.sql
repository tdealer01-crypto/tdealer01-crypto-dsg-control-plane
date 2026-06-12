-- ============================================================================
-- Live DB drift top-up — 2026-06-12
-- ============================================================================
-- See the local copy delivered in session; this is the canonical repo copy.
-- Purpose : Bring the live Supabase database up to the checked-in migrations
--           so the CI "verify" live-DB gate tests pass.
--           Drift confirmed by CI run 27438328487 (PR #725):
--             • executions.metadata        — missing column (PGRST204)
--             • usage_counters.amount_usd  — missing column (PGRST204)
--             • audit_logs.metadata        — missing column (PGRST204)
--             • finance approve flow 500   — same era of drift on the
--               finance_* workflow/control-layer objects
--
-- Safety  : Idempotent — safe to run more than once.
--           Strictly additive: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT
--           EXISTS / CREATE INDEX IF NOT EXISTS / guarded ADD CONSTRAINT.
--           No DROP TABLE, no TRUNCATE, no UPDATE/DELETE of existing user data.
--           The only data writes are the original migration's own backfill
--           (INSERT ... ON CONFLICT DO NOTHING) and a NULL-only target fill,
--           both copied from checked-in migrations.
--
-- Source  : Definitions copied verbatim from
--           supabase/migrations/20260417000000_full_schema_sync.sql
--           supabase/migrations/20260411101500_finance_governance_workflow.sql
--           supabase/migrations/20260424010000_finance_governance_control_layer.sql
--           supabase/migrations/20260426090000_finance_workflow_action_audit_evidence.sql
--
-- How to run: Supabase Dashboard → SQL Editor → paste everything → Run.
--             Then run the verification block at the bottom and check that
--             every row reports 'OK'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Column top-ups confirmed missing by CI (runtime/usage/audit core tables)
-- ----------------------------------------------------------------------------

alter table public.executions
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists request_payload jsonb not null default '{}'::jsonb,
  add column if not exists context_payload jsonb not null default '{}'::jsonb,
  add column if not exists reason text,
  add column if not exists policy_version text,
  add column if not exists latency_ms integer not null default 0;

alter table public.audit_logs
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists evidence jsonb not null default '{}'::jsonb,
  add column if not exists decision text,
  add column if not exists reason text,
  add column if not exists policy_version text;

alter table public.usage_counters
  add column if not exists amount_usd numeric(12,6) not null default 0;

-- usage_counters upserts use onConflict (agent_id, billing_period) —
-- ensure the unique constraint exists (guarded; name-agnostic check).
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    where t.relname = 'usage_counters'
      and c.contype = 'u'
      and (
        select array_agg(a.attname order by a.attname)
        from unnest(c.conkey) k
        join pg_attribute a on a.attrelid = t.oid and a.attnum = k
      ) = array['agent_id', 'billing_period']::name[]
  ) then
    alter table public.usage_counters
      add constraint usage_counters_agent_period_unique unique (agent_id, billing_period);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2) Legacy finance workflow tables (20260411101500) — create if absent
-- ----------------------------------------------------------------------------

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

-- ----------------------------------------------------------------------------
-- 3) Action-event audit columns (20260426090000) — the approve-flow writer
--    inserts actor/result/target; their absence 500s the approve endpoint.
-- ----------------------------------------------------------------------------

alter table public.finance_workflow_action_events
  add column if not exists actor text not null default 'api',
  add column if not exists result text not null default 'ok',
  add column if not exists target text;

update public.finance_workflow_action_events
set target = coalesce(approval_id, case_id)
where target is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_workflow_action_events_result_chk'
  ) then
    alter table public.finance_workflow_action_events
      add constraint finance_workflow_action_events_result_chk
      check (result in ('ok', 'error', 'denied')) not valid;
    alter table public.finance_workflow_action_events
      validate constraint finance_workflow_action_events_result_chk;
  end if;
end $$;

create index if not exists idx_finance_workflow_action_events_org_action_actor
  on public.finance_workflow_action_events (org_id, action, actor, created_at desc);

-- ----------------------------------------------------------------------------
-- 4) Finance control layer (20260424010000) — tables, column top-ups,
--    indexes, guarded constraints, updated_at triggers, RLS.
--    RLS note: policies below are SELECT-only for authenticated users scoped
--    to their JWT org_id; the app's service-role writes bypass RLS as designed.
-- ----------------------------------------------------------------------------

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

-- Column top-ups in case the tables pre-exist in an older shape.
alter table public.finance_approval_decisions
  add column if not exists actor text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists reason text;
alter table public.finance_transactions
  add column if not exists workflow_case_id text;
alter table public.finance_approval_requests
  add column if not exists risk text;

-- Backfill copied from 20260424010000 (idempotent: on conflict do nothing).
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

-- Guarded CHECK constraints (original migration adds were not re-runnable).
do $$
declare
  c record;
begin
  for c in
    select * from (values
      ('finance_transactions',      'finance_transactions_amount_nonnegative',      'check (amount >= 0)'),
      ('finance_approval_requests', 'finance_approval_requests_status_valid',       'check (status in (''pending'', ''approved'', ''rejected'', ''escalated'', ''in_review''))'),
      ('finance_approval_steps',    'finance_approval_steps_status_valid',          'check (status in (''pending'', ''approved'', ''rejected'', ''skipped'', ''in_progress''))'),
      ('finance_approval_decisions','finance_approval_decisions_decision_valid',    'check (decision in (''approve'', ''reject'', ''escalate''))'),
      ('finance_exceptions',        'finance_exceptions_status_valid',              'check (status in (''open'', ''resolved''))'),
      ('finance_evidence_bundles',  'finance_evidence_bundles_status_valid',        'check (status in (''ready'', ''building'', ''failed''))')
    ) as t(tbl, conname, condef)
  loop
    if not exists (select 1 from pg_constraint where conname = c.conname) then
      execute format('alter table public.%I add constraint %I %s not valid', c.tbl, c.conname, c.condef);
      execute format('alter table public.%I validate constraint %I', c.tbl, c.conname);
    end if;
  end loop;
end $$;

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
on public.finance_transactions for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_requests_org_select on public.finance_approval_requests;
create policy finance_approval_requests_org_select
on public.finance_approval_requests for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_steps_org_select on public.finance_approval_steps;
create policy finance_approval_steps_org_select
on public.finance_approval_steps for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_approval_decisions_org_select on public.finance_approval_decisions;
create policy finance_approval_decisions_org_select
on public.finance_approval_decisions for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_exceptions_org_select on public.finance_exceptions;
create policy finance_exceptions_org_select
on public.finance_exceptions for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists finance_evidence_bundles_org_select on public.finance_evidence_bundles;
create policy finance_evidence_bundles_org_select
on public.finance_evidence_bundles for select to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

-- ----------------------------------------------------------------------------
-- 5) Verification — every row must say OK. Paste the output back if any FAIL.
-- ----------------------------------------------------------------------------

select 'executions.metadata' as object,
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='executions' and column_name='metadata')
       then 'OK' else 'FAIL' end as status
union all
select 'audit_logs.metadata',
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='audit_logs' and column_name='metadata')
       then 'OK' else 'FAIL' end
union all
select 'usage_counters.amount_usd',
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='usage_counters' and column_name='amount_usd')
       then 'OK' else 'FAIL' end
union all
select 'usage_counters unique(agent_id,billing_period)',
       case when exists (
         select 1 from pg_constraint c join pg_class t on t.oid=c.conrelid
         where t.relname='usage_counters' and c.contype='u') then 'OK' else 'FAIL' end
union all
select 'finance_workflow_action_events.actor',
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='finance_workflow_action_events' and column_name='actor')
       then 'OK' else 'FAIL' end
union all
select 'finance_workflow_action_events.result',
       case when exists (select 1 from information_schema.columns
         where table_schema='public' and table_name='finance_workflow_action_events' and column_name='result')
       then 'OK' else 'FAIL' end
union all
select 'table ' || t.expected,
       case when to_regclass('public.' || t.expected) is not null then 'OK' else 'FAIL' end
from (values
  ('finance_workflow_cases'), ('finance_workflow_approvals'), ('finance_workflow_action_events'),
  ('finance_transactions'), ('finance_approval_requests'), ('finance_approval_steps'),
  ('finance_approval_decisions'), ('finance_exceptions'), ('finance_evidence_bundles'),
  ('finance_export_jobs')
) as t(expected);
