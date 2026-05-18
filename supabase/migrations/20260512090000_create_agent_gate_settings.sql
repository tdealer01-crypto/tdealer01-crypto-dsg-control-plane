create table if not exists public.agent_gate_settings (
  id uuid primary key default gen_random_uuid(),
  org_id text not null unique,
  gate_mode text not null default 'audit_only' check (gate_mode in ('audit_only', 'enforce_gate')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_gate_settings_org_id_idx
  on public.agent_gate_settings (org_id);

comment on table public.agent_gate_settings is
  'Per-organization Core DSG Spin / CospinDSG mode switch. audit_only records evidence; enforce_gate blocks or stabilizes non-ALLOW actions.';

comment on column public.agent_gate_settings.gate_mode is
  'audit_only or enforce_gate';
