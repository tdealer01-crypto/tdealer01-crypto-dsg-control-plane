-- Main-branch merge remains governed by GitHub PR/branch rules. The agent
-- workspace production gate controls external production mutations and must
-- not claim to enforce a GitHub merge without branch-protection integration.

create or replace function public.agent_workspace_production_scope_allowed(p_scope text)
returns boolean
language sql
immutable
strict
as $$
  select
    p_scope = 'deploy.production'
    or p_scope like 'database.production.%'
    or p_scope like 'stripe.live.%';
$$;

update public.agent_workspace_leases
set scopes = array_remove(scopes, 'repo.merge.main'),
    updated_at = now()
where 'repo.merge.main' = any(scopes);
