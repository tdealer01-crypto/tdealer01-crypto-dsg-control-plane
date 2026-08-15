WITH ranked AS (
  SELECT
    id,
    org_id,
    metadata ->> 'stripe_event_id' AS stripe_event_id,
    row_number() OVER (
      PARTITION BY org_id, metadata ->> 'stripe_event_id'
      ORDER BY created_at ASC, id ASC
    ) AS occurrence
  FROM public.revenue_events
  WHERE idempotency_key IS NULL
    AND jsonb_typeof(metadata) = 'object'
    AND NULLIF(metadata ->> 'stripe_event_id', '') IS NOT NULL
)
UPDATE public.revenue_events event
SET idempotency_key = 'stripe:' || ranked.stripe_event_id
FROM ranked
WHERE event.id = ranked.id
  AND ranked.occurrence = 1;;
