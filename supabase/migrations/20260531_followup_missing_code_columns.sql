-- Follow-up: bring the live database in line with the columns/tables the
-- application code reads/writes. Restoring the build type-check (ignoreBuildErrors
-- removed) surfaced pre-existing drift: lib/database.types.ts declares these
-- tables/columns but the live DB is missing some of them entirely (e.g.
-- access_requests did not exist).
--
-- Fully idempotent: CREATE TABLE IF NOT EXISTS defines the table when absent;
-- the ADD COLUMN IF NOT EXISTS statements top up an existing table that is only
-- missing columns. Foreign keys are intentionally omitted so the script never
-- fails on a missing referenced table; integrity FKs can be added later once the
-- full schema is reconciled.

-- ---------------------------------------------------------------------------
-- access_requests  (POST /api/access/request intake + review)
-- ---------------------------------------------------------------------------
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text,
  email text not null,
  requested_role text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  email_domain text,
  workspace_name text,
  full_name text,
  requested_org_hint text,
  review_note text,
  reviewed_by_user_id text,
  ref_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.access_requests add column if not exists email_domain text;
alter table public.access_requests add column if not exists workspace_name text;
alter table public.access_requests add column if not exists full_name text;
alter table public.access_requests add column if not exists requested_org_hint text;
alter table public.access_requests add column if not exists review_note text;
alter table public.access_requests add column if not exists reviewed_by_user_id text;
alter table public.access_requests add column if not exists ref_code text;

-- ---------------------------------------------------------------------------
-- billing_subscriptions  (trial window: /auth/confirm writes, drip crons read)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text unique not null,
  stripe_customer_id text,
  org_id text not null,
  customer_email text,
  status text not null default 'trialing',
  plan_key text not null default 'trial',
  billing_interval text not null default 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.billing_subscriptions add column if not exists trial_start timestamptz;
alter table public.billing_subscriptions add column if not exists trial_end timestamptz;

-- ---------------------------------------------------------------------------
-- runtime_ledger_entries  (truth_sequence read by summary/checkpoint/setup)
-- ---------------------------------------------------------------------------
create table if not exists public.runtime_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null,
  request_id uuid,
  execution_id uuid,
  truth_state_id uuid,
  decision text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  canonical_hash text,
  ledger_sequence bigint not null default 0,
  truth_sequence bigint,
  created_at timestamptz not null default now()
);
alter table public.runtime_ledger_entries add column if not exists truth_sequence bigint;

-- ---------------------------------------------------------------------------
-- runtime_effects  (callback accounting used by lib/runtime/reconcile)
-- ---------------------------------------------------------------------------
create table if not exists public.runtime_effects (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text,
  execution_id uuid,
  effect_type text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  callback_count integer not null default 0,
  result_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.runtime_effects add column if not exists callback_count integer not null default 0;
alter table public.runtime_effects add column if not exists result_payload jsonb;
