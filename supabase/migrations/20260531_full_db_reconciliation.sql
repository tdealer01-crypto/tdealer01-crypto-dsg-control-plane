-- =====================================================================
-- 20260531_full_db_reconciliation.sql
-- Full live-DB reconciliation: create the 18 tables the application code
-- requires but that are missing from the live Supabase database, and top
-- up known-missing columns on tables that already exist.
--
-- IDEMPOTENT: every statement uses "if not exists" / "add column if not
-- exists" and is safe to run multiple times in the Supabase SQL Editor.
--
-- FOREIGN KEYS INTENTIONALLY OMITTED: all FOREIGN KEY / references clauses
-- have been stripped from the source DDL so this script is order-independent
-- and will not fail when a referenced table is absent. The underlying
-- columns (e.g. org_id, agent_id) are retained. RLS policies, triggers, and
-- functions are likewise intentionally excluded -- tables + columns only.
--
-- Column types inferred from the source migration DDL + lib/database.types.ts
-- (string->text, number->bigint/integer, boolean->boolean, Json->jsonb,
-- ISO-string date->timestamptz).
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- Group A -- tables sourced from supabase/schema.sql
-- =====================================================================

-- access_requests (source: supabase/schema.sql)
create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text,
  email text not null,
  requested_role text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- billing_customers (source: supabase/schema.sql)
create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text unique not null,
  org_id text not null,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- billing_events (source: supabase/schema.sql)
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_customer_id text,
  org_id text,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- guest_access_grants (source: supabase/schema.sql)
