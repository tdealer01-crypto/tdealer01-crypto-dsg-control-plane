-- Serialize DSG Gate usage assignment per organization so concurrent requests
-- cannot both claim the final included quota slot.

ALTER TABLE public.dsg_gate_usage
  ADD COLUMN IF NOT EXISTS usage_position INTEGER;

CREATE OR REPLACE FUNCTION public.record_dsg_gate_usage(
  p_org_id TEXT,
  p_eval_id TEXT,
  p_route TEXT,
  p_gate_status TEXT,
  p_duration_ms INTEGER
)
RETURNS TABLE (
  usage_id UUID,
  created BOOLEAN,
  billed BOOLEAN,
  meter_event_id TEXT,
  usage_position INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing public.dsg_gate_usage%ROWTYPE;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_position INTEGER;
  v_inserted public.dsg_gate_usage%ROWTYPE;
BEGIN
  IF p_org_id IS NULL OR btrim(p_org_id) = '' THEN
    RAISE EXCEPTION 'org_id is required';
  END IF;
  IF p_eval_id IS NULL OR btrim(p_eval_id) = '' THEN
    RAISE EXCEPTION 'eval_id is required';
  END IF;
  IF p_route NOT IN ('gates/evaluate', 'proofs/prove') THEN
    RAISE EXCEPTION 'unsupported route: %', p_route;
  END IF;

  -- One organization is serialized only for the short usage-assignment
  -- transaction. Different organizations remain concurrent.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org_id, 0));

  SELECT *
  INTO v_existing
  FROM public.dsg_gate_usage usage
  WHERE usage.org_id = p_org_id
    AND usage.eval_id = p_eval_id
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_existing.id,
      FALSE,
      v_existing.billed,
      v_existing.meter_event_id,
      v_existing.usage_position;
    RETURN;
  END IF;

  SELECT
    COALESCE(entitlement.current_period_start, date_trunc('month', now())),
    COALESCE(entitlement.current_period_end, date_trunc('month', now()) + INTERVAL '1 month')
  INTO v_period_start, v_period_end
  FROM public.dsg_gate_entitlements entitlement
  WHERE entitlement.org_id = p_org_id;

  IF NOT FOUND THEN
    v_period_start := date_trunc('month', now());
    v_period_end := v_period_start + INTERVAL '1 month';
  END IF;

  SELECT COUNT(*)::INTEGER + 1
  INTO v_position
  FROM public.dsg_gate_usage usage
  WHERE usage.org_id = p_org_id
    AND usage.created_at >= v_period_start
    AND usage.created_at < v_period_end;

  INSERT INTO public.dsg_gate_usage (
    org_id,
    eval_id,
    route,
    gate_status,
    duration_ms,
    billed,
    usage_position
  ) VALUES (
    p_org_id,
    p_eval_id,
    p_route,
    p_gate_status,
    p_duration_ms,
    FALSE,
    v_position
  )
  RETURNING * INTO v_inserted;

  RETURN QUERY SELECT
    v_inserted.id,
    TRUE,
    v_inserted.billed,
    v_inserted.meter_event_id,
    v_inserted.usage_position;
END;
$$;

REVOKE ALL ON FUNCTION public.record_dsg_gate_usage(TEXT, TEXT, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_dsg_gate_usage(TEXT, TEXT, TEXT, TEXT, INTEGER)
  TO service_role;

COMMENT ON FUNCTION public.record_dsg_gate_usage(TEXT, TEXT, TEXT, TEXT, INTEGER) IS
  'Idempotently records one DSG Gate evaluation and assigns a serialized subscription-period usage position.';
