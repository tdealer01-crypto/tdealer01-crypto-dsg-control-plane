create extension if not exists pgcrypto;

create table if not exists runtime_truth_state (
  org_id text primary key references organizations(id) on delete cascade,
  epoch integer not null default 1,
  sequence bigint not null default 0,
  v_t jsonb not null default '{}'::jsonb,
  t_t bigint not null default 0,
  g_t text not null default 'zone:origin',
  i_t text not null default 'net:bootstrap',
  s_star_hash text not null default '',
  updated_at timestamptz not null default now()
);

create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  request_id text not null,
  action text not null,
  input_hash text not null,
  approval_hash text not null,
  approved_at timestamptz not null default now(),
  expires_at timestamptz not null,
  epoch integer not null default 1,
  used_at timestamptz,
  status text not null default 'issued',
  metadata jsonb not null default '{}'::jsonb,
  unique (org_id, request_id),
  unique (approval_hash)
);

create table if not exists effects (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text references agents(id) on delete set null,
  request_id text not null,
  action text not null,
  effect_id text not null,
  payload_hash text not null,
  status text not null default 'started',
  external_receipt jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, effect_id)
);

create table if not exists ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text references agents(id) on delete set null,
  request_id text not null,
  approval_hash text,
  sequence bigint not null,
  epoch integer not null,
  action text not null,
  input_hash text not null,
  decision text not null,
  reason text,
  prev_state_hash text not null,
  next_state_hash text not null,
  effect_id text,
  logical_ts bigint not null,
  prev_entry_hash text not null,
  entry_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, sequence),
  unique (org_id, entry_hash)
);

create table if not exists state_checkpoints (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  sequence bigint not null,
  epoch integer not null,
  state_hash text not null,
  entry_hash text not null,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, sequence)
);

create index if not exists idx_approvals_org_agent on approvals(org_id, agent_id, approved_at desc);
create index if not exists idx_effects_org_created on effects(org_id, created_at desc);
create index if not exists idx_ledger_entries_org_created on ledger_entries(org_id, created_at desc);
create index if not exists idx_checkpoints_org_sequence on state_checkpoints(org_id, sequence desc);

create table if not exists mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text references agents(id) on delete set null,
  request_id text not null,
  tool_name text not null,
  approval_hash text,
  input_hash text not null,
  result_hash text,
  effect_id text,
  status text not null default 'started',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists agent_memory (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references organizations(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  memory_key text not null,
  memory_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, agent_id, memory_key)
);

create index if not exists idx_mcp_tool_calls_org_created on mcp_tool_calls(org_id, created_at desc);
create index if not exists idx_agent_memory_org_agent on agent_memory(org_id, agent_id);
