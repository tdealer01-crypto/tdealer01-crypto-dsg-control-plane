-- DSG Control Plane product-loop scaffold schema
-- This migration adds the minimum table set expected by the current API/UI routes.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  email text,
  org_id text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.policies (
  id text primary key,
  name text not null,
  version text not null default 'v1',
  status text not null default 'active',
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agents (
  id text primary key,
  org_id text not null,
  name text not null,
  policy_id text not null references public.policies(id) on update cascade,
  status text not null default 'active',
  monthly_limit integer not null default 10000,
  api_key_hash text,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  decision text not null,
  latency_ms integer not null default 0,
  request_payload jsonb not null default '{}'::jsonb,
  context_payload jsonb not null default '{}'::jsonb,
  policy_version text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  execution_id uuid references public.executions(id) on delete cascade,
  policy_version text,
  decision text not null,
  reason text,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  execution_id uuid references public.executions(id) on delete set null,
  event_type text not null,
  quantity integer not null default 1,
  unit text not null default 'execution',
  amount_usd numeric(12,4) not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_counters (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  billing_period text not null,
  executions integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(agent_id, billing_period)
);

create index if not exists idx_users_auth_user_id on public.users(auth_user_id);
create index if not exists idx_users_org_id on public.users(org_id);
create index if not exists idx_agents_org_id on public.agents(org_id);
create index if not exists idx_agents_policy_id on public.agents(policy_id);
create index if not exists idx_executions_org_created_at on public.executions(org_id, created_at desc);
create index if not exists idx_executions_agent_created_at on public.executions(agent_id, created_at desc);
create index if not exists idx_audit_logs_org_created_at on public.audit_logs(org_id, created_at desc);
create index if not exists idx_usage_events_agent_created_at on public.usage_events(agent_id, created_at desc);
create index if not exists idx_usage_counters_agent_period on public.usage_counters(agent_id, billing_period);

insert into public.policies (id, name, version, status, description, config)
values (
  'policy_default',
  'Default DSG Policy',
  'v1',
  'active',
  'Baseline deterministic policy for scaffold execution routes.',
  jsonb_build_object(
    'block_risk_score', 0.8,
    'stabilize_risk_score', 0.4
  )
)
on conflict (id) do update set
  name = excluded.name,
  version = excluded.version,
  status = excluded.status,
  description = excluded.description,
  config = excluded.config,
  updated_at = now();
