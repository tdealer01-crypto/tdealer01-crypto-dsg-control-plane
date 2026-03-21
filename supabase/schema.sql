create table if not exists organizations (
  id uuid primary key,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists agents (
  id uuid primary key,
  org_id uuid,
  name text not null,
  api_key_hash text not null,
  policy_id uuid,
  status text not null default 'active',
  monthly_limit integer default 10000,
  created_at timestamptz default now()
);

create table if not exists executions (
  id uuid primary key,
  org_id uuid,
  agent_id uuid,
  decision text not null,
  latency_ms integer not null,
  request_payload jsonb,
  context_payload jsonb,
  created_at timestamptz default now()
);

create table if not exists usage_counters (
  id uuid primary key,
  org_id uuid,
  agent_id uuid,
  billing_period text not null,
  executions integer not null default 0,
  updated_at timestamptz default now()
);
