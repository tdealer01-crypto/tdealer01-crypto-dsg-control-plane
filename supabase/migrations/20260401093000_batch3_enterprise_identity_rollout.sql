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

create index if not exists idx_directory_group_role_mappings_org_role
  on directory_group_role_mappings (org_id, target_role);

create index if not exists idx_seat_activations_org_activated
  on seat_activations (org_id, activated_at desc);
