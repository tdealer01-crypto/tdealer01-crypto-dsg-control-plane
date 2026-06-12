-- Stripe OAuth States Table
-- P0-1: Real OAuth state verification with hash, expiry, and org binding

CREATE TABLE stripe_oauth_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash TEXT UNIQUE NOT NULL,          -- SHA-256 hash of the state token
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,             -- Typically 10 minutes from creation
  used_at TIMESTAMP,                         -- NULL until consumed
  return_url TEXT,                           -- Where to redirect after OAuth
  stripe_account_hint TEXT,                  -- Optional: pre-selected Stripe account
  dsg_org_id TEXT NOT NULL,                  -- DSG organization ID (FK to organizations)
  workspace_id TEXT,                         -- Optional: workspace within org
  installed_by_user_id TEXT,                 -- User who initiated OAuth (FK to auth.users)
  metadata JSONB DEFAULT '{}',               -- Additional context
  
  CONSTRAINT stripe_oauth_states_org_fk
    FOREIGN KEY (dsg_org_id)
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_stripe_oauth_states_hash ON stripe_oauth_states(state_hash);
CREATE INDEX idx_stripe_oauth_states_expires ON stripe_oauth_states(expires_at) WHERE used_at IS NULL;
CREATE INDEX idx_stripe_oauth_states_org ON stripe_oauth_states(dsg_org_id);
CREATE INDEX idx_stripe_oauth_states_user ON stripe_oauth_states(installed_by_user_id);

-- RLS: Only org members can access their OAuth states
ALTER TABLE stripe_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_oauth_states_org_access
  ON stripe_oauth_states
  USING (
    auth.uid() IS NOT NULL AND
    dsg_org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Cleanup function for expired unused states (run via pg_cron or similar)
-- DELETE FROM stripe_oauth_states WHERE expires_at < NOW() AND used_at IS NULL;

SELECT pg_sleep(0);