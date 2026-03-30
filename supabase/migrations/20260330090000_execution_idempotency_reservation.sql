alter table public.executions
  add column if not exists idempotency_key text;

alter table public.usage_events
  add column if not exists idempotency_key text;

create table if not exists public.execution_reservations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  idempotency_key text not null,
  billing_period text not null,
  org_billing_period text not null,
  status text not null default 'pending' check (status in ('pending', 'processed', 'failed', 'rejected')),
  quota_reserved boolean not null default false,
  execution_id uuid references public.executions(id) on delete set null,
  response_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  current_agent_executions integer not null default 0,
  org_executions integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, idempotency_key)
);

create unique index if not exists idx_executions_agent_idempotency
  on public.executions (agent_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_usage_events_agent_idempotency_event
  on public.usage_events (agent_id, idempotency_key, event_type)
  where idempotency_key is not null;

create index if not exists idx_execution_reservations_agent_created_at
  on public.execution_reservations (agent_id, created_at desc);

create or replace function public.reserve_execution_quota(
  p_org_id text,
  p_agent_id text,
  p_idempotency_key text,
  p_billing_period text,
  p_org_billing_period text,
  p_monthly_limit integer,
  p_included_executions integer
)
returns table (
  reservation_id uuid,
  status text,
  execution_id uuid,
  response_payload jsonb,
  quota_reserved boolean,
  error_code text,
  error_message text,
  current_agent_executions integer,
  org_executions integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.execution_reservations%rowtype;
  v_current_agent integer := 0;
  v_org_exec integer := 0;
  v_reservation public.execution_reservations%rowtype;
begin
  select * into v_existing
  from public.execution_reservations
  where agent_id = p_agent_id
    and idempotency_key = p_idempotency_key
  for update;

  if found then
    return query
    select
      v_existing.id,
      v_existing.status,
      v_existing.execution_id,
      v_existing.response_payload,
      false,
      v_existing.error_code,
      v_existing.error_message,
      v_existing.current_agent_executions,
      v_existing.org_executions;
    return;
  end if;

  select coalesce(executions, 0)
    into v_current_agent
  from public.usage_counters
  where agent_id = p_agent_id
    and billing_period = p_billing_period
  limit 1;

  select coalesce(sum(executions), 0)
    into v_org_exec
  from public.usage_counters
  where org_id = p_org_id
    and billing_period = p_org_billing_period;

  if p_monthly_limit > 0 and v_current_agent >= p_monthly_limit then
    insert into public.execution_reservations (
      org_id,
      agent_id,
      idempotency_key,
      billing_period,
      org_billing_period,
      status,
      quota_reserved,
      error_code,
      error_message,
      current_agent_executions,
      org_executions
    ) values (
      p_org_id,
      p_agent_id,
      p_idempotency_key,
      p_billing_period,
      p_org_billing_period,
      'rejected',
      false,
      'agent_quota_exceeded',
      'Agent monthly quota exceeded',
      v_current_agent,
      v_org_exec
    )
    returning * into v_reservation;

    return query
    select
      v_reservation.id,
      v_reservation.status,
      v_reservation.execution_id,
      v_reservation.response_payload,
      v_reservation.quota_reserved,
      v_reservation.error_code,
      v_reservation.error_message,
      v_reservation.current_agent_executions,
      v_reservation.org_executions;
    return;
  end if;

  if v_org_exec >= p_included_executions then
    insert into public.execution_reservations (
      org_id,
      agent_id,
      idempotency_key,
      billing_period,
      org_billing_period,
      status,
      quota_reserved,
      error_code,
      error_message,
      current_agent_executions,
      org_executions
    ) values (
      p_org_id,
      p_agent_id,
      p_idempotency_key,
      p_billing_period,
      p_org_billing_period,
      'rejected',
      false,
      'org_quota_exceeded',
      'Organization execution quota exceeded',
      v_current_agent,
      v_org_exec
    )
    returning * into v_reservation;

    return query
    select
      v_reservation.id,
      v_reservation.status,
      v_reservation.execution_id,
      v_reservation.response_payload,
      v_reservation.quota_reserved,
      v_reservation.error_code,
      v_reservation.error_message,
      v_reservation.current_agent_executions,
      v_reservation.org_executions;
    return;
  end if;

  insert into public.usage_counters (org_id, agent_id, billing_period, executions, updated_at)
  values (p_org_id, p_agent_id, p_billing_period, 1, now())
  on conflict (agent_id, billing_period)
  do update set
    executions = public.usage_counters.executions + 1,
    updated_at = now();

  insert into public.execution_reservations (
    org_id,
    agent_id,
    idempotency_key,
    billing_period,
    org_billing_period,
    status,
    quota_reserved,
    current_agent_executions,
    org_executions
  ) values (
    p_org_id,
    p_agent_id,
    p_idempotency_key,
    p_billing_period,
    p_org_billing_period,
    'pending',
    true,
    v_current_agent + 1,
    v_org_exec + 1
  )
  returning * into v_reservation;

  return query
  select
    v_reservation.id,
    v_reservation.status,
    v_reservation.execution_id,
    v_reservation.response_payload,
    v_reservation.quota_reserved,
    v_reservation.error_code,
    v_reservation.error_message,
    v_reservation.current_agent_executions,
    v_reservation.org_executions;
end;
$$;

create or replace function public.finalize_execution_reservation(
  p_reservation_id uuid,
  p_status text,
  p_execution_id uuid,
  p_response_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.execution_reservations%rowtype;
begin
  select * into v_reservation
  from public.execution_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return;
  end if;

  update public.execution_reservations
  set
    status = p_status,
    execution_id = coalesce(p_execution_id, execution_id),
    response_payload = coalesce(p_response_payload, response_payload),
    updated_at = now()
  where id = p_reservation_id;

  if p_status = 'failed' and v_reservation.quota_reserved then
    update public.usage_counters
    set executions = greatest(0, executions - 1),
        updated_at = now()
    where agent_id = v_reservation.agent_id
      and billing_period = v_reservation.billing_period;

    update public.execution_reservations
    set quota_reserved = false,
        updated_at = now()
    where id = p_reservation_id;
  end if;
end;
$$;
