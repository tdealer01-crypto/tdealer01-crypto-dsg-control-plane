create or replace function public.dsg_create_plan(
  p_job_id uuid,
  p_plan_hash text,
  p_tasks jsonb,
  p_dependency_edges jsonb,
  p_wave_hash text,
  p_waves jsonb
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_task_plan_id uuid;
  v_wave_plan_id uuid;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'job:plan') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_plan_hash !~ '^sha256:[a-f0-9]{64}$' or p_wave_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'DSG_INVALID_PLAN_HASH';
  end if;

  if jsonb_typeof(p_tasks) <> 'array' or jsonb_array_length(p_tasks) = 0 then
    raise exception 'DSG_TASKS_REQUIRED';
  end if;

  insert into public.dsg_task_plans(job_id, workspace_id, plan_hash, tasks, dependency_edges, status, created_by)
  values (p_job_id, v_workspace_id, p_plan_hash, p_tasks, coalesce(p_dependency_edges, '[]'::jsonb), 'READY', v_actor)
  returning id into v_task_plan_id;

  insert into public.dsg_wave_plans(job_id, workspace_id, task_plan_id, wave_hash, waves, status)
  values (p_job_id, v_workspace_id, v_task_plan_id, p_wave_hash, coalesce(p_waves, '[]'::jsonb), 'READY')
  returning id into v_wave_plan_id;

  update public.dsg_runtime_jobs
  set status = 'WAITING_APPROVAL', current_wave_id = 'wave-1'
  where id = p_job_id;

  insert into public.dsg_runtime_events(job_id, workspace_id, event_type, message, actor_id, payload)
  values (
    p_job_id,
    v_workspace_id,
    'PLAN_CREATED',
    'Runtime plan created',
    v_actor,
    jsonb_build_object('taskPlanId', v_task_plan_id, 'wavePlanId', v_wave_plan_id, 'planHash', p_plan_hash, 'waveHash', p_wave_hash)
  );

  return jsonb_build_object('taskPlanId', v_task_plan_id, 'wavePlanId', v_wave_plan_id);
end;
$$;

create or replace function public.dsg_create_evidence_manifest(
  p_job_id uuid,
  p_manifest_hash text,
  p_evidence_ids uuid[]
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_manifest_id uuid;
  v_missing_count integer;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'evidence:write') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_manifest_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'DSG_INVALID_MANIFEST_HASH';
  end if;

  select count(*) into v_missing_count
  from unnest(coalesce(p_evidence_ids, array[]::uuid[])) as e(id)
  where not exists (
    select 1 from public.dsg_evidence_items item
    where item.id = e.id and item.job_id = p_job_id and item.workspace_id = v_workspace_id
  );

  if v_missing_count > 0 or cardinality(coalesce(p_evidence_ids, array[]::uuid[])) = 0 then
    raise exception 'DSG_EVIDENCE_INCOMPLETE';
  end if;

  insert into public.dsg_evidence_manifests(job_id, workspace_id, manifest_hash, evidence_ids, status, created_by)
  values (p_job_id, v_workspace_id, p_manifest_hash, p_evidence_ids, 'COMPLETE', v_actor)
  returning id into v_manifest_id;

  return v_manifest_id;
end;
$$;

create or replace function public.dsg_create_audit_export(
  p_job_id uuid,
  p_export_hash text
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_export_id uuid;
  v_entry_ids uuid[];
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'audit:export') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_export_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'DSG_INVALID_AUDIT_EXPORT_HASH';
  end if;

  select coalesce(array_agg(id order by created_at asc), array[]::uuid[]) into v_entry_ids
  from public.dsg_audit_ledger
  where job_id = p_job_id and workspace_id = v_workspace_id;

  if cardinality(v_entry_ids) = 0 then
    raise exception 'DSG_AUDIT_EMPTY';
  end if;

  insert into public.dsg_audit_exports(job_id, workspace_id, export_hash, ledger_entry_ids, created_by)
  values (p_job_id, v_workspace_id, p_export_hash, v_entry_ids, v_actor)
  returning id into v_export_id;

  return v_export_id;
