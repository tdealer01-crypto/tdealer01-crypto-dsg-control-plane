create or replace function public.dsg_provision_user_access(
  p_auth_user_id uuid,
  p_email text
)
returns jsonb
language plpgsql
as $$
declare
  invite_row record;
  target_workspace_id uuid;
  final_role text;
begin
  if p_auth_user_id is null then
    raise exception 'p_auth_user_id is required';
  end if;

  if p_email is null or position('@' in p_email) <= 1 then
    raise exception 'valid email is required';
  end if;

  select *
  into invite_row
  from public.dsg_access_invites
  where lower(email) = lower(p_email)
    and status = 'active'
    and (expires_at is null or expires_at > now())
  order by created_at desc
  limit 1;

  if invite_row.id is null then
    return jsonb_build_object(
      'ok', false,
      'reason', 'NO_ACTIVE_INVITE',
      'email', lower(p_email)
    );
  end if;

  final_role := invite_row.role;

  if invite_row.workspace_id is not null then
    target_workspace_id := invite_row.workspace_id;
  else
    select workspace_id
    into target_workspace_id
    from public.dsg_workspace_members
    where actor_id::text in (
      lower(p_email),
      p_email,
      p_auth_user_id::text
    )
    order by created_at desc nulls last
    limit 1;

    if target_workspace_id is null then
      select id
      into target_workspace_id
      from public.dsg_workspaces
      order by created_at desc nulls last, id desc
      limit 1;
    end if;
  end if;

  if target_workspace_id is null then
    raise exception 'No workspace available for provisioning';
  end if;

  insert into public.users (
    email,
    auth_user_id,
    full_name,
    role,
    is_active,
    created_at,
    updated_at
  )
  values (
    lower(p_email),
    p_auth_user_id,
    split_part(lower(p_email), '@', 1),
    lower(final_role),
    true,
    now(),
    now()
  )
  on conflict (email)
  do update set
    auth_user_id = excluded.auth_user_id,
    is_active = true,
    role = excluded.role,
    updated_at = now();

  insert into public.dsg_workspace_members (
    workspace_id,
    actor_id,
    role,
    created_at
  )
  values (
    target_workspace_id,
    p_auth_user_id::text,
    final_role,
    now()
  )
  on conflict (workspace_id, actor_id)
  do update set
    role = excluded.role;

  update public.dsg_access_invites
  set updated_at = now()
  where id = invite_row.id;

  return jsonb_build_object(
    'ok', true,
    'email', lower(p_email),
    'auth_user_id', p_auth_user_id,
    'workspace_id', target_workspace_id,
    'role', final_role,
    'purpose', invite_row.purpose
  );
end;
$$;

grant execute on function public.dsg_provision_user_access(uuid, text) to authenticated;
grant execute on function public.dsg_provision_user_access(uuid, text) to service_role;;
