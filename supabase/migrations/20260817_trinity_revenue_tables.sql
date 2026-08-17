-- Trinity DSG Revenue Tracking Tables
-- Stores cost metrics and revenue records from Trinity API integration

-- Main revenue records table
CREATE TABLE IF NOT EXISTS trinity_revenue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id text NOT NULL,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  source text NOT NULL DEFAULT 'trinity-agents',
  total_amount_usd decimal(10, 4) NOT NULL,
  agent_count integer NOT NULL,
  healthy_agents integer,
  fragmentation_risk decimal(5, 2),
  context_sharing decimal(5, 2),
  metrics_json jsonb,
  status text NOT NULL DEFAULT 'pending_reconciliation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_amount CHECK (total_amount_usd >= 0),
  CONSTRAINT valid_agent_count CHECK (agent_count >= 0),
  CONSTRAINT valid_healthy_agents CHECK (healthy_agents IS NULL OR healthy_agents >= 0),
  CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Per-agent revenue breakdown
CREATE TABLE IF NOT EXISTS trinity_revenue_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trinity_revenue_record_id uuid REFERENCES trinity_revenue_records(id) ON DELETE CASCADE,
  agent_name text NOT NULL,
  jobs_processed integer DEFAULT 0,
  cpu_usage decimal(5, 2),
  agent_cost_usd decimal(10, 4) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_cost CHECK (agent_cost_usd >= 0),
  CONSTRAINT valid_jobs CHECK (jobs_processed >= 0)
);

-- Revenue sync state tracking
CREATE TABLE IF NOT EXISTS trinity_revenue_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_successful_sync timestamptz,
  last_sync_attempt timestamptz,
  last_sync_period text,
  last_sync_record_count integer,
  last_sync_total_cost decimal(10, 4),
  status text NOT NULL DEFAULT 'ready',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_trinity_revenue_records_org_period
  ON trinity_revenue_records(organization_id, period_start DESC, period_end DESC);

CREATE INDEX idx_trinity_revenue_records_status
  ON trinity_revenue_records(status);

CREATE INDEX idx_trinity_revenue_records_created
  ON trinity_revenue_records(created_at DESC);

CREATE INDEX idx_trinity_revenue_agents_record
  ON trinity_revenue_agents(trinity_revenue_record_id);

CREATE INDEX idx_trinity_revenue_agents_agent
  ON trinity_revenue_agents(agent_name);

-- RLS Policies (optional - adjust based on your auth model)
ALTER TABLE trinity_revenue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE trinity_revenue_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE trinity_revenue_sync_state ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage all revenue records
CREATE POLICY trinity_revenue_service_role
  ON trinity_revenue_records
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY trinity_revenue_agents_service_role
  ON trinity_revenue_agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY trinity_sync_state_service_role
  ON trinity_revenue_sync_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE trinity_revenue_records IS 'Trinity DSG Agent cost records from hourly revenue sync';
COMMENT ON TABLE trinity_revenue_agents IS 'Per-agent cost breakdown within each revenue record';
COMMENT ON TABLE trinity_revenue_sync_state IS 'State tracking for Trinity revenue sync operations';

COMMENT ON COLUMN trinity_revenue_records.status IS 'Status: pending_reconciliation, reconciled, billed, archived';
COMMENT ON COLUMN trinity_revenue_sync_state.status IS 'Status: ready, syncing, failed, degraded';
