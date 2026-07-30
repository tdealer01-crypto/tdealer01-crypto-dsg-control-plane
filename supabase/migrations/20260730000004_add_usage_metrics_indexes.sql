-- Add indexes to executions table for usage metrics and analytics queries
-- These indexes support efficient filtering by org, date ranges, and decision status.

-- Index for analytics by decision type and time
CREATE INDEX IF NOT EXISTS idx_executions_decision_created
  ON executions(decision, created_at DESC);

-- Index for policy version tracking
CREATE INDEX IF NOT EXISTS idx_executions_policy_version_created
  ON executions(policy_version, created_at DESC);

-- Index for org-level analytics (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_executions_org_created
  ON executions(org_id, created_at DESC);

-- Composite index for complex queries (org + decision + time)
CREATE INDEX IF NOT EXISTS idx_executions_org_decision_created
  ON executions(org_id, decision, created_at DESC);

-- Index for agent-level analytics
CREATE INDEX IF NOT EXISTS idx_executions_agent_created
  ON executions(agent_id, created_at DESC);

-- Index for time-range queries by latency (performance analysis)
CREATE INDEX IF NOT EXISTS idx_executions_latency_created
  ON executions(latency_ms, created_at DESC)
  WHERE latency_ms > 100;  -- Index slow queries only

-- Index for created_at alone (for date-based partitioning preparation)
CREATE INDEX IF NOT EXISTS idx_executions_created_desc
  ON executions(created_at DESC);
