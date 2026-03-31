create or replace function runtime_commit_execution(
  p_org_id text,
  p_agent_id text,
  p_request_id uuid,
  p_truth_state_id uuid,
  p_decision text,
  p_reason text,
  p_truth_sequence bigint,
  p_execution_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns runtime_ledger_entries
language plpgsql
security definer
as $$
declare
  inserted runtime_ledger_entries;
begin
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
    p_execution_id,
    p_truth_state_id,
    p_decision,
    p_truth_sequence,
    p_reason,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into inserted;

  update runtime_approval_requests
    set status = 'consumed', consumed_at = now()
    where id = p_request_id
      and status = 'pending';

  return inserted;
end;
$$;
