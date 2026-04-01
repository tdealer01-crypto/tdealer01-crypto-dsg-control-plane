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

create index if not exists idx_guest_access_grants_org_email on guest_access_grants(org_id, email);
create index if not exists idx_guest_access_grants_org_status on guest_access_grants(org_id, status);

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

create index if not exists idx_access_requests_email_status on access_requests(email, status);
create index if not exists idx_access_requests_domain_status on access_requests(email_domain, status);
create index if not exists idx_access_requests_status_created on access_requests(status, created_at desc);

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

create index if not exists idx_sign_in_events_email_created on sign_in_events(email, created_at desc);
create index if not exists idx_sign_in_events_org_created on sign_in_events(org_id, created_at desc);
create index if not exists idx_sign_in_events_event_created on sign_in_events(event_type, created_at desc);
