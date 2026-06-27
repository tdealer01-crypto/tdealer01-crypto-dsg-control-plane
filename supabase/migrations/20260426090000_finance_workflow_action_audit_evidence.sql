alter table public.finance_workflow_action_events
  add column if not exists actor text not null default 'api',
  add column if not exists result text not null default 'ok',
  add column if not exists target text;

update public.finance_workflow_action_events
set target = coalesce(approval_id, case_id)
where target is null;

alter table public.finance_workflow_action_events
  add constraint finance_workflow_action_events_result_chk
  check (result in ('ok', 'error', 'denied')) not valid;

alter table public.finance_workflow_action_events
  validate constraint finance_workflow_action_events_result_chk;

create index if not exists idx_finance_workflow_action_events_org_action_actor
  on public.finance_workflow_action_events (org_id, action, actor, created_at desc);
