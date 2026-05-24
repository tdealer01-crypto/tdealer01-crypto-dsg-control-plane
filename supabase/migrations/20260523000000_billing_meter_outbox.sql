-- Durable Stripe Billing Meter outbox.
--
-- P0 revenue-hardening goal:
-- A successful paid execution must have a durable internal billing record
-- before any best-effort Stripe delivery attempt is made.

create table if not exists public.billing_meter_outbox (
  id uuid primary key default gen_random_uuid(),
  execution_id text not null unique,
  org_id text not null,
  stripe_customer_id text not null,
  event_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  stripe_event_id text,
  error text,
  created_at timestamptz not null default now(),
  flushed_at timestamptz
);

create index if not exists idx_billing_meter_outbox_pending
  on public.billing_meter_outbox(status, created_at)
  where status = 'pending';

create index if not exists idx_billing_meter_outbox_failed
  on public.billing_meter_outbox(status, created_at)
  where status = 'failed';

alter table public.billing_meter_outbox enable row level security;
