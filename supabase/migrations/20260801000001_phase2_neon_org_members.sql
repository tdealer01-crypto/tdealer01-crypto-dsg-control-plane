-- Phase 2: Organization Members Table for Neon Multi-Tenant Setup
-- Parallel to Supabase; ensures consistent multi-tenant scoping across both databases
-- Status: PENDING_NEON_APPLICATION

-- Organization Members Table for multi-tenant org scoping
-- Links users to organizations for RLS enforcement
CREATE TABLE IF NOT EXISTS org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(org_id, user_id),
  CONSTRAINT role_valid CHECK (role IN ('owner', 'admin', 'member', 'viewer'))
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);

-- SECURITY DEFINER function to check org membership (bypasses RLS to avoid infinite recursion)
CREATE OR REPLACE FUNCTION get_user_orgs(p_user_id UUID)
RETURNS TABLE(org_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT org_members.org_id
  FROM org_members
  WHERE org_members.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Enable RLS on org_members to prevent unauthorized membership changes
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read org memberships for orgs they belong to (via SECURITY DEFINER helper)
CREATE POLICY org_members_read ON org_members
  FOR SELECT
  USING (
    org_id IN (
      SELECT get_user_orgs(auth.uid())
    )
  );

-- Policy: Only service_role can insert/update org memberships
CREATE POLICY org_members_insert ON org_members
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY org_members_update ON org_members
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Grant access
GRANT SELECT ON org_members TO authenticated;
GRANT SELECT, INSERT, UPDATE ON org_members TO service_role;
GRANT EXECUTE ON FUNCTION get_user_orgs TO authenticated, service_role;

-- Comments for documentation
COMMENT ON TABLE org_members IS
  'Multi-tenant organization membership (Neon Phase 2). Links users to organizations for RLS enforcement.
   SECURITY: SECURITY DEFINER function get_user_orgs() provides membership checks without RLS recursion.
   SECURITY: RLS policies use get_user_orgs() to avoid infinite loops.
   SECURITY: service_role only can insert/update memberships to prevent privilege escalation.';

COMMENT ON FUNCTION get_user_orgs(UUID) IS
  'SECURITY DEFINER helper to check organization membership without triggering RLS recursion.
   Used by RLS policies on org_members and other org-scoped tables.';
