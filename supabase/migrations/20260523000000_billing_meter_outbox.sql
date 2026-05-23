-- Billing Meter Outbox
--
-- Guarantees no silent loss of metered billing events when Stripe is unavailable.
-- Pattern: write here first, flush to Stripe async via hourly cron.
-- Status lifecycle: pending → sent | failed

create table if not exists billing_meter_outbox (
  id                 uuid        primary key default gen_random_uuid(),
  execution_id       text        not null unique,
  org_id             text        not null,
  stripe_customer_id text        not null,
  event_name         text        not null,
  quantity           int         not null default 1,
  status             text        not null default 'pending'
                                 check (status in ('pending', 'sent', 'failed')),
  stripe_event_id    text,
  error              text,
  created_at         timestamptz not null default now(),
  flushed_at         timestamptz
);

-- Partial index: flusher only scans pending rows
create index if not exists billing_meter_outbox_pending_idx
  on billing_meter_outbox (created_at)
  where status = 'pending';

-- RLS: service role only (no user-facing access)
alter table billing_meter_outbox enable row level security;
