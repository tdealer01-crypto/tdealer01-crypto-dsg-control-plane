-- Restrict the development workspace to the repository owner's organization
-- and explicit active agent identities. Historical wildcard leases are
-- revoked, not deleted, so append-only audit references remain intact.

do $$
declare
  v_org_id text;
  v_workspace_id uuid;
begin
  select u.org_id::text into v_org_id
  from public.users u
  where lower(u.email) = 't.dealer01@dsg.pics'
    and u.is_active = true
  order by u.created_at asc
  limit 1;

  if v_org_id is null then
    raise exception 'agent_workspace_owner_org_not_found';
  end if;

  update public.agent_workspaces
  set org_id = v_org_id,
      created_by = 't.dealer01@dsg.pics',
      updated_at = now()
  where workspace_key = 'dsg-agent-dev'
  returning id into v_workspace_id;

  if v_workspace_id is null then
    raise exception 'dsg_agent_dev_workspace_not_found';
  end if;

  update public.agent_workspace_leases
  set status = 'revoked',
      auto_renew = false,
      auto_renew_until = now(),
      updated_at = now(),
      metadata = metadata || jsonb_build_object(
        'revoked_reason', 'replaced_by_explicit_org_agent_leases',
        'revoked_at', now()
      )
  where workspace_id = v_workspace_id
    and agent_id = '*'
    and status <> 'revoked';

  insert into public.agent_workspace_leases (
    workspace_id,
    agent_id,
    org_id,
    scopes,
    environments,
    status,
    starts_at,
    expires_at,
    auto_renew,
    auto_renew_until,
    issued_by,
    metadata,
    updated_at
  )
  select
    v_workspace_id,
    a.id::text,
    v_org_id,
    array[
      'repo.*',
      'database.*',
      'deploy.preview.*',
      'stripe.test.*',
      'tool.*',
      'test.*',
      'build.*',
      'browser.*',
      'logs.read',
      'evidence.*',
      'workspace.*',
      'deploy.production',
      'database.production.*',
      'stripe.live.*'
    ]::text[],
    array['development','preview','production']::text[],
    'active',
    now(),
    now() + interval '30 days',
    true,
    now() + interval '365 days',
    't.dealer01@dsg.pics',
    jsonb_build_object(
      'purpose', 'Plan-authorized development without repeated per-action approval',
      'membership', 'explicit_active_agent_in_owner_org'
    ),
    now()
  from public.agents a
  where a.org_id::text = v_org_id
    and a.status = 'active'
  on conflict (workspace_id, agent_id)
  do update set
    org_id = excluded.org_id,
    scopes = excluded.scopes,
    environments = excluded.environments,
    status = 'active',
    expires_at = excluded.expires_at,
    auto_renew = true,
    auto_renew_until = excluded.auto_renew_until,
    issued_by = excluded.issued_by,
    metadata = excluded.metadata,
    updated_at = now();
end;
$$;

