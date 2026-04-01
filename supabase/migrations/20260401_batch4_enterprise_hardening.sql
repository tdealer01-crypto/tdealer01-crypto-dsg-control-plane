create extension if not exists pgcrypto;

create table if not exists org_domains (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  domain text not null,
  status text not null default 'approved' check (status in ('approved','verified','disabled')),
  verification_method text null,
  verification_token text null,
  verified_at timestamptz null,
  claim_mode text not null default 'manual' check (claim_mode in ('manual','automatic')),
  auto_join_mode text not null default 'disabled' check (auto_join_mode in ('disabled','auto_join','require_approval')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, domain)
);
create index if not exists idx_org_domains_domain_status on org_domains(domain, status);

create table if not exists sign_in_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  email text not null,
  result text not null default 'success',
  created_at timestamptz not null default now()
);

create table if not exists access_requests (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  email text not null,
  reason text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists guest_access_grants (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  email text not null,
  scope text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists onboarding_states (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists org_security_settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,
  sso_enabled boolean not null default false,
  sso_enforced boolean not null default false,
  break_glass_email_enabled boolean not null default true,
  sso_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists security_event_stream_configs (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,
  destination_type text not null default 'webhook' check (destination_type in ('webhook')),
  webhook_url text null,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key_type text not null check (key_type in ('ip','email','org_id')),
  key_value text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_rate_limit_events_lookup on rate_limit_events(scope, key_type, key_value, created_at desc);
