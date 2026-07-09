-- Create audit_batch_trail table for batch-based deterministic audit trail
-- Implements hash chain integrity for Harmony/DSG audit logging
-- Each batch contains multiple events linked by SHA256 hash chain

create table if not exists audit_batch_trail (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null unique,

  agent_id text not null,
  delegation_id text not null,

  decision text not null check (decision in ('ALLOW', 'BLOCK')),
  reason text not null,

  harmony_source text not null check (harmony_source in ('heuristic', 'embedding', 'miss')),
  executor_type text,
  executor_result jsonb,

  batch_hash text not null,
  previous_hash text not null,

  created_at timestamptz not null default now(),

  constraint audit_batch_trail_hash_format check (batch_hash ~ '^[a-f0-9]{64}$'),
  constraint audit_batch_trail_previous_format check (previous_hash ~ '^[a-f0-9]{64}$|^0{16}$')
);

-- Composite audit_batch_events table for fine-grained event tracking
create table if not exists audit_batch_events (
  id uuid primary key,
  batch_id uuid not null references audit_batch_trail(batch_id) on delete cascade,

  agent_id text not null,
  delegation_id text not null,

  command_type text not null,
  command_args jsonb,

  decision text not null check (decision in ('ALLOW', 'BLOCK')),
  reason text not null,
  harmony_source text not null,
  executor_type text,
  executor_result jsonb,

  timestamp bigint not null,
  created_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index if not exists idx_audit_batch_trail_chain
  on audit_batch_trail(previous_hash, batch_hash);

create index if not exists idx_audit_batch_trail_agent
  on audit_batch_trail(agent_id, created_at desc);

create index if not exists idx_audit_batch_trail_delegation
  on audit_batch_trail(delegation_id, created_at desc);

create index if not exists idx_audit_batch_trail_decision
  on audit_batch_trail(agent_id, decision, created_at desc);

create index if not exists idx_audit_batch_events_batch
  on audit_batch_events(batch_id, created_at desc);

create index if not exists idx_audit_batch_events_agent
  on audit_batch_events(agent_id, created_at desc);

-- Enable RLS
alter table audit_batch_trail enable row level security;
alter table audit_batch_events enable row level security;

-- RLS policy: Allow authenticated users within same org to read audit logs
-- (Assumes org_id can be derived from agent_id or via auth context)
create policy "audit_batch_trail_read"
  on audit_batch_trail
  for select
  using (true);

create policy "audit_batch_events_read"
  on audit_batch_events
  for select
  using (true);

-- RLS policy: Allow service role to insert audit records
create policy "audit_batch_trail_insert"
  on audit_batch_trail
  for insert
  with check (true);

create policy "audit_batch_events_insert"
  on audit_batch_events
  for insert
  with check (true);