create or replace function public.authorize_agent_workspace_action(
  p_workspace_key text,
  p_agent_id text,
  p_org_id text,
  p_scope text,
  p_environment text,
  p_plan_hash text,
  p_action text default 'execute',
  p_target text default null,
  p_input_hash text default null,
  p_evidence jsonb default '{}'::jsonb,
  p_promotion_id uuid default null
)
returns table (
  allowed boolean,
  reason text,
  workspace_id uuid,
  lease_id uuid,
  effective_plan_hash text,
  production_locked boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace public.agent_workspaces;
  v_lease public.agent_workspace_leases;
  v_promotion public.agent_workspace_promotions;
  v_allowed boolean := false;
  v_reason text := 'denied';
begin
  select w.* into v_workspace
  from public.agent_workspaces w
  where w.workspace_key = p_workspace_key
    and w.status = 'active'
  limit 1;

  if v_workspace.id is null then
    v_reason := 'workspace_not_found_or_inactive';
  elsif v_workspace.org_id is null
    or v_workspace.org_id in ('', 'system') then
    v_reason := 'workspace_requires_explicit_org_scope';
  elsif coalesce(p_org_id, '') <> v_workspace.org_id then
    v_reason := 'org_scope_mismatch';
  elsif p_environment <> all(v_workspace.allowed_environments)
    and p_environment <> 'production' then
    v_reason := 'environment_not_allowed';
  elsif coalesce(v_workspace.plan_hash, '') <> ''
    and coalesce(p_plan_hash, '') <> v_workspace.plan_hash then
    v_reason := 'plan_hash_mismatch';
  elsif p_environment <> 'production' and (
    p_scope like 'deploy.production%'
    or p_scope like 'database.production%'
    or p_scope like 'stripe.live%'
  ) then
    v_reason := 'production_scope_requires_production_environment';
  else
    select l.* into v_lease
    from public.agent_workspace_leases l
    where l.workspace_id = v_workspace.id
      and l.status = 'active'
      and l.agent_id = p_agent_id
      and l.org_id = p_org_id
      and l.starts_at <= now()
      and now() <= l.auto_renew_until
      and p_environment = any(l.environments)
      and public.agent_workspace_scope_matches(l.scopes, p_scope)
    order by l.expires_at desc
    limit 1;

    if v_lease.id is null then
      v_reason := 'no_active_lease_for_agent_scope';
    else
      if v_lease.expires_at < now() then
        if v_lease.auto_renew and v_lease.auto_renew_until > now() then
          update public.agent_workspace_leases l
          set expires_at = least(now() + interval '30 days', l.auto_renew_until),
              updated_at = now()
          where l.id = v_lease.id
          returning l.* into v_lease;
        else
          v_reason := 'lease_expired';
        end if;
      end if;

      if v_reason = 'denied' then
        if p_environment = 'production' then
          if not v_workspace.production_access or v_workspace.production_locked then
            if p_promotion_id is null then
              v_reason := 'production_requires_approved_promotion';
            else
              select pr.* into v_promotion
              from public.agent_workspace_promotions pr
              where pr.id = p_promotion_id
                and pr.workspace_id = v_workspace.id
                and pr.org_id = p_org_id
                and pr.target_environment = 'production'
                and pr.status = 'approved'
                and pr.commit_sha is not null
                and pr.evidence_hash is not null
                and (pr.expires_at is null or pr.expires_at > now())
              limit 1;

              if v_promotion.id is null then
                v_reason := 'promotion_missing_expired_or_not_approved';
              elsif not public.agent_workspace_scope_matches(v_promotion.requested_scopes, p_scope) then
                v_reason := 'promotion_scope_mismatch';
              else
                v_allowed := true;
                v_reason := 'approved_production_promotion';
              end if;
            end if;
          else
            v_allowed := true;
            v_reason := 'workspace_production_access_enabled';
          end if;
        else
          v_allowed := true;
          v_reason := 'plan_authorized_development_action';
        end if;
      end if;
    end if;
  end if;

  insert into public.agent_workspace_audit_events (
    workspace_id,
    org_id,
    agent_id,
    action,
    requested_scope,
    environment,
    target,
    plan_hash,
    input_hash,
    authorized,
    reason,
    lease_id,
    promotion_id,
    evidence
  ) values (
    v_workspace.id,
    p_org_id,
    p_agent_id,
    p_action,
    p_scope,
    p_environment,
    p_target,
    p_plan_hash,
    p_input_hash,
    v_allowed,
    v_reason,
    v_lease.id,
    p_promotion_id,
    coalesce(p_evidence, '{}'::jsonb)
  );

  return query select
    v_allowed,
    v_reason,
    v_workspace.id,
    v_lease.id,
    v_workspace.plan_hash,
    coalesce(v_workspace.production_locked, true);
end;
$$;

revoke all on function public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid
) from public;
grant execute on function public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid
) to service_role;;
