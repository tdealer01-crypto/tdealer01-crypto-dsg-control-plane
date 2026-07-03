-- Add monitoring_alerts table for agent alert tracking
-- Fixes: monitoring dashboard /api/monitoring/alerts endpoints depend on this table

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),

  title TEXT NOT NULL,
  message TEXT,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_org_id
  ON public.monitoring_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_agent_id
  ON public.monitoring_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status
  ON public.monitoring_alerts(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity
  ON public.monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_created_at
  ON public.monitoring_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow users to view alerts from their organization
CREATE POLICY "monitoring_alerts_org_isolation"
  ON public.monitoring_alerts
  FOR SELECT
  USING (
    org_id = (SELECT org_id FROM public.agents a WHERE a.id = monitoring_alerts.agent_id LIMIT 1)
    OR auth.uid() = (
      SELECT owner_user_id FROM public.agents a WHERE a.id = monitoring_alerts.agent_id LIMIT 1
    )
  );

-- RLS Policy: Allow creating alerts (internal use, filtered by agent ownership)
CREATE POLICY "monitoring_alerts_insert"
  ON public.monitoring_alerts
  FOR INSERT
  WITH CHECK (
    org_id = (SELECT org_id FROM public.agents a WHERE a.id = monitoring_alerts.agent_id LIMIT 1)
  );

-- RLS Policy: Allow updating alert status (acknowledge/resolve)
CREATE POLICY "monitoring_alerts_update"
  ON public.monitoring_alerts
  FOR UPDATE
  USING (
    org_id = (SELECT org_id FROM public.agents a WHERE a.id = monitoring_alerts.agent_id LIMIT 1)
  );
