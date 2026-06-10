-- Migration: Add delegated_agi_jobs table for delegation-based execution
-- Purpose: Store delegation contracts and related execution state for agents
-- Date: 2026-06-10

-- Create delegated_agi_jobs table
CREATE TABLE IF NOT EXISTS delegated_agi_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  delegation_id TEXT NOT NULL UNIQUE,
  goal TEXT NOT NULL,
  scope TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'failed', 'cancelled', 'expired')),

  -- Delegation contract stored as JSONB
  delegation_json JSONB NOT NULL,

  -- Plan/execution state (optional, populated during execution)
  plan_json JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Indexing
  CONSTRAINT valid_org_id CHECK (org_id ~ '^[a-z0-9_-]+$'),
  CONSTRAINT valid_user_id CHECK (user_id ~ '^[a-z0-9_-]+$'),
  CONSTRAINT valid_delegation_id CHECK (delegation_id ~ '^deleg_[a-z0-9_]+$')
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_org_id ON delegated_agi_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_user_id ON delegated_agi_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_status ON delegated_agi_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_expires_at ON delegated_agi_jobs(expires_at);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_org_status ON delegated_agi_jobs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_user_status ON delegated_agi_jobs(user_id, status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_delegated_agi_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_delegated_agi_jobs_timestamp
BEFORE UPDATE ON delegated_agi_jobs
FOR EACH ROW
EXECUTE FUNCTION update_delegated_agi_jobs_updated_at();

-- Create RLS policies (if RLS is enabled)
-- Note: RLS is not enabled by default; uncomment if needed
-- ALTER TABLE delegated_agi_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own delegations
-- CREATE POLICY delegated_agi_jobs_user_access ON delegated_agi_jobs
--   USING (auth.uid()::text = user_id)
--   WITH CHECK (auth.uid()::text = user_id);

-- Policy: Admins can see all delegations for their org
-- CREATE POLICY delegated_agi_jobs_admin_access ON delegated_agi_jobs
--   USING (
--     EXISTS (
--       SELECT 1 FROM org_members
--       WHERE org_members.org_id = delegated_agi_jobs.org_id
--       AND org_members.user_id = auth.uid()::text
--       AND org_members.role IN ('owner', 'admin')
--     )
--   );

-- Comment on table
COMMENT ON TABLE delegated_agi_jobs IS 'Delegation contracts and execution state for AI agents';
COMMENT ON COLUMN delegated_agi_jobs.delegation_json IS 'Complete delegation contract: delegationId, userId, goal, scope, allowedActions, blockedActions, requiresUserConfirm, expiresAt';
COMMENT ON COLUMN delegated_agi_jobs.plan_json IS 'Execution plan snapshot (populated during or after execution)';
COMMENT ON COLUMN delegated_agi_jobs.status IS 'Job status: active, completed, failed, cancelled, or expired';
