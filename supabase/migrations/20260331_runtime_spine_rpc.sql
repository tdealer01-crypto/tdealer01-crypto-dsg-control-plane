create unique index if not exists idx_runtime_ledger_request_once
  on runtime_ledger_entries(request_id)
  where request_id is not null;

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
  p_created_at timestamptz default now()
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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'runtime_commit_execution requires service_role';
  end if;

  select * into v_request
  from runtime_approval_requests
  where id = p_request_id
    and org_id = p_org_id
    and agent_id = p_agent_id
  for update;

  if v_request.id is null then
    raise exception 'approval request not found for org/agent';
  end if;

  if v_request.status = 'consumed' then
    select * into v_existing
    from runtime_ledger_entries
    where request_id = p_request_id
    limit 1;

    if v_existing.id is null then
      raise exception 'approval consumed without ledger lineage';
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
    raise exception 'approval request is not pending';
  end if;

  if v_request.expires_at is not null and v_request.expires_at < now() then
    update runtime_approval_requests
    set status = 'expired'
    where id = p_request_id;
    raise exception 'approval request expired';
  end if;

  insert into runtime_truth_states (
    org_id,
    agent_id,
    canonical_hash,
    canonical_json
  )
  values (
    p_org_id,
    p_agent_id,
    p_canonical_hash,
    coalesce(p_canonical_json, '{}'::jsonb)
  )
  on conflict (org_id, agent_id, canonical_hash)
  do update set canonical_json = excluded.canonical_json
  returning * into v_truth;

  insert into executions (
    org_id,
    agent_id,
    decision,
    latency_ms,
    request_payload,
    context_payload,
    policy_version,
    reason,
    created_at
  )
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
  timestamptz
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
  timestamptz
) to service_role;
