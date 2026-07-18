-- DSG Agents table (for Superteam integration)
CREATE TABLE IF NOT EXISTS dsg_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  claim_code TEXT NOT NULL UNIQUE,
  username TEXT,
  status TEXT DEFAULT 'active',
  human_id TEXT,
  human_email TEXT,
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Discovery Log
CREATE TABLE IF NOT EXISTS agent_discovery_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES dsg_agents(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  listing_title TEXT,
  listing_type TEXT,
  reward DECIMAL(15, 2),
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Submissions
CREATE TABLE IF NOT EXISTS agent_submissions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES dsg_agents(id) ON DELETE CASCADE,
  human_id TEXT,
  listing_id TEXT NOT NULL,
  listing_title TEXT,
  link TEXT NOT NULL,
  other_info TEXT,
  status TEXT DEFAULT 'submitted',
  superteam_response JSONB,
  telegram TEXT,
  ask DECIMAL(15, 2),
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_status ON dsg_agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_human ON dsg_agents(human_id);
CREATE INDEX IF NOT EXISTS idx_discovery_agent ON agent_discovery_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_discovery_type ON agent_discovery_log(listing_type);
CREATE INDEX IF NOT EXISTS idx_submissions_agent ON agent_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_submissions_human ON agent_submissions(human_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON agent_submissions(status);

-- RLS Policies
ALTER TABLE dsg_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_discovery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_submissions ENABLE ROW LEVEL SECURITY;

-- Allow public read of agents (profile info only)
CREATE POLICY "agents_readable" ON dsg_agents
  FOR SELECT USING (true);

-- Allow agent submissions to be readable by human owner
CREATE POLICY "submissions_readable" ON agent_submissions
  FOR SELECT USING (
    human_id = auth.uid()::text OR
    agent_id IN (
      SELECT id FROM dsg_agents WHERE human_id = auth.uid()::text
    )
  );

-- Allow discovery logs to be readable
CREATE POLICY "discovery_readable" ON agent_discovery_log
  FOR SELECT USING (true);
