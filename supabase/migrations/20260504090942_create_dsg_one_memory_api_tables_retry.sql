create extension if not exists pgcrypto;
create schema if not exists api;

create table if not exists api.dsg_memory_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  job_id text,
  actor_id text not null,
  actor_role text not null,
  source_type text not null check (source_type in ('conversation','agent_step','approval','command_output','test_output','deployment_log','manual_note','system_event')),
  memory_kind text not null check (memory_kind in ('policy','decision','preference','requirement','risk','command','evidence','workflow','project_context','claim','unknown')),
  raw_text text not null check (length(trim(raw_text)) > 0),
  normalized_summary text,
  trust_level text not null default 'user_supplied' check (trust_level in ('observed','verified','user_supplied','system_generated','unverified')),
  status text not null default 'active' check (status in ('active','stale','conflicted','redacted','blocked','deleted')),
  contains_secret boolean not null default false,
  contains_pii boolean not null default false,
  contains_legal_claim boolean not null default false,
  contains_production_claim boolean not null default false,
  source_evidence_id text,
  source_audit_id text,
  content_hash text not null check (length(trim(content_hash)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dsg_memory_events_workspace_created_idx on api.dsg_memory_events(workspace_id, created_at desc);
create index if not exists dsg_memory_events_workspace_job_idx on api.dsg_memory_events(workspace_id, job_id);
create index if not exists dsg_memory_events_kind_status_idx on api.dsg_memory_events(memory_kind, status);

create table if not exists api.dsg_memory_retrievals (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  job_id text,
  actor_id text not null,
  query_text text not null check (length(trim(query_text)) > 0),
  retrieval_scope jsonb not null default '{}'::jsonb,
  retrieved_memory_ids text[] not null default '{}'::text[],
  blocked_memory_ids text[] not null default '{}'::text[],
  review_memory_ids text[] not null default '{}'::text[],
  gate_status text not null check (gate_status in ('PASS','REVIEW','BLOCK','UNSUPPORTED')),
  gate_reasons text[] not null default '{}'::text[],
  context_pack_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists dsg_memory_retrievals_workspace_created_idx on api.dsg_memory_retrievals(workspace_id, created_at desc);

create table if not exists api.dsg_memory_context_packs (
  id uuid primary key default gen_random_uuid(),
  workspace_id text not null,
  job_id text,
  actor_id text not null,
  purpose text not null check (purpose in ('planning','approval_review','runtime_execution','verification','completion_report','support')),
  memory_ids text[] not null default '{}'::text[],
  context_text text not null check (length(trim(context_text)) > 0),
  context_hash text not null check (length(trim(context_hash)) > 0),
  gate_status text not null check (gate_status in ('PASS','REVIEW','BLOCK','UNSUPPORTED')),
  gate_reasons text[] not null default '{}'::text[],
  evidence_ids text[] not null default '{}'::text[],
  audit_ids text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

create index if not exists dsg_memory_context_packs_workspace_created_idx on api.dsg_memory_context_packs(workspace_id, created_at desc);

grant usage on schema api to anon, authenticated, service_role;
grant select, insert, update, delete on api.dsg_memory_events to service_role;
grant select, insert, update, delete on api.dsg_memory_retrievals to service_role;
grant select, insert, update, delete on api.dsg_memory_context_packs to service_role;

select pg_notify('pgrst', 'reload schema');;
