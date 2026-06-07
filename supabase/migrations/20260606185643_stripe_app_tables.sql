-- Stripe App Governance Tables
-- Phase 3: Database & Persistence Layer

-- 1. stripe_app_accounts: Link Stripe accounts to DSG orgs
CREATE TABLE stripe_app_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT UNIQUE NOT NULL,
  dsg_org_id TEXT NOT NULL,
  stripe_api_key_encrypted TEXT,
  fail_safe_mode TEXT DEFAULT 'fail_open', -- 'fail_open' or 'fail_closed'
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'revoked'
  installed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',

  -- Foreign key to DSG organizations table
  CONSTRAINT stripe_app_accounts_org_fk
    FOREIGN KEY (dsg_org_id)
    REFERENCES organizations(id) ON DELETE CASCADE
);

-- 2. stripe_operation_policies: Governance rules per account
CREATE TABLE stripe_operation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- 'charge', 'payment_intent', 'payout', 'refund'
  rule_type TEXT, -- 'amount_threshold', 'rate_limit', 'manual_approval'
  conditions JSONB NOT NULL, -- { "max_amount_cents": 1000000 }
  action TEXT NOT NULL, -- 'allow', 'block', 'review'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT stripe_operation_policies_account_fk
    FOREIGN KEY (stripe_account_id)
    REFERENCES stripe_app_accounts(stripe_account_id) ON DELETE CASCADE
);

-- 3. stripe_operation_audits: Links Stripe events to DSG decisions
CREATE TABLE stripe_operation_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_account_id TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL, -- Stripe webhook event ID (for idempotency)
  stripe_object_id TEXT NOT NULL, -- charge_id, payment_intent_id, payout_id, etc.
  operation_type TEXT NOT NULL, -- 'charge', 'payment_intent', 'payout'
  dsg_decision_id TEXT, -- Links to dsg_governance_decision_events if applicable
  dsg_decision TEXT, -- 'ALLOW', 'BLOCK', 'REVIEW'
  dsg_reason TEXT,
  dsg_proof TEXT, -- Hash of decision proof
  payload JSONB, -- Full Stripe event for audit trail
  status TEXT DEFAULT 'recorded', -- 'recorded', 'reviewed', 'executed'
  created_at TIMESTAMP DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT stripe_operation_audits_account_fk
    FOREIGN KEY (stripe_account_id)
    REFERENCES stripe_app_accounts(stripe_account_id) ON DELETE CASCADE
);

-- Indexes for performance (CRITICAL for query speed)
CREATE INDEX idx_stripe_app_accounts_org_id
  ON stripe_app_accounts(dsg_org_id);

CREATE INDEX idx_stripe_app_accounts_status
  ON stripe_app_accounts(status);

CREATE INDEX idx_stripe_operation_policies_account
  ON stripe_operation_policies(stripe_account_id);

CREATE INDEX idx_stripe_operation_policies_operation
  ON stripe_operation_policies(operation_type);

CREATE INDEX idx_stripe_operation_audits_account
  ON stripe_operation_audits(stripe_account_id);

CREATE INDEX idx_stripe_operation_audits_created
  ON stripe_operation_audits(created_at DESC);

CREATE INDEX idx_stripe_operation_audits_decision
  ON stripe_operation_audits(dsg_decision);

-- Composite index for quota counting (100 ops/month)
CREATE INDEX idx_stripe_operation_audits_account_created
  ON stripe_operation_audits(stripe_account_id, created_at DESC);

-- Enable Row-Level Security (RLS)
ALTER TABLE stripe_app_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_operation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_operation_audits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only org members can access their Stripe accounts
CREATE POLICY stripe_app_accounts_org_access
  ON stripe_app_accounts
  USING (
    auth.uid() IS NOT NULL AND
    dsg_org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY stripe_operation_policies_org_access
  ON stripe_operation_policies
  USING (
    stripe_account_id IN (
      SELECT stripe_account_id FROM stripe_app_accounts
      WHERE dsg_org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY stripe_operation_audits_org_access
  ON stripe_operation_audits
  USING (
    stripe_account_id IN (
      SELECT stripe_account_id FROM stripe_app_accounts
      WHERE dsg_org_id IN (
        SELECT org_id FROM org_members WHERE user_id = auth.uid()
      )
    )
  );

-- Timestamps
SELECT pg_sleep(0); -- Migration markers
