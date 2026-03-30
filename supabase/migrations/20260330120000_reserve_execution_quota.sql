create extension if not exists pgcrypto;

create or replace function public.reserve_execution_quota(
  p_agent_id text,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agent public.agents%rowtype;
  v_now timestamptz := coalesce(p_now, now());
  v_billing_period text := to_char(v_now, 'YYYY-MM');
  v_subscription record;
  v_org_period text;
  v_plan_key text := 'trial';
  v_subscription_status text := 'trialing';
  v_included_executions integer := 1000;
  v_org_executions bigint := 0;
  v_existing_agent_executions integer := 0;
  v_previous_count integer := 0;
  v_new_count integer := 0;
  v_reservation_id uuid := gen_random_uuid();
begin
  select *
  into v_agent
  from public.agents
  where id = p_agent_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'AGENT_NOT_FOUND',
        'message', 'Agent not found'
      )
    );
  end if;

  if v_agent.status <> 'active' then
    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'AGENT_INACTIVE',
        'message', 'Agent is not active',
        'agent_id', v_agent.id,
        'org_id', v_agent.org_id
      )
    );
  end if;

  select plan_key, status, current_period_start
  into v_subscription
  from public.billing_subscriptions
  where org_id = v_agent.org_id
  order by updated_at desc
  limit 1;

  if found then
    v_plan_key := lower(coalesce(v_subscription.plan_key, 'trial'));
    v_subscription_status := coalesce(v_subscription.status, 'trialing');
    v_org_period := to_char(coalesce(v_subscription.current_period_start, v_now), 'YYYY-MM');
  else
    v_org_period := v_billing_period;
  end if;

  v_included_executions := case v_plan_key
    when 'trial' then 1000
    when 'pro' then 10000
    when 'business' then 100000
    when 'enterprise' then 1000000
    else 1000
  end;

  perform pg_advisory_xact_lock(hashtext(v_agent.org_id || ':' || v_org_period));

  perform 1
  from public.usage_counters
  where org_id = v_agent.org_id
    and billing_period = v_org_period
  for update;

  select coalesce(sum(executions), 0)
  into v_org_executions
  from public.usage_counters
  where org_id = v_agent.org_id
    and billing_period = v_org_period;

  if v_org_executions >= v_included_executions then
    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'ORG_QUOTA_EXCEEDED',
        'message', 'Organization execution quota exceeded',
        'scope', 'organization',
        'org_id', v_agent.org_id,
        'billing_period', v_org_period,
        'executions', v_org_executions,
        'included_executions', v_included_executions,
        'plan_key', v_plan_key,
        'subscription_status', v_subscription_status
      )
    );
  end if;

  select executions
  into v_existing_agent_executions
  from public.usage_counters
  where agent_id = v_agent.id
    and billing_period = v_billing_period
  for update;

  v_existing_agent_executions := coalesce(v_existing_agent_executions, 0);

  if coalesce(v_agent.monthly_limit, 0) > 0 and v_existing_agent_executions >= v_agent.monthly_limit then
    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'AGENT_QUOTA_EXCEEDED',
        'message', 'Agent monthly quota exceeded',
        'scope', 'agent',
        'agent_id', v_agent.id,
        'org_id', v_agent.org_id,
        'billing_period', v_billing_period,
        'executions', v_existing_agent_executions,
        'monthly_limit', v_agent.monthly_limit
      )
    );
  end if;

  insert into public.usage_counters (org_id, agent_id, billing_period, executions, updated_at)
  values (v_agent.org_id, v_agent.id, v_billing_period, 1, v_now)
  on conflict (agent_id, billing_period)
  do update set
    executions = public.usage_counters.executions + 1,
    updated_at = excluded.updated_at
  where coalesce(v_agent.monthly_limit, 0) = 0
     or public.usage_counters.executions < v_agent.monthly_limit
  returning public.usage_counters.executions - 1, public.usage_counters.executions
  into v_previous_count, v_new_count;

  if not found then
    select executions
    into v_existing_agent_executions
    from public.usage_counters
    where agent_id = v_agent.id
      and billing_period = v_billing_period;

    return jsonb_build_object(
      'ok', false,
      'error', jsonb_build_object(
        'code', 'AGENT_QUOTA_EXCEEDED',
        'message', 'Agent monthly quota exceeded',
        'scope', 'agent',
        'agent_id', v_agent.id,
        'org_id', v_agent.org_id,
        'billing_period', v_billing_period,
        'executions', coalesce(v_existing_agent_executions, 0),
        'monthly_limit', v_agent.monthly_limit
      )
    );
  end if;


  return jsonb_build_object(
    'ok', true,
    'reservation', jsonb_build_object(
      'reservation_id', v_reservation_id,
      'agent_id', v_agent.id,
      'org_id', v_agent.org_id,
      'period', v_billing_period,
      'org_period', v_org_period,
      'previous_count', v_previous_count,
      'new_count', v_new_count,
      'monthly_limit', v_agent.monthly_limit,
      'included_executions', v_included_executions,
      'plan_key', v_plan_key,
      'reserved_at', v_now
    )
  );
end;
$$;
