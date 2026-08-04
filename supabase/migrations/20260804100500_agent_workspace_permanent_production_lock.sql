-- Production is never globally unlocked for an agent workspace. Exact,
-- evidence-bound promotions authorize individual actions while these flags
-- remain locked.

create or replace function public.enforce_agent_workspace_production_lock()
returns trigger
language plpgsql
as $$
begin
  new.production_access := false;
  new.production_locked := true;
  return new;
end;
$$;

drop trigger if exists trg_agent_workspace_production_lock on public.agent_workspaces;
create trigger trg_agent_workspace_production_lock
before insert or update of production_access, production_locked
on public.agent_workspaces
for each row execute function public.enforce_agent_workspace_production_lock();

update public.agent_workspaces
set production_access = false,
    production_locked = true,
    updated_at = now();
