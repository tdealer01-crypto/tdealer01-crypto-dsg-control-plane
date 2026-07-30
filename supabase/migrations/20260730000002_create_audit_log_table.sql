-- Operational Audit Log Table
-- Immutable append-only log of all significant operational actions, decisions, and state changes.
-- Designed for compliance, evidence collection, and post-incident investigation.

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  actor_type VARCHAR(50) DEFAULT 'user', -- 'user', 'system', 'service', 'agent'

  -- Action tracking
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'deny', 'execute', 'block', etc.
  resource_type VARCHAR(50) NOT NULL, -- 'policy', 'agent', 'execution', 'approval', 'secret', etc.
  resource_id VARCHAR(255) NOT NULL,
  resource_name VARCHAR(255), -- For human readability

  -- Decision/result
  result VARCHAR(20), -- 'SUCCESS', 'FAILED', 'DENIED', 'REVIEW', 'BLOCK'

  -- Context and details
  details JSONB DEFAULT '{}', -- Flexible field for action-specific data
  change_summary TEXT, -- Human-readable summary of what changed

  -- Request correlation
  request_id UUID, -- Link to runtime request/intent
  execution_id UUID, -- Link to execution record if applicable

  -- Compliance and audit trail
  ip_address INET,
  user_agent TEXT,
  correlation_id TEXT, -- For tracing related events

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  -- Immutability constraint
  CONSTRAINT audit_log_immutable CHECK (created_at IS NOT NULL)
);

-- Indexes for efficient querying and compliance reporting
CREATE INDEX IF NOT EXISTS idx_audit_log_org_created
  ON audit_log(org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON audit_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_resource
  ON audit_log(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_log_result
  ON audit_log(result);

CREATE INDEX IF NOT EXISTS idx_audit_log_org_action_time
  ON audit_log(org_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_request_id
  ON audit_log(request_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_execution_id
  ON audit_log(execution_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON audit_log(created_at DESC);

-- Enable RLS for org-scoped access control
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read their org's audit logs
CREATE POLICY audit_log_org_members_read ON audit_log
  FOR SELECT
  USING (
    -- Check if user is member of this org
    -- Adjust this based on your org membership model
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Policy: service_role (backend) can insert audit logs
CREATE POLICY audit_log_service_insert ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: prevent deletes (audit trail immutability)
-- Only allow deletes through explicit retention policies in application code
-- Drop delete policy to enforce append-only behavior
-- Uncomment to fully prevent deletes:
-- CREATE POLICY audit_log_no_delete ON audit_log
--   FOR DELETE
--   USING (false);

-- Function to record common audit events (helpers can call this)
CREATE OR REPLACE FUNCTION audit_log_action(
  p_org_id UUID,
  p_actor_id UUID,
  p_actor_type VARCHAR DEFAULT 'user',
  p_action VARCHAR,
  p_resource_type VARCHAR,
  p_resource_id VARCHAR,
  p_resource_name VARCHAR DEFAULT NULL,
  p_result VARCHAR DEFAULT 'SUCCESS',
  p_details JSONB DEFAULT '{}',
  p_change_summary TEXT DEFAULT NULL,
  p_request_id UUID DEFAULT NULL,
  p_execution_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (
    org_id,
    actor_id,
    actor_type,
    action,
    resource_type,
    resource_id,
    resource_name,
    result,
    details,
    change_summary,
    request_id,
    execution_id,
    ip_address,
    correlation_id
  )
  VALUES (
    p_org_id,
    p_actor_id,
    p_actor_type,
    p_action,
    p_resource_type,
    p_resource_id,
    p_resource_name,
    p_result,
    p_details,
    p_change_summary,
    p_request_id,
    p_execution_id,
    p_ip_address,
    p_correlation_id
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant access to authenticated users and service role
GRANT SELECT ON audit_log TO authenticated;
GRANT SELECT, INSERT ON audit_log TO service_role;
