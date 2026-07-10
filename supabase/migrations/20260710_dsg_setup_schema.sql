-- DSG One-Time Setup Schema Migration
-- Adds infrastructure provisioning tables with RLS policies

-- 1. Connector Manifests (read-only registry of provider capabilities)
CREATE TABLE IF NOT EXISTS dsg_connector_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id text NOT NULL UNIQUE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('oauth', 'api-key', 'webhook')),
  manifest_jsonb jsonb NOT NULL,
  capabilities jsonb[] NOT NULL DEFAULT '{}',
  health_check_endpoint text,
  sandbox_supported boolean DEFAULT true,
  marketplace_metadata jsonb,
  verified boolean DEFAULT false,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connector_manifests_connector_id
  ON dsg_connector_manifests(connector_id);
CREATE INDEX IF NOT EXISTS idx_connector_manifests_verified
  ON dsg_connector_manifests(verified);

-- 2. Discovery Analysis Results
CREATE TABLE IF NOT EXISTS dsg_discovery_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  github_url text,
  scan_mode text NOT NULL CHECK (scan_mode IN ('heuristic', 'ai', 'both')),
  detected_services jsonb NOT NULL,
  suggested_providers jsonb NOT NULL,
  analysis_timestamp timestamp NOT NULL,
  proof_hash text NOT NULL,
  created_by text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),

  CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_discovery_analyses_org_id
  ON dsg_discovery_analyses(org_id);
CREATE INDEX IF NOT EXISTS idx_discovery_analyses_created_at
  ON dsg_discovery_analyses(org_id, created_at DESC);

-- Enable RLS
ALTER TABLE dsg_discovery_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY discovery_analyses_org_isolation
  ON dsg_discovery_analyses FOR ALL
  USING (org_id = current_user_org_id());

-- 3. Provision Plans (execution blueprints)
CREATE TABLE IF NOT EXISTS dsg_provision_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  discovery_id uuid REFERENCES dsg_discovery_analyses(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending_approval', 'approved', 'executing', 'completed', 'failed')),
  plan_definition jsonb NOT NULL,
  dependency_graph jsonb NOT NULL,
  estimated_duration_seconds int,
  canonical_plan_hash text NOT NULL,
  approval_id uuid,
  approved_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  INDEX idx_org_status (org_id, status),
  UNIQUE(id)
);

CREATE INDEX IF NOT EXISTS idx_provision_plans_org_id
  ON dsg_provision_plans(org_id);
CREATE INDEX IF NOT EXISTS idx_provision_plans_discovery_id
  ON dsg_provision_plans(discovery_id);
CREATE INDEX IF NOT EXISTS idx_provision_plans_canonical_hash
  ON dsg_provision_plans(canonical_plan_hash);

-- Enable RLS
ALTER TABLE dsg_provision_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY provision_plans_org_isolation
  ON dsg_provision_plans FOR ALL
  USING (org_id = current_user_org_id());

-- 4. Provision Executions (state machine for running plans)
CREATE TABLE IF NOT EXISTS dsg_provision_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES dsg_provision_plans(id) ON DELETE CASCADE,
  approval_id uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'paused', 'rolled_back')),
  current_phase int DEFAULT 0,
  checkpoint_jsonb jsonb,
  items_completed jsonb[] DEFAULT '{}',
  items_failed jsonb[] DEFAULT '{}',
  started_at timestamp,
  completed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  INDEX idx_org_status (org_id, status),
  INDEX idx_plan_id (plan_id)
);

CREATE INDEX IF NOT EXISTS idx_provision_executions_org_id
  ON dsg_provision_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_provision_executions_created_at
  ON dsg_provision_executions(org_id, created_at DESC);

-- Enable RLS
ALTER TABLE dsg_provision_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY provision_executions_org_isolation
  ON dsg_provision_executions FOR ALL
  USING (org_id = current_user_org_id());

-- 5. Audit Events (immutable hash-chain for compliance)
CREATE TABLE IF NOT EXISTS dsg_provision_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id uuid REFERENCES dsg_provision_executions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb NOT NULL,
  previous_event_hash text,
  event_hash text NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),

  INDEX idx_org_created (org_id, created_at DESC),
  INDEX idx_execution_id (execution_id)
);

-- Enable RLS
ALTER TABLE dsg_provision_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY provision_audit_events_org_isolation
  ON dsg_provision_audit_events FOR ALL
  USING (org_id = current_user_org_id());

