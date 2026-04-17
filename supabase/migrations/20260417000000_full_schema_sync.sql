begin;

create extension if not exists pgcrypto;

-- ============================================================
-- 0) Drop old objects
-- ============================================================

drop materialized view if exists public.org_current_readiness cascade;
drop view if exists public.org_current_readiness cascade;
drop view if exists public.policy_versions cascade;

drop function if exists public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
) cascade;

drop table if exists public.agent_stats_daily cascade;
drop table if exists public.alert_events cascade;
drop table if exists public.readiness_history cascade;
drop table if exists public.core_monitor_snapshots cascade;

drop table if exists public.org_onboarding_states cascade;
drop table if exists public.seat_activations cascade;
drop table if exists public.org_billing_policies cascade;
drop table if exists public.sign_in_events cascade;
drop table if exists public.guest_access_grants cascade;
drop table if exists public.directory_sync_events cascade;
drop table if exists public.directory_group_role_mappings cascade;
drop table if exists public.directory_sync_configs cascade;
drop table if exists public.org_sso_configs cascade;
drop table if exists public.access_requests cascade;
drop table if exists public.trial_signups cascade;

drop table if exists public.runtime_policy_governance_events cascade;
drop table if exists public.runtime_policies cascade;
drop table if exists public.runtime_roles cascade;
drop table if exists public.runtime_checkpoints cascade;
drop table if exists public.runtime_effects cascade;
drop table if exists public.audit_logs cascade;
drop table if exists public.runtime_ledger_entries cascade;
drop table if exists public.executions cascade;
drop table if exists public.runtime_truth_states cascade;
drop table if exists public.runtime_approval_requests cascade;

drop table if exists public.usage_counters cascade;
drop table if exists public.usage_events cascade;
drop table if exists public.billing_events cascade;
drop table if exists public.billing_subscriptions cascade;
drop table if exists public.billing_customers cascade;

drop table if exists public.agents cascade;
drop table if exists public.policies cascade;
drop table if exists public.users cascade;
drop table if exists public.organizations cascade;

-- ============================================================
-- 1) Core product tables
-- ============================================================

create table public.organizations (
  id text primary key,
  name text not null,
  slug text unique,
  plan text not null default 'trial',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  org_id text not null references public.organizations(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'owner',
  auth_provider text not null default 'email',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.policies (
  id text primary key,
  org_id text references public.organizations(id) on delete cascade,
  name text not null,
  version text not null default 'v1',
  status text not null default 'active',
  description text,
  rules jsonb not null default '{}'::jsonb,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_policies_org_name_version
  on public.policies (org_id, name, version);

create table public.agents (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  policy_id text references public.policies(id) on delete set null,
  status text not null default 'active',
  monthly_limit integer not null default 1000,
  api_key_hash text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_agents_api_key_hash_unique
  on public.agents(api_key_hash)
  where api_key_hash is not null;

create index idx_agents_org_id on public.agents(org_id);
create index idx_agents_policy_id on public.agents(policy_id);

create table public.executions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  decision text not null,
  latency_ms integer not null default 0,
  reason text,
  request_payload jsonb not null default '{}'::jsonb,
  context_payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  policy_version text,
  created_at timestamptz not null default now()
);

create index idx_executions_org_agent_created_at
  on public.executions(org_id, agent_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text references public.agents(id) on delete set null,
  execution_id uuid references public.executions(id) on delete cascade,
  decision text,
  reason text,
  policy_version text,
  metadata jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_execution_id on public.audit_logs(execution_id);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text references public.agents(id) on delete set null,
  execution_id uuid references public.executions(id) on delete cascade,
  event_type text not null default 'execution',
  quantity numeric not null default 1,
  unit text not null default 'execution',
  amount_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now()
);

create index idx_usage_events_execution_id on public.usage_events(execution_id);
create index idx_usage_events_org_id on public.usage_events(org_id);

create table public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  billing_period text not null,
  executions integer not null default 0,
  amount_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, billing_period)
);

create index idx_usage_counters_org_period on public.usage_counters(org_id, billing_period);

-- ============================================================
-- 2) Billing
-- ============================================================

create table public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text unique not null,
  org_id text not null references public.organizations(id) on delete cascade,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text unique not null,
  stripe_customer_id text,
  org_id text not null references public.organizations(id) on delete cascade,
  customer_email text,
  status text not null default 'trialing',
  plan_key text not null default 'trial',
  billing_interval text not null default 'monthly',
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique,
  stripe_customer_id text,
  org_id text references public.organizations(id) on delete cascade,
  event_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3) Trial / access / provisioning
-- ============================================================

create table public.trial_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workspace_name text,
  full_name text,
  org_id text references public.organizations(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete cascade,
  email text not null,
  requested_role text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4) Runtime spine
