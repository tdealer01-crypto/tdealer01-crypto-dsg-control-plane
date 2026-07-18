-- Superteam Agent Integration Tables

-- dsg_agents table: Stores autonomous agent registrations
CREATE TABLE IF NOT EXISTS public.dsg_agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  claim_code TEXT NOT NULL UNIQUE,
  human_id TEXT,
  human_email TEXT,
  claimed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'active', 'claimed', 'paused')),
  last_heartbeat TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- agent_submissions table: Tracks work submissions to Superteam
CREATE TABLE IF NOT EXISTS public.agent_submissions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.dsg_agents(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  listing_title TEXT,
  link TEXT NOT NULL,
  other_info TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected', 'paid')),
  superteam_response JSONB,
  telegram TEXT,
  ask NUMERIC,
  human_id TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- agent_discovery_log table: Tracks discovered listings
CREATE TABLE IF NOT EXISTS public.agent_discovery_log (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES public.dsg_agents(id) ON DELETE CASCADE,
  listing_id TEXT NOT NULL,
  listing_title TEXT,
  listing_type TEXT,
  reward NUMERIC,
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_dsg_agents_claim_code ON public.dsg_agents(claim_code);
CREATE INDEX IF NOT EXISTS idx_dsg_agents_api_key ON public.dsg_agents(api_key);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_agent_id ON public.agent_submissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_submissions_listing_id ON public.agent_submissions(listing_id);
CREATE INDEX IF NOT EXISTS idx_agent_discovery_log_agent_id ON public.agent_discovery_log(agent_id);

-- Enable RLS
ALTER TABLE public.dsg_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_discovery_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow service role full access
CREATE POLICY "Service role can access dsg_agents" ON public.dsg_agents
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can access agent_submissions" ON public.agent_submissions
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can access agent_discovery_log" ON public.agent_discovery_log
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
