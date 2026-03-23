create extension if not exists pgcrypto;

create table if not exists public.billing_customers (
  stripe_customer_id text primary key,
  org_id text,
  email text,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_subscriptions (
  stripe_subscription_id text primary key,
  stripe_customer_id text references public.billing_customers(stripe_customer_id) on delete set null,
  org_id text,
  customer_email text,
  status text not null,
  plan_key text,
  billing_interval text,
  price_id text,
  product_id text,
  cancel_at_period_end boolean not null default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.billing_events (
  stripe_event_id text primary key,
  event_type text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz not null default now()
);

create index if not exists idx_billing_customers_org_id
  on public.billing_customers(org_id);

create index if not exists idx_billing_customers_email
  on public.billing_customers(email);

create index if not exists idx_billing_subscriptions_org_id
  on public.billing_subscriptions(org_id);

create index if not exists idx_billing_subscriptions_customer_id
  on public.billing_subscriptions(stripe_customer_id);

create index if not exists idx_billing_subscriptions_status
  on public.billing_subscriptions(status);

create index if not exists idx_billing_subscriptions_plan_interval
  on public.billing_subscriptions(plan_key, billing_interval);

create index if not exists idx_billing_events_type_created_at
  on public.billing_events(event_type, created_at desc);
