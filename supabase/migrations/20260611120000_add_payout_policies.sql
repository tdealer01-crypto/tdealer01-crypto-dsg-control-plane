-- Payout Safety Settings: policy table + usage tracking

create table if not exists dsg_payout_policies (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,

  max_payout_amount bigint not null default 50000,
  daily_limit bigint not null default 100000,
  weekly_limit bigint not null default 500000,
  monthly_limit bigint not null default 2000000,

  max_payouts_per_day int not null default 3,
  min_minutes_between_payouts int not null default 120,

  allowed_currency text not null default 'THB',
  allowed_destinations jsonb not null default '[]'::jsonb,

  new_destination_hold_hours int not null default 24,

  low_risk_action text not null default 'ALLOW',
  medium_risk_action text not null default 'REVIEW',
  high_risk_action text not null default 'REVIEW',
  critical_risk_action text not null default 'BLOCK',

  approval_threshold_amount bigint not null default 50000,
  two_person_approval_threshold bigint,

  allowed_days jsonb not null default '["MON","TUE","WED","THU","FRI"]'::jsonb,
  allowed_time_start text not null default '09:00',
  allowed_time_end text not null default '18:00',

  automation_enabled boolean not null default true,
  emergency_paused boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Payout usage tracking for period aggregation
create table if not exists dsg_payout_usage (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  amount bigint not null,
  currency text not null default 'THB',
  destination_id text,
  decision text not null,
  payout_ref text,
  evaluated_at timestamptz not null default now()
);

create index if not exists idx_dsg_payout_usage_org_time
  on dsg_payout_usage (org_id, evaluated_at desc);

-- Auto-update updated_at
create or replace function dsg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists trg_payout_policies_updated_at on dsg_payout_policies;
create trigger trg_payout_policies_updated_at
  before update on dsg_payout_policies
  for each row execute function dsg_set_updated_at();

-- RLS
alter table dsg_payout_policies enable row level security;
alter table dsg_payout_usage enable row level security;

drop policy if exists "org owner reads own policy" on dsg_payout_policies;
create policy "org owner reads own policy" on dsg_payout_policies
  for select using (org_id = auth.uid()::text);

drop policy if exists "org owner writes own policy" on dsg_payout_policies;
create policy "org owner writes own policy" on dsg_payout_policies
  for all using (org_id = auth.uid()::text);

drop policy if exists "org owner reads own usage" on dsg_payout_usage;
create policy "org owner reads own usage" on dsg_payout_usage
  for select using (org_id = auth.uid()::text);

drop policy if exists "org owner inserts own usage" on dsg_payout_usage;
create policy "org owner inserts own usage" on dsg_payout_usage
  for insert with check (org_id = auth.uid()::text);
