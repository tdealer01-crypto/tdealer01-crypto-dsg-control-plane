create schema if not exists api;

create or replace function api.dsg_record_production_flow_proof(
  p_details jsonb default '{}'::jsonb,
  p_flow_name text default 'production_flow',
  p_job_id text default null,
  p_proof_hash text default null,
  p_status text default 'FAILED'
)
returns jsonb
language plpgsql
security definer
set search_path = public, api
as $$
declare
  v_id uuid;
  v_job_uuid uuid;
  v_workspace_id uuid;
  v_checked_by text;
begin
  if p_proof_hash is null or length(trim(p_proof_hash)) = 0 then
    raise exception 'DSG_PROOF_HASH_REQUIRED';
  end if;

  begin
    v_job_uuid := nullif(p_job_id, '')::uuid;
  exception when invalid_text_representation then
    v_job_uuid := null;
  end;

  begin
    v_workspace_id := coalesce(
      nullif(p_details->>'workspace_id', '')::uuid,
      nullif(p_details->>'workspaceId', '')::uuid,
      '00000000-0000-4000-8000-000000000101'::uuid
    );
  exception when invalid_text_representation then
    v_workspace_id := '00000000-0000-4000-8000-000000000101'::uuid;
  end;

  v_checked_by := coalesce(
    nullif(p_details->>'checked_by', ''),
    nullif(p_details->>'checkedBy', ''),
    'github-actions'
  );

  insert into public.dsg_production_flow_proofs (
    job_id,
    workspace_id,
    flow_name,
    proof_hash,
    status,
    checked_by,
    details
  ) values (
    v_job_uuid,
    v_workspace_id,
    p_flow_name,
    p_proof_hash,
    p_status,
    v_checked_by,
    coalesce(p_details, '{}'::jsonb) || jsonb_build_object(
      'inputJobId', p_job_id,
      'recordedByRpc', 'api.dsg_record_production_flow_proof'
    )
  )
  returning id into v_id;

  return jsonb_build_object(
    'ok', true,
    'id', v_id,
    'jobId', p_job_id,
    'flowName', p_flow_name,
    'status', p_status,
    'proofHash', p_proof_hash
  );
end;
$$;

grant usage on schema api to anon, authenticated, service_role;
grant execute on function api.dsg_record_production_flow_proof(jsonb, text, text, text, text)
to anon, authenticated, service_role;;