-- 6. Connector Credentials (encrypted OAuth tokens, API keys, SSH keys, etc.)
CREATE TABLE IF NOT EXISTS dsg_connector_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  credential_type text NOT NULL
    CHECK (credential_type IN ('oauth', 'api_key', 'ssh', 'certificate', 'service_account')),
  encrypted_value text NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('bearer', 'api_key', 'pem', 'json')),
  scope text,
  expires_at timestamp,
  refresh_token_encrypted text,
  rotation_policy jsonb,
  fingerprint text NOT NULL,
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'expired', 'unknown')),
  last_used_at timestamp,
  last_health_check_at timestamp,
  metadata jsonb,
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(org_id, connector_id),
  INDEX idx_org_health (org_id, health_status),
  INDEX idx_fingerprint (fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_connector_credentials_org_id
  ON dsg_connector_credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_connector_credentials_expires_at
  ON dsg_connector_credentials(expires_at);

-- Enable RLS
ALTER TABLE dsg_connector_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY connector_credentials_org_isolation
  ON dsg_connector_credentials FOR ALL
  USING (org_id = current_user_org_id());

-- 7. Capabilities Registry (derived from manifests)
CREATE TABLE IF NOT EXISTS dsg_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability text NOT NULL,
  resource_type text NOT NULL,
  providers jsonb[] NOT NULL DEFAULT '{}',
  created_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(capability, resource_type)
);

CREATE INDEX IF NOT EXISTS idx_capabilities_capability
  ON dsg_capabilities(capability);
CREATE INDEX IF NOT EXISTS idx_capabilities_resource_type
  ON dsg_capabilities(resource_type);

-- 8. Dependency Nodes (part of provision plans)
CREATE TABLE IF NOT EXISTS dsg_dependency_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES dsg_provision_plans(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  provider_id text NOT NULL,
  action text NOT NULL,
  params jsonb,
  provides jsonb,
  requires jsonb,
  phase int NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),

  INDEX idx_plan_id (plan_id),
  INDEX idx_node_id (node_id)
);

CREATE INDEX IF NOT EXISTS idx_dependency_nodes_phase
  ON dsg_dependency_nodes(plan_id, phase);

-- Enable RLS
ALTER TABLE dsg_dependency_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dependency_nodes_org_via_plan
  ON dsg_dependency_nodes FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM dsg_provision_plans
      WHERE org_id = current_user_org_id()
    )
  );

-- 9. Extend dsg_secrets (existing table) with connector metadata
ALTER TABLE IF EXISTS dsg_secrets ADD COLUMN IF NOT EXISTS (
  connector_id text,
  secret_type text CHECK (secret_type IN ('credential', 'secret', 'key', 'certificate', 'token')),
  rotation_enabled boolean DEFAULT false,
  rotation_interval_days int,
  rotation_policy jsonb,
  last_rotation timestamp,
  health_status text DEFAULT 'unknown'
);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_dsg_secrets_connector_id
  ON dsg_secrets(org_id, connector_id) WHERE connector_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsg_secrets_rotation_enabled
  ON dsg_secrets(org_id, rotation_enabled) WHERE rotation_enabled = true;

-- Ensure DSG schema is created
CREATE SCHEMA IF NOT EXISTS dsg;

-- Grant permissions
GRANT USAGE ON SCHEMA dsg TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA dsg TO authenticated;
GRANT INSERT, UPDATE ON dsg_connector_credentials TO authenticated;
GRANT INSERT ON dsg_provision_audit_events TO authenticated;

-- Create helper function to get current org_id from JWT
CREATE OR REPLACE FUNCTION current_user_org_id() RETURNS uuid AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'org_id')::uuid,
    (auth.jwt() ->> 'sub')::uuid
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMENT ON TABLE dsg_connector_manifests IS 'Registry of provider capabilities and metadata';
COMMENT ON TABLE dsg_discovery_analyses IS 'AI + heuristic analysis results for projects';
COMMENT ON TABLE dsg_provision_plans IS 'Execution plans with dependency graphs';
COMMENT ON TABLE dsg_provision_executions IS 'State machines tracking plan execution';
COMMENT ON TABLE dsg_provision_audit_events IS 'Immutable audit trail (hash-chain)';
COMMENT ON TABLE dsg_connector_credentials IS 'Encrypted OAuth tokens, API keys, SSH keys, etc.';
COMMENT ON TABLE dsg_capabilities IS 'Query registry: which providers support which capabilities';
COMMENT ON TABLE dsg_dependency_nodes IS 'Dependency graph nodes within provision plans';
