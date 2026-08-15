-- Make OAuth bearer tokens first-class credentials for the unified MCP gateway.
-- The token remains opaque to the gateway; authorization, role resolution, and
-- quota checks happen in one server-only security-definer RPC.

create or replace function public.validate_mcp_oauth_token_context(
  p_token_hash text
) returns table(
  token_id      uuid,
  key_id        uuid,
  key_actor_id  uuid,
  actor_id      uuid,
  org_id        text,
  roles         text[],
  plan_id       text,
  calls_used    integer,
  calls_limit   integer,
  scope         text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token_id      uuid;
  v_key_id        uuid;
  v_key_actor_id  uuid;
  v_plan_id       text;
  v_scope         text;
  v_calls_limit   integer;
  v_period_start  timestamptz;
  v_period_end    timestamptz;
  v_calls_used    integer;
  v_actor_id      uuid;
  v_org_uuid      uuid;
  v_base_role     text;
  v_runtime_role  text;
  v_roles         text[] := '{}'::text[];
begin
  select
    t.token_id,
    k.key_id,
    k.actor_id,
    t.scope,
    k.plan_id,
    k.calls_limit,
    k.period_start,
    k.period_end,
    count(u.usage_id)::integer
  into
    v_token_id,
    v_key_id,
    v_key_actor_id,
    v_scope,
    v_plan_id,
    v_calls_limit,
    v_period_start,
    v_period_end,
    v_calls_used
  from public.mcp_oauth_tokens t
  join public.dsg_mcp_api_keys k
    on k.key_id = t.key_id
   and k.actor_id = t.actor_id
  left join public.dsg_mcp_usage u
    on u.key_id = k.key_id
   and u.called_at >= k.period_start
   and u.called_at < k.period_end
  where t.token_hash = p_token_hash
    and t.revoked_at is null
    and t.expires_at > now()
    and k.status = 'ACTIVE'
    and k.period_end > now()
  group by
    t.token_id,
    k.key_id,
    k.actor_id,
    t.scope,
    k.plan_id,
    k.calls_limit,
    k.period_start,
    k.period_end
  having count(u.usage_id) < k.calls_limit
  limit 1;

  if v_token_id is null then
    return;
  end if;

  if coalesce(v_scope, '') !~ '(^|[[:space:]])mcp:execute([[:space:]]|$)' then
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
    v_token_id,
    v_key_id,
    v_key_actor_id,
    v_actor_id,
    v_org_uuid::text,
    v_roles,
    v_plan_id,
    v_calls_used,
    v_calls_limit,
    v_scope;
end;
$$;

revoke all on function public.validate_mcp_oauth_token_context(text) from public, anon, authenticated;
grant execute on function public.validate_mcp_oauth_token_context(text) to service_role;

revoke all on function public.validate_mcp_oauth_token(text) from public, anon, authenticated;
revoke all on function public.create_mcp_oauth_token(uuid, uuid, text, text, integer) from public, anon, authenticated;
revoke all on function public.revoke_mcp_oauth_token(text, uuid) from public, anon, authenticated;
revoke all on function public.record_mcp_oauth_token_usage(uuid) from public, anon, authenticated;
revoke all on function public.create_mcp_oauth_code(uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.exchange_mcp_oauth_code(text, text, text, uuid, integer) from public, anon, authenticated;

grant execute on function public.validate_mcp_oauth_token(text) to service_role;
grant execute on function public.create_mcp_oauth_token(uuid, uuid, text, text, integer) to service_role;
grant execute on function public.revoke_mcp_oauth_token(text, uuid) to service_role;
grant execute on function public.record_mcp_oauth_token_usage(uuid) to service_role;
grant execute on function public.create_mcp_oauth_code(uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.exchange_mcp_oauth_code(text, text, text, uuid, integer) to service_role;;
