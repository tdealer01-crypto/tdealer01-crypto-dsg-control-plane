-- Add agent permissions table for customer-parity access
-- Allows agents to have fine-grained permissions like users

CREATE TABLE IF NOT EXISTS agent_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  -- Permissions as a JSONB set for flexibility
  permissions TEXT[] NOT NULL DEFAULT '{}',

  -- Default agent role (for backward compat, agents can have roles too)
  default_role TEXT DEFAULT 'operator',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,

  UNIQUE(org_id, agent_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_agent_permissions_org_agent
  ON agent_permissions(org_id, agent_id);

-- RLS policy: agents can read their own permissions
ALTER TABLE agent_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_read_own_permissions" ON agent_permissions
  FOR SELECT
  USING (TRUE); -- Will be checked by application logic

-- Helper function to get agent permissions
CREATE OR REPLACE FUNCTION get_agent_permissions(p_org_id UUID, p_agent_id UUID)
RETURNS TEXT[] AS $$
BEGIN
  RETURN COALESCE(
    (SELECT permissions FROM agent_permissions
     WHERE org_id = public.dsg_text_to_uuid(p_org_id) AND agent_id = public.dsg_text_to_uuid(p_agent_id)),
    '{org.execute, org.view_reports, org.view_evidence}'::TEXT[]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index on updated_at for auditing
CREATE INDEX IF NOT EXISTS idx_agent_permissions_updated_at
  ON agent_permissions(updated_at DESC);

COMMENT ON TABLE agent_permissions IS 'Stores fine-grained permissions for agents (agent feature parity with users)';
COMMENT ON COLUMN agent_permissions.permissions IS 'JSON array of org.* permissions granted to this agent';
COMMENT ON COLUMN agent_permissions.default_role IS 'Default role for backward compatibility (operator, admin, viewer, etc)';
