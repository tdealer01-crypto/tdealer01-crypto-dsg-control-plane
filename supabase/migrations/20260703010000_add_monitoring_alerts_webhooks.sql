-- Phase 3 gap fix: monitoring_alerts and monitoring_webhooks tables
-- These tables are required by:
--   app/api/monitoring/alerts/route.ts, app/api/monitoring/alerts/[id]/route.ts
--   app/api/monitoring/webhooks/route.ts, app/api/monitoring/webhooks/[id]/route.ts
--   lib/monitoring/alert-engine.ts, lib/monitoring/webhook-sender.ts
-- Schema matches lib/database.types.ts (monitoring_alerts / monitoring_webhooks).
-- Idempotent: safe to re-run.

-- monitoring_alerts: budget/execution alerts per org+agent
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

-- monitoring_webhooks: per-org webhook delivery targets for alerts
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

-- Enable RLS
ALTER TABLE public.monitoring_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read/insert/update alerts in their org.
-- Read scope: org members only. Write scope: org members (acknowledge/resolve, internal alert creation).
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

-- RLS: org members can read webhook configs; only org admins can create/update/delete
-- (webhook configs contain delivery URLs and HMAC secrets).
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

-- Allow anon role to execute org-membership helper functions used inside the
-- RLS policies above. Both functions check auth.uid(): for anon sessions
-- auth.uid() is NULL, so they return false and RLS yields zero rows instead
-- of "permission denied for function is_org_member" (which surfaced as HTTP 500).
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO anon;

-- Ask PostgREST to reload its schema cache so the new tables are visible immediately
NOTIFY pgrst, 'reload schema';
