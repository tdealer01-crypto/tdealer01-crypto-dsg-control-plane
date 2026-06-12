-- Stripe Policy Rules Table
-- P0-7: Configurable policy rules with real thresholds and risk scoring

CREATE TABLE IF NOT EXISTS stripe_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,                          -- FK to organizations
  stripe_account_id TEXT,                        -- Optional: specific account, NULL = org-wide
  rule_type TEXT NOT NULL,                       -- 'amount_threshold', 'rate_limit', 'time_window', 'customer_allowlist', 'risk_score'
  name TEXT NOT NULL,                            -- Human-readable name
  description TEXT,
  conditions JSONB NOT NULL,                     -- Rule conditions (threshold, window, etc.)
  action TEXT NOT NULL,                          -- 'ALLOW', 'BLOCK', 'REVIEW'
  priority INTEGER DEFAULT 100,                  -- Lower = higher priority
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,                               -- User ID who created the rule
  
  CONSTRAINT stripe_policy_rules_org_fk
    FOREIGN KEY (org_id)
    REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT stripe_policy_rules_account_fk
    FOREIGN KEY (stripe_account_id)
    REFERENCES stripe_app_accounts(stripe_account_id) ON DELETE SET NULL,
  CONSTRAINT valid_action CHECK (action IN ('ALLOW', 'BLOCK', 'REVIEW'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stripe_policy_rules_org_id ON stripe_policy_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_stripe_policy_rules_account ON stripe_policy_rules(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_stripe_policy_rules_type ON stripe_policy_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_stripe_policy_rules_priority ON stripe_policy_rules(org_id, priority);

-- RLS
ALTER TABLE stripe_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY stripe_policy_rules_org_access
  ON stripe_policy_rules
  USING (
    auth.uid() IS NOT NULL AND
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_stripe_policy_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stripe_policy_rules_updated_at ON stripe_policy_rules;
CREATE TRIGGER trigger_update_stripe_policy_rules_updated_at
  BEFORE UPDATE ON stripe_policy_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_stripe_policy_rules_updated_at();

SELECT pg_sleep(0);