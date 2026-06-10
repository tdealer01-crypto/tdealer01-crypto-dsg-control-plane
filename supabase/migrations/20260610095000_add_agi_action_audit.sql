-- Create agi_action_audit table for delegation action audit trail
-- Each action is recorded with a deterministic hash, linked to the previous event.
create table if not exists agi_action_audit (
  event_id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  delegation_id text not null,
  agent_id text not null,

  tool text not null,
  action text not null,
  target text,
  risk text not null check (risk in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

  decision text not null check (decision in ('ALLOW', 'BLOCK')),
  reason text not null,

  evidence_json jsonb not null,
  previous_hash text,
  event_hash text not null,

  created_at timestamptz not null default now(),

  constraint agi_action_audit_event_hash_format check (event_hash ~ '^sha256:[a-f0-9]{64}$'),
  constraint agi_action_audit_previous_hash_format check (previous_hash is null or previous_hash ~ '^sha256:[a-f0-9]{64}$')
);

-- Index for efficient hash chain verification (links previous to current)
create index if not exists idx_agi_audit_chain
  on agi_action_audit(previous_hash, event_hash);

-- Index for job-scoped queries
create index if not exists idx_agi_audit_job
  on agi_action_audit(job_id, created_at desc);

-- Index for delegation-scoped queries
create index if not exists idx_agi_audit_delegation
  on agi_action_audit(delegation_id, created_at desc);

-- Index for agent-scoped queries
create index if not exists idx_agi_audit_agent
  on agi_action_audit(agent_id, created_at desc);

-- Index for decision queries
create index if not exists idx_agi_audit_decision
  on agi_action_audit(job_id, decision, created_at desc);

-- Index for risk queries
create index if not exists idx_agi_audit_risk
  on agi_action_audit(job_id, risk, created_at desc);

-- Enable RLS for agi_action_audit
alter table agi_action_audit enable row level security;

-- RLS policy: Allow authenticated users to read audit logs
-- (In production, restrict to users in the same org as the job owner)
create policy "agi_action_audit_read"
  on agi_action_audit
  for select
  using (true);

-- RLS policy: Allow system/service role to insert audit logs
create policy "agi_action_audit_insert"
  on agi_action_audit
  for insert
  with check (true);
