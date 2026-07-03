-- DSG Gate Marketplace Stripe Integration Schema
-- Creates tables for seller onboarding, transactions, and payouts

create extension if not exists pgcrypto;

-- Sellers table: Core seller account and KYC information
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  stripe_account_id text unique,
  business_name text not null,
  kyc_status text not null default 'pending' check (kyc_status in ('pending', 'in_review', 'verified', 'rejected')),
  kyc_account_link_url text,
  fee_percentage numeric not null default 10 check (fee_percentage >= 0 and fee_percentage <= 100),
  payout_schedule text not null default 'weekly' check (payout_schedule in ('daily', 'weekly', 'biweekly', 'monthly')),
  stripe_dashboard_access boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seller transactions table: Individual checkout session records
create table if not exists public.seller_transactions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  checkout_session_id text unique not null,
  customer_email text not null,
  amount_total bigint not null check (amount_total > 0),
  platform_fee bigint not null check (platform_fee >= 0),
  seller_payout bigint not null check (seller_payout > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'refunded', 'failed')),
  created_at timestamptz not null default now()
);

-- Seller payouts table: Aggregated payout records to Stripe connected accounts
create table if not exists public.seller_payouts (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers(id) on delete cascade,
  amount bigint not null check (amount > 0),
  stripe_payout_id text,
  status text not null default 'pending' check (status in ('pending', 'in_transit', 'paid', 'failed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Create indexes for common queries
create index if not exists idx_sellers_user_id
  on public.sellers(user_id);

create index if not exists idx_sellers_stripe_account_id
  on public.sellers(stripe_account_id);

create index if not exists idx_sellers_kyc_status
  on public.sellers(kyc_status);

create index if not exists idx_sellers_updated_at
  on public.sellers(updated_at desc);

create index if not exists idx_seller_transactions_seller_id
  on public.seller_transactions(seller_id);

create index if not exists idx_seller_transactions_checkout_session_id
  on public.seller_transactions(checkout_session_id);

create index if not exists idx_seller_transactions_customer_email
  on public.seller_transactions(customer_email);

create index if not exists idx_seller_transactions_status
  on public.seller_transactions(status);

create index if not exists idx_seller_transactions_created_at
  on public.seller_transactions(created_at desc);

create index if not exists idx_seller_payouts_seller_id
  on public.seller_payouts(seller_id);

create index if not exists idx_seller_payouts_stripe_payout_id
  on public.seller_payouts(stripe_payout_id);

create index if not exists idx_seller_payouts_status
  on public.seller_payouts(status);

create index if not exists idx_seller_payouts_created_at
  on public.seller_payouts(created_at desc);

-- Enable row-level security
alter table public.sellers enable row level security;
alter table public.seller_transactions enable row level security;
alter table public.seller_payouts enable row level security;

-- RLS Policies: sellers - authenticated users can read their own record
drop policy if exists sellers_select_own on public.sellers;
create policy sellers_select_own
  on public.sellers
  for select
  to authenticated
  using (user_id = auth.uid());

-- RLS Policies: sellers - authenticated users can update their own record
drop policy if exists sellers_update_own on public.sellers;
create policy sellers_update_own
  on public.sellers
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- RLS Policies: sellers - authenticated users can insert their own record
drop policy if exists sellers_insert_own on public.sellers;
create policy sellers_insert_own
  on public.sellers
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- RLS Policies: seller_transactions - sellers can read their own transactions
drop policy if exists seller_transactions_select_own on public.seller_transactions;
create policy seller_transactions_select_own
  on public.seller_transactions
  for select
  to authenticated
  using (
    seller_id in (
      select id from public.sellers where user_id = auth.uid()
    )
  );

-- RLS Policies: seller_transactions - system can insert (via service role)
-- This allows the API to insert transactions without row-level restrictions
drop policy if exists seller_transactions_insert_service on public.seller_transactions;
create policy seller_transactions_insert_service
  on public.seller_transactions
  for insert
  to service_role
  with check (true);

-- RLS Policies: seller_payouts - sellers can read their own payouts
drop policy if exists seller_payouts_select_own on public.seller_payouts;
create policy seller_payouts_select_own
  on public.seller_payouts
  for select
  to authenticated
  using (
    seller_id in (
      select id from public.sellers where user_id = auth.uid()
    )
  );

-- RLS Policies: seller_payouts - system can insert (via service role)
drop policy if exists seller_payouts_insert_service on public.seller_payouts;
create policy seller_payouts_insert_service
  on public.seller_payouts
  for insert
  to service_role
  with check (true);
