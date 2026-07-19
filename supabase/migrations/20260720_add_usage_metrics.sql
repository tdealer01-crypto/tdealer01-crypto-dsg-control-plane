-- Create usage metrics table for enterprise observability
-- Migration: 20260720_add_usage_metrics.sql
-- Purpose: Daily rollup of org usage for dashboard, billing, and capacity planning

BEGIN;

-- Create org_usage_metrics table for daily usage aggregation
CREATE TABLE IF NOT EXISTS public.org_usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  api_calls INTEGER NOT NULL DEFAULT 0,
  webhook_deliveries INTEGER NOT NULL DEFAULT 0,
  gate_evaluations INTEGER NOT NULL DEFAULT 0,
  storage_gb NUMERIC(10, 2) NOT NULL DEFAULT 0,
  active_seats INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, period_start)
);

-- Enable RLS on org_usage_metrics
ALTER TABLE public.org_usage_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can read their own org's usage metrics
CREATE POLICY "org_usage_metrics_org_read" ON public.org_usage_metrics
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_usage_metrics.org_id
    )
  );

-- RLS Policy: only admin can write metrics (via cron or admin endpoint)
CREATE POLICY "org_usage_metrics_admin_write" ON public.org_usage_metrics
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.user_org_roles
      WHERE org_id = org_usage_metrics.org_id AND role_name = 'admin'
    )
  );

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_usage_metrics_org_id ON public.org_usage_metrics(org_id);
CREATE INDEX IF NOT EXISTS idx_org_usage_metrics_period_start ON public.org_usage_metrics(org_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_org_usage_metrics_created_at ON public.org_usage_metrics(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_org_usage_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS org_usage_metrics_updated_at ON public.org_usage_metrics;
CREATE TRIGGER org_usage_metrics_updated_at
  BEFORE UPDATE ON public.org_usage_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_org_usage_metrics_updated_at();

-- Document table
COMMENT ON TABLE public.org_usage_metrics IS 'Daily aggregated usage metrics for enterprise observability and billing';
COMMENT ON COLUMN public.org_usage_metrics.period_start IS 'Date (UTC) of the usage period';
COMMENT ON COLUMN public.org_usage_metrics.api_calls IS 'Total API calls made during this period';
COMMENT ON COLUMN public.org_usage_metrics.webhook_deliveries IS 'Total webhook deliveries attempted';
COMMENT ON COLUMN public.org_usage_metrics.gate_evaluations IS 'Total gate evaluations (DSG deterministic gates)';
COMMENT ON COLUMN public.org_usage_metrics.storage_gb IS 'Total storage used (in GB)';
COMMENT ON COLUMN public.org_usage_metrics.active_seats IS 'Number of active users/seats during this period';
COMMENT ON COLUMN public.org_usage_metrics.cost_usd IS 'Estimated cost for the period (for cost projection)';

COMMIT;
