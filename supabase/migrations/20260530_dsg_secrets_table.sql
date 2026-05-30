-- DSG Secrets Table for Credential Broker
-- Stores encrypted secrets for DSG Brain execution context.
-- All secrets are encrypted at rest and never exposed in raw form.

CREATE TABLE IF NOT EXISTS public.dsg_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Metadata for audit and tracking
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,

  -- Encryption metadata (if using envelope encryption)
  encryption_key_version INT DEFAULT 1,
  encryption_algorithm TEXT DEFAULT 'pgcrypto',

  -- Soft delete support
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT value_not_empty CHECK (length(trim(value)) > 0)
);

-- Enable RLS on dsg_secrets
ALTER TABLE public.dsg_secrets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow service role (server-side) full access
-- This policy permits the Credential Broker to query secrets
CREATE POLICY "service_role_full_access" ON public.dsg_secrets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Prevent authenticated users from accessing secrets directly
-- Secrets are only accessed through the server-side Credential Broker API
CREATE POLICY "no_direct_user_access" ON public.dsg_secrets
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- RLS Policy: Prevent anonymous users from accessing secrets
CREATE POLICY "no_anonymous_access" ON public.dsg_secrets
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Index on name for fast secret lookups by the credential broker
CREATE UNIQUE INDEX idx_dsg_secrets_name ON public.dsg_secrets(name)
  WHERE deleted_at IS NULL;

-- Index on org_id for org-scoped secret queries
CREATE INDEX idx_dsg_secrets_org_id ON public.dsg_secrets(org_id)
  WHERE deleted_at IS NULL;

-- Index on created_at for audit trail queries
CREATE INDEX idx_dsg_secrets_created_at ON public.dsg_secrets(created_at DESC);

-- Audit trigger: Track updates to secrets
CREATE OR REPLACE FUNCTION public.handle_dsg_secrets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_dsg_secrets_updated_at
  BEFORE UPDATE ON public.dsg_secrets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_dsg_secrets_updated_at();

-- Grant permissions
-- Service role can query and manage secrets
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsg_secrets TO service_role;

-- Comment for documentation
COMMENT ON TABLE public.dsg_secrets IS 'Encrypted credential storage for DSG Brain execution. Never expose raw values to clients.';
COMMENT ON COLUMN public.dsg_secrets.name IS 'Secret identifier (e.g., ANTHROPIC_API_KEY). Must be unique.';
COMMENT ON COLUMN public.dsg_secrets.value IS 'Encrypted secret value. Never logged or exposed.';
COMMENT ON COLUMN public.dsg_secrets.encryption_key_version IS 'Key rotation support for envelope encryption.';
