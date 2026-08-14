create or replace function public.dsg_member_role(target_workspace_id uuid)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select m.role
  from public.dsg_workspace_members m
  where m.workspace_id = target_workspace_id
    and m.actor_id = public.dsg_current_actor_id()
  limit 1
$$;

create or replace function public.dsg_has_permission(target_workspace_id uuid, permission text)
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select case public.dsg_member_role(target_workspace_id)
    when 'OWNER' then true
    when 'ADMIN' then permission = any(array[
      'job:read','job:create','job:plan','job:control','approval:write','evidence:write','audit:export','replay:verify','deployment:write'
    ])
    when 'OPERATOR' then permission = any(array[
      'job:read','job:create','job:plan','job:control','approval:write','evidence:write','replay:verify'
    ])
    when 'AUDITOR' then permission = any(array['job:read','audit:export','replay:verify'])
    when 'VIEWER' then permission = 'job:read'
    else false
  end
$$;

revoke execute on function public.dsg_member_role(uuid) from anon;
revoke execute on function public.dsg_has_permission(uuid, text) from anon;

drop policy if exists "dsg_workspace_insert_self" on public.dsg_workspaces;
create policy "dsg_workspace_insert_self" on public.dsg_workspaces
for insert to authenticated
with check (created_by = public.dsg_current_actor_id());

drop policy if exists "dsg_workspace_update_admin" on public.dsg_workspaces;
create policy "dsg_workspace_update_admin" on public.dsg_workspaces
for update to authenticated
using (public.dsg_member_role(id) = any(array['OWNER','ADMIN']))
with check (public.dsg_member_role(id) = any(array['OWNER','ADMIN']));

drop policy if exists "dsg_workspace_member_insert_self_owner" on public.dsg_workspace_members;
create policy "dsg_workspace_member_insert_self_owner" on public.dsg_workspace_members
for insert to authenticated
with check (actor_id = public.dsg_current_actor_id() and role = 'OWNER');

drop policy if exists "dsg_workspace_member_select_workspace" on public.dsg_workspace_members;
create policy "dsg_workspace_member_select_workspace" on public.dsg_workspace_members
for select to authenticated
using (actor_id = public.dsg_current_actor_id());

do $$
declare
  item record;
begin
  for item in select * from (values
    ('dsg_runtime_jobs','job:create','job:control'),
    ('dsg_input_locks','job:plan','job:plan'),
    ('dsg_task_plans','job:plan','job:plan'),
    ('dsg_wave_plans','job:plan','job:plan'),
    ('dsg_runtime_events','job:control','job:control'),
    ('dsg_approvals','approval:write','approval:write'),
    ('dsg_evidence_items','evidence:write','evidence:write'),
    ('dsg_evidence_manifests','evidence:write','evidence:write'),
    ('dsg_audit_ledger','audit:export','audit:export'),
    ('dsg_audit_exports','audit:export','audit:export'),
    ('dsg_replay_proofs','replay:verify','replay:verify'),
    ('dsg_completion_reports','replay:verify','replay:verify'),
    ('dsg_connectors','job:control','job:control'),
    ('dsg_tool_registry','job:control','job:control'),
    ('dsg_deployment_proofs','deployment:write','deployment:write'),
    ('dsg_production_flow_proofs','production:write','production:write')
  ) as x(table_name, insert_permission, update_permission) loop
    execute format('drop policy if exists "dsg_member_insert" on public.%I', item.table_name);
    execute format('drop policy if exists "dsg_member_update" on public.%I', item.table_name);
    execute format('create policy "dsg_member_insert" on public.%I for insert to authenticated with check (public.dsg_has_permission(workspace_id, %L))', item.table_name, item.insert_permission);
    execute format('create policy "dsg_member_update" on public.%I for update to authenticated using (public.dsg_has_permission(workspace_id, %L)) with check (public.dsg_has_permission(workspace_id, %L))', item.table_name, item.update_permission, item.update_permission);
  end loop;
end $$;

create or replace function public.dsg_claim_gate(
  has_evidence boolean,
  has_audit_export boolean,
  has_replay_proof boolean,
  has_auth_rbac_proof boolean,
  has_deployment_proof boolean,
  has_production_flow_proof boolean,
  uses_mock_state boolean,
  is_dev_or_smoke_only boolean
)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'completed', has_evidence and has_audit_export and has_replay_proof,
    'verified', has_evidence and has_audit_export and has_replay_proof and has_auth_rbac_proof,
    'deployable', has_evidence and has_audit_export and has_replay_proof and has_auth_rbac_proof and has_deployment_proof,
    'production', has_evidence and has_audit_export and has_replay_proof and has_auth_rbac_proof and has_deployment_proof and has_production_flow_proof and not uses_mock_state and not is_dev_or_smoke_only,
    'blocks', array_remove(array[
      case when not has_evidence then 'NO_EVIDENCE' end,
      case when not has_audit_export then 'NO_AUDIT_EXPORT' end,
      case when not has_replay_proof then 'NO_REPLAY_PROOF' end,
      case when not has_auth_rbac_proof then 'NO_AUTH_RBAC_PROOF' end,
      case when not has_deployment_proof then 'NO_DEPLOYMENT_PROOF' end,
      case when not has_production_flow_proof then 'NO_PRODUCTION_FLOW_PROOF' end,
      case when uses_mock_state then 'MOCK_STATE_BLOCKS_PRODUCTION' end,
      case when is_dev_or_smoke_only then 'DEV_OR_SMOKE_ONLY_BLOCKS_PRODUCTION' end
    ], null)
  )
