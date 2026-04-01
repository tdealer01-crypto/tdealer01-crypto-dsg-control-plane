create extension if not exists pgcrypto;

create table if not exists organizations (
  id text primary key,
  name text not null,
  slug text unique not null,
  plan text default 'trial',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);


create table if not exists trial_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  workspace_name text not null,
  full_name text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  org_id text references organizations(id) on delete cascade,
  email text unique not null,
  role text default 'owner',
  auth_provider text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists agents (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  policy_id text,
  status text default 'active',
  monthly_limit integer default 10000,
  api_key_hash text not null,
  last_used_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists executions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  decision text not null,
  latency_ms integer default 0,
  request_payload jsonb default '{}'::jsonb,
  context_payload jsonb default '{}'::jsonb,
  policy_version text,
  reason text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  execution_id uuid references executions(id) on delete set null,
  policy_version text,
  decision text,
  reason text,
  evidence jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text references agents(id) on delete set null,
  execution_id uuid references executions(id) on delete set null,
  event_type text not null,
  quantity integer default 1,
  unit text default 'execution',
  amount_usd numeric(12,3) default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists usage_counters (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text references agents(id) on delete cascade,
  billing_period text not null,
  executions integer default 0,
  updated_at timestamptz default now(),
  unique (agent_id, billing_period)
);

create table if not exists billing_customers (
  id uuid primary key default gen_random_uuid(),
  stripe_customer_id text unique not null,
  org_id text references organizations(id) on delete set null,
  email text,
  name text,
  updated_at timestamptz default now()
);

create table if not exists billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  stripe_subscription_id text unique not null,
  stripe_customer_id text,
  org_id text references organizations(id) on delete set null,
  customer_email text,
  status text,
  plan_key text,
  billing_interval text,
  price_id text,
  product_id text,
  cancel_at_period_end boolean default false,
  current_period_start timestamptz,
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  metadata jsonb default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb default '{}'::jsonb,
  processed_at timestamptz default now()
);

create index if not exists idx_users_org_id on users(org_id);
create index if not exists idx_agents_org_id on agents(org_id);
create index if not exists idx_executions_org_id on executions(org_id);
create index if not exists idx_executions_agent_id on executions(agent_id);
create index if not exists idx_executions_created_at on executions(created_at desc);
create index if not exists idx_audit_logs_org_id on audit_logs(org_id);
create index if not exists idx_usage_events_org_id on usage_events(org_id);
create index if not exists idx_usage_counters_org_period on usage_counters(org_id, billing_period);
create index if not exists idx_billing_subscriptions_org_id on billing_subscriptions(org_id);
create index if not exists idx_billing_events_customer on billing_events(stripe_customer_id);

create index if not exists idx_trial_signups_email_status on trial_signups(email, status, created_at desc);
create unique index if not exists idx_trial_signups_completed_email on trial_signups(email) where status = 'completed';

create table if not exists guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'guest_auditor',
  invited_by_user_id uuid null references users(id) on delete set null,
  scope jsonb not null default '{}'::jsonb,
  expires_at timestamptz null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint guest_access_grants_role_chk check (role in ('guest_auditor')),
  constraint guest_access_grants_status_chk check (status in ('active', 'expired', 'revoked'))
);

create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_domain text not null,
  workspace_name text null,
  full_name text null,
  requested_org_hint text null,
  status text not null default 'pending',
  reviewed_by_user_id uuid null references users(id) on delete set null,
  review_note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_requests_status_chk check (status in ('pending', 'approved', 'denied'))
);

create table if not exists sign_in_events (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  org_id text null references organizations(id) on delete set null,
  auth_user_id uuid null,
  event_type text not null,
  source text null,
  ip_address text null,
  user_agent text null,
  success boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint sign_in_events_event_type_chk check (event_type in ('magic_link_requested', 'magic_link_verified', 'request_access_submitted', 'sign_out'))
);

create index if not exists idx_guest_access_grants_org_email on guest_access_grants(org_id, email);
create index if not exists idx_guest_access_grants_org_status on guest_access_grants(org_id, status);
create index if not exists idx_access_requests_email_status on access_requests(email, status);
create index if not exists idx_access_requests_domain_status on access_requests(email_domain, status);
create index if not exists idx_access_requests_status_created on access_requests(status, created_at desc);
create index if not exists idx_sign_in_events_email_created on sign_in_events(email, created_at desc);
create index if not exists idx_sign_in_events_org_created on sign_in_events(org_id, created_at desc);
create index if not exists idx_sign_in_events_event_created on sign_in_events(event_type, created_at desc);
