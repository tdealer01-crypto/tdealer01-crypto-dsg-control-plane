create table if not exists integration_profiles (
  id text primary key,
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade unique,
  email text not null,
  app_name text not null,
  webhook_url text,
  allowed_origins jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists integration_profiles_org_idx on integration_profiles(org_id);
create index if not exists integration_profiles_status_idx on integration_profiles(status);
