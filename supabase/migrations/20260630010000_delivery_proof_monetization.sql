-- Delivery Proof Monetization Schema
-- Tracks scan tiers, usage, and payment eligibility

create table if not exists delivery_proof_scans (
  id bigint primary key generated always as identity,
  run_id text unique not null,
  org_id uuid,
  user_id uuid,
  
  -- Scan metadata
  production_url text not null,
  repo_url text,
  claim_result text, -- 'EVIDENCE COMPLETE' | 'PRODUCTION BLOCKED' | 'PENDING'
  
  -- Check results
  checks_passed integer,
  checks_total integer,
  
  -- Monetization
  tier text default 'free', -- 'free' | 'pro_scan' | 'unlimited'
  stripe_event_id text,
  metered_event_sent boolean default false,
  cost_credits integer default 10,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  constraint org_id_length check (org_id is null or length(org_id::text) > 0)
);

-- Track org subscription tier eligibility
create table if not exists delivery_proof_entitlements (
  id bigint primary key generated always as identity,
  org_id uuid not null unique,
  
  -- Tier tracking
  current_tier text default 'free', -- 'free' | 'pro' | 'business' | 'enterprise'
  scans_included_monthly integer default 1,
  scans_used_this_month integer default 0,
  scans_overage_charged integer default 0,
  
  -- Stripe
  customer_id text,
  subscription_id text,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create indexes
create index if not exists idx_delivery_proof_scans_run_id on delivery_proof_scans(run_id);
create index if not exists idx_delivery_proof_scans_org_id on delivery_proof_scans(org_id);
create index if not exists idx_delivery_proof_scans_created_at on delivery_proof_scans(created_at);
create index if not exists idx_delivery_proof_entitlements_org_id on delivery_proof_entitlements(org_id);

-- Enable RLS
alter table delivery_proof_scans enable row level security;
alter table delivery_proof_entitlements enable row level security;

-- RLS policies
create policy "Users can view their org's delivery proof scans"
  on delivery_proof_scans for select
  using (org_id = auth.uid()::text::uuid or org_id is null);

create policy "Users can view their org's entitlements"
  on delivery_proof_entitlements for select
  using (org_id = auth.uid()::text::uuid);
