-- Promotion approval is created as pending, approved by trusted release CI,
-- consumed once, and then terminal.

alter table public.agent_workspace_promotions
  drop constraint if exists agent_workspace_promotions_status_check;

alter table public.agent_workspace_promotions
  add constraint agent_workspace_promotions_status_check
  check (status in ('pending', 'approved', 'rejected', 'executed'));

create or replace function public.enforce_agent_workspace_promotion_transition()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'promotion_must_start_pending';
    end if;
    return new;
  end if;

  if old.status = 'pending' and new.status not in ('pending', 'approved', 'rejected') then
    raise exception 'invalid_pending_promotion_transition:%', new.status;
  elsif old.status = 'approved' and new.status not in ('approved', 'executed', 'rejected') then
    raise exception 'invalid_approved_promotion_transition:%', new.status;
  elsif old.status in ('rejected', 'executed') and new.status <> old.status then
    raise exception 'terminal_promotion_cannot_transition:%', old.status;
  end if;

  if new.status = 'executed' and new.executed_at is null then
    raise exception 'executed_promotion_requires_executed_at';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_agent_workspace_promotion_transition on public.agent_workspace_promotions;
create trigger trg_agent_workspace_promotion_transition
before insert or update of status, executed_at
on public.agent_workspace_promotions
for each row execute function public.enforce_agent_workspace_promotion_transition();
