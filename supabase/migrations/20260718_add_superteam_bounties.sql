-- Superteam Bounties table
CREATE TABLE IF NOT EXISTS superteam_bounties (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward DECIMAL(15, 2) NOT NULL,
  reward_token TEXT NOT NULL DEFAULT 'USDC',
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  level TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  posted_by TEXT NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Bounty Submissions table
CREATE TABLE IF NOT EXISTS bounty_submissions (
  id TEXT PRIMARY KEY,
  bounty_id TEXT NOT NULL REFERENCES superteam_bounties(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  submission_status TEXT NOT NULL DEFAULT 'pending',
  dsg_gate_status TEXT DEFAULT 'pending', -- pending, approved, blocked, review
  trinity_agent_review JSONB DEFAULT '{}'::jsonb,
  payment_status TEXT DEFAULT 'pending', -- pending, paid, failed
  payment_tx_hash TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trinity Agent Review Log
CREATE TABLE IF NOT EXISTS trinity_bounty_reviews (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES bounty_submissions(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL, -- Mind, Hand, Eye, Nerve, Spine
  review_result JSONB NOT NULL, -- { decision, reasoning, score }
  reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bounty Sync Log
CREATE TABLE IF NOT EXISTS superteam_sync_log (
  id TEXT PRIMARY KEY,
  sync_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  bounties_fetched INTEGER,
  bounties_created INTEGER,
  bounties_updated INTEGER,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  details JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bounties_status ON superteam_bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_category ON superteam_bounties(category);
CREATE INDEX IF NOT EXISTS idx_bounties_level ON superteam_bounties(level);
CREATE INDEX IF NOT EXISTS idx_submissions_bounty ON bounty_submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON bounty_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON bounty_submissions(submission_status);
CREATE INDEX IF NOT EXISTS idx_reviews_submission ON trinity_bounty_reviews(submission_id);

-- RLS Policies
ALTER TABLE superteam_bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trinity_bounty_reviews ENABLE ROW LEVEL SECURITY;

-- Allow all to view bounties (public)
CREATE POLICY "bounties_readable" ON superteam_bounties
  FOR SELECT USING (true);

-- Allow authenticated users to view their submissions
CREATE POLICY "submissions_readable" ON bounty_submissions
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- Allow authenticated users to create submissions
CREATE POLICY "submissions_creatable" ON bounty_submissions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Allow reviews to be readable
CREATE POLICY "reviews_readable" ON trinity_bounty_reviews
  FOR SELECT USING (true);
