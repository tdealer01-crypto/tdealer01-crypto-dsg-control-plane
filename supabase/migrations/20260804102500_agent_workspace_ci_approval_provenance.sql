-- Approved promotions must carry trusted release-CI provenance. The API may
-- request or reject a promotion, but only the release workflow holding the
-- service-role secret can populate these fields and move it to approved.

create or replace function public.enforce_agent_workspace_promotion_evidence()
returns trigger
language plpgsql
as $$
declare
  v_scope text;
begin
  foreach v_scope in array coalesce(new.requested_scopes, '{}'::text[])
  loop
    if not public.agent_workspace_production_scope_allowed(v_scope) then
      raise exception 'promotion_scope_not_allowed:%', v_scope;
    end if;
  end loop;

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
    if new.approved_by is null
      or new.approved_by not like 'github-actions:https://github.com/%/actions/runs/%'
      or new.approved_at is null then
      raise exception 'promotion_requires_trusted_ci_approver';
    end if;
    if coalesce(new.checks ->> 'approval_mode', '') <> 'trusted_release_ci' then
      raise exception 'promotion_requires_trusted_release_ci_mode';
    end if;
    if coalesce(new.checks ->> 'promotion_id', '') <> new.id::text then
      raise exception 'promotion_evidence_id_mismatch';
    end if;
    if lower(coalesce(new.checks ->> 'commit_sha', '')) <> lower(new.commit_sha) then
      raise exception 'promotion_evidence_commit_mismatch';
    end if;
    if coalesce(new.checks ->> 'github_run_url', '') not like 'https://github.com/%/actions/runs/%' then
      raise exception 'promotion_requires_github_run_url';
    end if;
    if coalesce(new.checks ->> 'preview_url', '') not like 'https://%' then
      raise exception 'promotion_requires_preview_url';
    end if;
    if coalesce(new.checks ->> 'rollback_url', '') not like 'https://%' then
      raise exception 'promotion_requires_rollback_url';
    end if;
  end if;
  return new;
end;
$$;
