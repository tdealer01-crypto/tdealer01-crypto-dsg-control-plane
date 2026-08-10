-- Resolve MCP key authorization in the same security-definer RPC as key/quota validation.
-- The key table stores auth.users(id); public.users carries the control-plane
-- actor/org identity and runtime role bootstrap.
create or replace function public.validate_mcp_api_key_context(
  p_key_hash text
) returns table(
  key_id       uuid,
  key_actor_id uuid,
  actor_id     uuid,
  org_id       text,
  roles        text[],
  plan_id      text,
  calls_used   integer,
  calls_limit  integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key_id       uuid;
  v_key_actor_id uuid;
  v_plan_id      text;
  v_calls_limit  integer;
  v_period_start timestamptz;
  v_period_end   timestamptz;
  v_calls_used   integer;
  v_actor_id     uuid;
  v_org_id       text;
  v_org_uuid     uuid;
  v_base_role    text;
  v_runtime_role text;
  v_roles        text[] := '{}'::text[];
begin
  select
    k.key_id,
    k.actor_id,
    k.plan_id,
    k.calls_limit,
    k.period_start,
    k.period_end,
    count(u.usage_id)::integer
  into
    v_key_id,
    v_key_actor_id,
    v_plan_id,
    v_calls_limit,
    v_period_start,
    v_period_end,
    v_calls_used
  from public.dsg_mcp_api_keys k
  left join public.dsg_mcp_usage u
    on u.key_id = k.key_id
   and u.called_at >= k.period_start
   and u.called_at < k.period_end
  where k.key_hash = p_key_hash
    and k.status = 'ACTIVE'
    and k.period_end > now()
  group by
    k.key_id,
    k.actor_id,
    k.plan_id,
    k.calls_limit,
    k.period_start,
    k.period_end
  having count(u.usage_id) < k.calls_limit
  limit 1;

  if v_key_id is null then
    return;
  end if;

  select
    u.id,
    u.org_id,
    lower(coalesce(u.role, ''))
  into
    v_actor_id,
    v_org_uuid,
    v_base_role
  from public.users u
  where u.auth_user_id = v_key_actor_id
    and u.is_active = true
    and u.org_id is not null
  limit 1;

  if v_actor_id is null then
    return;
  end if;

  v_roles := case
    when v_base_role in ('owner', 'admin') then
      array['org_admin', 'operator', 'reviewer', 'runtime_auditor', 'billing_admin']::text[]
    when v_base_role = 'viewer' then
      array['reviewer']::text[]
    when v_base_role in ('org_admin', 'operator', 'reviewer', 'runtime_auditor', 'billing_admin') then
      array[v_base_role]::text[]
    else
      '{}'::text[]
  end;

  for v_runtime_role in
    select rr.role
    from public.runtime_roles rr
    where rr.org_id = v_org_uuid
      and rr.user_id = v_actor_id
  loop
    if not (v_runtime_role = any(v_roles)) then
      v_roles := array_append(v_roles, v_runtime_role);
    end if;
  end loop;

  return query
  select
    v_key_id,
    v_key_actor_id,
    v_actor_id,
    v_org_uuid::text,
    v_roles,
    v_plan_id,
    v_calls_used,
    v_calls_limit;
end;
$$;

revoke all on function public.validate_mcp_api_key_context(text) from public, anon, authenticated;
grant execute on function public.validate_mcp_api_key_context(text) to service_role;

-- These mutating functions are server-only. A public anon key must never be
-- able to mint, meter, or revoke an MCP credential.
revoke all on function public.create_mcp_api_key(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.record_mcp_usage(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_mcp_api_key(uuid, uuid) from public, anon, authenticated;
grant execute on function public.create_mcp_api_key(uuid, text, text, text) to service_role;
grant execute on function public.record_mcp_usage(uuid, uuid, text) to service_role;
grant execute on function public.revoke_mcp_api_key(uuid, uuid) to service_role;

-- Validation is also server-only so the gateway cannot be downgraded to a
-- public key without an explicit, reviewed policy change.
revoke all on function public.validate_mcp_api_key(text) from public, anon, authenticated;
grant execute on function public.validate_mcp_api_key(text) to service_role;
