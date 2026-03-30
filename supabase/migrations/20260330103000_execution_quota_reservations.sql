-- Atomic quota reservation + finalize flow for /api/execute

create table if not exists public.execution_reservations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  agent_id text not null references public.agents(id) on delete cascade,
  billing_period text not null,
  org_billing_period text not null,
  idempotency_key text not null,
  refund_policy text not null default 'refund_on_failure',
  status text not null default 'reserved'
    check (status in ('reserved', 'consumed', 'failed_refunded', 'failed_not_refunded')),
  execution_id uuid references public.executions(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agent_id, idempotency_key)
);

create index if not exists idx_execution_reservations_org_period
  on public.execution_reservations(org_id, org_billing_period, created_at desc);

create index if not exists idx_execution_reservations_status
  on public.execution_reservations(status, created_at desc);

create trigger trg_execution_reservations_set_updated_at
before update on public.execution_reservations
for each row
execute function public.set_row_updated_at();

create or replace function public.reserve_execution_quota(
  p_agent_id text,
  p_org_id text,
  p_billing_period text,
  p_org_billing_period text,
  p_monthly_limit integer,
  p_included_executions integer,
  p_idempotency_key text,
  p_refund_policy text default 'refund_on_failure'
)
returns table(
  ok boolean,
  reservation_id uuid,
  code text,
  message text,
  reservation_status text,
  execution_id uuid,
  agent_executions integer,
  org_executions integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.execution_reservations%rowtype;
  v_counter_id uuid;
  v_agent_executions integer;
  v_org_executions integer;
begin
  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    return query select false, null::uuid, 'idempotency_required', 'idempotency_key is required', null::text, null::uuid, 0, 0;
    return;
  end if;

  select *
  into v_existing
  from public.execution_reservations
  where agent_id = p_agent_id
    and idempotency_key = p_idempotency_key
  limit 1;

  if found then
    return query
    select true,
           v_existing.id,
           'idempotent_replay',
           'idempotent reservation replay',
           v_existing.status,
           v_existing.execution_id,
           0,
           0;
    return;
  end if;

  insert into public.usage_counters(org_id, agent_id, billing_period, executions)
  values (p_org_id, p_agent_id, p_billing_period, 0)
  on conflict (agent_id, billing_period) do nothing;

  select id, executions
  into v_counter_id, v_agent_executions
  from public.usage_counters
  where agent_id = p_agent_id
    and billing_period = p_billing_period
  for update;

  if coalesce(p_monthly_limit, 0) > 0 and v_agent_executions >= p_monthly_limit then
    return query
    select false,
           null::uuid,
           'agent_quota_exceeded',
           'Agent monthly quota exceeded',
           null::text,
           null::uuid,
           v_agent_executions,
           0;
    return;
  end if;

  perform 1
  from public.usage_counters
  where org_id = p_org_id
    and billing_period = p_org_billing_period
  for update;

  select coalesce(sum(executions), 0)
  into v_org_executions
  from public.usage_counters
  where org_id = p_org_id
    and billing_period = p_org_billing_period;

  if v_org_executions >= coalesce(p_included_executions, 0) then
    return query
    select false,
           null::uuid,
           'org_quota_exceeded',
           'Organization execution quota exceeded',
           null::text,
           null::uuid,
           v_agent_executions,
           v_org_executions;
    return;
  end if;

  update public.usage_counters
  set executions = executions + 1
  where id = v_counter_id
  returning executions into v_agent_executions;

  insert into public.execution_reservations(
    org_id,
    agent_id,
    billing_period,
    org_billing_period,
    idempotency_key,
    refund_policy,
    status
  )
  values (
    p_org_id,
    p_agent_id,
    p_billing_period,
    p_org_billing_period,
    p_idempotency_key,
    coalesce(nullif(p_refund_policy, ''), 'refund_on_failure'),
    'reserved'
  )
  returning id into reservation_id;

  ok := true;
  code := 'reserved';
  message := 'quota reserved';
  reservation_status := 'reserved';
  execution_id := null;
  agent_executions := v_agent_executions;
  org_executions := v_org_executions + 1;
  return next;
exception when unique_violation then
  select *
  into v_existing
  from public.execution_reservations
  where agent_id = p_agent_id
    and idempotency_key = p_idempotency_key
  limit 1;

  return query
  select true,
         v_existing.id,
         'idempotent_replay',
         'idempotent reservation replay',
         v_existing.status,
         v_existing.execution_id,
         0,
         0;
end;
$$;

create or replace function public.finalize_execution_reservation(
  p_reservation_id uuid,
  p_outcome text,
  p_execution_id uuid default null,
  p_error_message text default null
)
returns table(
  ok boolean,
  status text,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.execution_reservations%rowtype;
begin
  if p_reservation_id is null then
    return query select false, 'invalid', 'reservation_id is required';
    return;
  end if;

  select *
  into v_res
  from public.execution_reservations
  where id = p_reservation_id
  for update;

  if not found then
    return query select false, 'not_found', 'reservation not found';
    return;
  end if;

  if v_res.status <> 'reserved' then
    return query select true, v_res.status, 'reservation already finalized';
    return;
  end if;

  if p_outcome = 'consumed' then
    update public.execution_reservations
    set status = 'consumed',
        execution_id = p_execution_id,
        error_message = null
    where id = p_reservation_id;

    return query select true, 'consumed', 'reservation consumed';
    return;
  end if;

  if coalesce(v_res.refund_policy, 'refund_on_failure') = 'refund_on_failure' then
    update public.usage_counters
    set executions = greatest(executions - 1, 0)
    where agent_id = v_res.agent_id
      and billing_period = v_res.billing_period;

    update public.execution_reservations
    set status = 'failed_refunded',
        error_message = coalesce(p_error_message, 'execution failed')
    where id = p_reservation_id;

    return query select true, 'failed_refunded', 'reservation refunded';
    return;
  end if;

  update public.execution_reservations
  set status = 'failed_not_refunded',
      error_message = coalesce(p_error_message, 'execution failed')
  where id = p_reservation_id;

  return query select true, 'failed_not_refunded', 'reservation finalized without refund';
end;
$$;

revoke all on function public.reserve_execution_quota(text, text, text, text, integer, integer, text, text) from public;
revoke all on function public.finalize_execution_reservation(uuid, text, uuid, text) from public;
grant execute on function public.reserve_execution_quota(text, text, text, text, integer, integer, text, text) to service_role;
grant execute on function public.finalize_execution_reservation(uuid, text, uuid, text) to service_role;
