-- DSG Gate automatic-revenue hardening
--
-- Creates the missing entitlement/usage schema when an environment skipped the
-- historical migration, makes usage idempotent, aligns counts to the Stripe
-- subscription period, and atomically syncs organization + gate entitlements.

BEGIN;

CREATE TABLE IF NOT EXISTS public.dsg_gate_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'enterprise')),
  evals_per_month INTEGER NOT NULL DEFAULT 50
    CHECK (evals_per_month > 0),
  subscription_status TEXT NOT NULL DEFAULT 'free',
  overage_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_meter_event_name TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dsg_gate_entitlements
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS overage_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS dsg_gate_entitlements_subscription_uidx
  ON public.dsg_gate_entitlements (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.dsg_gate_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  eval_id TEXT NOT NULL,
  route TEXT NOT NULL
    CHECK (route IN ('gates/evaluate', 'proofs/prove')),
  gate_status TEXT NOT NULL,
  duration_ms INTEGER,
  billed BOOLEAN NOT NULL DEFAULT FALSE,
  meter_event_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dsg_gate_usage_org_created_idx
  ON public.dsg_gate_usage (org_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS dsg_gate_usage_org_eval_uidx
  ON public.dsg_gate_usage (org_id, eval_id);

ALTER TABLE public.dsg_gate_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dsg_gate_usage ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dsg_gate_entitlements'
      AND policyname = 'dsg_gate_entitlements_org_read'
  ) THEN
    CREATE POLICY dsg_gate_entitlements_org_read
      ON public.dsg_gate_entitlements
      FOR SELECT
      USING (org_id = auth.jwt() ->> 'org_id');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dsg_gate_usage'
      AND policyname = 'dsg_gate_usage_org_read'
  ) THEN
    CREATE POLICY dsg_gate_usage_org_read
      ON public.dsg_gate_usage
      FOR SELECT
      USING (org_id = auth.jwt() ->> 'org_id');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.dsg_gate_evals_this_period(p_org_id TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH entitlement AS (
    SELECT current_period_start, current_period_end
    FROM public.dsg_gate_entitlements
    WHERE org_id = p_org_id
  ), bounds AS (
    SELECT
      COALESCE(current_period_start, date_trunc('month', now())) AS period_start,
      COALESCE(current_period_end, date_trunc('month', now()) + INTERVAL '1 month') AS period_end
    FROM entitlement
    UNION ALL
    SELECT date_trunc('month', now()), date_trunc('month', now()) + INTERVAL '1 month'
    WHERE NOT EXISTS (SELECT 1 FROM entitlement)
    LIMIT 1
  )
  SELECT COUNT(*)::INTEGER
  FROM public.dsg_gate_usage usage
  CROSS JOIN bounds
  WHERE usage.org_id = p_org_id
    AND usage.created_at >= bounds.period_start
    AND usage.created_at < bounds.period_end;
$$;

REVOKE ALL ON FUNCTION public.dsg_gate_evals_this_period(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dsg_gate_evals_this_period(TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.sync_dsg_paid_entitlement(
  p_org_id TEXT,
  p_plan_key TEXT,
  p_status TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_plan TEXT := 'free';
  v_tier TEXT := 'free';
  v_limit INTEGER := 50;
  v_overage BOOLEAN := FALSE;
  v_customer_id TEXT;
  v_subscription_id TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_status TEXT := lower(COALESCE(p_status, 'unknown'));
  v_plan_key TEXT := lower(COALESCE(p_plan_key, 'free'));
BEGIN
  IF p_org_id IS NULL OR btrim(p_org_id) = '' THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;

  SELECT
    subscription.stripe_customer_id,
    subscription.stripe_subscription_id,
    subscription.current_period_start,
    subscription.current_period_end
  INTO
    v_customer_id,
    v_subscription_id,
    v_period_start,
    v_period_end
  FROM public.billing_subscriptions subscription
  WHERE subscription.org_id::TEXT = p_org_id
  ORDER BY subscription.updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    SELECT customer.stripe_customer_id
    INTO v_customer_id
    FROM public.billing_customers customer
    WHERE customer.org_id::TEXT = p_org_id
    ORDER BY customer.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  IF v_status IN ('active', 'trialing') THEN
    CASE v_plan_key
      WHEN 'enterprise' THEN
        v_plan := 'enterprise';
        v_tier := 'enterprise';
        v_limit := 999999;
        v_overage := FALSE;
      WHEN 'business' THEN
        v_plan := 'business';
        v_tier := 'pro';
        v_limit := 5000;
        v_overage := TRUE;
      WHEN 'pro' THEN
        v_plan := 'pro';
        v_tier := 'pro';
        v_limit := 5000;
        v_overage := TRUE;
      ELSE
        v_plan := 'free';
        v_tier := 'free';
        v_limit := 50;
        v_overage := FALSE;
    END CASE;
  END IF;

  UPDATE public.organizations
  SET plan = v_plan,
      updated_at = now()
  WHERE id::TEXT = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization % not found', p_org_id;
  END IF;

  INSERT INTO public.dsg_gate_entitlements (
    org_id,
    tier,
    evals_per_month,
    subscription_status,
    overage_enabled,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_meter_event_name,
    current_period_start,
    current_period_end,
    updated_at
  ) VALUES (
    p_org_id,
    v_tier,
    v_limit,
    v_status,
    v_overage,
    v_customer_id,
    v_subscription_id,
    current_setting('app.settings.stripe_meter_event_name', TRUE),
    v_period_start,
    v_period_end,
    now()
  )
  ON CONFLICT (org_id) DO UPDATE SET
    tier = EXCLUDED.tier,
    evals_per_month = EXCLUDED.evals_per_month,
    subscription_status = EXCLUDED.subscription_status,
    overage_enabled = EXCLUDED.overage_enabled,
    stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, public.dsg_gate_entitlements.stripe_customer_id),
    stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, public.dsg_gate_entitlements.stripe_subscription_id),
    stripe_meter_event_name = COALESCE(EXCLUDED.stripe_meter_event_name, public.dsg_gate_entitlements.stripe_meter_event_name),
    current_period_start = COALESCE(EXCLUDED.current_period_start, public.dsg_gate_entitlements.current_period_start),
    current_period_end = COALESCE(EXCLUDED.current_period_end, public.dsg_gate_entitlements.current_period_end),
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.sync_dsg_paid_entitlement(TEXT, TEXT, TEXT) IS
  'Atomically synchronizes organizations.plan and DSG Gate entitlement from Stripe subscription state.';

COMMIT;
