-- Durable, service-role-only post-deploy evidence and baseline state.
-- Monitoring observes; DSG Control Plane is the only authority that may commit
-- a measured next baseline or authorize a provider rollback.

create table if not exists public.agentic_post_deploy_receipts (
  id uuid primary key default gen_random_uuid(),
  target_repository text not null,
  promotion_id text not null,
  deployment_id text not null unique,
  baseline_commit text not null check (baseline_commit ~ '^[0-9a-fA-F]{40}$'),
  candidate_commit text not null check (candidate_commit ~ '^[0-9a-fA-F]{40}$'),
  monitoring_evidence_hash text not null check (monitoring_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  control_evidence_hash text not null check (control_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  monitoring_status text not null check (monitoring_status in ('PASS', 'REVIEW', 'BLOCK')),
  recommended_action text not null check (recommended_action in ('ACCEPT_NEXT_BASELINE', 'HOLD_REVIEW', 'ROLLBACK_RECOMMENDED')),
  control_action text not null check (control_action in ('COMMIT_NEXT_BASELINE', 'HOLD_REVIEW', 'EXECUTE_ROLLBACK', 'BLOCK')),
  receipt_payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists agentic_post_deploy_receipts_promotion_idx
  on public.agentic_post_deploy_receipts (promotion_id, created_at desc);

create table if not exists public.agentic_evolution_baselines (
  target_repository text primary key,
  baseline_commit text not null check (baseline_commit ~ '^[0-9a-fA-F]{40}$'),
  source_deployment_id text not null unique,
  promotion_id text not null,
  monitoring_evidence_hash text not null check (monitoring_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  control_evidence_hash text not null check (control_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  promoted_at timestamptz not null default now()
);

create table if not exists public.agentic_rollback_evidence (
  deployment_id text primary key,
  promotion_id text not null,
  target_repository text not null,
  candidate_commit text not null check (candidate_commit ~ '^[0-9a-fA-F]{40}$'),
  rollback_adapter text not null,
  rollback_target text not null,
  control_evidence_hash text not null check (control_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  adapter_evidence_hash text not null check (adapter_evidence_hash ~ '^[0-9a-fA-F]{64}$'),
  health_passed boolean not null check (health_passed = true),
  evidence_payload jsonb not null,
  rolled_back_at timestamptz not null default now()
);

alter table public.agentic_post_deploy_receipts enable row level security;
alter table public.agentic_evolution_baselines enable row level security;
alter table public.agentic_rollback_evidence enable row level security;

-- No anon/authenticated policies are intentionally created. These tables are
-- governance state and are only mutated by the server-side service role.
revoke all on table public.agentic_post_deploy_receipts from anon, authenticated;
revoke all on table public.agentic_evolution_baselines from anon, authenticated;
revoke all on table public.agentic_rollback_evidence from anon, authenticated;
grant all on table public.agentic_post_deploy_receipts to service_role;
grant all on table public.agentic_evolution_baselines to service_role;
grant all on table public.agentic_rollback_evidence to service_role;

-- Atomic compare-and-swap baseline promotion. A stale canary result cannot
-- overwrite a baseline that has already advanced in another deployment.
create or replace function public.dsg_commit_evolution_baseline(
  p_target_repository text,
  p_expected_baseline text,
  p_next_baseline text,
  p_source_deployment_id text,
  p_promotion_id text,
  p_monitoring_evidence_hash text,
  p_control_evidence_hash text
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_baseline text;
begin
  if p_expected_baseline !~ '^[0-9a-fA-F]{40}$'
     or p_next_baseline !~ '^[0-9a-fA-F]{40}$'
     or p_monitoring_evidence_hash !~ '^[0-9a-fA-F]{64}$'
     or p_control_evidence_hash !~ '^[0-9a-fA-F]{64}$' then
    raise exception 'INVALID_BASELINE_BINDING';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_target_repository));

  select baseline_commit
    into v_current_baseline
    from public.agentic_evolution_baselines
   where target_repository = p_target_repository
   for update;

  if found and v_current_baseline <> p_expected_baseline then
    return 'STALE_BASELINE';
  end if;

  insert into public.agentic_evolution_baselines (
    target_repository,
    baseline_commit,
    source_deployment_id,
    promotion_id,
    monitoring_evidence_hash,
    control_evidence_hash,
    promoted_at
  ) values (
    p_target_repository,
    p_next_baseline,
    p_source_deployment_id,
    p_promotion_id,
    p_monitoring_evidence_hash,
    p_control_evidence_hash,
    now()
  )
  on conflict (target_repository) do update set
    baseline_commit = excluded.baseline_commit,
    source_deployment_id = excluded.source_deployment_id,
    promotion_id = excluded.promotion_id,
    monitoring_evidence_hash = excluded.monitoring_evidence_hash,
    control_evidence_hash = excluded.control_evidence_hash,
    promoted_at = excluded.promoted_at;

  return 'COMMITTED';
end;
$$;

revoke all on function public.dsg_commit_evolution_baseline(text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.dsg_commit_evolution_baseline(text, text, text, text, text, text, text) to service_role;