end;
$$;

create or replace function public.dsg_create_completion_report(
  p_job_id uuid,
  p_report_hash text,
  p_evidence_manifest_id uuid,
  p_audit_export_id uuid,
  p_replay_proof_id uuid,
  p_deployment_proof_id uuid default null,
  p_production_flow_proof_id uuid default null,
  p_uses_mock_state boolean default false,
  p_is_dev_or_smoke_only boolean default true
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_report_id uuid;
  v_replay_status text;
  v_has_deployment boolean;
  v_has_production_flow boolean;
  v_gate jsonb;
  v_claim_status text;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'replay:verify') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_report_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'DSG_INVALID_REPORT_HASH';
  end if;

  if not exists (select 1 from public.dsg_evidence_manifests where id = p_evidence_manifest_id and job_id = p_job_id and status = 'COMPLETE') then
    raise exception 'DSG_EVIDENCE_MANIFEST_REQUIRED';
  end if;

  if not exists (select 1 from public.dsg_audit_exports where id = p_audit_export_id and job_id = p_job_id) then
    raise exception 'DSG_AUDIT_EXPORT_REQUIRED';
  end if;

  select status into v_replay_status from public.dsg_replay_proofs where id = p_replay_proof_id and job_id = p_job_id;
  if v_replay_status is distinct from 'PASS' then
    raise exception 'DSG_REPLAY_PASS_REQUIRED';
  end if;

  v_has_deployment := p_deployment_proof_id is not null and exists (
    select 1 from public.dsg_deployment_proofs where id = p_deployment_proof_id and job_id = p_job_id and status = 'PASS'
  );
  v_has_production_flow := p_production_flow_proof_id is not null and exists (
    select 1 from public.dsg_production_flow_proofs where id = p_production_flow_proof_id and job_id = p_job_id and status = 'PASS'
  );

  v_gate := public.dsg_claim_gate(true, true, true, true, v_has_deployment, v_has_production_flow, p_uses_mock_state, p_is_dev_or_smoke_only);

  if (v_gate->>'production')::boolean then
    v_claim_status := 'PRODUCTION';
  elsif (v_gate->>'deployable')::boolean then
    v_claim_status := 'DEPLOYABLE';
  elsif (v_gate->>'verified')::boolean then
    v_claim_status := 'VERIFIED';
  else
    v_claim_status := 'BLOCKED';
  end if;

  insert into public.dsg_completion_reports(
    job_id,
    workspace_id,
    claim_status,
    evidence_manifest_id,
    audit_export_id,
    replay_proof_id,
    block_reasons,
    report_hash,
    created_by
  ) values (
    p_job_id,
    v_workspace_id,
    v_claim_status,
    p_evidence_manifest_id,
    p_audit_export_id,
    p_replay_proof_id,
    coalesce(array(select jsonb_array_elements_text(v_gate->'blocks')), array[]::text[]),
    p_report_hash,
    v_actor
  ) returning id into v_report_id;

  update public.dsg_runtime_jobs
  set status = case when v_claim_status in ('VERIFIED','DEPLOYABLE','PRODUCTION') then 'COMPLETED' else 'BLOCKED' end,
      completion_report_id = v_report_id
  where id = p_job_id;

  return v_report_id;
end;
$$;

revoke execute on function public.dsg_create_plan(uuid, text, jsonb, jsonb, text, jsonb) from anon;
revoke execute on function public.dsg_create_evidence_manifest(uuid, text, uuid[]) from anon;
revoke execute on function public.dsg_create_audit_export(uuid, text) from anon;
revoke execute on function public.dsg_create_completion_report(uuid, text, uuid, uuid, uuid, uuid, uuid, boolean, boolean) from anon;