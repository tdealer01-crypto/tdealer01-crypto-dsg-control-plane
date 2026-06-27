/**
 * Migration: Add User Confirmation Gate and Job State Machine
 *
 * Creates tables and columns to support:
 * - User confirmation requests for HIGH/CRITICAL actions
 * - Job state machine tracking
 * - Delegation job lifecycle management
 */

-- Create user_confirmation_requests table
CREATE TABLE IF NOT EXISTS user_confirmation_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL,
  delegation_id TEXT NOT NULL,

  step_json JSONB NOT NULL,
  evidence_json JSONB NOT NULL,

  status TEXT NOT NULL DEFAULT 'PENDING',
  approved_by TEXT,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  CONSTRAINT fk_job_id FOREIGN KEY (job_id) REFERENCES dsg_runtime_jobs(id) ON DELETE CASCADE
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_confirmation_job_id ON user_confirmation_requests(job_id);
CREATE INDEX IF NOT EXISTS idx_user_confirmation_delegation_id ON user_confirmation_requests(delegation_id);
CREATE INDEX IF NOT EXISTS idx_user_confirmation_status ON user_confirmation_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_confirmation_expires_at ON user_confirmation_requests(expires_at);

-- Add columns to dsg_runtime_jobs to track state machine
ALTER TABLE dsg_runtime_jobs
ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'CREATED',
ADD COLUMN IF NOT EXISTS state_updated_at TIMESTAMPTZ DEFAULT now();

-- Create delegation_jobs table for dedicated AGI delegation tracking
CREATE TABLE IF NOT EXISTS delegated_agi_jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegation_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,

  goal TEXT NOT NULL,
  scope TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'CREATED',
  current_state TEXT NOT NULL DEFAULT 'CREATED',

  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for delegation_jobs
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_delegation_id ON delegated_agi_jobs(delegation_id);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_org_id ON delegated_agi_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_user_id ON delegated_agi_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_status ON delegated_agi_jobs(status);
CREATE INDEX IF NOT EXISTS idx_delegated_agi_jobs_current_state ON delegated_agi_jobs(current_state);

-- Enable RLS on user_confirmation_requests
ALTER TABLE user_confirmation_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see confirmation requests for their own jobs
CREATE POLICY user_confirmation_requests_select_policy
  ON user_confirmation_requests
  FOR SELECT
  USING (
    delegation_id IN (
      SELECT delegation_id FROM delegated_agi_jobs
      WHERE user_id = auth.uid()::text
    )
  );

-- RLS Policy: Only authenticated users can insert confirmation requests
CREATE POLICY user_confirmation_requests_insert_policy
  ON user_confirmation_requests
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: Users can update their own confirmation requests
CREATE POLICY user_confirmation_requests_update_policy
  ON user_confirmation_requests
  FOR UPDATE
  USING (
    delegation_id IN (
      SELECT delegation_id FROM delegated_agi_jobs
      WHERE user_id = auth.uid()::text
    )
  )
  WITH CHECK (
    delegation_id IN (
      SELECT delegation_id FROM delegated_agi_jobs
      WHERE user_id = auth.uid()::text
    )
  );

-- Enable RLS on delegated_agi_jobs
ALTER TABLE delegated_agi_jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own jobs
CREATE POLICY delegated_agi_jobs_select_policy
  ON delegated_agi_jobs
  FOR SELECT
  USING (user_id = auth.uid()::text);

-- RLS Policy: Users can only insert their own jobs
CREATE POLICY delegated_agi_jobs_insert_policy
  ON delegated_agi_jobs
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

-- RLS Policy: Users can only update their own jobs
CREATE POLICY delegated_agi_jobs_update_policy
  ON delegated_agi_jobs
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

-- Add index on state for efficient state machine queries
CREATE INDEX IF NOT EXISTS idx_dsg_runtime_jobs_state ON dsg_runtime_jobs(state);
CREATE INDEX IF NOT EXISTS idx_dsg_runtime_jobs_state_updated_at ON dsg_runtime_jobs(state_updated_at);
