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

create table if not exists policies (
  id text primary key,
  name text not null,
  version text not null default 'v1',
  status text not null default 'active',
  description text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agents (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  policy_id text references policies(id) on update cascade,
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

create table if not exists org_sso_configs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique references organizations(id) on delete cascade,
  provider text not null default 'generic_saml',
  connection_id text,
  display_name text,
  login_hint text,
  is_enabled boolean not null default false,
  enforce_sso boolean not null default false,
  break_glass_email_login_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_sso_configs_provider_chk check (provider in ('generic_saml', 'workos'))
);

create table if not exists directory_sync_configs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique references organizations(id) on delete cascade,
  provider text not null default 'generic_scim',
  is_enabled boolean not null default false,
  group_sync_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint directory_sync_configs_provider_chk check (provider in ('generic_scim', 'workos_directory_sync'))
);

create table if not exists directory_group_role_mappings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  external_group_id text not null,
  external_group_name text,
  target_role text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, external_group_id),
  constraint directory_group_role_mappings_role_chk check (target_role in ('owner', 'admin', 'operator', 'viewer'))
);

create table if not exists directory_sync_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  event_type text not null,
  email text,
  external_user_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint directory_sync_events_type_chk check (event_type in ('jit_provision', 'jit_update', 'group_mapping_applied', 'sync_error'))
);

create table if not exists org_billing_policies (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique references organizations(id) on delete cascade,
  seat_activation_policy text not null default 'on_first_login',
  trial_requires_card boolean not null default false,
  managed_user_billing_mode text not null default 'bill_on_activation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_billing_policies_seat_activation_chk check (seat_activation_policy in ('on_first_login', 'on_provision')),
  constraint org_billing_policies_managed_mode_chk check (managed_user_billing_mode in ('bill_on_activation', 'bill_on_provision'))
);

create table if not exists seat_activations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  email text not null,
  user_id uuid references users(id) on delete set null,
  guest_grant_id uuid,
  role text,
  source text not null,
  activated_at timestamptz not null,
  billable_from timestamptz not null,
  created_at timestamptz not null default now(),
  unique (org_id, email)
);

create table if not exists org_onboarding_states (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique references organizations(id) on delete cascade,
  bootstrap_status text not null default 'pending',
  checklist jsonb not null default '{}'::jsonb,
  bootstrapped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint org_onboarding_states_bootstrap_status_chk check (bootstrap_status in ('pending', 'completed', 'failed'))
);

create index if not exists idx_directory_group_role_mappings_org_role on directory_group_role_mappings(org_id, target_role);
create index if not exists idx_seat_activations_org_activated on seat_activations(org_id, activated_at desc);
