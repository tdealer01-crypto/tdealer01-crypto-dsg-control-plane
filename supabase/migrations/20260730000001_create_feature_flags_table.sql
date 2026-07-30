-- Feature Flags Table
-- Enables runtime feature rollout control, per-org enablement, and gradual deployment.

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,

  -- Rollout control
  enabled_for_orgs UUID[] DEFAULT '{}',
  rollout_percentage INT DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),

  -- Lifecycle management
  retire_date TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookup and filtering
CREATE INDEX IF NOT EXISTS idx_feature_flags_name ON feature_flags(name);
CREATE INDEX IF NOT EXISTS idx_feature_flags_owner ON feature_flags(owner);
CREATE INDEX IF NOT EXISTS idx_feature_flags_retire_date ON feature_flags(retire_date)
  WHERE retire_date IS NOT NULL;

-- Enable RLS for org-scoped access
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policies: allow reading own org's flags (basic case)
-- For more complex scenarios, adjust based on your org/auth structure
CREATE POLICY feature_flags_org_read ON feature_flags
  FOR SELECT
  TO authenticated
  USING (true);  -- Public read for now; tighten based on org structure

CREATE POLICY feature_flags_admin_write ON feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Only allow inserts if user is admin (adjust based on your auth model)
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY feature_flags_admin_update ON feature_flags
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY feature_flags_admin_delete ON feature_flags
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Trigger to update updated_at on changes
CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
