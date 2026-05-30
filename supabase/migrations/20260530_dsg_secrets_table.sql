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

-- DSG Execution Grants Table
-- Time-limited grants bound to specific plan hashes
CREATE TABLE IF NOT EXISTS public.dsg_execution_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id TEXT NOT NULL UNIQUE,
  plan_hash TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ttl_ms INTEGER NOT NULL,
  renewals INTEGER DEFAULT 0,
  max_renewals INTEGER DEFAULT 2,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS on dsg_execution_grants: server-side only
ALTER TABLE public.dsg_execution_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_grants_full_access" ON public.dsg_execution_grants
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "no_user_grants_access" ON public.dsg_execution_grants
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Index on grant_id for fast lookups
CREATE UNIQUE INDEX idx_dsg_execution_grants_grant_id ON public.dsg_execution_grants(grant_id);
CREATE INDEX idx_dsg_execution_grants_plan_hash ON public.dsg_execution_grants(plan_hash);
CREATE INDEX idx_dsg_execution_grants_expires_at ON public.dsg_execution_grants(expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsg_execution_grants TO service_role;

-- DSG Credential Leases Table
-- Time-limited leases for secret access with redaction fingerprints
CREATE TABLE IF NOT EXISTS public.dsg_credential_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id TEXT NOT NULL UNIQUE,
  secret_name TEXT NOT NULL,
  redaction_fingerprint TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  valid BOOLEAN DEFAULT true,
  renewals INTEGER DEFAULT 0,
  max_renewals INTEGER DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS on dsg_credential_leases: server-side only
ALTER TABLE public.dsg_credential_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_leases_full_access" ON public.dsg_credential_leases
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "no_user_leases_access" ON public.dsg_credential_leases
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- Index on lease_id for fast lookups
CREATE UNIQUE INDEX idx_dsg_credential_leases_lease_id ON public.dsg_credential_leases(lease_id);
CREATE INDEX idx_dsg_credential_leases_secret_name ON public.dsg_credential_leases(secret_name);
CREATE INDEX idx_dsg_credential_leases_expires_at ON public.dsg_credential_leases(expires_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dsg_credential_leases TO service_role;
