create extension if not exists pgcrypto;

create table if not exists public.runtime_truth_states (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null,
  request_id uuid references public.runtime_approval_requests(id) on delete set null,
  canonical_hash text,
  canonical_json jsonb not null default '{}'::jsonb,
  decision text,
  reason text,
  policy_version text,
  truth_sequence bigint not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_runtime_truth_states_org_agent_seq
  on public.runtime_truth_states(org_id, agent_id, truth_sequence);

create table if not exists public.runtime_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null,
  request_id uuid references public.runtime_approval_requests(id) on delete set null,
  execution_id uuid references public.executions(id) on delete cascade,
  truth_state_id uuid references public.runtime_truth_states(id) on delete cascade,
  decision text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  canonical_hash text,
  ledger_sequence bigint not null,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_runtime_ledger_entries_org_agent_seq
  on public.runtime_ledger_entries(org_id, agent_id, ledger_sequence);

create index if not exists idx_runtime_ledger_entries_request_id
  on public.runtime_ledger_entries(request_id);

create table if not exists public.runtime_checkpoints (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null,
  truth_state_id uuid references public.runtime_truth_states(id) on delete cascade,
  latest_ledger_entry_id uuid references public.runtime_ledger_entries(id) on delete cascade,
  checkpoint_hash text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (org_id, agent_id, checkpoint_hash)
);

create index if not exists idx_runtime_checkpoints_org_agent
  on public.runtime_checkpoints(org_id, agent_id, created_at desc);

create table if not exists public.runtime_roles (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('org_admin', 'operator', 'runtime_auditor', 'billing_admin', 'guest_auditor')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id, role)
);

create index if not exists idx_runtime_roles_org_user
  on public.runtime_roles(org_id, user_id);

notify pgrst, 'reload schema';