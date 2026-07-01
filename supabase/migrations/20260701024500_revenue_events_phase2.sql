create table if not exists public.revenue_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  org_id text not null,
  user_id text,
  event_type text not null,
  plan_id text,
  amount numeric,
  currency text not null default 'USD',
  source text not null,
  metadata jsonb
);

create index if not exists revenue_events_org_id_idx
  on public.revenue_events (org_id);

create index if not exists revenue_events_org_created_at_idx
  on public.revenue_events (org_id, created_at desc);

create index if not exists revenue_events_event_type_idx
  on public.revenue_events (event_type);

alter table public.revenue_events enable row level security;
