create or replace function runtime_commit_execution(
  p_org_id text,
  p_agent_id text,
  p_request_id uuid,
  p_decision text,
  p_reason text,
  p_metadata jsonb default '{}'::jsonb,
  p_canonical_hash text,
  p_canonical_json jsonb,
  p_latency_ms integer default 0,
  p_request_payload jsonb default '{}'::jsonb,
  p_context_payload jsonb default '{}'::jsonb,
  p_policy_version text default null,
  p_audit_evidence jsonb default '{}'::jsonb,
  p_usage_amount_usd numeric default 0,
  p_created_at timestamptz default now(),
  p_agent_monthly_limit integer default 0,
  p_org_plan_limit integer default 0
)
returns table (
  ledger_id uuid,
  execution_id uuid,
  truth_state_id uuid,
  ledger_sequence bigint,
  truth_sequence bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request runtime_approval_requests;
  v_existing runtime_ledger_entries;
  v_truth runtime_truth_states;
  v_execution executions;
  v_truth_sequence bigint;
  v_inserted runtime_ledger_entries;
  v_billing_period text;
  v_agent_executions bigint;
  v_org_executions bigint;
  v_rows integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'runtime_commit_execution requires service_role';
  end if;

  if p_decision not in ('ALLOW', 'STABILIZE', 'BLOCK') then
    raise exception 'invalid_decision';
  end if;

  perform pg_advisory_xact_lock(hashtext(coalesce(p_org_id, '')), 0);
  perform pg_advisory_xact_lock(hashtext(coalesce(p_org_id, '')), hashtext(coalesce(p_agent_id, '')));

  select * into v_request
  from runtime_approval_requests
  where id = p_request_id
    and org_id = p_org_id
    and agent_id = p_agent_id
  for update;

  if v_request.id is null then
    raise exception 'approval_request_not_found';
  end if;

  if v_request.status = 'consumed' then
    select * into v_existing
    from runtime_ledger_entries
    where request_id = p_request_id
    limit 1;

    if v_existing.id is null then
      raise exception 'approval_consumed_without_ledger_lineage';
    end if;

    return query
    select
      v_existing.id,
      v_existing.execution_id,
      v_existing.truth_state_id,
      v_existing.ledger_sequence,
      v_existing.truth_sequence,
      true;
    return;
  end if;

  if v_request.status <> 'pending' then
    raise exception 'approval_request_not_pending';
  end if;

  if v_request.expires_at is not null and v_request.expires_at < now() then
    update runtime_approval_requests
    set status = 'expired'
    where id = p_request_id;
    raise exception 'approval_request_expired';
  end if;

  v_billing_period := to_char(coalesce(p_created_at, now()), 'YYYY-MM');

  if p_agent_monthly_limit > 0 then
    select coalesce(sum(uc.executions), 0)
      into v_agent_executions
    from usage_counters uc
    where uc.agent_id = p_agent_id
      and uc.billing_period = v_billing_period;

    if v_agent_executions >= p_agent_monthly_limit then
      raise exception 'agent_quota_exceeded';
    end if;
  end if;

  if p_org_plan_limit > 0 then
    select coalesce(sum(uc.executions), 0)
      into v_org_executions
    from usage_counters uc
    where uc.org_id = p_org_id
      and uc.billing_period = v_billing_period;

    if v_org_executions >= p_org_plan_limit then
      raise exception 'org_quota_exceeded';
    end if;
  end if;

  insert into runtime_truth_states (org_id, agent_id, canonical_hash, canonical_json)
  values (p_org_id, p_agent_id, p_canonical_hash, coalesce(p_canonical_json, '{}'::jsonb))
  on conflict (org_id, agent_id, canonical_hash)
  do update set canonical_json = excluded.canonical_json
  returning * into v_truth;

  insert into executions (org_id, agent_id, decision, latency_ms, request_payload, context_payload, policy_version, reason, created_at)
  values (
    p_org_id,
    p_agent_id,
    p_decision,
    greatest(coalesce(p_latency_ms, 0), 0),
    coalesce(p_request_payload, '{}'::jsonb),
    coalesce(p_context_payload, '{}'::jsonb),
    p_policy_version,
    p_reason,
    coalesce(p_created_at, now())
  )
  returning * into v_execution;

  select coalesce(max(truth_sequence), 0) + 1
    into v_truth_sequence
  from runtime_ledger_entries
  where org_id = p_org_id
    and agent_id = p_agent_id;

  insert into runtime_ledger_entries (
    org_id,
    agent_id,
    request_id,
    execution_id,
    truth_state_id,
    decision,
    truth_sequence,
    reason,
    metadata
  )
  values (
    p_org_id,
    p_agent_id,
    p_request_id,
    v_execution.id,
    v_truth.id,
    p_decision,
    v_truth_sequence,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into v_inserted;

  update runtime_approval_requests
    set status = 'consumed',
        consumed_at = now()
    where id = p_request_id
      and status = 'pending';

  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'approval_consumption_failed';
  end if;

  insert into audit_logs (org_id, agent_id, execution_id, policy_version, decision, reason, evidence, created_at)
  values (
    p_org_id,
    p_agent_id,
    v_execution.id,
    p_policy_version,
    p_decision,
    p_reason,
    coalesce(p_audit_evidence, '{}'::jsonb),
    coalesce(p_created_at, now())
  );

  insert into usage_events (org_id, agent_id, execution_id, event_type, quantity, unit, amount_usd, metadata, created_at)
  values (
    p_org_id,
    p_agent_id,
    v_execution.id,
    'execution',
    1,
    'execution',
    coalesce(p_usage_amount_usd, 0),
    coalesce(p_metadata, '{}'::jsonb),
    coalesce(p_created_at, now())
  );

  insert into usage_counters (org_id, agent_id, billing_period, executions, updated_at)
  values (
    p_org_id,
    p_agent_id,
    v_billing_period,
    1,
    coalesce(p_created_at, now())
  )
  on conflict (agent_id, billing_period)
  do update
    set executions = usage_counters.executions + 1,
        updated_at = excluded.updated_at;

  insert into runtime_checkpoints (
    org_id,
    agent_id,
    truth_state_id,
    latest_ledger_entry_id,
    checkpoint_hash,
    metadata
  )
  values (
    p_org_id,
    p_agent_id,
    v_truth.id,
    v_inserted.id,
    p_canonical_hash,
    jsonb_build_object(
      'decision', p_decision,
      'policy_version', p_policy_version,
      'reason', p_reason
    )
  )
  on conflict (org_id, agent_id, checkpoint_hash)
  do nothing;

  return query
  select
    v_inserted.id,
    v_execution.id,
    v_truth.id,
    v_inserted.ledger_sequence,
    v_inserted.truth_sequence,
    false;
end;
$$;

revoke all on function public.runtime_commit_execution(
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer,
  jsonb,
  jsonb,
  text,
  jsonb,
  numeric,
  timestamptz,
  integer,
  integer
) from public;

grant execute on function public.runtime_commit_execution(
  text,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  integer,
  jsonb,
  jsonb,
  text,
  jsonb,
  numeric,
  timestamptz,
  integer,
  integer
) to service_role;
