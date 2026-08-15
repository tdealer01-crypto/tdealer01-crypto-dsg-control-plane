create or replace function public.agent_workspace_promotion_checks_pass(p_checks jsonb)
returns boolean
language sql
immutable
as $$
  with required(check_name) as (
    values
      ('typecheck'),
      ('unit_tests'),
      ('build'),
      ('preview_smoke'),
      ('migration_check'),
      ('security_check'),
      ('rollback_ready')
  )
  select bool_and(
    lower(coalesce(p_checks ->> required.check_name, ''))
      in ('true', 'pass', 'passed', 'success', 'green')
  )
  from required;
$$;

create or replace function public.enforce_agent_workspace_promotion_evidence()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'approved' then
    if new.commit_sha is null or new.commit_sha !~ '^[0-9a-fA-F]{7,64}$' then
      raise exception 'promotion_requires_valid_commit_sha';
    end if;
    if new.evidence_hash is null or new.evidence_hash !~ '^[0-9a-fA-F]{64}$' then
      raise exception 'promotion_requires_valid_evidence_hash';
    end if;
    if coalesce(array_length(new.requested_scopes, 1), 0) = 0 then
      raise exception 'promotion_requires_exact_scopes';
    end if;
    if new.expires_at is null or new.expires_at <= now() then
      raise exception 'promotion_requires_future_expiry';
    end if;
    if not public.agent_workspace_promotion_checks_pass(new.checks) then
      raise exception 'promotion_required_checks_not_passed';
    end if;
    if new.approved_by is null or new.approved_at is null then
      raise exception 'promotion_requires_approver_identity';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_agent_workspace_promotion_evidence on public.agent_workspace_promotions;
create trigger trg_agent_workspace_promotion_evidence
before insert or update of status, checks, commit_sha, evidence_hash, requested_scopes, expires_at
on public.agent_workspace_promotions
for each row execute function public.enforce_agent_workspace_promotion_evidence();

-- Append-only audit rows retain their references. Referenced workspace, lease,
-- and promotion records therefore cannot be deleted while audit evidence exists.
alter table public.agent_workspace_audit_events
  drop constraint if exists agent_workspace_audit_events_workspace_id_fkey,
  drop constraint if exists agent_workspace_audit_events_lease_id_fkey,
  drop constraint if exists agent_workspace_audit_events_promotion_id_fkey;

alter table public.agent_workspace_audit_events
  add constraint agent_workspace_audit_events_workspace_id_fkey
    foreign key (workspace_id) references public.agent_workspaces(id) on delete restrict,
  add constraint agent_workspace_audit_events_lease_id_fkey
    foreign key (lease_id) references public.agent_workspace_leases(id) on delete restrict,
  add constraint agent_workspace_audit_events_promotion_id_fkey
    foreign key (promotion_id) references public.agent_workspace_promotions(id) on delete restrict;

revoke all on function public.agent_workspace_promotion_checks_pass(jsonb) from public;
grant execute on function public.agent_workspace_promotion_checks_pass(jsonb) to service_role;;
