-- Create agent_profiles table
CREATE TABLE public.agent_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL UNIQUE,
  wallet_address text NOT NULL,
  skills text[] NOT NULL DEFAULT '{}',
  reputation integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'bronze',
  completed_jobs integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  last_active timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_agent_profiles_agent_id ON public.agent_profiles(agent_id);
CREATE INDEX idx_agent_profiles_wallet_address ON public.agent_profiles(wallet_address);
CREATE INDEX idx_agent_profiles_tier ON public.agent_profiles(tier);
CREATE INDEX idx_agent_profiles_reputation ON public.agent_profiles(reputation);
CREATE INDEX idx_agent_profiles_last_active ON public.agent_profiles(last_active);

-- Enable RLS
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY agent_profiles_select_own ON public.agent_profiles
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

CREATE POLICY agent_profiles_update_own ON public.agent_profiles
  FOR UPDATE
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid()::text = agent_id OR auth.role() = 'service_role');

CREATE POLICY agent_profiles_insert_service_role ON public.agent_profiles
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role' OR auth.uid()::text = agent_id);

CREATE POLICY agent_profiles_admin_all ON public.agent_profiles
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create earnings_records table
CREATE TABLE public.earnings_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  agent_id text NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'SOL',
  tx_signature text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_earnings_agent_id FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(agent_id) ON DELETE CASCADE
);

-- Indexes for earnings_records
CREATE INDEX idx_earnings_records_agent_id ON public.earnings_records(agent_id);
CREATE INDEX idx_earnings_records_job_id ON public.earnings_records(job_id);
CREATE INDEX idx_earnings_records_created_at ON public.earnings_records(created_at);

-- Enable RLS on earnings_records
ALTER TABLE public.earnings_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for earnings_records
CREATE POLICY earnings_records_select_own ON public.earnings_records
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

CREATE POLICY earnings_records_admin_all ON public.earnings_records
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create job_executions table
CREATE TABLE public.job_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id text NOT NULL,
  agent_id text NOT NULL,
  status text NOT NULL,
  deliverable text,
  proof_hash text,
  quality_score integer,
  tx_signature text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT fk_job_executions_agent_id FOREIGN KEY (agent_id) REFERENCES public.agent_profiles(agent_id) ON DELETE CASCADE
);

-- Indexes for job_executions
CREATE INDEX idx_job_executions_agent_id ON public.job_executions(agent_id);
CREATE INDEX idx_job_executions_job_id ON public.job_executions(job_id);
CREATE INDEX idx_job_executions_status ON public.job_executions(status);

-- Enable RLS on job_executions
ALTER TABLE public.job_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for job_executions
CREATE POLICY job_executions_select_own ON public.job_executions
  FOR SELECT
  USING (auth.uid()::text = agent_id OR auth.role() = 'service_role');

CREATE POLICY job_executions_admin_all ON public.job_executions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');;