-- ============================================================

create table public.runtime_approval_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  approval_key text not null unique,
  request_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  expires_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_runtime_approval_requests_org_agent
  on public.runtime_approval_requests(org_id, agent_id, created_at desc);

create table public.runtime_truth_states (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  request_id uuid references public.runtime_approval_requests(id) on delete set null,
  canonical_hash text,
  canonical_json jsonb not null default '{}'::jsonb,
  decision text,
  reason text,
  policy_version text,
  truth_sequence bigint not null,
  created_at timestamptz not null default now()
);

create unique index idx_runtime_truth_states_org_agent_seq
  on public.runtime_truth_states(org_id, agent_id, truth_sequence);

create table public.runtime_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  request_id uuid references public.runtime_approval_requests(id) on delete set null,
  execution_id uuid references public.executions(id) on delete cascade,
  truth_state_id uuid references public.runtime_truth_states(id) on delete cascade,
  decision text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  canonical_hash text,
  ledger_sequence bigint not null,
  created_at timestamptz not null default now()
);

create unique index idx_runtime_ledger_entries_org_agent_seq
  on public.runtime_ledger_entries(org_id, agent_id, ledger_sequence);

create index idx_runtime_ledger_entries_request_id
  on public.runtime_ledger_entries(request_id);

create table public.runtime_effects (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text references public.agents(id) on delete set null,
  execution_id uuid references public.executions(id) on delete cascade,
  effect_type text,
  status text not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.runtime_checkpoints (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  truth_state_id uuid references public.runtime_truth_states(id) on delete cascade,
  latest_ledger_entry_id uuid references public.runtime_ledger_entries(id) on delete cascade,
  checkpoint_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, agent_id, checkpoint_hash)
);

-- ============================================================
-- 5) Runtime RBAC / governance
-- ============================================================

create table public.runtime_roles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('org_admin', 'operator', 'runtime_auditor', 'billing_admin', 'guest_auditor')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id, role)
);

create table public.runtime_policies (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  name text not null,
  version text not null default 'v1',
  status text not null default 'draft',
  thresholds jsonb not null default '{}'::jsonb,
  governance_state text not null default 'proposed',
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name, version)
);

create table public.runtime_policy_governance_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  policy_id uuid not null references public.runtime_policies(id) on delete cascade,
  actor_user_id uuid references public.users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 6) Enterprise identity / access / onboarding
-- ============================================================

create table public.org_sso_configs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  provider text not null,
  display_name text,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

create table public.directory_sync_configs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  provider text not null default 'scim',
  status text not null default 'disabled',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.directory_group_role_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  config_id uuid references public.directory_sync_configs(id) on delete cascade,
  external_group_id text not null,
  role text not null,
  created_at timestamptz not null default now(),
  unique (org_id, external_group_id)
);

create table public.directory_sync_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  config_id uuid references public.directory_sync_configs(id) on delete cascade,
  event_type text not null,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'guest_auditor',
  scope jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sign_in_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  org_id text references public.organizations(id) on delete cascade,
  event_type text not null,
  source text,
  success boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.org_billing_policies (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  seat_activation_policy text not null default 'on_first_login',
  trial_requires_card boolean not null default false,
  managed_user_billing_mode text not null default 'bill_on_activation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

create table public.seat_activations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'owner',
  source text,
  activated_at timestamptz,
  billable_from timestamptz,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table public.org_onboarding_states (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  bootstrap_status text not null default 'pending',
  checklist jsonb not null default '{}'::jsonb,
  bootstrapped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id)
);

-- ============================================================
-- 7) Monitor / readiness
-- ============================================================

create table public.core_monitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete cascade,
  readiness_status text,
  readiness_score integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.readiness_history (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete cascade,
  readiness_status text,
  readiness_score integer,
  reason text,
  created_at timestamptz not null default now()
);

create table public.alert_events (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete cascade,
  level text not null default 'info',
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.agent_stats_daily (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  day date not null,
  executions integer not null default 0,
  blocks integer not null default 0,
  stabilizes integer not null default 0,
  amount_usd numeric(12,6) not null default 0,
  created_at timestamptz not null default now(),
  unique (agent_id, day)
);

create view public.org_current_readiness as
select
  o.id as org_id,
  s.readiness_status,
  s.readiness_score,
  s.payload,
  s.created_at
from public.organizations o
left join lateral (
  select cms.readiness_status, cms.readiness_score, cms.payload, cms.created_at
  from public.core_monitor_snapshots cms
  where cms.org_id = o.id
  order by cms.created_at desc
  limit 1
) s on true;

-- ============================================================
-- 8) Compatibility view for legacy callers
-- ============================================================

