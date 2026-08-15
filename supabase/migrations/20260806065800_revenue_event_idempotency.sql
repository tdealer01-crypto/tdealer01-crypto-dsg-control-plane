ALTER TABLE public.revenue_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

UPDATE public.revenue_events
SET idempotency_key = metadata ->> 'idempotency_key'
WHERE idempotency_key IS NULL
  AND jsonb_typeof(metadata) = 'object'
  AND NULLIF(metadata ->> 'idempotency_key', '') IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS revenue_events_org_idempotency_uidx
  ON public.revenue_events (org_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;;
