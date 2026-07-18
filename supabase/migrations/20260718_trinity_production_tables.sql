-- Trinity Production Tables for Real Data & Execution Tracking

-- Trinity Executions Table
CREATE TABLE IF NOT EXISTS trinity_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT UNIQUE NOT NULL,
  job_id TEXT NOT NULL,
  deliverable TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  quality_score FLOAT,
  execution_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trinity Verifications Table
CREATE TABLE IF NOT EXISTS trinity_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id TEXT NOT NULL,
  quality_criteria TEXT,
  quality_score FLOAT NOT NULL,
  verification_status TEXT NOT NULL CHECK (verification_status IN ('passed', 'review', 'failed')),
  checks_passed INT,
  checks_total INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trinity Payments Table (Ledger)
CREATE TABLE IF NOT EXISTS trinity_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id TEXT NOT NULL,
  amount_sol FLOAT NOT NULL,
  transaction_hash TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'failed')),
  confirmations INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (execution_id) REFERENCES trinity_executions(execution_id)
);

-- DSG Jobs Table (Internal Jobs)
CREATE TABLE IF NOT EXISTS dsg_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  reward_sol FLOAT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DSG Governance Policies Table
CREATE TABLE IF NOT EXISTS dsg_governance_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  policy_hash TEXT,
  ccvs_level TEXT DEFAULT 'L2',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast retrieval
CREATE INDEX IF NOT EXISTS idx_trinity_executions_job ON trinity_executions(job_id);
CREATE INDEX IF NOT EXISTS idx_trinity_executions_status ON trinity_executions(status);
CREATE INDEX IF NOT EXISTS idx_trinity_executions_created ON trinity_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trinity_verifications_deliverable ON trinity_verifications(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_trinity_verifications_status ON trinity_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_trinity_verifications_created ON trinity_verifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trinity_payments_execution ON trinity_payments(execution_id);
CREATE INDEX IF NOT EXISTS idx_trinity_payments_status ON trinity_payments(status);
CREATE INDEX IF NOT EXISTS idx_trinity_payments_created ON trinity_payments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsg_jobs_active ON dsg_jobs(active);
CREATE INDEX IF NOT EXISTS idx_dsg_jobs_category ON dsg_jobs(category);

CREATE INDEX IF NOT EXISTS idx_dsg_policies_active ON dsg_governance_policies(active);

-- Enable RLS
ALTER TABLE trinity_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trinity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE trinity_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsg_governance_policies ENABLE ROW LEVEL SECURITY;

-- Permissive policies for Trinity operations (restrict in production)
CREATE POLICY "trinity_executions_all" ON trinity_executions FOR ALL USING (true);
CREATE POLICY "trinity_verifications_all" ON trinity_verifications FOR ALL USING (true);
CREATE POLICY "trinity_payments_all" ON trinity_payments FOR ALL USING (true);
CREATE POLICY "dsg_jobs_read" ON dsg_jobs FOR SELECT USING (active = true);
CREATE POLICY "dsg_jobs_write" ON dsg_jobs FOR ALL USING (true);
CREATE POLICY "dsg_policies_read" ON dsg_governance_policies FOR SELECT USING (active = true);
CREATE POLICY "dsg_policies_write" ON dsg_governance_policies FOR ALL USING (true);

-- Comments
COMMENT ON TABLE trinity_executions IS 'Trinity agent job executions with quality scores and timing';
COMMENT ON TABLE trinity_verifications IS 'Deliverable verification results with quality metrics';
COMMENT ON TABLE trinity_payments IS 'Payment ledger for completed jobs (SOL settlements)';
COMMENT ON TABLE dsg_jobs IS 'Internal DSG job postings for agents';
COMMENT ON TABLE dsg_governance_policies IS 'DSG governance policies for validation';
