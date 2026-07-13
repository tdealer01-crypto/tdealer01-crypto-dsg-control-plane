-- AI-Firstify Audit Logs Schema
-- Immutable audit trail for all AI operations and governance decisions

CREATE TABLE IF NOT EXISTS ai_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'model_deployment', 'policy_evaluation', 'policy_update', 'execution_blocked', etc.
  resource_type TEXT NOT NULL, -- 'model', 'policy', 'execution', 'decision'
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'evaluate', 'block', 'approve'
  decision TEXT, -- 'pass', 'review', 'block', 'unsupported'
  decision_reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  actor_type TEXT DEFAULT 'user', -- 'user', 'system', 'agent'
  actor_id TEXT, -- Can be user UUID or service identifier

  -- Request context
  request_id TEXT,
  request_metadata JSONB DEFAULT '{}',

  -- Governance evaluation results
  policy_id UUID REFERENCES ai_policies(id),
  policy_version INT,
  proof_reference TEXT, -- Hash or reference to formal proof

  -- Execution details
  execution_details JSONB DEFAULT '{}',
  error_message TEXT,
  execution_time_ms INT,

  -- Network/system info
  ip_address INET,
  user_agent TEXT,

  -- Compliance tracking
  compliance_tags TEXT[] DEFAULT '{}',
  retention_until TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT audit_logs_immutable CHECK (created_at IS NOT NULL)
);

-- Indexes for efficient querying
CREATE INDEX idx_ai_audit_logs_org_id ON ai_audit_logs(org_id);
CREATE INDEX idx_ai_audit_logs_event_type ON ai_audit_logs(event_type);
CREATE INDEX idx_ai_audit_logs_resource_type ON ai_audit_logs(resource_type);
CREATE INDEX idx_ai_audit_logs_resource_id ON ai_audit_logs(org_id, resource_type, resource_id);
CREATE INDEX idx_ai_audit_logs_user_id ON ai_audit_logs(user_id);
CREATE INDEX idx_ai_audit_logs_created_at ON ai_audit_logs(created_at DESC);
CREATE INDEX idx_ai_audit_logs_decision ON ai_audit_logs(decision);
CREATE INDEX idx_ai_audit_logs_policy_id ON ai_audit_logs(policy_id);
CREATE INDEX idx_ai_audit_logs_actor ON ai_audit_logs(actor_type, actor_id);

-- Composite indexes for common queries
CREATE INDEX idx_ai_audit_logs_org_time ON ai_audit_logs(org_id, created_at DESC);
CREATE INDEX idx_ai_audit_logs_org_event_time ON ai_audit_logs(org_id, event_type, created_at DESC);

-- Partitioning hint: Large audit logs table may benefit from time-based partitioning
-- Consider adding partition by range(created_at) for performance at scale

-- Enable RLS
ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are append-only; no updates or deletes (except via retention policy)
GRANT SELECT, INSERT ON ai_audit_logs TO authenticated;
GRANT SELECT, INSERT ON ai_audit_logs TO service_role;

-- Function to track changes (audit trigger)
CREATE OR REPLACE FUNCTION log_ai_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO ai_audit_logs (
    org_id,
    event_type,
    resource_type,
    resource_id,
    action,
    user_id,
    actor_type,
    execution_details
  ) VALUES (
    COALESCE(NEW.org_id, OLD.org_id),
    'policy_change',
    'policy',
    COALESCE(NEW.id, OLD.id)::text,
    CASE WHEN TG_OP = 'INSERT' THEN 'create' WHEN TG_OP = 'UPDATE' THEN 'update' WHEN TG_OP = 'DELETE' THEN 'delete' END,
    auth.uid(),
    'system',
    jsonb_build_object(
      'operation', TG_OP,
      'old_data', to_jsonb(OLD),
      'new_data', to_jsonb(NEW)
    )
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to policy table
DROP TRIGGER IF EXISTS ai_policies_audit_trigger ON ai_policies;
CREATE TRIGGER ai_policies_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_policies
  FOR EACH ROW
  EXECUTE FUNCTION log_ai_operation();