$$;

create or replace function public.dsg_create_workspace(p_name text, p_slug text)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
begin
  if v_actor is null then
    raise exception 'DSG_AUTH_REQUIRED';
  end if;

  insert into public.dsg_workspaces(name, slug, created_by)
  values (p_name, p_slug, v_actor)
  returning id into v_workspace_id;

  insert into public.dsg_workspace_members(workspace_id, actor_id, role)
  values (v_workspace_id, v_actor, 'OWNER');

  return v_workspace_id;
end;
$$;

create or replace function public.dsg_create_runtime_job(
  p_workspace_id uuid,
  p_goal text,
  p_success_criteria jsonb default '[]'::jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_job_id uuid;
  v_payload jsonb;
  v_hash text;
begin
  if not public.dsg_has_permission(p_workspace_id, 'job:create') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_goal is null or length(trim(p_goal)) = 0 then
    raise exception 'DSG_GOAL_REQUIRED';
  end if;

  insert into public.dsg_runtime_jobs(workspace_id, goal, success_criteria, status, created_by)
  values (p_workspace_id, p_goal, coalesce(p_success_criteria, '[]'::jsonb), 'QUEUED', v_actor)
  returning id into v_job_id;

  v_payload := jsonb_build_object('jobId', v_job_id, 'goal', p_goal, 'status', 'QUEUED');
  v_hash := public.dsg_compute_audit_hash(null, v_actor, 'job:create', 'PASS', v_payload);

  insert into public.dsg_runtime_events(job_id, workspace_id, event_type, message, actor_id, payload)
  values (v_job_id, p_workspace_id, 'JOB_CREATED', 'Runtime job created', v_actor, v_payload);

  insert into public.dsg_audit_ledger(job_id, workspace_id, actor_id, action, decision, current_hash, payload)
  values (v_job_id, p_workspace_id, v_actor, 'job:create', 'PASS', v_hash, v_payload);

  return v_job_id;
end;
$$;

create or replace function public.dsg_record_evidence(
  p_job_id uuid,
  p_evidence_type text,
  p_content_hash text,
  p_summary text,
  p_uri text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_actor text := public.dsg_current_actor_id();
  v_workspace_id uuid;
  v_evidence_id uuid;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'evidence:write') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  if p_content_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception 'DSG_INVALID_EVIDENCE_HASH';
  end if;

  insert into public.dsg_evidence_items(job_id, workspace_id, evidence_type, uri, content_hash, summary, created_by, metadata)
  values (p_job_id, v_workspace_id, p_evidence_type, p_uri, p_content_hash, p_summary, v_actor, coalesce(p_metadata, '{}'::jsonb))
  returning id into v_evidence_id;

  return v_evidence_id;
end;
$$;

create or replace function public.dsg_record_replay_proof(
  p_job_id uuid,
  p_replay_hash text,
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
  v_replay_id uuid;
begin
  select workspace_id into v_workspace_id from public.dsg_runtime_jobs where id = p_job_id;
  if v_workspace_id is null then
    raise exception 'DSG_JOB_NOT_FOUND';
  end if;

  if not public.dsg_has_permission(v_workspace_id, 'replay:verify') then
    raise exception 'DSG_PERMISSION_DENIED';
  end if;

  insert into public.dsg_replay_proofs(job_id, workspace_id, replay_hash, status, checked_by, details)
  values (p_job_id, v_workspace_id, p_replay_hash, p_status, v_actor, coalesce(p_details, '{}'::jsonb))
  returning id into v_replay_id;

  return v_replay_id;
end;
$$;

revoke execute on function public.dsg_claim_gate(boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from anon;
revoke execute on function public.dsg_create_workspace(text, text) from anon;
revoke execute on function public.dsg_create_runtime_job(uuid, text, jsonb) from anon;
revoke execute on function public.dsg_record_evidence(uuid, text, text, text, text, jsonb) from anon;
revoke execute on function public.dsg_record_replay_proof(uuid, text, text, jsonb) from anon;