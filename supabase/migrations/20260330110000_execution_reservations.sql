create table if not exists public.usage_reservations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null references public.organizations(id) on delete cascade,
  agent_id text not null references public.agents(id) on delete cascade,
  execution_id uuid references public.executions(id) on delete set null,
  billing_period text not null,
  org_billing_period text not null,
  status text not null
    check (status in ('reserved', 'consumed', 'failed_refunded', 'failed_not_refunded')),
  quantity integer not null default 1 check (quantity > 0),
  plan_key text not null,
  refund_policy text not null
    check (refund_policy in ('refund_on_failure', 'no_refund_on_failure')),
  policy_source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);

create index if not exists idx_usage_reservations_org_created_at
  on public.usage_reservations (org_id, created_at desc);

create index if not exists idx_usage_reservations_agent_created_at
  on public.usage_reservations (agent_id, created_at desc);

create or replace function public.reserve_execution_quota(
  p_org_id text,
  p_agent_id text,
  p_billing_period text,
  p_org_billing_period text,
  p_agent_monthly_limit integer,
  p_org_included_executions integer,
  p_plan_key text,
  p_refund_policy text,
  p_policy_source text,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  ok boolean,
  reservation_id uuid,
  status text,
  error_code text,
  error_message text,
  agent_executions integer,
  org_executions integer
)
language plpgsql
as $$
declare
  v_agent_counter_id uuid;
  v_agent_executions integer := 0;
  v_org_executions integer := 0;
  v_reservation_id uuid;
begin
  if p_refund_policy not in ('refund_on_failure', 'no_refund_on_failure') then
    return query select false, null::uuid, null::text, 'invalid_refund_policy', 'Unsupported refund policy', null::integer, null::integer;
    return;
  end if;

  if p_billing_period !~ '^\d{4}-\d{2}$' or p_org_billing_period !~ '^\d{4}-\d{2}$' then
    return query select false, null::uuid, null::text, 'invalid_billing_period', 'Billing period must follow YYYY-MM', null::integer, null::integer;
    return;
  end if;

  select id, executions
  into v_agent_counter_id, v_agent_executions
  from public.usage_counters
  where agent_id = p_agent_id
    and billing_period = p_billing_period
  for update;

  if v_agent_counter_id is null then
    insert into public.usage_counters (org_id, agent_id, billing_period, executions, updated_at)
    values (p_org_id, p_agent_id, p_billing_period, 0, now())
    returning id, executions into v_agent_counter_id, v_agent_executions;
  end if;

  perform 1
  from public.usage_counters
  where org_id = p_org_id
    and billing_period = p_org_billing_period
  for update;

  select coalesce(sum(executions), 0)::integer
  into v_org_executions
  from public.usage_counters
  where org_id = p_org_id
    and billing_period = p_org_billing_period;

  if p_agent_monthly_limit > 0 and v_agent_executions >= p_agent_monthly_limit then
    return query select false, null::uuid, null::text, 'agent_quota_exceeded', 'Agent monthly quota exceeded', v_agent_executions, v_org_executions;
    return;
  end if;

  if p_org_included_executions > 0 and v_org_executions >= p_org_included_executions then
    return query select false, null::uuid, null::text, 'org_quota_exceeded', 'Organization execution quota exceeded', v_agent_executions, v_org_executions;
    return;
  end if;

  update public.usage_counters
  set executions = executions + 1,
      updated_at = now()
  where id = v_agent_counter_id;

  insert into public.usage_reservations (
    org_id,
    agent_id,
    billing_period,
    org_billing_period,
    status,
    quantity,
    plan_key,
    refund_policy,
    policy_source,
    metadata
  )
  values (
    p_org_id,
    p_agent_id,
    p_billing_period,
    p_org_billing_period,
    'reserved',
    1,
    lower(coalesce(p_plan_key, 'trial')),
    p_refund_policy,
    p_policy_source,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_reservation_id;

  return query select true, v_reservation_id, 'reserved', null::text, null::text, v_agent_executions + 1, v_org_executions + 1;
end;
$$;

create or replace function public.finalize_execution_reservation(
  p_reservation_id uuid,
  p_status text,
  p_execution_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns table(
  ok boolean,
  reservation_id uuid,
  status text,
  refunded boolean,
  error_code text,
  error_message text
)
language plpgsql
as $$
declare
  v_reservation public.usage_reservations%rowtype;
  v_refunded boolean := false;
begin
  if p_status not in ('consumed', 'failed_refunded', 'failed_not_refunded') then
    return query select false, p_reservation_id, null::text, false, 'invalid_status', 'Unsupported final reservation status';
    return;
  end if;

  select *
  into v_reservation
  from public.usage_reservations
  where id = p_reservation_id
  for update;

  if v_reservation.id is null then
    return query select false, p_reservation_id, null::text, false, 'not_found', 'Reservation not found';
    return;
  end if;

  if v_reservation.status <> 'reserved' then
    return query select false, p_reservation_id, v_reservation.status, false, 'already_finalized', 'Reservation already finalized';
    return;
  end if;

  if p_status = 'failed_refunded' then
    update public.usage_counters
    set executions = greatest(executions - v_reservation.quantity, 0),
        updated_at = now()
    where agent_id = v_reservation.agent_id
      and billing_period = v_reservation.billing_period;

    v_refunded := true;
  end if;

  update public.usage_reservations
  set status = p_status,
      execution_id = coalesce(p_execution_id, execution_id),
      finalized_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
  where id = p_reservation_id;

  insert into public.usage_events (
    org_id,
    agent_id,
    execution_id,
    event_type,
    quantity,
    unit,
    amount_usd,
    metadata,
    created_at
  )
  values (
    v_reservation.org_id,
    v_reservation.agent_id,
    coalesce(p_execution_id, v_reservation.execution_id),
    case when p_status = 'consumed' then 'execution' else 'execution_failed' end,
    v_reservation.quantity,
    'execution',
    case when p_status = 'consumed' then 0.001 else 0 end,
    jsonb_build_object(
      'reservation_id', p_reservation_id,
      'reservation_status', p_status,
      'refunded', v_refunded,
      'refund_policy', v_reservation.refund_policy,
      'policy_source', v_reservation.policy_source
    ) || coalesce(p_metadata, '{}'::jsonb),
    now()
  );

  return query select true, p_reservation_id, p_status, v_refunded, null::text, null::text;
end;
$$;
