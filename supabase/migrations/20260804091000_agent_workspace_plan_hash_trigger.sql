-- Keep plan hashes identical across migrations, APIs and runtime calls.
-- PostgreSQL owns the canonical jsonb representation and therefore owns the
-- authoritative hash used by the authorization RPC.

create or replace function public.hash_agent_workspace_plan(p_plan jsonb)
returns text
language sql
immutable
strict
as $$
  select encode(digest(convert_to(p_plan::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.set_agent_workspace_plan_hash()
returns trigger
language plpgsql
as $$
begin
  new.plan_hash := public.hash_agent_workspace_plan(coalesce(new.approved_plan, '{}'::jsonb));
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_agent_workspace_plan_hash on public.agent_workspaces;
create trigger trg_agent_workspace_plan_hash
before insert or update of approved_plan on public.agent_workspaces
for each row execute function public.set_agent_workspace_plan_hash();

update public.agent_workspaces
set approved_plan = approved_plan
where workspace_key = 'dsg-agent-dev';

revoke all on function public.hash_agent_workspace_plan(jsonb) from public;
grant execute on function public.hash_agent_workspace_plan(jsonb) to service_role;
