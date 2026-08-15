create table if not exists public.dsg_mcp_api_keys (
  key_id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references auth.users(id) on delete cascade,
  key_hash text not null unique,
  key_prefix text not null,
  label text not null default 'Default',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'REVOKED')),
  stripe_subscription_id text,
  stripe_customer_id text,
  plan_id text not null default 'MCP_490',
  calls_limit integer not null default 10000,
  period_start timestamptz not null default date_trunc('month', now()),
  period_end timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.dsg_mcp_api_keys enable row level security;

create table if not exists public.dsg_mcp_usage (
  usage_id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.dsg_mcp_api_keys(key_id),
  actor_id uuid not null,
  tool_name text not null,
  called_at timestamptz not null default now()
);

alter table public.dsg_mcp_usage enable row level security;

create index if not exists dsg_mcp_usage_key_period_idx on public.dsg_mcp_usage(key_id, called_at);;
