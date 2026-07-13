-- AI-Firstify RLS (Row Level Security) Policies
-- Enforce org/workspace scoping and role-based access control

-- ============================================================================
-- AI Models Table RLS
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Owners/Admins can see all models in their org
CREATE POLICY "ai_models_owner_access"
  ON ai_models
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations org
      JOIN organization_members om ON om.org_id = org.id
      WHERE org.id = ai_models.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations org
      JOIN organization_members om ON om.org_id = org.id
      WHERE org.id = ai_models.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Members can read models in their org
CREATE POLICY "ai_models_member_read"
  ON ai_models
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_models.org_id
        AND user_id = auth.uid()
    )
  );

-- Creator can update their own models
CREATE POLICY "ai_models_creator_update"
  ON ai_models
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- AI Policies Table RLS
-- ============================================================================

ALTER TABLE ai_policies ENABLE ROW LEVEL SECURITY;

-- Owners/Admins can do everything
CREATE POLICY "ai_policies_owner_access"
  ON ai_policies
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organizations org
      JOIN organization_members om ON om.org_id = org.id
      WHERE org.id = ai_policies.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations org
      JOIN organization_members om ON om.org_id = org.id
      WHERE org.id = ai_policies.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- Operators/Members can read policies
CREATE POLICY "ai_policies_member_read"
  ON ai_policies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_policies.org_id
        AND user_id = auth.uid()
        AND role IN ('member', 'operator', 'viewer')
    )
  );

-- Only admins can modify policies
CREATE POLICY "ai_policies_admin_write"
  ON ai_policies
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_policies.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "ai_policies_admin_update"
  ON ai_policies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_policies.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- AI Policy Versions Table RLS
-- ============================================================================

ALTER TABLE ai_policy_versions ENABLE ROW LEVEL SECURITY;

-- Read access through parent policy
CREATE POLICY "ai_policy_versions_read"
  ON ai_policy_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_policy_versions.org_id
        AND user_id = auth.uid()
    )
  );

-- Write access through admin role
CREATE POLICY "ai_policy_versions_write"
  ON ai_policy_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_policy_versions.org_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- AI Audit Logs Table RLS
-- ============================================================================

ALTER TABLE ai_audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs are read-only for org members (immutable audit trail)
CREATE POLICY "ai_audit_logs_read"
  ON ai_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE org_id = ai_audit_logs.org_id
        AND user_id = auth.uid()
    )
  );

-- Only system/service role can insert audit logs
CREATE POLICY "ai_audit_logs_insert"
  ON ai_audit_logs
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Owners can view all audit logs; others see only their own actions
CREATE POLICY "ai_audit_logs_scoped_read"
  ON ai_audit_logs
  FOR SELECT
  USING (
    CASE
      WHEN EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.org_id = ai_audit_logs.org_id
          AND om.user_id = auth.uid()
          AND om.role IN ('owner', 'admin')
      )
      THEN true
      ELSE (ai_audit_logs.user_id = auth.uid() OR ai_audit_logs.actor_id = auth.uid()::text)
    END
  );

-- ============================================================================
-- Grant appropriate table permissions
-- ============================================================================

GRANT SELECT ON ai_models TO authenticated;
GRANT INSERT, UPDATE ON ai_models TO authenticated;

GRANT SELECT ON ai_policies TO authenticated;
GRANT INSERT, UPDATE ON ai_policies TO authenticated;

GRANT SELECT ON ai_policy_versions TO authenticated;
GRANT INSERT ON ai_policy_versions TO authenticated;

GRANT SELECT, INSERT ON ai_audit_logs TO authenticated;
GRANT SELECT, INSERT ON ai_audit_logs TO service_role;
