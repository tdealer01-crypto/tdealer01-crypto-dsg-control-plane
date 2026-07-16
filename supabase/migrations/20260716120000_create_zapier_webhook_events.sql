-- Zapier Revenue Automation webhook event logs.
-- Written only by the service-role webhook route (app/api/webhooks/zapier/[...path]/route.ts)
-- after HMAC signature verification. org_id is resolved best-effort from
-- billing_customers.stripe_customer_id and left null when the customer can't
-- yet be matched — rows stay visible to service role and can be reconciled
-- later, mirroring marketplace_events' "log now, link later" approach.

create table if not exists public.zapier_payment_events (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete set null,
  customer_id text not null,
  payment_id text not null,
  invoice_number text,
  amount numeric not null,
  currency text not null,
  status text not null,
  occurred_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint zapier_payment_events_status_chk
    check (status in ('completed', 'failed', 'pending', 'refunded'))
);

create unique index if not exists zapier_payment_events_payment_id_idx
  on public.zapier_payment_events (payment_id);

create index if not exists idx_zapier_payment_events_org_created
  on public.zapier_payment_events (org_id, created_at desc);

create table if not exists public.zapier_quota_events (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete set null,
  customer_id text not null,
  service_type text not null,
  quota_allocated numeric not null,
  usage_current numeric not null,
  usage_percent numeric not null,
  health_status text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint zapier_quota_events_health_status_chk
    check (health_status in ('healthy', 'warning', 'critical'))
);

create index if not exists idx_zapier_quota_events_org_created
  on public.zapier_quota_events (org_id, created_at desc);

create index if not exists idx_zapier_quota_events_customer_created
  on public.zapier_quota_events (customer_id, created_at desc);

create table if not exists public.zapier_communication_events (
  id uuid primary key default gen_random_uuid(),
  org_id text references public.organizations(id) on delete set null,
  customer_id text not null,
  email text not null,
  type text not null,
  subject text,
  status text not null,
  occurred_at timestamptz not null,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint zapier_communication_events_type_chk
    check (type in ('invoice', 'reminder', 'alert', 'update')),
  constraint zapier_communication_events_status_chk
    check (status in ('sent', 'failed', 'pending'))
);

create index if not exists idx_zapier_communication_events_org_created
  on public.zapier_communication_events (org_id, created_at desc);

create index if not exists idx_zapier_communication_events_customer_created
  on public.zapier_communication_events (customer_id, created_at desc);

alter table public.zapier_payment_events enable row level security;
alter table public.zapier_quota_events enable row level security;
alter table public.zapier_communication_events enable row level security;

-- Org-isolated read access: an authenticated user only sees rows whose
-- org_id matches their own active org membership (service role bypasses RLS
-- and remains the only writer via the webhook route).
drop policy if exists zapier_payment_events_org_select on public.zapier_payment_events;
create policy zapier_payment_events_org_select
on public.zapier_payment_events
for select
to authenticated
using (exists (
  select 1 from public.users u
  where u.auth_user_id::text = auth.uid()::text
    and u.is_active = true
    and u.org_id::text = zapier_payment_events.org_id
));

drop policy if exists zapier_quota_events_org_select on public.zapier_quota_events;
create policy zapier_quota_events_org_select
on public.zapier_quota_events
for select
to authenticated
using (exists (
  select 1 from public.users u
  where u.auth_user_id::text = auth.uid()::text
    and u.is_active = true
    and u.org_id::text = zapier_quota_events.org_id
));

drop policy if exists zapier_communication_events_org_select on public.zapier_communication_events;
create policy zapier_communication_events_org_select
on public.zapier_communication_events
for select
to authenticated
using (exists (
  select 1 from public.users u
  where u.auth_user_id::text = auth.uid()::text
    and u.is_active = true
    and u.org_id::text = zapier_communication_events.org_id
));
