create or replace function public.runtime_commit_execution(
  p_org_id text,
  p_agent_id text,
  p_request_id uuid,
  p_decision text,
  p_reason text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_canonical_hash text default null,
  p_canonical_json jsonb default '{}'::jsonb,
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
  execution_id uuid,
  ledger_id uuid,
  truth_state_id uuid,
  truth_sequence bigint,
  ledger_sequence bigint,
  replayed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_execution_id uuid;
  v_ledger_id uuid;
  v_truth_state_id uuid;
  v_truth_sequence bigint;
  v_ledger_sequence bigint;
  v_checkpoint_hash text;
begin
  if upper(coalesce(p_decision, '')) not in ('ALLOW', 'STABILIZE', 'BLOCK', 'PASS', 'REVIEW', 'UNSUPPORTED') then
    raise exception 'invalid_decision';
  end if;

  if not exists (
    select 1
    from public.runtime_approval_requests rar
    where rar.id = p_request_id
      and rar.org_id = p_org_id
      and rar.agent_id = p_agent_id
      and rar.status = 'pending'
  ) then
    raise exception 'no pending runtime intent';
  end if;

  select coalesce(max(rts.truth_sequence), 0) + 1
    into v_truth_sequence
  from public.runtime_truth_states rts
  where rts.org_id = p_org_id
    and rts.agent_id = p_agent_id;

  select coalesce(max(rle.ledger_sequence), 0) + 1
    into v_ledger_sequence
  from public.runtime_ledger_entries rle
  where rle.org_id = p_org_id
    and rle.agent_id = p_agent_id;

  insert into public.runtime_truth_states (
    org_id,
    agent_id,
    request_id,
    canonical_hash,
    canonical_json,
    decision,
    reason,
    policy_version,
    truth_sequence,
    created_at
  ) values (
    p_org_id,
    p_agent_id,
    p_request_id,
    p_canonical_hash,
    coalesce(p_canonical_json, '{}'::jsonb),
    upper(p_decision),
    p_reason,
    coalesce(p_policy_version, 'v1'),
    v_truth_sequence,
    coalesce(p_created_at, now())
  ) returning id into v_truth_state_id;

  insert into public.executions (
    org_id,
    agent_id,
    decision,
    latency_ms,
    request_payload,
    context_payload,
    policy_version,
    reason,
    created_at
  ) values (
    p_org_id::uuid,
    p_agent_id::uuid,
    upper(p_decision),
    coalesce(p_latency_ms, 0),
    coalesce(p_request_payload, '{}'::jsonb),
    coalesce(p_context_payload, '{}'::jsonb),
    coalesce(p_policy_version, 'v1'),
    p_reason,
    coalesce(p_created_at, now())
  ) returning id into v_execution_id;

  insert into public.runtime_ledger_entries (
    org_id,
    agent_id,
    request_id,
    execution_id,
    truth_state_id,
    decision,
    reason,
    metadata,
    canonical_hash,
    ledger_sequence,
    created_at
  ) values (
    p_org_id,
    p_agent_id,
    p_request_id,
    v_execution_id,
    v_truth_state_id,
    upper(p_decision),
    p_reason,
    coalesce(p_metadata, '{}'::jsonb),
    p_canonical_hash,
    v_ledger_sequence,
    coalesce(p_created_at, now())
  ) returning id into v_ledger_id;

  v_checkpoint_hash := encode(
    digest(
      coalesce(p_canonical_hash, '') || ':' || v_ledger_id::text || ':' || v_truth_sequence::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.runtime_checkpoints (
    org_id,
    agent_id,
    truth_state_id,
    latest_ledger_entry_id,
    checkpoint_hash,
    metadata,
    created_at
  ) values (
    p_org_id,
    p_agent_id,
    v_truth_state_id,
    v_ledger_id,
    v_checkpoint_hash,
    jsonb_build_object('source', 'runtime_commit_execution', 'execution_id', v_execution_id),
    coalesce(p_created_at, now())
  ) on conflict (org_id, agent_id, checkpoint_hash) do nothing;

  update public.runtime_approval_requests rar
  set status = 'consumed'
  where rar.id = p_request_id;

  return query
  select
    v_execution_id,
    v_ledger_id,
    v_truth_state_id,
    v_truth_sequence,
    v_ledger_sequence,
    false;
end;
$$;

notify pgrst, 'reload schema';;
