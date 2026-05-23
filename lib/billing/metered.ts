/**
 * Stripe Metered Billing — Usage-Based Overage Charges
 *
 * Implements Stripe's Billing Meter API (2026) to report per-execution
 * usage events. This enables hybrid pricing: flat subscription +
 * metered overage for high-volume orgs.
 *
 * Market context: Stripe Metering for AI agents (tokens, tasks, workflows)
 * became the industry standard in Q1 2026. This positions DSG ONE at the
 * frontier of enterprise AI billing.
 *
 * Required env vars (add to Vercel when enabling metered billing):
 *   STRIPE_METER_EVENT_NAME  – e.g., "dsg_execution"
 *   STRIPE_SECRET_KEY        – already configured
 */

import Stripe from 'stripe';

type MeterEventResult =
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
 * Called after a successful /api/execute response.
 * Fire-and-forget safe — errors are logged but never thrown.
 *
 * @param stripeCustomerId  The org's Stripe customer ID (from billing_customers table)
 * @param orgId             DSG org ID (used as idempotency key component)
 * @param quantity          Number of executions to meter (default: 1)
 */
export async function reportMeterEvent(
  stripeCustomerId: string,
  orgId: string,
  quantity = 1
): Promise<MeterEventResult> {
  const stripe = getStripe();
  const eventName = getMeterEventName();

  if (!stripe || !eventName) {
    return { ok: false, error: 'Stripe metering not configured', skipped: true };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const idempotencyKey = `dsg-meter-${orgId}-${timestamp}`;

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

    return { ok: true, eventId: event.identifier };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[metered] Stripe meter event failed:', message);
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
 */
export async function meterExecution(orgId: string, quantity = 1): Promise<void> {
  const customerId = await getStripeCustomerIdForOrg(orgId);
  if (!customerId) return;
  void reportMeterEvent(customerId, orgId, quantity);
}

/**
 * Check if Stripe metered billing is configured.
 */
export function isMeteredBillingConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_METER_EVENT_NAME);
}
