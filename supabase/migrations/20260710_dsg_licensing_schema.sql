-- DSG Licensing Schema Migration
-- Adds subscription, usage metering, and credential vault tables

-- 1. Extend organizations table with subscription fields
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'none' CHECK (subscription_tier IN ('starter', 'pro', 'enterprise', 'none')),
ADD COLUMN IF NOT EXISTS subscription_expires_at timestamp;

CREATE INDEX IF NOT EXISTS idx_organizations_subscription_tier
  ON organizations(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
  ON organizations(stripe_customer_id);

-- 2. DSG Usage Metrics (for decision metering)
CREATE TABLE IF NOT EXISTS dsg_usage_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_month text NOT NULL, -- YYYY-MM format
  decision_count int NOT NULL DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(org_id, metric_month)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_id
  ON dsg_usage_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_org_month
  ON dsg_usage_metrics(org_id, metric_month DESC);

-- Enable RLS
ALTER TABLE dsg_usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_metrics_org_isolation
  ON dsg_usage_metrics FOR ALL
  USING (org_id = current_user_org_id());

-- 3. Connector Credentials (Universal Vault)
CREATE TABLE IF NOT EXISTS dsg_connector_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  connector_id text NOT NULL,
  credential_type text NOT NULL CHECK (credential_type IN ('oauth', 'api_key', 'ssh', 'certificate', 'service_account')),
  encrypted_value text NOT NULL, -- AES-256-GCM encrypted
  token_type text,
  scope text,
  expires_at timestamp,
  refresh_token_encrypted text,
  rotation_policy jsonb,
  fingerprint text, -- SHA256 for audit
  health_status text DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'expired', 'unknown')),
  last_used_at timestamp,
  last_health_check_at timestamp,
  metadata jsonb DEFAULT '{}',
  revoked_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),

  UNIQUE(org_id, connector_id),
  CONSTRAINT fk_org FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_connector_credentials_org_id
  ON dsg_connector_credentials(org_id);
CREATE INDEX IF NOT EXISTS idx_connector_credentials_health
  ON dsg_connector_credentials(org_id, health_status);
CREATE INDEX IF NOT EXISTS idx_connector_credentials_connector_id
  ON dsg_connector_credentials(org_id, connector_id);

-- Enable RLS
ALTER TABLE dsg_connector_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY connector_credentials_org_isolation
  ON dsg_connector_credentials FOR ALL
  USING (org_id = current_user_org_id());

-- 4. Capabilities Registry (for provider matching)
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

-- 5. Dependency Nodes (for graph representation)
CREATE TABLE IF NOT EXISTS dsg_dependency_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES dsg_provision_plans(id) ON DELETE CASCADE,
  node_id text NOT NULL,
  provider_id text NOT NULL,
  action text NOT NULL,
  params jsonb DEFAULT '{}',
  provides jsonb DEFAULT '{}',
  requires jsonb DEFAULT '{}',
  phase int DEFAULT 0,
  created_at timestamp NOT NULL DEFAULT now(),

  CONSTRAINT fk_plan FOREIGN KEY (plan_id) REFERENCES dsg_provision_plans(id)
);

CREATE INDEX IF NOT EXISTS idx_dependency_nodes_plan_id
  ON dsg_dependency_nodes(plan_id);
CREATE INDEX IF NOT EXISTS idx_dependency_nodes_phase
  ON dsg_dependency_nodes(plan_id, phase);

-- Enable RLS
ALTER TABLE dsg_dependency_nodes ENABLE ROW LEVEL SECURITY;
CREATE POLICY dependency_nodes_plan_isolation
  ON dsg_dependency_nodes FOR SELECT
  USING (
    plan_id IN (
      SELECT id FROM dsg_provision_plans
      WHERE org_id = current_user_org_id()
    )
  );
