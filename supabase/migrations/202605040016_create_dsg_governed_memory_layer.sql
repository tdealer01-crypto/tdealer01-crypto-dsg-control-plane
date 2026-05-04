-- Step 16C: DSG Governed Memory Layer
-- Status: schema foundation only. Memory is evidence candidate, not source of truth.
-- This migration intentionally enables RLS without broad client policies.
-- Server-side repositories with service-role + DSG RBAC must mediate access.

create extension if not exists pgcrypto;

create table if not exists dsg_memory_events (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  job_id uuid,
  actor_id text not null,
  actor_role text not null,

  source_type text not null check (
    source_type in (
      'conversation',
      'agent_step',
      'approval',
      'command_output',
      'test_output',
      'deployment_log',
      'manual_note',
      'system_event'
    )
  ),

  memory_kind text not null check (
    memory_kind in (
      'policy',
      'decision',
      'preference',
      'requirement',
      'risk',
      'command',
      'evidence',
      'workflow',
      'project_context',
      'claim',
      'unknown'
    )
  ),

  raw_text text not null,
  normalized_summary text,

  trust_level text not null default 'user_supplied' check (
    trust_level in (
      'observed',
      'verified',
      'user_supplied',
      'system_generated',
      'unverified'
    )
  ),

  status text not null default 'active' check (
    status in (
      'active',
      'stale',
      'conflicted',
      'redacted',
      'blocked',
      'deleted'
    )
  ),

  contains_secret boolean not null default false,
  contains_pii boolean not null default false,
  contains_legal_claim boolean not null default false,
  contains_production_claim boolean not null default false,

  source_evidence_id uuid,
  source_audit_id uuid,

  content_hash text not null,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dsg_memory_events_content_hash_not_blank check (length(trim(content_hash)) > 0),
  constraint dsg_memory_events_raw_text_not_blank check (length(trim(raw_text)) > 0)
);

create table if not exists dsg_memory_edges (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  from_memory_id uuid not null references dsg_memory_events(id) on delete cascade,
  to_memory_id uuid not null references dsg_memory_events(id) on delete cascade,

  edge_type text not null check (
    edge_type in (
      'supports',
      'contradicts',
      'updates',
      'depends_on',
      'derived_from',
      'same_topic',
      'blocks',
      'approves',
      'references'
    )
  ),

  confidence numeric not null default 1.0 check (confidence >= 0 and confidence <= 1),
  reason text,

  created_at timestamptz not null default now(),

  constraint dsg_memory_edges_no_self_edge check (from_memory_id <> to_memory_id)
);

create table if not exists dsg_memory_retrievals (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  job_id uuid,
  actor_id text not null,

  query_text text not null,
  retrieval_scope jsonb not null default '{}'::jsonb,

  retrieved_memory_ids uuid[] not null default '{}',
  blocked_memory_ids uuid[] not null default '{}',
  review_memory_ids uuid[] not null default '{}',

  gate_status text not null check (
    gate_status in ('PASS', 'BLOCK', 'REVIEW', 'UNSUPPORTED')
  ),

  gate_reasons text[] not null default '{}',
  context_pack_id uuid,

  created_at timestamptz not null default now(),

  constraint dsg_memory_retrievals_query_not_blank check (length(trim(query_text)) > 0)
);

create table if not exists dsg_memory_context_packs (
  id uuid primary key default gen_random_uuid(),

  workspace_id uuid not null,
  job_id uuid,
  actor_id text not null,

  purpose text not null check (
    purpose in (
      'planning',
      'approval_review',
      'runtime_execution',
      'verification',
      'completion_report',
      'support'
    )
  ),

  memory_ids uuid[] not null,
  context_text text not null,
  context_hash text not null,

  gate_status text not null check (
    gate_status in ('PASS', 'BLOCK', 'REVIEW', 'UNSUPPORTED')
  ),

  gate_reasons text[] not null default '{}',
  evidence_ids uuid[] not null default '{}',
  audit_ids uuid[] not null default '{}',

  created_at timestamptz not null default now(),

  constraint dsg_memory_context_packs_context_not_blank check (length(trim(context_text)) > 0),
  constraint dsg_memory_context_packs_hash_not_blank check (length(trim(context_hash)) > 0)
);

create index if not exists dsg_memory_events_workspace_created_idx
  on dsg_memory_events (workspace_id, created_at desc);

create index if not exists dsg_memory_events_job_idx
  on dsg_memory_events (workspace_id, job_id)
  where job_id is not null;

create index if not exists dsg_memory_events_kind_status_idx
  on dsg_memory_events (workspace_id, memory_kind, status);

create index if not exists dsg_memory_events_claim_flags_idx
  on dsg_memory_events (workspace_id, contains_secret, contains_pii, contains_production_claim);

create index if not exists dsg_memory_edges_from_idx
  on dsg_memory_edges (workspace_id, from_memory_id);

create index if not exists dsg_memory_edges_to_idx
  on dsg_memory_edges (workspace_id, to_memory_id);

create index if not exists dsg_memory_retrievals_job_created_idx
  on dsg_memory_retrievals (workspace_id, job_id, created_at desc);

create index if not exists dsg_memory_context_packs_job_created_idx
  on dsg_memory_context_packs (workspace_id, job_id, created_at desc);

alter table dsg_memory_events enable row level security;
alter table dsg_memory_edges enable row level security;
alter table dsg_memory_retrievals enable row level security;
alter table dsg_memory_context_packs enable row level security;

comment on table dsg_memory_events is
  'DSG governed memory events. Memory is evidence candidate and cannot override current evidence, audit, DB, or runtime state.';

comment on table dsg_memory_edges is
  'Knowledge graph edges between governed memory events, including contradiction and update relations.';

comment on table dsg_memory_retrievals is
  'Audit trail for scoped memory retrieval and memory gate result before context use.';

comment on table dsg_memory_context_packs is
  'Bound context payloads created from gated memory for planner, approval, runtime, verification, or reports.';
