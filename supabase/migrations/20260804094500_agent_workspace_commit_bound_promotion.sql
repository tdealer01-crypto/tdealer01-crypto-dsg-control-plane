-- Bind production authorization to the exact commit recorded by promotion.

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
  p_promotion_id uuid default null,
  p_commit_sha text default null
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
            elsif p_commit_sha is null or p_commit_sha !~ '^[0-9a-fA-F]{7,64}$' then
              v_reason := 'production_requires_valid_commit_sha';
            else
              select pr.* into v_promotion
              from public.agent_workspace_promotions pr
              where pr.id = p_promotion_id
                and pr.workspace_id = v_workspace.id
                and pr.org_id = p_org_id
                and pr.target_environment = 'production'
                and pr.status = 'approved'
                and pr.commit_sha is not null
                and lower(pr.commit_sha) = lower(p_commit_sha)
                and pr.evidence_hash is not null
                and (pr.expires_at is null or pr.expires_at > now())
              limit 1;

              if v_promotion.id is null then
                v_reason := 'promotion_missing_expired_unapproved_or_commit_mismatch';
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
    coalesce(p_evidence, '{}'::jsonb) || jsonb_build_object('commit_sha', p_commit_sha)
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
  text, text, text, text, text, text, text, text, text, jsonb, uuid, text
) from public;
grant execute on function public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid, text
) to service_role;

drop function if exists public.authorize_agent_workspace_action(
  text, text, text, text, text, text, text, text, text, jsonb, uuid
);
