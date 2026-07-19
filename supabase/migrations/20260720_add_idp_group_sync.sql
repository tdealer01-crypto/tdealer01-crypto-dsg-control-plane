-- Create IdP group synchronization schema
-- Migration: 20260720_add_idp_group_sync.sql
-- Purpose: Map IdP groups to DSG RBAC roles for automatic group-based access assignment

BEGIN;

-- Create org_idp_groups table for IdP group → DSG role mappings
CREATE TABLE IF NOT EXISTS public.org_idp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  idp_group_name TEXT NOT NULL,
  rbac_role_id UUID NOT NULL REFERENCES public.org_rbac_roles(id) ON DELETE CASCADE,
  auto_assign BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, idp_group_name)
);

-- Enable RLS on org_idp_groups
ALTER TABLE public.org_idp_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policy: only org admin can read/write group mappings
CREATE POLICY "org_idp_groups_admin_only" ON public.org_idp_groups
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_idp_groups.org_id AND role_name = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_idp_groups.org_id AND role_name = 'admin'
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_idp_groups_org_id ON public.org_idp_groups(org_id);
CREATE INDEX IF NOT EXISTS idx_org_idp_groups_idp_group_name ON public.org_idp_groups(org_id, idp_group_name);
CREATE INDEX IF NOT EXISTS idx_org_idp_groups_rbac_role_id ON public.org_idp_groups(rbac_role_id);
CREATE INDEX IF NOT EXISTS idx_org_idp_groups_auto_assign ON public.org_idp_groups(org_id, auto_assign);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_org_idp_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_idp_groups_updated_at ON public.org_idp_groups;
CREATE TRIGGER org_idp_groups_updated_at
  BEFORE UPDATE ON public.org_idp_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_idp_groups_updated_at();

-- Document table
COMMENT ON TABLE public.org_idp_groups IS 'Mapping of IdP groups (e.g., engineering@acme.com) to DSG RBAC roles for automatic group-based access assignment';
COMMENT ON COLUMN public.org_idp_groups.idp_group_name IS 'IdP group identifier (e.g., engineering@acme.com or ou=engineering,dc=acme,dc=com)';
COMMENT ON COLUMN public.org_idp_groups.auto_assign IS 'If true, users with this group membership automatically receive the mapped role on login';

COMMIT;