create table if not exists public.guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  email text not null,
  role text not null default 'guest_auditor',
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- runtime_effects (source: supabase/schema.sql)
create table if not exists public.runtime_effects (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text,
  execution_id uuid,
  effect_type text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================================
-- Group B -- tables sourced from historical migration files
-- =====================================================================

-- defi_accounts (source: 20260521000000_defi_tables.sql)
create table if not exists public.defi_accounts (
  id uuid primary key default gen_random_uuid(),
  wallet_address text unique not null,
  deposit_usd numeric not null default 0,
  share_pct numeric not null default 0,
  joined_at timestamptz not null default now()
);

-- defi_txns (source: 20260521000000_defi_tables.sql)
create table if not exists public.defi_txns (
  id uuid primary key default gen_random_uuid(),
  wallet_address text not null,
  type text not null check (type in ('deposit','withdraw','rebalance','yield')),
  amount_usd numeric not null,
  tx_hash text,
  protocol text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists defi_txns_wallet_idx on public.defi_txns(wallet_address);

-- dsg_governance_decision_events (source: 20260508_governance_decision_events.sql)
create table if not exists public.dsg_governance_decision_events (
  id text primary key default gen_random_uuid()::text,
  org_id text not null,
  decision_id text not null,
  gate_id text,
  decision text,
  action text not null,
  actor_id text not null,
  actor_role text,
  action_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint dsg_governance_decision_events_action_check check (action in ('evaluate', 'approve', 'reject', 'pause', 'resume', 'rollback')),
  constraint dsg_governance_decision_events_decision_check check (decision is null or decision in ('PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED'))
);
create index if not exists idx_dsg_governance_decision_events_org_time
  on public.dsg_governance_decision_events(org_id, created_at desc);
create index if not exists idx_dsg_governance_decision_events_decision_id
  on public.dsg_governance_decision_events(org_id, decision_id, created_at desc);
create index if not exists idx_dsg_governance_decision_events_action
  on public.dsg_governance_decision_events(org_id, action, created_at desc);

-- finance_approval_steps (source: 20260424010000_finance_governance_control_layer.sql)
create table if not exists public.finance_approval_steps (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null,
  step_order int not null,
  approver_role text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists idx_finance_approval_steps_org_approval
  on public.finance_approval_steps (org_id, approval_request_id, step_order);

-- finance_evidence_bundles (source: 20260424010000_finance_governance_control_layer.sql)
create table if not exists public.finance_evidence_bundles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null,
  status text not null default 'ready',
  uri text,
  created_at timestamptz not null default now()
);
create index if not exists idx_finance_evidence_bundles_org_approval
  on public.finance_evidence_bundles (org_id, approval_request_id, created_at desc);

-- finance_exceptions (source: 20260424010000_finance_governance_control_layer.sql)
create table if not exists public.finance_exceptions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  approval_request_id text not null,
  status text not null default 'open',
  reason text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_finance_exceptions_org_approval
  on public.finance_exceptions (org_id, approval_request_id, created_at desc);

-- finance_workflow_approvals (source: 20260411101500_finance_governance_workflow.sql)
create table if not exists public.finance_workflow_approvals (
  id text primary key,
  org_id text not null,
  case_id text not null,
  vendor text not null,
  amount text not null,
  status text not null,
  risk text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_workflow_approvals_status_chk check (status in ('Needs approver', 'Exception open', 'Compliance review', 'approved', 'rejected', 'escalated'))
);
create index if not exists idx_finance_workflow_approvals_org_id_status
  on public.finance_workflow_approvals (org_id, status, updated_at desc);

-- finance_workflow_cases (source: 20260411101500_finance_governance_workflow.sql)
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
create index if not exists idx_finance_workflow_cases_org_id_updated
  on public.finance_workflow_cases (org_id, updated_at desc);

-- integration_profiles (source: 20260413090000_integration_profiles.sql)
create table if not exists public.integration_profiles (
  id text primary key,
  org_id text not null,
  agent_id text not null unique,
  email text not null,
  app_name text not null,
  webhook_url text,
  allowed_origins jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists integration_profiles_org_idx on public.integration_profiles(org_id);
create index if not exists integration_profiles_status_idx on public.integration_profiles(status);

-- referral_codes (source: 20260516300000_create_referral_codes.sql)
create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  org_id text not null,
  referrer_email text,
  clicks integer not null default 0,
  signups integer not null default 0,
  conversions integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists referral_codes_org_idx on public.referral_codes (org_id);
create index if not exists referral_codes_code_idx on public.referral_codes (code);

-- release_gate_entitlements (source: 20260426193300_release_gate_entitlements.sql)
create table if not exists public.release_gate_entitlements (
  id uuid primary key default gen_random_uuid(),
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'pro',
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_release_gate_entitlements_email
  on public.release_gate_entitlements (email);
create index if not exists idx_release_gate_entitlements_customer
  on public.release_gate_entitlements (stripe_customer_id);

-- =====================================================================
-- Column top-ups -- add code-required columns that may be missing on
-- tables that already exist on the live DB. All nullable or defaulted so
-- ADD COLUMN is safe against populated tables.
-- =====================================================================

-- access_requests
alter table public.access_requests add column if not exists email_domain text;
alter table public.access_requests add column if not exists workspace_name text;
alter table public.access_requests add column if not exists full_name text;
alter table public.access_requests add column if not exists requested_org_hint text;
alter table public.access_requests add column if not exists review_note text;
alter table public.access_requests add column if not exists reviewed_by_user_id text;
alter table public.access_requests add column if not exists ref_code text;

-- billing_subscriptions (table already exists on live DB)
alter table public.billing_subscriptions add column if not exists trial_start timestamptz;
alter table public.billing_subscriptions add column if not exists trial_end timestamptz;

-- billing_events
alter table public.billing_events add column if not exists stripe_subscription_id text;
alter table public.billing_events add column if not exists processed_at timestamptz;

-- runtime_ledger_entries (table already exists on live DB)
alter table public.runtime_ledger_entries add column if not exists truth_sequence bigint;

-- runtime_effects
alter table public.runtime_effects add column if not exists callback_count integer not null default 0;
alter table public.runtime_effects add column if not exists result_payload jsonb;
