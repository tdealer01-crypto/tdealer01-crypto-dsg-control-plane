-- Marketplace Sellers Table
-- Tracks seller onboarding via Stripe Connect (Accounts v2)

create table if not exists public.marketplace_sellers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.users(id) on delete restrict,
  business_name text not null,
  email text not null,
  country text not null,
  stripe_account_id text unique,
  account_link_url text,
  kyc_status text default 'pending' check (kyc_status in ('pending', 'verified', 'failed')),
  stripe_dashboard_type text default 'express',
  stripe_account_created_at timestamp with time zone,
  verified_at timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Indexes for common queries
create index if not exists idx_marketplace_sellers_org_id on public.marketplace_sellers(org_id);
create index if not exists idx_marketplace_sellers_user_id on public.marketplace_sellers(user_id);
create index if not exists idx_marketplace_sellers_email on public.marketplace_sellers(email);
create index if not exists idx_marketplace_sellers_stripe_account_id on public.marketplace_sellers(stripe_account_id);
create index if not exists idx_marketplace_sellers_kyc_status on public.marketplace_sellers(kyc_status);

-- Row Level Security
alter table public.marketplace_sellers enable row level security;

-- Policy: Users can view sellers in their org
drop policy if exists marketplace_sellers_select on public.marketplace_sellers;
create policy marketplace_sellers_select on public.marketplace_sellers
  for select
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Users can insert sellers for their org
drop policy if exists marketplace_sellers_insert on public.marketplace_sellers;
create policy marketplace_sellers_insert on public.marketplace_sellers
  for insert
  with check (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );

-- Policy: Users can update their own seller profiles
drop policy if exists marketplace_sellers_update on public.marketplace_sellers;
create policy marketplace_sellers_update on public.marketplace_sellers
  for update
  using (
    user_id = (select id from public.users where auth_user_id = auth.uid())
    or org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );

-- Audit log table for seller events (KYC status changes, etc.)
create table if not exists public.marketplace_seller_events (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.marketplace_sellers(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  event_type text not null,
  previous_status text,
  new_status text,
  metadata jsonb,
  created_at timestamp with time zone default now()
);

-- Indexes for audit
create index if not exists idx_seller_events_seller_id on public.marketplace_seller_events(seller_id);
create index if not exists idx_seller_events_org_id on public.marketplace_seller_events(org_id);
create index if not exists idx_seller_events_event_type on public.marketplace_seller_events(event_type);

-- RLS for audit
alter table public.marketplace_seller_events enable row level security;

drop policy if exists seller_events_select on public.marketplace_seller_events;
create policy seller_events_select on public.marketplace_seller_events
  for select
  using (
    org_id = (select org_id from public.users where auth_user_id = auth.uid())
  );
