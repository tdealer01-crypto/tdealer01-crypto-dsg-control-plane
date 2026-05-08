-- Append-only governance decision events table
-- Used by hardened approval routes to persist decision audit trail
-- WORM enforcement: no update/delete allowed

create table if not exists public.dsg_governance_decision_events (
  id text primary key default gen_random_uuid()::text,
  org_id text not null,
  decision_id text not null,
  gate_id text,
  decision text,
  approved_by text,
  approved_at timestamptz,
  action text not null,
  reason text,
  created_at timestamptz not null default now(),
  
  constraint decision_action_check check (
    action in ('evaluate', 'approve', 'reject', 'pause', 'resume', 'rollback')
  ),
  
  constraint decision_type_check check (
    decision in ('PASS', 'REVIEW', 'BLOCK', 'UNSUPPORTED', null)
  )
);

-- Append-only enforcement: prevent updates
create or replace trigger prevent_update_dsg_governance_decision_events
  before update on public.dsg_governance_decision_events
  for each row
  execute function raise_immutable_record('Cannot update dsg_governance_decision_events');

-- Append-only enforcement: prevent deletes
create or replace trigger prevent_delete_dsg_governance_decision_events
  before delete on public.dsg_governance_decision_events
  for each row
  execute function raise_immutable_record('Cannot delete dsg_governance_decision_events');

-- Index for efficient org_id + created_at queries
create index if not exists idx_dsg_governance_decision_events_org_time
  on public.dsg_governance_decision_events(org_id, created_at desc);

-- Index for decision_id lookups (audit trace)
create index if not exists idx_dsg_governance_decision_events_decision_id
  on public.dsg_governance_decision_events(decision_id);

-- Index for action filtering (approve/reject/pause/rollback)
create index if not exists idx_dsg_governance_decision_events_action
  on public.dsg_governance_decision_events(org_id, action, created_at desc);

-- Immutability function (if not exists)
do $$
begin
  if not exists (
    select 1 from pg_proc 
    where proname = 'raise_immutable_record'
  ) then
    create function public.raise_immutable_record(msg text) returns trigger as $$
    begin
      raise exception '%', msg;
    end;
    $$ language plpgsql;
  end if;
end
$$;

comment on table public.dsg_governance_decision_events is 'Append-only audit trail for governance decision events. Used by gateway approval workflows, pause/rollback controls, and compliance reporting. No updates or deletes allowed.';
comment on column public.dsg_governance_decision_events.org_id is 'Organization scope for all queries; matches users.org_id';
comment on column public.dsg_governance_decision_events.decision_id is 'Unique decision identifier for trace/audit lookups';
comment on column public.dsg_governance_decision_events.gate_id is 'Gate evaluation identifier (may be null for non-gate events)';
comment on column public.dsg_governance_decision_events.decision is 'Gate decision outcome: PASS, REVIEW, BLOCK, UNSUPPORTED';
comment on column public.dsg_governance_decision_events.approved_by is 'User ID of approver (from session, never from request body)';
comment on column public.dsg_governance_decision_events.action is 'Action taken: evaluate, approve, reject, pause, resume, rollback';
comment on column public.dsg_governance_decision_events.reason is 'Human-readable reason or note for action';
