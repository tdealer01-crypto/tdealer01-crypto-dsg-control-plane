create table if not exists public.gateway_monitor_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  plan_id text,
  tool_name text not null,
  action text not null,
  mode text not null default 'monitor',
  decision text not null,
  actor_id text,
  actor_role text,
  risk text,
  status text not null default 'recorded',
  request_hash text not null,
  decision_hash text,
  record_hash text,
  audit_token text,
  input jsonb not null default '{}'::jsonb,
  result jsonb,
  constraints jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint gateway_monitor_events_mode_chk
    check (mode in ('monitor', 'gateway', 'critical')),
  constraint gateway_monitor_events_decision_chk
    check (decision in ('allow', 'block', 'review', 'ask_more_info')),
  constraint gateway_monitor_events_status_chk
    check (status in ('recorded', 'committed', 'rejected', 'expired'))
);

create unique index if not exists idx_gateway_monitor_events_audit_token
  on public.gateway_monitor_events (audit_token)
  where audit_token is not null;

create index if not exists idx_gateway_monitor_events_org_created
  on public.gateway_monitor_events (org_id, created_at desc);

create index if not exists idx_gateway_monitor_events_org_tool
  on public.gateway_monitor_events (org_id, tool_name, created_at desc);

alter table public.gateway_monitor_events enable row level security;

drop policy if exists gateway_monitor_events_org_select on public.gateway_monitor_events;
create policy gateway_monitor_events_org_select
on public.gateway_monitor_events
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
