-- Delivery Proofs Table
-- Tracks production readiness proofs, health checks, and deployment verification results.

CREATE TABLE IF NOT EXISTS delivery_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  -- Target identification
  target_url TEXT NOT NULL, -- The URL being verified (e.g., production deployment)
  repo_url TEXT, -- Optional repository URL for context
  readiness_path TEXT DEFAULT '/api/readiness', -- Custom readiness endpoint

  -- Verification results
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PASS', 'FAIL', 'PARTIAL'

  -- Individual checks (detailed results)
  checks JSONB DEFAULT '{}', -- {
                             --   "health": { "status": "pass", "timestamp": "...", "response_time_ms": 123 },
                             --   "readiness": { "status": "pass", "timestamp": "...", "message": "ready" },
                             --   "auth": { "status": "pass", "timestamp": "...", "description": "auth rejection OK" },
                             --   "repo": { "status": "pass", "timestamp": "...", "message": "repo URL found" }
                             -- }

  -- Shared report
  report_id TEXT, -- Reference to delivery_proof_reports(run_id) if applicable

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '90 days'),
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by UUID, -- User who initiated the proof scan
  notes TEXT -- Additional observations or context
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_delivery_proofs_org
  ON delivery_proofs(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_status
  ON delivery_proofs(status);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_target_url
  ON delivery_proofs(target_url);

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_expires_at
  ON delivery_proofs(expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_verified_at
  ON delivery_proofs(verified_at DESC)
  WHERE verified_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_delivery_proofs_org_status
  ON delivery_proofs(org_id, status, created_at DESC);

-- Enable RLS for org-scoped access control
ALTER TABLE delivery_proofs ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read their org's delivery proofs
CREATE POLICY delivery_proofs_org_read ON delivery_proofs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: org members can insert new proofs
CREATE POLICY delivery_proofs_org_insert ON delivery_proofs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: org members can update their proofs (before expiry)
CREATE POLICY delivery_proofs_org_update ON delivery_proofs
  FOR UPDATE
  TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Service role can insert (for automated proof scans)
CREATE POLICY delivery_proofs_service_insert ON delivery_proofs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can update results
CREATE POLICY delivery_proofs_service_update ON delivery_proofs
  FOR UPDATE
  TO service_role
  USING (true);

-- Function to record proof results
CREATE OR REPLACE FUNCTION record_delivery_proof(
  p_org_id UUID,
  p_target_url TEXT,
  p_status VARCHAR,
  p_checks JSONB DEFAULT '{}',
  p_report_id TEXT DEFAULT NULL,
  p_repo_url TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO delivery_proofs (
    org_id,
    target_url,
    status,
    checks,
    report_id,
    repo_url,
    created_by,
    notes,
    verified_at
  )
  VALUES (
    p_org_id,
    p_target_url,
    p_status,
    p_checks,
    p_report_id,
    p_repo_url,
    p_created_by,
    p_notes,
    CASE WHEN p_status IN ('PASS', 'FAIL', 'PARTIAL') THEN now() ELSE NULL END
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access
GRANT SELECT, INSERT ON delivery_proofs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON delivery_proofs TO service_role;
