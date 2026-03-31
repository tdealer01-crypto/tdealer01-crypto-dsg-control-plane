create table if not exists runtime_roles (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id, role),
  constraint runtime_roles_role_chk check (role in ('org_admin','operator','reviewer','runtime_auditor','billing_admin'))
);

create table if not exists runtime_policies (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  name text not null,
  version text not null,
  status text not null default 'draft',
  thresholds jsonb not null default '{}'::jsonb,
  governance_state text not null default 'proposed',
  created_by uuid references users(id) on delete set null,
  updated_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name, version)
);

create table if not exists runtime_policy_governance_events (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  policy_id uuid not null references runtime_policies(id) on delete cascade,
  actor_user_id uuid references users(id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
