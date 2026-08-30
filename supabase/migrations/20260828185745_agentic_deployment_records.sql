-- Record of a governed candidate deployment actually being performed.
--
-- Before this table, post-deploy control accepted the DeploymentBinding
-- (deploymentId, provider, commits) straight from the monitoring payload and
-- only cross-checked it against the promotion receipt. Nothing recorded that a
-- deploy had happened at all, so a caller could invent a deploymentId for a
-- deployment that never ran. This table is written by the deploy step itself,
-- immediately after the slot swap, and post-deploy control now requires a
-- matching row before it will act on canary evidence.

create table if not exists public.agentic_deployment_records (
  deployment_id text primary key,
  promotion_id text not null references public.agentic_promotion_receipts(promotion_id),
  target_repository text not null,
  baseline_commit text not null check (baseline_commit ~ '^[0-9a-fA-F]{40}$'),
  candidate_commit text not null check (candidate_commit ~ '^[0-9a-fA-F]{40}$'),
  provider text not null,
  deployment_slot text not null,
  image_digest text,
  workflow_run_uri text not null,
  deployed_at timestamptz not null default now()
);

create index if not exists agentic_deployment_records_promotion_idx
  on public.agentic_deployment_records (promotion_id, deployed_at desc);

alter table public.agentic_deployment_records enable row level security;

-- Governance state: service-role only, same posture as the other agentic tables.
revoke all on table public.agentic_deployment_records from anon, authenticated;
grant all on table public.agentic_deployment_records to service_role;
