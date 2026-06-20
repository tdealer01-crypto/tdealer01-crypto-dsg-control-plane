-- Atomic quota increment function.
--
-- Replaces the app-layer SELECT + UPDATE pattern in lib/usage/quota.ts
-- with a single atomic SQL operation: UPDATE ... executions = executions + 1
-- followed by INSERT ON CONFLICT to handle the first-row case.
--
-- Both paths are atomic at the DB level, eliminating the read-modify-write
-- race condition where two concurrent requests could both read executions=N
-- and both write N+1 instead of N+2.

CREATE OR REPLACE FUNCTION increment_quota_atomic(
  p_org_id   TEXT,
  p_agent_id TEXT,
  p_billing_period TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomic increment if the row already exists.
  -- executions = executions + 1 is a single SQL expression evaluated inside
  -- a row lock, so concurrent calls increment correctly.
  UPDATE usage_counters
  SET    executions = executions + 1,
         updated_at = NOW()
  WHERE  org_id = public.dsg_text_to_uuid(p_org_id)
    AND  agent_id = public.dsg_text_to_uuid(p_agent_id)
    AND  billing_period = p_billing_period;

  -- If no row existed (NOT FOUND from UPDATE), insert one.
  -- ON CONFLICT handles two concurrent first-insert races.
  IF NOT FOUND THEN
    INSERT INTO usage_counters (org_id, agent_id, billing_period, executions, updated_at)
    VALUES (p_org_id, p_agent_id, p_billing_period, 1, NOW())
    ON CONFLICT (org_id, agent_id, billing_period)
    DO UPDATE SET executions = usage_counters.executions + 1,
                  updated_at = NOW();
  END IF;
END;
$$;

COMMENT ON FUNCTION increment_quota_atomic(TEXT, TEXT, TEXT)
  IS 'Atomically increment execution counter for (org, agent, billing_period). Safe under concurrent load.';
