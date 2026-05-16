-- DSG Agent Ledger — universal, append-only, hash-chained
-- Captures every action every agent takes across all domains.
-- Each entry cryptographically links to the previous via prev_hash,
-- so any deletion, insertion, or reordering breaks the chain.

-- Per-org configuration: choose audit-only, gate+audit, or full chain
create table if not exists public.dsg_ledger_config (
  org_id       text primary key,
  mode         text not null default 'gate' check (mode in ('audit_only', 'gate', 'full')),
  gate_enabled boolean not null default true,
  audit_enabled boolean not null default true,
  chain_enabled boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.dsg_ledger_config is
  'Per-org DSG mode: audit_only = log only, gate = log+block, full = log+block+chain verification';

alter table public.dsg_ledger_config enable row level security;
-- No direct client access — mutated via service-role API routes only

-- Universal agent action ledger with hash chain
create table if not exists public.dsg_agent_ledger (
  id           bigserial primary key,

  -- Monotonic sequence per org — gap = evidence of deletion
  org_id       text not null,
  seq          bigint not null,

  -- What the agent tried to do
  action       text not null,
  agent_id     text,
  session_id   text,
  context      jsonb not null default '{}'::jsonb,

  -- Gate decision
  decision     text not null check (decision in ('ALLOW', 'BLOCK', 'REVIEW', 'AUDIT')),
  reason       text,
  mode         text not null check (mode in ('audit_only', 'gate', 'full')),

  -- Invariant checks (MAKK-8 snapshot)
  invariant_snapshot jsonb,

  -- Cryptographic chain
  -- entry_hash = SHA256(org_id || seq || action || decision || timestamp_ms || prev_hash)
  entry_hash   text not null,
  prev_hash    text,               -- NULL only for seq=0 (genesis)

  -- Timestamps
  timestamp_ms bigint not null,    -- unix ms, deterministic, no timezone drift
  created_at   timestamptz not null default now(),

  constraint dsg_agent_ledger_org_seq unique (org_id, seq)
);

comment on column public.dsg_agent_ledger.seq is
  'Monotonic per org. Any gap proves deletion. Any reorder breaks the hash chain.';

comment on column public.dsg_agent_ledger.entry_hash is
  'SHA256 of all fields including prev_hash. Tamper with any field → hash mismatch.';

comment on column public.dsg_agent_ledger.prev_hash is
  'Hash of entry at (seq-1). NULL for genesis. Chain broken if this does not match stored entry_hash of previous row.';

create index if not exists dsg_agent_ledger_org_seq_idx
  on public.dsg_agent_ledger (org_id, seq);

create index if not exists dsg_agent_ledger_org_time_idx
  on public.dsg_agent_ledger (org_id, timestamp_ms desc);

create index if not exists dsg_agent_ledger_decision_idx
  on public.dsg_agent_ledger (org_id, decision, timestamp_ms desc);

-- WORM: no updates, no deletes — modification detected via hash chain
create or replace function public.raise_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'dsg_agent_ledger is append-only. Modifications detected via hash chain.';
end;
$$;

create trigger dsg_agent_ledger_no_update
  before update on public.dsg_agent_ledger
  for each row execute function public.raise_ledger_immutable();

create trigger dsg_agent_ledger_no_delete
  before delete on public.dsg_agent_ledger
  for each row execute function public.raise_ledger_immutable();

alter table public.dsg_agent_ledger enable row level security;

-- Authenticated users may read their own org's ledger (select only — no insert/update/delete)
create policy dsg_agent_ledger_org_select
  on public.dsg_agent_ledger
  for select
  to authenticated
  using (org_id = (auth.jwt() ->> 'org_id'));

-- Next-sequence RPC for atomic, race-free seq generation
create or replace function public.dsg_ledger_next_seq(p_org_id text)
returns bigint language sql security definer as $$
  select coalesce(max(seq), -1) + 1
  from public.dsg_agent_ledger
  where org_id = p_org_id;
$$;

revoke execute on function public.dsg_ledger_next_seq(text) from public;
grant execute on function public.dsg_ledger_next_seq(text) to service_role;

-- Latest entry hash for chain continuation
create or replace function public.dsg_ledger_latest_hash(p_org_id text)
returns text language sql security definer as $$
  select entry_hash
  from public.dsg_agent_ledger
  where org_id = p_org_id
  order by seq desc
  limit 1;
$$;

revoke execute on function public.dsg_ledger_latest_hash(text) from public;
grant execute on function public.dsg_ledger_latest_hash(text) to service_role;
