-- DSG ONE quota RPC uuid/text compatibility fix
-- The app calls increment_quota_atomic with string parameters. The live DB stores org_id/agent_id as uuid.
-- Cast once into uuid variables and use uuid values in UPDATE/INSERT/ON CONFLICT paths.

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_quota_atomic(
  p_org_id text,
  p_agent_id text,
  p_billing_period text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_agent_id uuid;
BEGIN
  v_org_id := p_org_id::uuid;
  v_agent_id := p_agent_id::uuid;

  UPDATE public.usage_counters
     SET executions = executions + 1,
         updated_at = now()
   WHERE org_id = v_org_id
     AND agent_id = v_agent_id
     AND billing_period = p_billing_period;

  IF NOT FOUND THEN
    INSERT INTO public.usage_counters (
      org_id,
      agent_id,
      billing_period,
      executions,
      updated_at
    )
    VALUES (
      v_org_id,
      v_agent_id,
      p_billing_period,
      1,
      now()
    )
    ON CONFLICT (org_id, agent_id, billing_period)
    DO UPDATE SET
      executions = public.usage_counters.executions + 1,
      updated_at = now();
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_quota_atomic(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_quota_atomic(text, text, text) TO service_role;

COMMIT;
