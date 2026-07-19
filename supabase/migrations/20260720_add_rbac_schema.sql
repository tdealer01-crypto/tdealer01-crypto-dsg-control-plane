-- Create RBAC (Role-Based Access Control) schema for custom roles + permissions
-- Migration: 20260720_add_rbac_schema.sql
-- Purpose: Enterprise RBAC with custom roles, permission matrix, and role-based access control

BEGIN;

-- Create org_rbac_roles table for custom role definitions
CREATE TABLE IF NOT EXISTS public.org_rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  description TEXT,
  is_custom BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, name)
);

-- Enable RLS on org_rbac_roles
ALTER TABLE public.org_rbac_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: org admin can read/write/delete roles in their org
CREATE POLICY "org_rbac_roles_admin_access" ON public.org_rbac_roles
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_rbac_roles.org_id AND role_name = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_rbac_roles.org_id AND role_name = 'admin'
    )
  );

-- RLS Policy: regular users can read roles in their org (for UI displays)
CREATE POLICY "org_rbac_roles_user_read" ON public.org_rbac_roles
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_rbac_roles.org_id
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_rbac_roles_org_id ON public.org_rbac_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_org_rbac_roles_name ON public.org_rbac_roles(org_id, name);
CREATE INDEX IF NOT EXISTS idx_org_rbac_roles_is_system ON public.org_rbac_roles(is_system, org_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_org_rbac_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_rbac_roles_updated_at ON public.org_rbac_roles;
CREATE TRIGGER org_rbac_roles_updated_at
  BEFORE UPDATE ON public.org_rbac_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_rbac_roles_updated_at();

-- Document table
COMMENT ON TABLE public.org_rbac_roles IS 'Custom RBAC role definitions per organization. Each role has a set of permissions (JSON array).';
COMMENT ON COLUMN public.org_rbac_roles.permissions IS 'JSON array of permission strings, e.g., ["read:*", "write:audit", "write:api-keys"]';
COMMENT ON COLUMN public.org_rbac_roles.is_system IS 'If true, this is a system role (admin, operator, viewer) and cannot be deleted';

-- Insert default system roles (one per organization, or global defaults)
-- Note: Orgs will create their own instances of these via application logic
INSERT INTO public.org_rbac_roles (org_id, name, permissions, description, is_system, is_custom)
VALUES
  (NULL, 'admin', '["*"]', 'Full access to all org resources', true, false),
  (NULL, 'operator', '["read:*", "write:audit", "write:api-keys", "write:webhooks", "write:notifications"]', 'Operator access: read all, write audit/api-keys/webhooks', true, false),
  (NULL, 'viewer', '["read:*"]', 'Read-only access to all org resources', true, false)
ON CONFLICT (org_id, name) DO NOTHING;

COMMIT;
