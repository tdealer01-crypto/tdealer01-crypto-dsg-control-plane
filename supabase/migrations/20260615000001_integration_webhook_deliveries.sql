-- Integration webhook deliveries table
create table if not exists public.integration_webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null references public.integration_profiles(id) on delete cascade,
  event text not null,
  status text not null default 'pending' check (status in ('delivered','failed','dead_letter','retrying','pending')),
  response_code integer,
  duration_ms integer,
  attempt integer not null default 1,
  error_message text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.integration_webhook_deliveries enable row level security;

-- Org members can view webhook deliveries for their org
create policy "org members can view integration webhook deliveries"
  on public.integration_webhook_deliveries
  for select
  using (
    webhook_id in (
      select id from public.integration_profiles
      where org_id in (
        select org_id from public.org_members where user_id = auth.uid()
      )
    )
  );

-- Indexes for query performance
create index if not exists integration_webhook_deliveries_webhook_idx
  on public.integration_webhook_deliveries(webhook_id);

create index if not exists integration_webhook_deliveries_created_idx
  on public.integration_webhook_deliveries(created_at desc);

create index if not exists integration_webhook_deliveries_status_idx
  on public.integration_webhook_deliveries(status);

-- Add webhook_secret_hash column to integration_profiles if not exists
alter table public.integration_profiles
add column if not exists webhook_secret_hash text;

-- RPC function to ensure delivery table exists (idempotent)
create or replace function public.ensure_integration_webhook_deliveries_table()
returns void
language plpgsql
as $$
begin
  -- Table creation is handled by migration, this is a no-op placeholder
  -- for any runtime checks
  null;
end;
$$;