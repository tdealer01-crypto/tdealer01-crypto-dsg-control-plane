DROP INDEX IF EXISTS public.revenue_events_org_idempotency_uidx;

CREATE UNIQUE INDEX revenue_events_org_idempotency_uidx
  ON public.revenue_events (org_id, idempotency_key);;