create view public.policy_versions
with (security_invoker = true) as
select
  p.id,
  p.id as policy_id,
  p.org_id,
  p.name,
  p.version,
  p.version as policy_version,
  p.status,
  p.description,
  p.rules,
  p.config,
  p.is_active,
  p.created_by,
  p.created_at,
  p.updated_at
from public.policies p;

-- ============================================================
-- 9) Seed baseline policy expected by Auto-Setup
-- ============================================================

insert into public.policies (
  id, org_id, name, version, status, description, rules, config, is_active
)
values (
  'policy_default',
  null,
  'Default DSG Policy',
  'v1',
  'active',
  'Baseline deterministic safety policy.',
  '{}'::jsonb,
  '{"block_risk_score":0.8,"stabilize_risk_score":0.4,"oscillation_window":4}'::jsonb,
  true
)
on conflict (id) do update
set
  name = excluded.name,
  version = excluded.version,
  status = excluded.status,
  description = excluded.description,
  rules = excluded.rules,
  config = excluded.config,
  is_active = excluded.is_active,
  updated_at = now();

-- ============================================================
-- 10) Canonical RPC: runtime_commit_execution
-- ============================================================

create or replace function public.runtime_commit_execution(
  p_org_id text,
  p_agent_id text,
  p_request_id uuid,
  p_decision text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_canonical_hash text default null,
  p_canonical_json jsonb default '{}'::jsonb,
  p_latency_ms integer default 0,
  p_request_payload jsonb default '{}'::jsonb,
  p_context_payload jsonb default '{}'::jsonb,
  p_policy_version text default null,
  p_audit_evidence jsonb default '{}'::jsonb,
  p_usage_amount_usd numeric default 0,
  p_created_at timestamptz default now(),
  p_agent_monthly_limit integer default 0,
  p_org_plan_limit integer default 0
)
returns table (
  execution_id uuid,
  ledger_id uuid,
  truth_state_id uuid,
  truth_sequence bigint,
  ledger_sequence bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_approval public.runtime_approval_requests%rowtype;
  v_execution_id uuid;
  v_ledger_id uuid;
  v_truth_state_id uuid;
  v_truth_sequence bigint;
  v_ledger_sequence bigint;
  v_agent_used integer := 0;
  v_org_used bigint := 0;
  v_period text;
  v_checkpoint_hash text;
begin
  if upper(coalesce(p_decision, '')) not in ('ALLOW', 'STABILIZE', 'BLOCK') then
    raise exception 'invalid_decision';
  end if;

  v_period := to_char(coalesce(p_created_at, now()), 'YYYY-MM');

  select *
    into v_approval
  from public.runtime_approval_requests
  where id = p_request_id
    and org_id = p_org_id
    and agent_id = p_agent_id
  for update;

  if not found then
    raise exception 'no pending runtime intent';
  end if;

  if v_approval.status = 'consumed' then
    select rle.execution_id, rle.id, rle.truth_state_id, rle.ledger_sequence
      into v_execution_id, v_ledger_id, v_truth_state_id, v_ledger_sequence
    from public.runtime_ledger_entries rle
    where rle.request_id = p_request_id
    order by rle.created_at desc
    limit 1;

    select rts.truth_sequence
      into v_truth_sequence
    from public.runtime_truth_states rts
    where rts.id = v_truth_state_id
    limit 1;

    return query
    select
      v_execution_id,
      v_ledger_id,
      v_truth_state_id,
      coalesce(v_truth_sequence, 1),
      coalesce(v_ledger_sequence, 1),
      true;
    return;
  end if;

  if v_approval.expires_at is not null and v_approval.expires_at < now() then
    update public.runtime_approval_requests
    set status = 'expired',
        updated_at = now()
    where id = p_request_id;

    raise exception 'approval expired';
  end if;

  if v_approval.status <> 'pending' then
    raise exception 'approval status invalid: %', v_approval.status;
  end if;

  if coalesce(p_agent_monthly_limit, 0) > 0 then
    select coalesce(uc.executions, 0)
      into v_agent_used
    from public.usage_counters uc
    where uc.agent_id = p_agent_id
      and uc.billing_period = v_period
    limit 1;

    if coalesce(v_agent_used, 0) >= p_agent_monthly_limit then
      raise exception 'agent_quota_exceeded';
    end if;
  end if;

  if coalesce(p_org_plan_limit, 0) > 0 then
    select coalesce(sum(uc.executions), 0)
      into v_org_used
    from public.usage_counters uc
    where uc.org_id = p_org_id
      and uc.billing_period = v_period;

    if coalesce(v_org_used, 0) >= p_org_plan_limit then
      raise exception 'org_quota_exceeded';
    end if;
  end if;

  select coalesce(max(rts.truth_sequence), 0) + 1
    into v_truth_sequence
  from public.runtime_truth_states rts
  where rts.org_id = p_org_id
    and rts.agent_id = p_agent_id;

  select coalesce(max(rle.ledger_sequence), 0) + 1
    into v_ledger_sequence
  from public.runtime_ledger_entries rle
  where rle.org_id = p_org_id
    and rle.agent_id = p_agent_id;

  insert into public.runtime_truth_states (
    org_id,
    agent_id,
    request_id,
    canonical_hash,
    canonical_json,
    decision,
    reason,
    policy_version,
    truth_sequence,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    p_request_id,
    p_canonical_hash,
    coalesce(p_canonical_json, '{}'::jsonb),
    upper(p_decision),
    p_reason,
    coalesce(p_policy_version, 'v1'),
    v_truth_sequence,
    coalesce(p_created_at, now())
  )
  returning id into v_truth_state_id;

  insert into public.executions (
    org_id,
    agent_id,
    decision,
    latency_ms,
    reason,
    request_payload,
    context_payload,
    metadata,
    policy_version,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    upper(p_decision),
    coalesce(p_latency_ms, 0),
    p_reason,
    coalesce(p_request_payload, '{}'::jsonb),
    coalesce(p_context_payload, '{}'::jsonb),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_policy_version, 'v1'),
    coalesce(p_created_at, now())
  )
  returning id into v_execution_id;

  update public.runtime_approval_requests
  set status = 'consumed',
      consumed_at = coalesce(p_created_at, now()),
      updated_at = now()
  where id = p_request_id;

  insert into public.runtime_ledger_entries (
    org_id,
    agent_id,
    request_id,
    execution_id,
    truth_state_id,
    decision,
    reason,
    metadata,
    canonical_hash,
    ledger_sequence,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    p_request_id,
    v_execution_id,
    v_truth_state_id,
    upper(p_decision),
    p_reason,
    coalesce(p_metadata, '{}'::jsonb),
    p_canonical_hash,
    v_ledger_sequence,
    coalesce(p_created_at, now())
  )
  returning id into v_ledger_id;

  insert into public.audit_logs (
    org_id,
    agent_id,
    execution_id,
    decision,
    reason,
    policy_version,
    metadata,
    evidence,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    v_execution_id,
    upper(p_decision),
    p_reason,
    coalesce(p_policy_version, 'v1'),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_audit_evidence, '{}'::jsonb),
    coalesce(p_created_at, now())
  );

  insert into public.usage_events (
    org_id,
    agent_id,
    execution_id,
    event_type,
    quantity,
    unit,
    amount_usd,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    v_execution_id,
    'execution',
    1,
    'execution',
    coalesce(p_usage_amount_usd, 0),
    coalesce(p_created_at, now())
  );

  insert into public.usage_counters (
    org_id,
    agent_id,
    billing_period,
    executions,
    amount_usd,
    created_at,
    updated_at
  )
  values (
    p_org_id,
    p_agent_id,
    v_period,
    1,
    coalesce(p_usage_amount_usd, 0),
    now(),
    now()
  )
  on conflict (agent_id, billing_period)
  do update set
    executions = public.usage_counters.executions + 1,
    amount_usd = public.usage_counters.amount_usd + excluded.amount_usd,
    updated_at = now();

  v_checkpoint_hash := encode(
    digest(
      coalesce(p_canonical_hash, '') || ':' ||
      coalesce(v_ledger_id::text, '') || ':' ||
      v_ledger_sequence::text || ':' ||
      v_truth_sequence::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.runtime_checkpoints (
    org_id,
    agent_id,
    truth_state_id,
    latest_ledger_entry_id,
    checkpoint_hash,
    metadata,
    created_at
  )
  values (
    p_org_id,
    p_agent_id,
    v_truth_state_id,
    v_ledger_id,
    v_checkpoint_hash,
    jsonb_build_object(
      'source', 'runtime_commit_execution',
      'execution_id', v_execution_id,
      'ledger_sequence', v_ledger_sequence,
      'truth_sequence', v_truth_sequence
    ),
    coalesce(p_created_at, now())
  )
  on conflict (org_id, agent_id, checkpoint_hash) do nothing;

  update public.agents
  set last_used_at = now(),
      updated_at = now()
  where id = p_agent_id
    and org_id = p_org_id;

  return query
  select
    v_execution_id,
    v_ledger_id,
    v_truth_state_id,
    v_truth_sequence,
    v_ledger_sequence,
    false;
end;
$$;

revoke all on function public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
) from public;

revoke all on function public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
) from anon;

revoke all on function public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
) from authenticated;

grant execute on function public.runtime_commit_execution(
  text, text, uuid, text, text, jsonb, text, jsonb, integer, jsonb, jsonb, text, jsonb, numeric, timestamptz, integer, integer
) to service_role;

commit;
