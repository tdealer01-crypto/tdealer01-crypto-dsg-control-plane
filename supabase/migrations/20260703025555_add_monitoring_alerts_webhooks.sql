-- Phase 3 gap fix: monitoring_alerts and monitoring_webhooks tables
-- Schema matches lib/database.types.ts (monitoring_alerts / monitoring_webhooks).
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS public.monitoring_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  agent_id UUID NOT NULL,

  alert_type TEXT NOT NULL CHECK (
    alert_type IN ('budget_daily', 'budget_monthly', 'budget_warning', 'execution_failed', 'tool_approval_failed')
  ),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'resolved')),

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_org_created
  ON public.monitoring_alerts (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_agent
  ON public.monitoring_alerts (agent_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_status
  ON public.monitoring_alerts (status);

CREATE TABLE IF NOT EXISTS public.monitoring_webhooks (
  webhook_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,

  url TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('slack', 'discord', 'generic')),
  secret TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_webhooks_org
  ON public.monitoring_webhooks (org_id);

ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_webhooks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "monitoring_alerts_select" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_select"
  ON public.monitoring_alerts
  FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "monitoring_alerts_insert" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_insert"
  ON public.monitoring_alerts
  FOR INSERT
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "monitoring_alerts_update" ON public.monitoring_alerts;
CREATE POLICY "monitoring_alerts_update"
  ON public.monitoring_alerts
  FOR UPDATE
  USING (public.is_org_member(org_id))
  WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "monitoring_webhooks_select" ON public.monitoring_webhooks;
CREATE POLICY "monitoring_webhooks_select"
  ON public.monitoring_webhooks
  FOR SELECT
  USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "monitoring_webhooks_insert" ON public.monitoring_webhooks;
CREATE POLICY "monitoring_webhooks_insert"
  ON public.monitoring_webhooks
  FOR INSERT
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "monitoring_webhooks_update" ON public.monitoring_webhooks;
CREATE POLICY "monitoring_webhooks_update"
  ON public.monitoring_webhooks
  FOR UPDATE
  USING (public.is_org_admin(org_id))
  WITH CHECK (public.is_org_admin(org_id));

DROP POLICY IF EXISTS "monitoring_webhooks_delete" ON public.monitoring_webhooks;
CREATE POLICY "monitoring_webhooks_delete"
  ON public.monitoring_webhooks
  FOR DELETE
  USING (public.is_org_admin(org_id));

NOTIFY pgrst, 'reload schema';;
