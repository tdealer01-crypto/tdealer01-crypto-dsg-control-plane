-- Create table for public test results (third-party shareable audit evidence)
CREATE TABLE IF NOT EXISTS public_test_results (
  test_id UUID PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '90 days',

  -- Test parameters
  min_required INT NOT NULL CHECK (min_required >= 0 AND min_required <= 5),
  actual_count INT NOT NULL CHECK (actual_count >= 0 AND actual_count <= 5),
  test_name TEXT,

  -- Decision and proof
  decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'BLOCK')),
  reason TEXT NOT NULL,

  -- SHA-256 proof chain
  request_hash TEXT NOT NULL,
  proof_hash TEXT NOT NULL,
  bundle_hash TEXT NOT NULL,
  merkle_root TEXT NOT NULL,

  -- Compliance flags
  ccvs_level TEXT NOT NULL DEFAULT 'L2' CHECK (ccvs_level IN ('L1', 'L2', 'L3')),
  compliance_ccvs BOOLEAN NOT NULL DEFAULT true,
  compliance_pdpa BOOLEAN NOT NULL DEFAULT true,
  compliance_eu_ai_act BOOLEAN NOT NULL DEFAULT true,

  -- Evidence flags
  evidence_deterministic BOOLEAN NOT NULL DEFAULT true,
  evidence_replayable BOOLEAN NOT NULL DEFAULT true,
  evidence_tamperable BOOLEAN NOT NULL DEFAULT false,

  -- Full result JSON (for export)
  result_json JSONB NOT NULL
);

-- Index for quick retrieval by testId (primary key index exists by default)
-- Index for finding recent results
CREATE INDEX IF NOT EXISTS idx_public_test_results_created_at ON public_test_results(created_at DESC);

-- Index for cleanup queries (expired results)
CREATE INDEX IF NOT EXISTS idx_public_test_results_expires_at ON public_test_results(expires_at);

-- Enable RLS (public read, no write from client)
ALTER TABLE public_test_results ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can read (public table)
CREATE POLICY "Public read access" ON public_test_results
  FOR SELECT USING (true);

-- Policy: no direct client inserts (server-only writes via API)
CREATE POLICY "No client inserts" ON public_test_results
  FOR INSERT WITH CHECK (false);

-- Policy: no updates
CREATE POLICY "No updates" ON public_test_results
  FOR UPDATE WITH CHECK (false);

-- Policy: no deletes (only server-side cleanup via cron)
CREATE POLICY "No deletes" ON public_test_results
  FOR DELETE WITH CHECK (false);

-- Comment
COMMENT ON TABLE public_test_results IS 'Public test results for third-party arbiter count validation - immutable audit evidence with automatic 90-day expiration';
