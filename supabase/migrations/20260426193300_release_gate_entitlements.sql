create table if not exists public.release_gate_entitlements (
  id uuid primary key default gen_random_uuid(),
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  plan text not null default 'pro',
  status text not null,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_release_gate_entitlements_email
  on public.release_gate_entitlements (email);

create index if not exists idx_release_gate_entitlements_customer
  on public.release_gate_entitlements (stripe_customer_id);

alter table public.release_gate_entitlements enable row level security;
