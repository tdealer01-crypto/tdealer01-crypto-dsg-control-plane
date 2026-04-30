create table if not exists public.gateway_connectors (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  provider text not null,
  status text not null default 'connected',
  name text not null default 'Customer webhook',
  endpoint_url text not null,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gateway_connectors_provider_chk
    check (provider in ('custom_http', 'zapier', 'make', 'n8n')),
  constraint gateway_connectors_status_chk
    check (status in ('connected', 'disabled', 'error'))
);

create unique index if not exists idx_gateway_connectors_org_provider_name
  on public.gateway_connectors (org_id, provider, name);

create index if not exists idx_gateway_connectors_org_status
  on public.gateway_connectors (org_id, status, created_at desc);

create table if not exists public.gateway_tools (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  connector_id uuid not null references public.gateway_connectors(id) on delete cascade,
  name text not null,
  provider text not null,
  action text not null,
  risk text not null default 'medium',
  execution_mode text not null default 'gateway',
  requires_approval boolean not null default false,
  enabled boolean not null default true,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gateway_tools_provider_chk
    check (provider in ('custom_http', 'zapier', 'make', 'n8n')),
  constraint gateway_tools_risk_chk
    check (risk in ('low', 'medium', 'high', 'critical')),
  constraint gateway_tools_execution_mode_chk
    check (execution_mode in ('monitor', 'gateway', 'critical'))
);

create unique index if not exists idx_gateway_tools_org_name
  on public.gateway_tools (org_id, name);

create index if not exists idx_gateway_tools_org_connector
  on public.gateway_tools (org_id, connector_id, enabled);

alter table public.gateway_connectors enable row level security;
alter table public.gateway_tools enable row level security;

drop policy if exists gateway_connectors_org_select on public.gateway_connectors;
create policy gateway_connectors_org_select
on public.gateway_connectors
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));

drop policy if exists gateway_tools_org_select on public.gateway_tools;
create policy gateway_tools_org_select
on public.gateway_tools
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
