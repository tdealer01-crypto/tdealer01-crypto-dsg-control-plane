/**
 * Stripe Metered Billing — Usage-Based Overage Charges
 *
 * Implements Stripe's Billing Meter API (2026) to report per-execution
 * usage events. This enables hybrid pricing: flat subscription +
 * metered overage for high-volume orgs.
 *
 * Outbox pattern: events are written to billing_meter_outbox first, then flushed
 * to Stripe. If Stripe is unavailable the pending row stays in the DB and the
 * hourly flush-meter-outbox cron retries it — no silent loss.
 *
 * Required env vars (add to Vercel when enabling metered billing):
 *   STRIPE_METER_EVENT_NAME  – e.g., "dsg_execution"
 *   STRIPE_SECRET_KEY        – already configured
 */

import Stripe from 'stripe';

export type MeterEventResult =
  | { ok: true; eventId: string }
  | { ok: false; error: string; skipped?: boolean };

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getMeterEventName(): string | null {
  return process.env.STRIPE_METER_EVENT_NAME ?? null;
}

/**
 * Report a single execution event to Stripe Metering.
 *
 * 1. Writes a pending row to billing_meter_outbox (durable record).
 * 2. Attempts immediate delivery to Stripe.
 * 3. Updates outbox row to 'sent' or 'failed'.
 *
 * The outbox row survives a Stripe outage and is retried by the hourly cron.
 *
 * @param stripeCustomerId  The org's Stripe customer ID (from billing_customers table)
 * @param orgId             DSG org ID (for outbox + tracing)
 * @param quantity          Number of executions to meter (default: 1)
 * @param executionId       Unique execution ID — idempotency key that prevents duplicate
 *                          charges when two executions occur in the same second
 */
export async function reportMeterEvent(
  stripeCustomerId: string,
  orgId: string,
  quantity = 1,
  executionId?: string,
): Promise<MeterEventResult> {
  const stripe = getStripe();
  const eventName = getMeterEventName();

  if (!stripe || !eventName) {
    return { ok: false, error: 'Stripe metering not configured', skipped: true };
  }

  // Stable idempotency key: executionId is preferred; timestamp fallback is for
  // callers that predate this parameter (avoids same-second deduplication bug).
  const idempotencyKey = executionId
    ? `dsg-meter-${executionId}`
    : `dsg-meter-${orgId}-${Math.floor(Date.now() / 1000)}`;

  // --- Outbox write (durable record before any network call) ---
  const { getSupabaseAdmin } = await import('../supabase-server');
  const supabase = getSupabaseAdmin();

  const outboxId = executionId ?? idempotencyKey;

  // Upsert so retries from the flusher cron don't create duplicate rows
  await supabase.from('billing_meter_outbox').upsert(
    {
      execution_id:       outboxId,
      org_id:             orgId,
      stripe_customer_id: stripeCustomerId,
      event_name:         eventName,
      quantity,
      status:             'pending',
    },
    { onConflict: 'execution_id', ignoreDuplicates: false },
  );

  // --- Stripe delivery ---
  try {
    const timestamp = Math.floor(Date.now() / 1000);

    const event = await stripe.billing.meterEvents.create(
      {
        event_name: eventName,
        payload: {
          stripe_customer_id: stripeCustomerId,
          value: String(quantity),
        },
        timestamp,
      },
      { idempotencyKey }
    );

    await supabase
      .from('billing_meter_outbox')
      .update({ status: 'sent', stripe_event_id: event.identifier, flushed_at: new Date().toISOString() })
      .eq('execution_id', outboxId);

    return { ok: true, eventId: event.identifier };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[metered] Stripe meter event failed (will retry via outbox):', message);

    await supabase
      .from('billing_meter_outbox')
      .update({ status: 'failed', error: message })
      .eq('execution_id', outboxId);

    return { ok: false, error: message };
  }
}

/**
 * Lookup the Stripe customer ID for an org from the billing_customers table.
 * Returns null if no customer record exists (org not yet on Stripe).
 */
export async function getStripeCustomerIdForOrg(orgId: string): Promise<string | null> {
  const { getSupabaseAdmin } = await import('../supabase-server');
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('org_id', orgId)
    .maybeSingle();

  return data?.stripe_customer_id ?? null;
}

/**
 * Combined: report meter event for an org if they have a Stripe customer.
 * Safe to call from /api/execute — never throws, skips gracefully if unconfigured.
 *
 * @param orgId        DSG org ID
 * @param quantity     Number of executions (default: 1)
 * @param executionId  Unique execution ID for idempotency (strongly recommended)
 */
export async function meterExecution(orgId: string, quantity = 1, executionId?: string): Promise<void> {
  const customerId = await getStripeCustomerIdForOrg(orgId);
  if (!customerId) return;
  void reportMeterEvent(customerId, orgId, quantity, executionId);
}

/**
 * Check if Stripe metered billing is configured.
 */
export function isMeteredBillingConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_METER_EVENT_NAME);
}
