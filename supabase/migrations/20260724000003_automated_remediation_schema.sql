-- Automated Remediation Schema
-- Tables: dsg_remediation_plans, dsg_remediation_executions, dsg_remediation_credentials

-- Remediation plans (approved by operators)
CREATE TABLE IF NOT EXISTS dsg_remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  -- Plan metadata
  name TEXT NOT NULL,
  description TEXT,
  plan_type TEXT NOT NULL, -- automated, manual, hybrid
  status TEXT NOT NULL DEFAULT 'draft', -- draft, approved, active, archived

  -- Trigger configuration
  trigger_anomaly_type TEXT, -- optional, empty = all types
  trigger_severity_level TEXT[], -- low/medium/high/critical
  trigger_confidence_threshold DECIMAL(3,2),

  -- Plan definition
  steps JSONB NOT NULL, -- array of remediation steps
  plan_hash TEXT, -- SHA256 hash for deterministic replay

  -- Execution settings
  requires_approval BOOLEAN DEFAULT true,
  auto_execute BOOLEAN DEFAULT false,
  rollback_on_failure BOOLEAN DEFAULT true,
  max_concurrent_executions INT DEFAULT 1,

  -- Success/failure criteria
  success_criteria JSONB,
  failure_actions JSONB, -- array of fallback actions

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Audit
  created_by UUID,
  last_modified_by UUID,

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (status IN ('draft', 'approved', 'active', 'archived')),
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('automated', 'manual', 'hybrid'))
);

-- Remediation execution records
CREATE TABLE IF NOT EXISTS dsg_remediation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,
  plan_id UUID NOT NULL,
  anomaly_id UUID, -- optional link to triggering anomaly

  -- Execution tracking
  execution_status TEXT NOT NULL DEFAULT 'pending', -- pending, running, success, failed, rolled_back
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Result tracking
  execution_result JSONB, -- array of step results with output/errors
  error_message TEXT,
  rollback_executed BOOLEAN DEFAULT false,

  -- Conformance & audit
  plan_hash_executed TEXT, -- hash of plan that was executed
  commands_executed JSONB, -- array of actual commands run
  conformance_verified BOOLEAN DEFAULT false,
  evidence JSONB, -- proof of execution (logs, outputs, etc)

  -- Approval workflow
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  approval_notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_plan FOREIGN KEY (plan_id) REFERENCES dsg_remediation_plans(id) ON DELETE CASCADE,
  CONSTRAINT valid_status CHECK (execution_status IN ('pending', 'running', 'success', 'failed', 'rolled_back'))
);

-- Credential management for controlled execution
CREATE TABLE IF NOT EXISTS dsg_remediation_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  workspace_id UUID NOT NULL,

  -- Credential metadata
  name TEXT NOT NULL,
  credential_type TEXT NOT NULL, -- aws, gcp, github, ssh, api_key

  -- Encrypted storage
  encrypted_value TEXT NOT NULL, -- encrypted credential (AES-256-GCM)
  encryption_key_id TEXT, -- reference to KMS key
  iv TEXT, -- initialization vector
  auth_tag TEXT, -- AEAD authentication tag

  -- Lease tracking
  is_active BOOLEAN DEFAULT true,
  lease_issued_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  lease_fingerprint TEXT, -- redaction fingerprint for audit logs

  -- Scope & permissions
  allowed_commands TEXT[], -- whitelisted commands
  allowed_paths TEXT[], -- whitelisted file paths
  max_uses INT, -- execution count limit
  uses_remaining INT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  last_used_at TIMESTAMPTZ,

  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT valid_type CHECK (credential_type IN ('aws', 'gcp', 'github', 'ssh', 'api_key'))
);

-- Indexes for performance
CREATE INDEX idx_dsg_remediation_plans_org_status ON dsg_remediation_plans(org_id, status);
CREATE INDEX idx_dsg_remediation_plans_workspace ON dsg_remediation_plans(workspace_id, status);
CREATE INDEX idx_dsg_remediation_plans_active ON dsg_remediation_plans(org_id, auto_execute) WHERE auto_execute = true;
CREATE INDEX idx_dsg_remediation_executions_plan ON dsg_remediation_executions(plan_id);
CREATE INDEX idx_dsg_remediation_executions_org_status ON dsg_remediation_executions(org_id, execution_status);
CREATE INDEX idx_dsg_remediation_executions_anomaly ON dsg_remediation_executions(anomaly_id);
CREATE INDEX idx_dsg_remediation_executions_created ON dsg_remediation_executions(created_at DESC);
CREATE INDEX idx_dsg_remediation_credentials_org_active ON dsg_remediation_credentials(org_id, is_active);
CREATE INDEX idx_dsg_remediation_credentials_type ON dsg_remediation_credentials(credential_type);

-- RLS Policies
ALTER TABLE dsg_remediation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_remediation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_remediation_credentials ENABLE ROW LEVEL SECURITY;

-- dsg_remediation_plans policies
CREATE POLICY plans_org_select ON dsg_remediation_plans
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY plans_org_insert ON dsg_remediation_plans
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY plans_org_update ON dsg_remediation_plans
  FOR UPDATE USING (org_id = auth.uid());

CREATE POLICY plans_org_delete ON dsg_remediation_plans
  FOR DELETE USING (org_id = auth.uid());

-- dsg_remediation_executions policies
CREATE POLICY executions_org_select ON dsg_remediation_executions
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY executions_org_insert ON dsg_remediation_executions
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY executions_org_update ON dsg_remediation_executions
  FOR UPDATE USING (org_id = auth.uid());

-- dsg_remediation_credentials policies
CREATE POLICY credentials_org_select ON dsg_remediation_credentials
  FOR SELECT USING (org_id = auth.uid());

CREATE POLICY credentials_org_insert ON dsg_remediation_credentials
  FOR INSERT WITH CHECK (org_id = auth.uid());

CREATE POLICY credentials_org_update ON dsg_remediation_credentials
  FOR UPDATE USING (org_id = auth.uid());

-- Audit triggers
CREATE TRIGGER update_dsg_remediation_plans_updated_at
  BEFORE UPDATE ON dsg_remediation_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_remediation_executions_updated_at
  BEFORE UPDATE ON dsg_remediation_executions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsg_remediation_credentials_updated_at
  BEFORE UPDATE ON dsg_remediation_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
