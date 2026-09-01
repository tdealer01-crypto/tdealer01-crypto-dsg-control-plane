-- Restore the server-side approved plan contract store on environments whose
-- migration history diverged before the original 20260603000000 migration.
-- Idempotent by design so source and live schema can converge safely.

CREATE TABLE IF NOT EXISTS public.dsg_plan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  plan_hash TEXT NOT NULL UNIQUE,
  scope_hash TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  allowed_action_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_target_systems JSONB NOT NULL DEFAULT '[]'::jsonb,
  allowed_operations JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_risk_level TEXT NOT NULL,
  evidence_requirements JSONB NOT NULL,
  claim_boundary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsg_plan_contracts_plan_hash_idx
  ON public.dsg_plan_contracts (plan_hash);
CREATE INDEX IF NOT EXISTS dsg_plan_contracts_workspace_idx
  ON public.dsg_plan_contracts (workspace_id, agent_id);

ALTER TABLE public.dsg_plan_contracts ENABLE ROW LEVEL SECURITY;

-- Deliberately no authenticated/anon policies. Server-side governance routes
-- use the backend service credential; public clients cannot read or mutate
-- approved plan contracts directly.