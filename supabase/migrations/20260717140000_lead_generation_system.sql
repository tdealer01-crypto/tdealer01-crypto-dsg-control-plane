-- Lead Generation System Tables
-- Supports automated customer discovery and scoring

-- Leads table: Track discovered potential customers
CREATE TABLE IF NOT EXISTS discovered_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL, -- 'github', 'twitter', 'linkedin', etc.
  source_id VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  company VARCHAR(255),
  title VARCHAR(255),
  avatar_url VARCHAR(512),
  bio TEXT,
  icp_score FLOAT DEFAULT 0.0, -- Ideal Customer Profile match (0-100)
  engagement_score FLOAT DEFAULT 0.0, -- Recent engagement level (0-100)
  overall_score FLOAT GENERATED ALWAYS AS (
    ROUND((icp_score * 0.6 + engagement_score * 0.4)::numeric, 2)
  ) STORED,
  status VARCHAR(30) DEFAULT 'discovered', -- discovered, contacted, responded, trial_invited, trial_active, converted, lost
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- Lead interactions: Track all engagement with leads
CREATE TABLE IF NOT EXISTS prospect_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL REFERENCES discovered_prospects(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'email_sent', 'email_opened', 'link_clicked', 'trial_signup', 'demo_requested'
  metadata JSONB, -- Additional context (email_subject, link_url, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trial accounts: Track trial signups linked to leads
CREATE TABLE IF NOT EXISTS discovery_trial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES discovered_prospects(id) ON DELETE SET NULL,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trial_start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_end_at TIMESTAMP WITH TIME ZONE,
  first_execution_at TIMESTAMP WITH TIME ZONE,
  total_executions INTEGER DEFAULT 0,
  onboarding_stage VARCHAR(50) DEFAULT 'signup', -- signup, email_verified, first_agent_created, first_execution, ready_to_convert
  status VARCHAR(30) DEFAULT 'active', -- active, converted, expired, canceled
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovered_prospects_email ON discovered_prospects(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discovered_prospects_source ON discovered_prospects(source);
CREATE INDEX IF NOT EXISTS idx_discovered_prospects_status ON discovered_prospects(status);
CREATE INDEX IF NOT EXISTS idx_discovered_prospects_overall_score ON discovered_prospects(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_prospect_id ON prospect_interactions(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_type ON prospect_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_prospect_interactions_created_at ON prospect_interactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_trial_accounts_org_id ON discovery_trial_accounts(org_id);
CREATE INDEX IF NOT EXISTS idx_discovery_trial_accounts_prospect_id ON discovery_trial_accounts(prospect_id) WHERE prospect_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discovery_trial_accounts_status ON discovery_trial_accounts(status);

-- RLS policies
ALTER TABLE discovered_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospect_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_trial_accounts ENABLE ROW LEVEL SECURITY;

-- Allow service role (admin) full access
CREATE POLICY discovered_prospects_service_role ON discovered_prospects
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

CREATE POLICY prospect_interactions_service_role ON prospect_interactions
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

CREATE POLICY discovery_trial_accounts_service_role ON discovery_trial_accounts
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

-- Allow users to see their own trial account
CREATE POLICY discovery_trial_accounts_org_member ON discovery_trial_accounts
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Grants for service role
GRANT ALL ON discovered_prospects TO service_role;
GRANT ALL ON prospect_interactions TO service_role;
GRANT ALL ON discovery_trial_accounts TO service_role;
