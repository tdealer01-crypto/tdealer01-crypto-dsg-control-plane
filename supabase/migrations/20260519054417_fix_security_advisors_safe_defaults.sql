-- Safe security hardening for Supabase security advisors
-- Goals:
-- 1) Remove mutable search_path warnings without changing function bodies.
-- 2) Prevent anon/authenticated from directly executing SECURITY DEFINER RPCs.
-- 3) Resolve RLS-enabled-no-policy warnings with explicit deny-by-default policies.
-- 4) Replace overly broad leads policy with service_role-scoped policy.

-- Function search_path hardening
alter function public.get_org_health_summary(p_org_id text) set search_path = public, auth, pg_temp;
alter function public.runtime_commit(p_agent_id uuid, p_organization_id uuid, p_user_id uuid, p_policy_id uuid, p_risk_score numeric, p_prompt text, p_context jsonb, p_request_id text, p_canonical_hash text) set search_path = public, auth, pg_temp;
alter function public.runtime_commit(p_agent_id uuid, p_organization_id uuid, p_user_id uuid, p_prompt text, p_decision text, p_risk_score double precision, p_stability_score double precision, p_proof_hash text, p_latency_ms integer, p_requires_approval boolean) set search_path = public, auth, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;
alter function public.normalize_slug(input_text text) set search_path = public, pg_temp;
alter function public.raise_ledger_immutable() set search_path = public, pg_temp;
alter function public.dsg_ledger_next_seq(p_org_id text) set search_path = public, pg_temp;
alter function public.dsg_ledger_latest_hash(p_org_id text) set search_path = public, pg_temp;
alter function public.current_user_org_id() set search_path = public, auth, pg_temp;
alter function public.current_user_is_active() set search_path = public, auth, pg_temp;
alter function public.dsg_prevent_agent_gate_audit_mutation() set search_path = public, pg_temp;

-- Revoke direct RPC execution from browser roles for SECURITY DEFINER functions flagged by advisor.
revoke execute on function api.dsg_record_production_flow_proof(p_details jsonb, p_flow_name text, p_job_id text, p_proof_hash text, p_status text) from anon, authenticated, public;
revoke execute on function public.current_org_id() from anon, authenticated, public;
revoke execute on function public.current_public_user_id() from anon, authenticated, public;
revoke execute on function public.current_user_is_active() from anon, authenticated, public;
revoke execute on function public.current_user_org_id() from anon, authenticated, public;
revoke execute on function public.dsg_ledger_latest_hash(p_org_id text) from anon, authenticated, public;
revoke execute on function public.dsg_ledger_next_seq(p_org_id text) from anon, authenticated, public;
revoke execute on function public.get_org_health_summary(p_org_id text) from anon, authenticated, public;
revoke execute on function public.handle_auth_user_change() from anon, authenticated, public;
revoke execute on function public.is_org_admin(target_org_id uuid) from anon, authenticated, public;
revoke execute on function public.is_org_member(target_org_id uuid) from anon, authenticated, public;
revoke execute on function public.rls_auto_enable() from anon, authenticated, public;
revoke execute on function public.runtime_commit(p_agent_id uuid, p_organization_id uuid, p_user_id uuid, p_policy_id uuid, p_risk_score numeric, p_prompt text, p_context jsonb, p_request_id text, p_canonical_hash text) from anon, authenticated, public;
revoke execute on function public.runtime_commit(p_agent_id uuid, p_organization_id uuid, p_user_id uuid, p_prompt text, p_decision text, p_risk_score double precision, p_stability_score double precision, p_proof_hash text, p_latency_ms integer, p_requires_approval boolean) from anon, authenticated, public;
revoke execute on function public.runtime_commit_execution(p_org_id text, p_agent_id text, p_request_id uuid, p_decision text, p_reason text, p_metadata jsonb, p_canonical_hash text, p_canonical_json jsonb, p_latency_ms integer, p_request_payload jsonb, p_context_payload jsonb, p_policy_version text, p_audit_evidence jsonb, p_usage_amount_usd numeric, p_created_at timestamp with time zone, p_agent_monthly_limit integer, p_org_plan_limit integer) from anon, authenticated, public;
revoke execute on function public.sync_auth_user(p_auth_user_id uuid) from anon, authenticated, public;

-- RLS deny-by-default policies for tables that had RLS enabled but no policy.
do $$
declare
  t regclass;
  tables regclass[] := array[
    'api.generated_app_items'::regclass,
    'public.admin_api_keys'::regclass,
    'public.agent_execution_approvals'::regclass,
    'public.agent_execution_requests'::regclass,
    'public.agent_execution_steps'::regclass,
    'public.agent_gate_settings'::regclass,
    'public.agent_stats_daily'::regclass,
    'public.billing_subscriptions'::regclass,
    'public.core_event_ingest'::regclass,
    'public.directory_group_role_mappings'::regclass,
    'public.directory_sync_configs'::regclass,
    'public.directory_sync_events'::regclass,
    'public.dsg_app_builder_approvals'::regclass,
    'public.dsg_app_builder_jobs'::regclass,
    'public.dsg_app_builder_tool_audits'::regclass,
    'public.dsg_crud_proof_tasks'::regclass,
    'public.dsg_ledger_config'::regclass,
    'public.dsg_memory_context_packs'::regclass,
    'public.dsg_memory_edges'::regclass,
    'public.dsg_memory_events'::regclass,
    'public.dsg_memory_retrievals'::regclass,
    'public.dsg_schema_meta'::regclass,
    'public.enterprise_leads'::regclass,
    'public.execution_audit'::regclass,
    'public.github_app_installations'::regclass,
    'public.marketing_agent_runs'::regclass,
    'public.marketing_sends'::regclass,
    'public.org_billing_policies'::regclass,
    'public.org_onboarding_states'::regclass,
    'public.org_sso_configs'::regclass,
    'public.org_stats_hourly'::regclass,
    'public.payments'::regclass,
    'public.readiness_history'::regclass,
    'public.runtime_approval_requests'::regclass,
    'public.runtime_checkpoints'::regclass,
    'public.runtime_ledger_entries'::regclass,
    'public.runtime_policies'::regclass,
    'public.runtime_policy_governance_events'::regclass,
    'public.runtime_roles'::regclass,
    'public.runtime_truth_states'::regclass,
    'public.seat_activations'::regclass,
    'public.sign_in_events'::regclass,
    'public.user_milestones'::regclass,
    'public.user_org_roles'::regclass
  ];
begin
  foreach t in array tables loop
    if not exists (
      select 1
      from pg_policies
      where schemaname = split_part(t::text, '.', 1)
        and tablename = split_part(t::text, '.', 2)
        and policyname = 'deny browser access by default'
    ) then
      execute format('create policy %I on %s as restrictive for all to anon, authenticated using (false) with check (false)', 'deny browser access by default', t);
    end if;
  end loop;
end $$;

-- Replace overly permissive policy on public.leads.
drop policy if exists "service role full access" on public.leads;
create policy "service role full access" on public.leads
  for all
  to service_role
  using (true)
  with check (true);
;
