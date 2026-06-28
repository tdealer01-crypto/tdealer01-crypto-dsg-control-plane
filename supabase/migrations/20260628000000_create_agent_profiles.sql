-- Create agent_profiles table for Trinity AI reputation persistence
CREATE TABLE IF NOT EXISTS public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL UNIQUE,
  wallet_address text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  reputation integer NOT NULL DEFAULT 0 CHECK (reputation >= 0 AND reputation <= 100),
  tier text NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  completed_jobs integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT agent_profiles_tier_check CHECK (
    (tier = 'bronze' AND completed_jobs >= 0 AND reputation >= 0) OR
    (tier = 'silver' AND completed_jobs >= 5 AND reputation >= 40) OR
    (tier = 'gold' AND completed_jobs >= 25 AND reputation >= 70) OR
    (tier = 'platinum' AND completed_jobs >= 100 AND reputation >= 90)
  )
);

-- Create index on agent_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_profiles_agent_id ON public.agent_profiles(agent_id);

-- Create index on wallet_address for address-based queries
CREATE INDEX IF NOT EXISTS idx_agent_profiles_wallet_address ON public.agent_profiles(wallet_address);

-- Create index on tier for tier-based analytics
CREATE INDEX IF NOT EXISTS idx_agent_profiles_tier ON public.agent_profiles(tier);

-- Create index on reputation for reputation-based queries
CREATE INDEX IF NOT EXISTS idx_agent_profiles_reputation ON public.agent_profiles(reputation);

-- Create index on last_active for activity tracking
CREATE INDEX IF NOT EXISTS idx_agent_profiles_last_active ON public.agent_profiles(last_active);

-- Enable RLS
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow agents to read their own profile
CREATE POLICY "agent_profiles_select_own" ON public.agent_profiles
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- Allow agents to update their own profile
CREATE POLICY "agent_profiles_update_own" ON public.agent_profiles
  FOR UPDATE
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- Allow service role to insert
CREATE POLICY "agent_profiles_insert_service_role" ON public.agent_profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid()::text = agent_id);

-- Allow service role full access for administrative operations
CREATE POLICY "agent_profiles_admin_all" ON public.agent_profiles
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_agent_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_agent_profiles_updated_at ON public.agent_profiles;
CREATE TRIGGER trigger_agent_profiles_updated_at
  BEFORE UPDATE ON public.agent_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agent_profiles_updated_at();

-- Create earnings_records table for transaction history
CREATE TABLE IF NOT EXISTS public.earnings_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  agent_id text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SOL',
  tx_signature text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_agent_id FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(agent_id) ON DELETE CASCADE
);

-- Create index on agent_id for earnings lookups
CREATE INDEX IF NOT EXISTS idx_earnings_records_agent_id ON public.earnings_records(agent_id);

-- Create index on job_id for job tracking
CREATE INDEX IF NOT EXISTS idx_earnings_records_job_id ON public.earnings_records(job_id);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_earnings_records_created_at ON public.earnings_records(created_at);

-- Enable RLS on earnings_records
ALTER TABLE public.earnings_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for earnings_records
-- Allow agents to read their own earnings
CREATE POLICY "earnings_records_select_own" ON public.earnings_records
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

-- Allow service role full access
CREATE POLICY "earnings_records_admin_all" ON public.earnings_records
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create job_executions table for execution history
CREATE TABLE IF NOT EXISTS public.job_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  agent_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('submitted', 'verified', 'paid', 'failed')),
  deliverable text,
  proof_hash text,
  quality_score integer CHECK (quality_score >= 0 AND quality_score <= 100),
  tx_signature text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_agent_id FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(agent_id) ON DELETE CASCADE
);

-- Create index on agent_id
CREATE INDEX IF NOT EXISTS idx_job_executions_agent_id ON public.job_executions(agent_id);

-- Create index on job_id
CREATE INDEX IF NOT EXISTS idx_job_executions_job_id ON public.job_executions(job_id);

-- Create index on status
CREATE INDEX IF NOT EXISTS idx_job_executions_status ON public.job_executions(status);

-- Enable RLS on job_executions
ALTER TABLE public.job_executions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for job_executions
CREATE POLICY "job_executions_select_own" ON public.job_executions
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

CREATE POLICY "job_executions_admin_all" ON public.job_executions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
