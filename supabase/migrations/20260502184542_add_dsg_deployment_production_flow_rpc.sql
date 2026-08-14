create or replace function public.dsg_record_deployment_proof(
  p_job_id uuid,
  p_environment text,
  p_deployment_url text,
  p_proof_hash text,
  p_status text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_proof_id uuid;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then raise exception 'DSG_JOB_NOT_FOUND'; end if;
  if not public.dsg_has_permission(v_workspace_id, 'deployment:write') then raise exception 'DSG_PERMISSION_DENIED'; end if;
  if p_proof_hash !~ '^sha256:[a-f0-9]{64}$' then raise exception 'DSG_INVALID_DEPLOYMENT_PROOF_HASH'; end if;
  if p_status not in ('PASS','BLOCK','FAILED') then raise exception 'DSG_INVALID_DEPLOYMENT_STATUS'; end if;
  if p_environment is null or length(trim(p_environment)) = 0 then raise exception 'DSG_ENVIRONMENT_REQUIRED'; end if;
  if p_deployment_url is null or p_deployment_url !~ '^https://.+' then raise exception 'DSG_HTTPS_DEPLOYMENT_URL_REQUIRED'; end if;

  insert into public.dsg_deployment_proofs(job_id, workspace_id, environment, deployment_url, proof_hash, status, checked_by, details)
  values (p_job_id, v_workspace_id, p_environment, p_deployment_url, p_proof_hash, p_status, v_actor, coalesce(p_details, '{}'::jsonb))
  returning id into v_proof_id;

  insert into public.dsg_runtime_events(job_id, workspace_id, event_type, message, actor_id, payload)
  values (p_job_id, v_workspace_id, 'DEPLOYMENT_PROOF_RECORDED', 'Deployment proof recorded', v_actor,
    jsonb_build_object('deploymentProofId', v_proof_id, 'environment', p_environment, 'status', p_status));

  return v_proof_id;
end;
$$;

create or replace function public.dsg_record_production_flow_proof(
  p_job_id uuid,
  p_flow_name text,
  p_proof_hash text,
  p_status text,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_proof_id uuid;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then raise exception 'DSG_JOB_NOT_FOUND'; end if;
  if not public.dsg_has_permission(v_workspace_id, 'production:write') then raise exception 'DSG_PERMISSION_DENIED'; end if;
  if p_proof_hash !~ '^sha256:[a-f0-9]{64}$' then raise exception 'DSG_INVALID_PRODUCTION_FLOW_PROOF_HASH'; end if;
  if p_status not in ('PASS','BLOCK','FAILED') then raise exception 'DSG_INVALID_PRODUCTION_FLOW_STATUS'; end if;
  if p_flow_name is null or length(trim(p_flow_name)) = 0 then raise exception 'DSG_FLOW_NAME_REQUIRED'; end if;

  insert into public.dsg_production_flow_proofs(job_id, workspace_id, flow_name, proof_hash, status, checked_by, details)
  values (p_job_id, v_workspace_id, p_flow_name, p_proof_hash, p_status, v_actor, coalesce(p_details, '{}'::jsonb))
  returning id into v_proof_id;

  insert into public.dsg_runtime_events(job_id, workspace_id, event_type, message, actor_id, payload)
  values (p_job_id, v_workspace_id, 'PRODUCTION_FLOW_PROOF_RECORDED', 'Production flow proof recorded', v_actor,
    jsonb_build_object('productionFlowProofId', v_proof_id, 'flowName', p_flow_name, 'status', p_status));

  return v_proof_id;
end;
$$;

revoke execute on function public.dsg_record_deployment_proof(uuid, text, text, text, text, jsonb) from anon;
revoke execute on function public.dsg_record_production_flow_proof(uuid, text, text, text, jsonb) from anon;