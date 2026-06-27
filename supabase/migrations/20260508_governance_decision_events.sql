create table if not exists public.dsg_governance_decision_events (
  id text primary key default gen_random_uuid()::text,
  org_id text not null,
  decision_id text not null,
  gate_id text,
  decision text,
  action text not null,
  actor_id text not null,
  actor_role text,
  action_at timestamptz not null default now(),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint dsg_governance_decision_events_action_check check (action in ('evaluate', 'approve', 'reject', 'pause', 'resume', 'rollback')),
  constraint dsg_governance_decision_events_decision_check check (decision is null or decision in ('PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED'))
);

create or replace trigger prevent_update_dsg_governance_decision_events
  before update on public.dsg_governance_decision_events
  for each row
  execute function public.raise_immutable_record('Cannot update dsg_governance_decision_events');

create or replace trigger prevent_delete_dsg_governance_decision_events
  before delete on public.dsg_governance_decision_events
  for each row
  execute function public.raise_immutable_record('Cannot delete dsg_governance_decision_events');

create index if not exists idx_dsg_governance_decision_events_org_time
  on public.dsg_governance_decision_events(org_id, created_at desc);

create index if not exists idx_dsg_governance_decision_events_decision_id
  on public.dsg_governance_decision_events(org_id, decision_id, created_at desc);

create index if not exists idx_dsg_governance_decision_events_action
  on public.dsg_governance_decision_events(org_id, action, created_at desc);

alter table public.dsg_governance_decision_events enable row level security;

drop policy if exists dsg_governance_decision_events_org_select on public.dsg_governance_decision_events;
create policy dsg_governance_decision_events_org_select
on public.dsg_governance_decision_events
for select
to authenticated
using (auth.uid() is not null and org_id = (auth.jwt() ->> 'org_id'));
