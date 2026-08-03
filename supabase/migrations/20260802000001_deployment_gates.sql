-- Phase 5: Production Deployment GO/NO-GO Gate Table
-- Records all production deployment gate decisions with full check results for audit trail

BEGIN;

-- Create deployment_gates table (append-only for audit)
CREATE TABLE IF NOT EXISTS deployment_gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  deployment_url TEXT NOT NULL,
  gate_version TEXT NOT NULL DEFAULT 'v5.0',

  -- Decision and state
  decision TEXT NOT NULL CHECK (decision IN ('GO', 'NO-GO', 'REVIEW')),
  checks_json JSONB NOT NULL, -- Full check results: [{name, status, details, latency_ms}, ...]
  decision_rationale TEXT NOT NULL,

  -- Metadata
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Audit trail
  verified_by TEXT,
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient querying
CREATE INDEX idx_deployment_gates_org_created
  ON deployment_gates(org_id, created_at DESC);

CREATE INDEX idx_deployment_gates_decision
  ON deployment_gates(decision, created_at DESC);

CREATE INDEX idx_deployment_gates_url_checked
  ON deployment_gates(deployment_url, checked_at DESC);

CREATE INDEX idx_deployment_gates_gate_version
  ON deployment_gates(gate_version, created_at DESC);

-- Enable Row-Level Security
ALTER TABLE deployment_gates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: authenticated users can read deployment gates for their org
CREATE POLICY deployment_gates_org_read
  ON deployment_gates FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM org_members
    WHERE user_id = auth.uid()
  ));

-- RLS Policy: only service role can insert deployment gates
CREATE POLICY deployment_gates_service_insert
  ON deployment_gates FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Immutability: prevent updates to deployment gates
CREATE TRIGGER trg_deployment_gates_no_update
  BEFORE UPDATE ON deployment_gates
  FOR EACH ROW
  EXECUTE FUNCTION raise_immutable_error('deployment_gates');

CREATE TRIGGER trg_deployment_gates_no_delete
  BEFORE DELETE ON deployment_gates
  FOR EACH ROW
  EXECUTE FUNCTION raise_immutable_error('deployment_gates');

-- Helper function to record a deployment gate decision
CREATE OR REPLACE FUNCTION record_deployment_gate_decision(
  p_org_id UUID,
  p_deployment_url TEXT,
  p_decision TEXT,
  p_checks_json JSONB,
  p_decision_rationale TEXT,
  p_checked_at TIMESTAMP WITH TIME ZONE,
  p_created_by TEXT
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO deployment_gates (
    org_id, deployment_url, decision, checks_json, decision_rationale,
    checked_at, created_by
  ) VALUES (
    p_org_id, p_deployment_url, p_decision, p_checks_json, p_decision_rationale,
    p_checked_at, p_created_by
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION record_deployment_gate_decision
  TO service_role;

-- Create view for latest deployment gate decisions per URL
CREATE OR REPLACE VIEW latest_deployment_gates AS
SELECT DISTINCT ON (deployment_url)
  id, org_id, deployment_url, gate_version, decision,
  checks_json, decision_rationale, checked_at, created_at,
  created_by, verified_by, verified_at
FROM deployment_gates
ORDER BY deployment_url, checked_at DESC;

-- Grant access to view
ALTER TABLE latest_deployment_gates OWNER TO authenticated;

COMMIT;
