-- Add monitoring tables for agent execution tracking
-- Phase 1: Foundation (non-breaking)

-- Create monitoring_executions table
CREATE TABLE IF NOT EXISTS public.monitoring_executions (
  execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL,
  org_id UUID NOT NULL,
  user_id UUID,

  -- Execution metadata
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'success', 'failure', 'blocked')),

  -- Execution details
  payload_hash TEXT,
  decision TEXT,
  reason TEXT,

  -- Token tracking
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (COALESCE(input_tokens, 0) + COALESCE(output_tokens, 0)) STORED,
  model_name TEXT DEFAULT 'unknown',
  total_cost_usd NUMERIC(10, 6) DEFAULT 0,

  -- Context
  metadata JSONB DEFAULT '{}',
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring_events table
CREATE TABLE IF NOT EXISTS public.monitoring_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.monitoring_executions(execution_id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (
    event_type IN ('execution_start', 'execution_end', 'tool_call', 'approval_gate',
                   'error', 'alert', 'metric', 'other')
  ),

  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_id TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring_tool_calls table
CREATE TABLE IF NOT EXISTS public.monitoring_tool_calls (
  tool_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.monitoring_executions(execution_id) ON DELETE CASCADE,

  tool_name TEXT NOT NULL,
  tool_input JSONB NOT NULL,
  tool_output JSONB,

  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  approval_status TEXT DEFAULT 'auto-approved' CHECK (approval_status IN ('auto-approved', 'pending', 'approved', 'rejected')),
  approval_reason TEXT,

  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN completed_at IS NOT NULL THEN (EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::INTEGER
      ELSE NULL
    END
  ) STORED,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring_token_usage table
CREATE TABLE IF NOT EXISTS public.monitoring_token_usage (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.monitoring_executions(execution_id) ON DELETE CASCADE,

  model_name TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,

  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_executions_agent_id
  ON public.monitoring_executions(agent_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_executions_org_id
  ON public.monitoring_executions(org_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_executions_created_at
  ON public.monitoring_executions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_executions_status
  ON public.monitoring_executions(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_executions_user_id
  ON public.monitoring_executions(user_id);

CREATE INDEX IF NOT EXISTS idx_monitoring_events_execution_id
  ON public.monitoring_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_event_type
  ON public.monitoring_events(event_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_events_timestamp
  ON public.monitoring_events(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_monitoring_tool_calls_execution_id
  ON public.monitoring_tool_calls(execution_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_tool_calls_risk_level
  ON public.monitoring_tool_calls(risk_level);
CREATE INDEX IF NOT EXISTS idx_monitoring_tool_calls_approval_status
  ON public.monitoring_tool_calls(approval_status);

CREATE INDEX IF NOT EXISTS idx_monitoring_token_usage_execution_id
  ON public.monitoring_token_usage(execution_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_token_usage_model
  ON public.monitoring_token_usage(model_name);

-- Enable RLS (Row Level Security)
ALTER TABLE public.monitoring_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_tool_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_token_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow users to view executions from their organization
CREATE POLICY "monitoring_executions_org_isolation"
  ON public.monitoring_executions
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM public.agents a WHERE a.id = monitoring_executions.agent_id LIMIT 1)
    OR user_id = auth.uid()
  );

CREATE POLICY "monitoring_events_read"
  ON public.monitoring_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_executions me
      WHERE me.execution_id = monitoring_events.execution_id
      AND (
        me.org_id = (SELECT org_id FROM public.agents a WHERE a.id = me.agent_id LIMIT 1)
        OR me.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "monitoring_tool_calls_read"
  ON public.monitoring_tool_calls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_executions me
      WHERE me.execution_id = monitoring_tool_calls.execution_id
      AND (
        me.org_id = (SELECT org_id FROM public.agents a WHERE a.id = me.agent_id LIMIT 1)
        OR me.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "monitoring_token_usage_read"
  ON public.monitoring_token_usage
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.monitoring_executions me
      WHERE me.execution_id = monitoring_token_usage.execution_id
      AND (
        me.org_id = (SELECT org_id FROM public.agents a WHERE a.id = me.agent_id LIMIT 1)
        OR me.user_id = auth.uid()
      )
    )
  );

-- Create view for monthly metrics
CREATE OR REPLACE VIEW public.monitoring_monthly_metrics AS
SELECT
  DATE_TRUNC('month', e.created_at)::DATE AS month,
  e.agent_id,
  e.org_id,
  COUNT(*) AS total_executions,
  SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) AS successful_executions,
  SUM(e.total_tokens) AS total_tokens_used,
  SUM(e.total_cost_usd) AS total_cost_usd,
  AVG(EXTRACT(EPOCH FROM (e.end_time - e.start_time))) FILTER (WHERE e.end_time IS NOT NULL) AS avg_duration_seconds,
  ROUND(
    100.0 * SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END)::numeric /
    NULLIF(COUNT(*), 0),
    2
  ) AS success_rate_percent
FROM public.monitoring_executions e
GROUP BY DATE_TRUNC('month', e.created_at), e.agent_id, e.org_id;
