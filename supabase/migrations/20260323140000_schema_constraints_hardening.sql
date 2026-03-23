-- DSG Control Plane schema hardening
-- Strengthens org consistency, data validation, and updated_at maintenance
-- for the existing product-loop scaffold tables.

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.users
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.policies
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.agents
  alter column created_at set default now(),
  alter column updated_at set default now();

alter table public.usage_counters
  alter column updated_at set default now();

drop trigger if exists trg_users_set_updated_at on public.users;
create trigger trg_users_set_updated_at
before update on public.users
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_policies_set_updated_at on public.policies;
create trigger trg_policies_set_updated_at
before update on public.policies
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_agents_set_updated_at on public.agents;
create trigger trg_agents_set_updated_at
before update on public.agents
for each row
execute function public.set_row_updated_at();

drop trigger if exists trg_usage_counters_set_updated_at on public.usage_counters;
create trigger trg_usage_counters_set_updated_at
before update on public.usage_counters
for each row
execute function public.set_row_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_org_id_not_blank'
  ) then
    alter table public.users
      add constraint users_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'users_active_requires_auth_user_id'
  ) then
    alter table public.users
      add constraint users_active_requires_auth_user_id
      check ((not is_active) or auth_user_id is not null);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'policies_name_not_blank'
  ) then
    alter table public.policies
      add constraint policies_name_not_blank
      check (btrim(name) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'policies_version_not_blank'
  ) then
    alter table public.policies
      add constraint policies_version_not_blank
      check (btrim(version) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'policies_status_allowed'
  ) then
    alter table public.policies
      add constraint policies_status_allowed
      check (status in ('active', 'draft', 'archived'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_org_id_not_blank'
  ) then
    alter table public.agents
      add constraint agents_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_name_not_blank'
  ) then
    alter table public.agents
      add constraint agents_name_not_blank
      check (btrim(name) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_status_not_blank'
  ) then
    alter table public.agents
      add constraint agents_status_not_blank
      check (btrim(status) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'agents_monthly_limit_non_negative'
  ) then
    alter table public.agents
      add constraint agents_monthly_limit_non_negative
      check (monthly_limit >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'executions_org_id_not_blank'
  ) then
    alter table public.executions
      add constraint executions_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'executions_decision_allowed'
  ) then
    alter table public.executions
      add constraint executions_decision_allowed
      check (decision in ('ALLOW', 'STABILIZE', 'BLOCK'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'executions_latency_ms_non_negative'
  ) then
    alter table public.executions
      add constraint executions_latency_ms_non_negative
      check (latency_ms >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'audit_logs_org_id_not_blank'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'audit_logs_decision_allowed'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_decision_allowed
      check (decision in ('ALLOW', 'STABILIZE', 'BLOCK'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_org_id_not_blank'
  ) then
    alter table public.usage_events
      add constraint usage_events_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_event_type_not_blank'
  ) then
    alter table public.usage_events
      add constraint usage_events_event_type_not_blank
      check (btrim(event_type) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_unit_not_blank'
  ) then
    alter table public.usage_events
      add constraint usage_events_unit_not_blank
      check (btrim(unit) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_quantity_positive'
  ) then
    alter table public.usage_events
      add constraint usage_events_quantity_positive
      check (quantity > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_amount_usd_non_negative'
  ) then
    alter table public.usage_events
      add constraint usage_events_amount_usd_non_negative
      check (amount_usd >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_counters_org_id_not_blank'
  ) then
    alter table public.usage_counters
      add constraint usage_counters_org_id_not_blank
      check (btrim(org_id) <> '');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_counters_billing_period_format'
  ) then
    alter table public.usage_counters
      add constraint usage_counters_billing_period_format
      check (billing_period ~ '^\d{4}-\d{2}$');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_counters_executions_non_negative'
  ) then
    alter table public.usage_counters
      add constraint usage_counters_executions_non_negative
      check (executions >= 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agents_id_org_key'
  ) then
    alter table public.agents
      add constraint agents_id_org_key unique (id, org_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'executions_id_org_key'
  ) then
    alter table public.executions
      add constraint executions_id_org_key unique (id, org_id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'audit_logs_agent_id_org_fk'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_agent_id_org_fk
      foreign key (agent_id, org_id)
      references public.agents (id, org_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'executions_agent_id_org_fk'
  ) then
    alter table public.executions
      add constraint executions_agent_id_org_fk
      foreign key (agent_id, org_id)
      references public.agents (id, org_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_agent_id_org_fk'
  ) then
    alter table public.usage_events
      add constraint usage_events_agent_id_org_fk
      foreign key (agent_id, org_id)
      references public.agents (id, org_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_counters_agent_id_org_fk'
  ) then
    alter table public.usage_counters
      add constraint usage_counters_agent_id_org_fk
      foreign key (agent_id, org_id)
      references public.agents (id, org_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'audit_logs_execution_id_org_fk'
  ) then
    alter table public.audit_logs
      add constraint audit_logs_execution_id_org_fk
      foreign key (execution_id, org_id)
      references public.executions (id, org_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'usage_events_execution_id_org_fk'
  ) then
    alter table public.usage_events
      add constraint usage_events_execution_id_org_fk
      foreign key (execution_id, org_id)
      references public.executions (id, org_id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_users_active_auth_user_id
  on public.users (auth_user_id)
  where is_active = true;

create index if not exists idx_usage_counters_org_period
  on public.usage_counters (org_id, billing_period);

create index if not exists idx_usage_events_org_created_at
  on public.usage_events (org_id, created_at desc);
