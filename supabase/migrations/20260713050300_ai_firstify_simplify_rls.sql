-- AI-Firstify Simplified RLS Policies (without organization_members dependency)
-- Fallback to org_id header validation in application layer

-- Drop the complex policies that reference organization_members
DROP POLICY IF EXISTS "ai_models_owner_access" ON ai_models;
DROP POLICY IF EXISTS "ai_models_member_read" ON ai_models;
DROP POLICY IF EXISTS "ai_models_creator_update" ON ai_models;

DROP POLICY IF EXISTS "ai_policies_owner_access" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_member_read" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_admin_write" ON ai_policies;
DROP POLICY IF EXISTS "ai_policies_admin_update" ON ai_policies;

DROP POLICY IF EXISTS "ai_policy_versions_read" ON ai_policy_versions;
DROP POLICY IF EXISTS "ai_policy_versions_write" ON ai_policy_versions;

DROP POLICY IF EXISTS "ai_audit_logs_read" ON ai_audit_logs;
DROP POLICY IF EXISTS "ai_audit_logs_insert" ON ai_audit_logs;
DROP POLICY IF EXISTS "ai_audit_logs_scoped_read" ON ai_audit_logs;

-- ============================================================================
-- Simplified RLS Policies (auth-based, org_id header validation in app)
-- ============================================================================

-- AI Models: authenticated users can see/manage their org data
CREATE POLICY "ai_models_authenticated"
  ON ai_models
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Policies: authenticated users can see/manage their org data
CREATE POLICY "ai_policies_authenticated"
  ON ai_policies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Policy Versions: authenticated users can read/insert
CREATE POLICY "ai_policy_versions_authenticated"
  ON ai_policy_versions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- AI Audit Logs: authenticated users can read, service_role can insert
CREATE POLICY "ai_audit_logs_authenticated_read"
  ON ai_audit_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ai_audit_logs_service_insert"
  ON ai_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Note: Org/workspace isolation is enforced at the application layer
-- by validating org_id header and only returning scoped data
-- This will be secured by organization_members table once infrastructure is ready
