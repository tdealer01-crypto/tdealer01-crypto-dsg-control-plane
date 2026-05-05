-- DSG Agent Command Gate
-- This is the production-oriented checkpoint model:
-- DSG checks and records the agent command, returns an action envelope, and the agent executes externally.
-- The agent must return the observed result for audit/evidence/replay recording.

create table if not exists public.dsg_agent_command_gate_decisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  agent_id text not null,
  session_id text not null,
  command_id text not null,
  target_system_id text not null,
  operation_name text not null,
  action_type text not null check (action_type in ('observe', 'read', 'write', 'delete', 'payment', 'deploy', 'admin')),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  decision text not null check (decision in ('PASS', 'REVIEW', 'BLOCK')),
  can_agent_execute boolean not null default false,
  command_hash text not null,
  decision_hash text not null unique,
  action_envelope jsonb,
  invariant_checks jsonb not null,
  request_payload jsonb not null,
  response_payload jsonb not null,
  pre_audit_event_id text not null,
  evidence_manifest_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create unique index if not exists idx_dsg_agent_command_gate_unique_command
  on public.dsg_agent_command_gate_decisions (workspace_id, agent_id, session_id, command_id);

create index if not exists idx_dsg_agent_command_gate_workspace_created
  on public.dsg_agent_command_gate_decisions (workspace_id, created_at desc);

create index if not exists idx_dsg_agent_command_gate_decision
  on public.dsg_agent_command_gate_decisions (decision, can_agent_execute);

create table if not exists public.dsg_agent_action_result_receipts (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  agent_id text not null,
  session_id text not null,
  command_id text not null,
  envelope_id text not null,
  decision_hash text not null references public.dsg_agent_command_gate_decisions(decision_hash),
  status text not null check (status in ('SUCCESS', 'FAILED', 'SKIPPED', 'BLOCKED_BY_TARGET', 'PARTIAL')),
  target_system_receipt_id text,
  observed_result_hash text not null,
  result_hash text not null,
  receipt_hash text not null unique,
  evidence_item_ids jsonb not null,
  error_class text,
  error_message text,
  request_payload jsonb not null,
  response_payload jsonb not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  recorded_at timestamptz not null default now()
);

create index if not exists idx_dsg_agent_action_result_workspace_recorded
  on public.dsg_agent_action_result_receipts (workspace_id, recorded_at desc);

create index if not exists idx_dsg_agent_action_result_command
  on public.dsg_agent_action_result_receipts (workspace_id, agent_id, session_id, command_id);

alter table public.dsg_agent_command_gate_decisions enable row level security;
alter table public.dsg_agent_action_result_receipts enable row level security;

comment on table public.dsg_agent_command_gate_decisions is
  'DB-backed command checkpoint decisions. DSG records the proposed agent command and returns an action envelope only when gates pass.';

comment on table public.dsg_agent_action_result_receipts is
  'DB-backed receipts from agents after they execute approved command envelopes externally.';
