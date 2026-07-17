-- Lead Generation System Tables
-- Supports automated customer discovery and scoring

-- Leads table: Track discovered potential customers
CREATE TABLE IF NOT EXISTS leads (
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
CREATE TABLE IF NOT EXISTS lead_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  interaction_type VARCHAR(50) NOT NULL, -- 'email_sent', 'email_opened', 'link_clicked', 'trial_signup', 'demo_requested'
  metadata JSONB, -- Additional context (email_subject, link_url, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trial accounts: Track trial signups linked to leads
CREATE TABLE IF NOT EXISTS trial_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
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
CREATE INDEX idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_overall_score ON leads(overall_score DESC);
CREATE INDEX idx_lead_interactions_lead_id ON lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_type ON lead_interactions(interaction_type);
CREATE INDEX idx_lead_interactions_created_at ON lead_interactions(created_at DESC);
CREATE INDEX idx_trial_accounts_org_id ON trial_accounts(org_id);
CREATE INDEX idx_trial_accounts_lead_id ON trial_accounts(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_trial_accounts_status ON trial_accounts(status);

-- RLS policies
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_accounts ENABLE ROW LEVEL SECURITY;

-- Allow service role (admin) full access
CREATE POLICY leads_service_role ON leads
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

CREATE POLICY lead_interactions_service_role ON lead_interactions
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

CREATE POLICY trial_accounts_service_role ON trial_accounts
  FOR ALL TO authenticated
  USING (auth.role() = 'service_role' OR FALSE)
  WITH CHECK (auth.role() = 'service_role' OR FALSE);

-- Allow users to see their own trial account
CREATE POLICY trial_accounts_org_member ON trial_accounts
  FOR SELECT TO authenticated
  USING (
    org_id IN (
      SELECT org_id FROM users WHERE auth_user_id = auth.uid()
    )
  );

-- Grants for service role
GRANT ALL ON leads TO service_role;
GRANT ALL ON lead_interactions TO service_role;
GRANT ALL ON trial_accounts TO service_role;
