-- DSG Plan Contracts: server-side store for operator-approved Hermes plan scope contracts.
-- Plans are stored here so the agent-command-gate can verify planHash server-side
-- instead of trusting a client-supplied contract object.

CREATE TABLE IF NOT EXISTS dsg_plan_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL,
  plan_hash TEXT NOT NULL UNIQUE,
  scope_hash TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  allowed_action_types JSONB NOT NULL DEFAULT '[]',
  allowed_target_systems JSONB NOT NULL DEFAULT '[]',
  allowed_operations JSONB NOT NULL DEFAULT '[]',
  max_risk_level TEXT NOT NULL,
  evidence_requirements JSONB NOT NULL,
  claim_boundary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsg_plan_contracts_plan_hash_idx ON dsg_plan_contracts (plan_hash);
CREATE INDEX IF NOT EXISTS dsg_plan_contracts_workspace_idx ON dsg_plan_contracts (workspace_id, agent_id);

ALTER TABLE dsg_plan_contracts ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; authenticated API routes use service role client.
-- No policies needed for service-role-only access.
