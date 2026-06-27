create table if not exists public.dsg_agent_command_gate_decisions (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  workspace_id text not null,
  command_id text not null,
  agent_id text not null,
  session_id text not null,
  actor_id text not null,
  actor_role text,
  gate_version text not null,
  decision text not null,
  can_agent_execute boolean not null,
  status text not null,
  command_hash text not null,
  decision_hash text not null,
  reasons jsonb not null default '[]'::jsonb,
  invariant_checks jsonb not null default '[]'::jsonb,
  action_envelope jsonb,
  request_body jsonb not null,
  result_body jsonb not null,
  created_at timestamptz not null default now(),
  constraint dsg_agent_command_gate_decisions_decision_check check (decision in ('PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED'))
);

create table if not exists public.dsg_agent_action_result_receipts (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  workspace_id text not null,
  command_id text not null,
  agent_id text not null,
  session_id text not null,
  envelope_id text not null,
  actor_id text not null,
  actor_role text,
  gate_version text not null,
  accepted boolean not null,
  status text not null,
  result_hash text not null,
  receipt_hash text not null,
  request_body jsonb not null,
  receipt_body jsonb not null,
  created_at timestamptz not null default now()
);

create or replace function public.dsg_prevent_agent_gate_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'dsg agent command gate audit rows are append only';
end;
$$;

drop trigger if exists trg_dsg_agent_command_gate_decisions_no_update on public.dsg_agent_command_gate_decisions;
create trigger trg_dsg_agent_command_gate_decisions_no_update before update on public.dsg_agent_command_gate_decisions for each row execute function public.dsg_prevent_agent_gate_audit_mutation();

drop trigger if exists trg_dsg_agent_command_gate_decisions_no_delete on public.dsg_agent_command_gate_decisions;
create trigger trg_dsg_agent_command_gate_decisions_no_delete before delete on public.dsg_agent_command_gate_decisions for each row execute function public.dsg_prevent_agent_gate_audit_mutation();

drop trigger if exists trg_dsg_agent_action_result_receipts_no_update on public.dsg_agent_action_result_receipts;
create trigger trg_dsg_agent_action_result_receipts_no_update before update on public.dsg_agent_action_result_receipts for each row execute function public.dsg_prevent_agent_gate_audit_mutation();

drop trigger if exists trg_dsg_agent_action_result_receipts_no_delete on public.dsg_agent_action_result_receipts;
create trigger trg_dsg_agent_action_result_receipts_no_delete before delete on public.dsg_agent_action_result_receipts for each row execute function public.dsg_prevent_agent_gate_audit_mutation();

create index if not exists idx_dsg_agent_command_gate_decisions_org_time on public.dsg_agent_command_gate_decisions(org_id, created_at desc);
create index if not exists idx_dsg_agent_command_gate_decisions_command on public.dsg_agent_command_gate_decisions(org_id, command_id, created_at desc);
create index if not exists idx_dsg_agent_command_gate_decisions_hash on public.dsg_agent_command_gate_decisions(org_id, decision_hash);
create index if not exists idx_dsg_agent_action_result_receipts_org_time on public.dsg_agent_action_result_receipts(org_id, created_at desc);
create index if not exists idx_dsg_agent_action_result_receipts_command on public.dsg_agent_action_result_receipts(org_id, command_id, created_at desc);
create index if not exists idx_dsg_agent_action_result_receipts_receipt on public.dsg_agent_action_result_receipts(org_id, receipt_hash);

alter table public.dsg_agent_command_gate_decisions enable row level security;
alter table public.dsg_agent_action_result_receipts enable row level security;

drop policy if exists dsg_agent_command_gate_decisions_org_select on public.dsg_agent_command_gate_decisions;
create policy dsg_agent_command_gate_decisions_org_select on public.dsg_agent_command_gate_decisions for select to authenticated using (exists (select 1 from public.users u where u.auth_user_id::text = auth.uid()::text and u.is_active = true and u.org_id::text = dsg_agent_command_gate_decisions.org_id));

drop policy if exists dsg_agent_action_result_receipts_org_select on public.dsg_agent_action_result_receipts;
create policy dsg_agent_action_result_receipts_org_select on public.dsg_agent_action_result_receipts for select to authenticated using (exists (select 1 from public.users u where u.auth_user_id::text = auth.uid()::text and u.is_active = true and u.org_id::text = dsg_agent_action_result_receipts.org_id));
