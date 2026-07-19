-- Create SSO (Single Sign-On) schema for SAML 2.0 + OIDC support
-- Migration: 20260720_add_sso_schema.sql
-- Purpose: Enterprise SSO with SAML and OIDC provider support

BEGIN;

-- Create org_sso_config table for SAML/OIDC provider configuration
CREATE TABLE IF NOT EXISTS public.org_sso_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('saml', 'oidc')),
  metadata_url TEXT,
  entity_id TEXT,
  acs_url TEXT,
  issuer TEXT,
  client_id TEXT,
  client_secret_encrypted TEXT,
  enabled BOOLEAN DEFAULT false,
  sso_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on org_sso_config
ALTER TABLE public.org_sso_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: only org admin can read/write SSO config
CREATE POLICY "org_sso_config_admin_only" ON public.org_sso_config
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_sso_config.org_id AND role_name = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_sso_config.org_id AND role_name = 'admin'
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_sso_config_org_id ON public.org_sso_config(org_id);
CREATE INDEX IF NOT EXISTS idx_org_sso_config_enabled ON public.org_sso_config(enabled, org_id);
CREATE INDEX IF NOT EXISTS idx_org_sso_config_sso_required ON public.org_sso_config(sso_required, org_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_org_sso_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_sso_config_updated_at ON public.org_sso_config;
CREATE TRIGGER org_sso_config_updated_at
  BEFORE UPDATE ON public.org_sso_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_sso_config_updated_at();

-- Document table
COMMENT ON TABLE public.org_sso_config IS 'SSO provider configuration (SAML 2.0 or OIDC). One per organization.';
COMMENT ON COLUMN public.org_sso_config.provider IS 'SSO provider type: saml or oidc';
COMMENT ON COLUMN public.org_sso_config.metadata_url IS 'SAML IdP metadata URL or OIDC discovery endpoint';
COMMENT ON COLUMN public.org_sso_config.client_secret_encrypted IS 'OIDC client secret (encrypted via Supabase vault)';
COMMENT ON COLUMN public.org_sso_config.sso_required IS 'If true, org members must use SSO (non-SSO logins blocked)';

COMMIT;
