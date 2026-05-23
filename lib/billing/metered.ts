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

export type MeterOutboxFlushResult = {
  scanned: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

type OutboxRow = {
  id: string;
  execution_id: string;
  org_id: string;
  stripe_customer_id: string;
  event_name: string;
  quantity: number;
  status: 'pending' | 'sent' | 'failed';
  stripe_event_id: string | null;
  error: string | null;
  created_at: string;
};

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getMeterEventName(): string | null {
  return process.env.STRIPE_METER_EVENT_NAME ?? null;
}

function normalizeExecutionId(executionId: string): string | null {
  const normalized = executionId.trim();
  return normalized.length > 0 ? normalized : null;
}

function positiveQuantity(quantity: number): number {
  return Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 1;
}

function idempotencyKeyForExecution(executionId: string): string {
  return `dsg-meter-${executionId}`;
}

async function getOutboxClient() {
  const { getSupabaseAdmin } = await import('../supabase-server');
  // billing_meter_outbox is introduced by a new migration in this branch.
  // Cast to any until lib/database.types.ts is regenerated from Supabase.
  return getSupabaseAdmin() as any;
}

async function createOutboxRow(input: {
  executionId: string;
  orgId: string;
  stripeCustomerId: string;
  eventName: string;
  quantity: number;
}): Promise<{ ok: true; rowId: string; alreadySentEventId?: string } | { ok: false; error: string }> {
  const supabase = await getOutboxClient();

  const { data, error } = await supabase
    .from('billing_meter_outbox')
    .insert({
      execution_id: input.executionId,
      org_id: input.orgId,
      stripe_customer_id: input.stripeCustomerId,
      event_name: input.eventName,
      quantity: input.quantity,
      status: 'pending',
    })
    .select('id,status,stripe_event_id')
    .maybeSingle();

  if (!error && data?.id) {
    return { ok: true, rowId: data.id };
  }

  const { data: existing, error: existingError } = await supabase
    .from('billing_meter_outbox')
    .select('id,status,stripe_event_id')
    .eq('execution_id', input.executionId)
    .maybeSingle();

  if (existing?.id) {
    if (existing.status === 'sent' && existing.stripe_event_id) {
      return { ok: true, rowId: existing.id, alreadySentEventId: existing.stripe_event_id };
    }
    return { ok: true, rowId: existing.id };
  }

  return {
    ok: false,
    error: existingError?.message ?? error?.message ?? 'failed to create billing meter outbox row',
  };
}

async function markOutboxSent(rowId: string, stripeEventId: string): Promise<void> {
  const supabase = await getOutboxClient();
  await supabase
    .from('billing_meter_outbox')
    .update({
      status: 'sent',
      stripe_event_id: stripeEventId,
      error: null,
      flushed_at: new Date().toISOString(),
    })
    .eq('id', rowId);
}

async function markOutboxFailed(rowId: string, error: string): Promise<void> {
  const supabase = await getOutboxClient();
  await supabase
    .from('billing_meter_outbox')
    .update({
      status: 'failed',
      error,
      flushed_at: new Date().toISOString(),
    })
    .eq('id', rowId);
}

async function deliverMeterEvent(input: {
  stripe: Stripe;
  stripeCustomerId: string;
  eventName: string;
  quantity: number;
  executionId: string;
}): Promise<MeterEventResult> {
  const timestamp = Math.floor(Date.now() / 1000);
  const idempotencyKey = idempotencyKeyForExecution(input.executionId);

  const meterEventPayload: any = {
    event_name: input.eventName,
    identifier: idempotencyKey,
    payload: {
      stripe_customer_id: input.stripeCustomerId,
      value: String(input.quantity),
    },
    timestamp,
  };

  const event = await input.stripe.billing.meterEvents.create(
    meterEventPayload,
    { idempotencyKey }
  );

  return { ok: true, eventId: event.identifier };
}

/**
 * Report a single execution event to Stripe Metering.
 *
 * Called after a successful /api/execute response.
 * Execution-level idempotency prevents same-second org activity from being
 * silently deduped by Stripe while still making retries of the same execution safe.
 *
 * A durable outbox row is written before Stripe delivery. If Stripe fails,
 * the failed row remains retryable by /api/cron/flush-meter-outbox.
 *
 * @param stripeCustomerId  The org's Stripe customer ID (from billing_customers table)
 * @param orgId             DSG org ID
 * @param quantity          Number of executions to meter
 * @param executionId       Canonical execution/audit row ID for idempotency
 */
export async function reportMeterEvent(
  stripeCustomerId: string,
  orgId: string,
  quantity: number,
  executionId: string
): Promise<MeterEventResult> {
  const stripe = getStripe();
  const eventName = getMeterEventName();
  const normalizedExecutionId = normalizeExecutionId(executionId);
  const meteredQuantity = positiveQuantity(quantity);

  if (!normalizedExecutionId) {
    return { ok: false, error: 'executionId is required for Stripe meter idempotency' };
  }

  if (!stripe || !eventName) {
    return { ok: false, error: 'Stripe metering not configured', skipped: true };
  }

  const outbox = await createOutboxRow({
    executionId: normalizedExecutionId,
    orgId,
    stripeCustomerId,
    eventName,
    quantity: meteredQuantity,
  });

  if (!outbox.ok) {
    return { ok: false, error: outbox.error };
  }

  if (outbox.alreadySentEventId) {
    return { ok: true, eventId: outbox.alreadySentEventId };
  }

  try {
    const result = await deliverMeterEvent({
      stripe,
      stripeCustomerId,
      eventName,
      quantity: meteredQuantity,
      executionId: normalizedExecutionId,
    });

    if (result.ok) {
      await markOutboxSent(outbox.rowId, result.eventId);
    }

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[metered] Stripe meter event failed:', message);
    await markOutboxFailed(outbox.rowId, message);
    return { ok: false, error: message };
  }
}

/**
 * Retry pending and failed billing meter outbox rows.
 */
export async function flushMeterOutbox(limit = 100): Promise<MeterOutboxFlushResult> {
  const stripe = getStripe();
  const result: MeterOutboxFlushResult = {
    scanned: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (!stripe) {
    return { ...result, errors: ['Stripe metering not configured'] };
  }

  const supabase = await getOutboxClient();
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();

  const { data, error } = await supabase
    .from('billing_meter_outbox')
    .select('*')
    .in('status', ['pending', 'failed'])
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return { ...result, errors: [error.message ?? 'failed to load billing meter outbox'] };
  }

  const rows = (data ?? []) as OutboxRow[];
  result.scanned = rows.length;

  for (const row of rows) {
    if (!row.execution_id || !row.stripe_customer_id || !row.event_name) {
      result.skipped++;
      continue;
    }

    try {
      const delivered = await deliverMeterEvent({
        stripe,
        stripeCustomerId: row.stripe_customer_id,
        eventName: row.event_name,
        quantity: positiveQuantity(row.quantity),
        executionId: row.execution_id,
      });

      if (delivered.ok) {
        await markOutboxSent(row.id, delivered.eventId);
        result.sent++;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await markOutboxFailed(row.id, message);
      result.failed++;
      result.errors.push(`${row.execution_id}: ${message}`);
    }
  }

  return result;
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
export async function meterExecution(orgId: string, quantity: number, executionId: string): Promise<void> {
  const customerId = await getStripeCustomerIdForOrg(orgId);
  if (!customerId) return;
  await reportMeterEvent(customerId, orgId, quantity, executionId);
}

/**
 * Check if Stripe metered billing is configured.
 */
export function isMeteredBillingConfigured(): boolean {
  return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_METER_EVENT_NAME);
}
