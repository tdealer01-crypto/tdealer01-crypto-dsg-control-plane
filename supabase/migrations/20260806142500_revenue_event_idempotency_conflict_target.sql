-- A partial unique index cannot be inferred by PostgREST's
-- ON CONFLICT (org_id, idempotency_key) target. A normal PostgreSQL unique
-- index still permits multiple NULL idempotency keys while supporting atomic
-- upsert for non-NULL keys.

DROP INDEX IF EXISTS public.revenue_events_org_idempotency_uidx;

CREATE UNIQUE INDEX revenue_events_org_idempotency_uidx
  ON public.revenue_events (org_id, idempotency_key);
