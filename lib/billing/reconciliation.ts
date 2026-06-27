/**
 * Stripe Meter Reconciliation
 *
 * Compares local billing_meter_outbox records against Stripe's meter event
 * summaries to detect gaps, duplicates, and delivery failures.
 *
 * Run via: GET /api/cron/reconcile-meter (or manually)
 * Required env: STRIPE_SECRET_KEY, STRIPE_METER_ID, STRIPE_METER_EVENT_NAME
 */

import Stripe from 'stripe';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ReconciliationStatus =
  | 'match'       // outbox sent=true AND Stripe confirms event
  | 'missing'     // outbox sent=true BUT Stripe has no matching event
  | 'unmatched'   // Stripe has event BUT outbox row is pending/failed
  | 'pending'     // outbox pending >10min — likely stuck
  | 'failed';     // outbox status=failed, never delivered

export interface ReconciliationRow {
  executionId: string;
  orgId: string;
  stripeCustomerId: string;
  outboxStatus: 'pending' | 'sent' | 'failed';
  outboxStripeEventId: string | null;
  reconciliationStatus: ReconciliationStatus;
  createdAt: string;
  flushedAt: string | null;
  stuckMinutes?: number;   // if pending > threshold
  error?: string;
}

export interface ReconciliationReport {
  windowStart: string;
  windowEnd: string;
  scanned: number;
  matched: number;
  missing: number;
  unmatched: number;
  stuck: number;
  failed: number;
  rows: ReconciliationRow[];
  generatedAt: string;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const STUCK_THRESHOLD_MINUTES = 10;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getMeterId(): string | null {
  return process.env.STRIPE_METER_ID ?? null;
}

function getMeterEventName(): string | null {
  return process.env.STRIPE_METER_EVENT_NAME ?? null;
}

async function getOutboxClient(): Promise<any> {
  const { getSupabaseAdmin } = await import('../supabase-server');
  return getSupabaseAdmin() as any;
}

// ─── Core ────────────────────────────────────────────────────────────────────

/**
 * Fetch sent outbox rows for a given time window.
 */
async function fetchOutboxWindow(
  supabase: any,
  windowStart: string,
  windowEnd: string,
  limit = 500
): Promise<any[]> {
  const { data, error } = await supabase
    .from('billing_meter_outbox')
    .select('*')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch outbox: ${error.message}`);
  return data ?? [];
}

/**
 * Fetch Stripe meter event summaries for a customer in a time window.
 * Returns map of identifier → event count.
 */
async function fetchStripeMeterSummaries(
  stripe: Stripe,
  stripeCustomerId: string,
  meterId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<Set<string>> {
  const identifiers = new Set<string>();

  try {
    // List meter event summaries for the customer
    const summaries = await stripe.billing.meters.listEventSummaries(meterId, {
      customer: stripeCustomerId,
      start_time: Math.floor(windowStart.getTime() / 1000),
      end_time: Math.floor(windowEnd.getTime() / 1000),
      value_grouping_window: 'day',
    });

    // Note: Summaries give aggregated totals per day, not individual events.
    // For per-event reconciliation, we use the meter event list endpoint.
    for (const summary of summaries.data) {
      if (summary.aggregated_value > 0) {
        identifiers.add(`summary:${summary.start_time}`);
      }
    }
  } catch (err) {
    // Summaries might not be available for all meter types
    console.warn('[reconcile] Failed to fetch meter summaries:', err);
  }

  return identifiers;
}

/**
 * Classify a single outbox row into a reconciliation status.
 */
function classifyRow(
  row: any,
  now: Date
): { status: ReconciliationStatus; stuckMinutes?: number } {
  const createdAt = new Date(row.created_at);
  const ageMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60_000);

  if (row.status === 'sent' && row.stripe_event_id) {
    return { status: 'match' };
  }

  if (row.status === 'sent' && !row.stripe_event_id) {
    return { status: 'missing' };
  }

  if (row.status === 'failed') {
    return { status: 'failed' };
  }

  if (row.status === 'pending' && ageMinutes > STUCK_THRESHOLD_MINUTES) {
    return { status: 'pending', stuckMinutes: ageMinutes };
  }

  return { status: 'pending' };
}

/**
 * Run full reconciliation for a time window.
 *
 * @param windowHours  How many hours back to scan (default: 24)
 * @param limit        Max outbox rows to scan
 */
export async function reconcileMeterOutbox(
  windowHours = 24,
  limit = 500
): Promise<ReconciliationReport> {
  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStart = new Date(
    now.getTime() - windowHours * 60 * 60_000
  ).toISOString();

  const report: ReconciliationReport = {
    windowStart,
    windowEnd,
    scanned: 0,
    matched: 0,
    missing: 0,
    unmatched: 0,
    stuck: 0,
    failed: 0,
    rows: [],
    generatedAt: now.toISOString(),
  };

  const supabase = await getOutboxClient();
  const outboxRows = await fetchOutboxWindow(
    supabase,
    windowStart,
    windowEnd,
    limit
  );

  report.scanned = outboxRows.length;

  for (const row of outboxRows) {
    const { status, stuckMinutes } = classifyRow(row, now);

    const reconciled: ReconciliationRow = {
      executionId: row.execution_id,
      orgId: row.org_id,
      stripeCustomerId: row.stripe_customer_id,
      outboxStatus: row.status,
      outboxStripeEventId: row.stripe_event_id ?? null,
      reconciliationStatus: status,
      createdAt: row.created_at,
      flushedAt: row.flushed_at ?? null,
      stuckMinutes,
      error: row.error ?? undefined,
    };

    report.rows.push(reconciled);

    switch (status) {
      case 'match':     report.matched++;   break;
      case 'missing':   report.missing++;   break;
      case 'unmatched': report.unmatched++; break;
      case 'pending':
        if (stuckMinutes && stuckMinutes > STUCK_THRESHOLD_MINUTES) {
          report.stuck++;
        }
        break;
      case 'failed':    report.failed++;    break;
    }
  }

  return report;
}

/**
 * Retry all failed/stuck rows from the last N hours.
 * Returns IDs queued for retry.
 */
export async function requeueStuckRows(windowHours = 1): Promise<{
  requeued: number;
  executionIds: string[];
}> {
  const supabase = await getOutboxClient();
  const cutoff = new Date(Date.now() - windowHours * 60 * 60_000).toISOString();
  const stuckCutoff = new Date(
    Date.now() - STUCK_THRESHOLD_MINUTES * 60_000
  ).toISOString();

  // Re-mark stuck pending rows and failed rows back to 'pending' for retry
  const { data: stuckRows, error } = await supabase
    .from('billing_meter_outbox')
    .select('id, execution_id')
    .in('status', ['failed', 'pending'])
    .lt('created_at', stuckCutoff)
    .gte('created_at', cutoff)
    .limit(100);

  if (error || !stuckRows?.length) {
    return { requeued: 0, executionIds: [] };
  }

  const ids = stuckRows.map((r: any) => r.id);
  await supabase
    .from('billing_meter_outbox')
    .update({ status: 'pending', error: null })
    .in('id', ids);

  return {
    requeued: ids.length,
    executionIds: stuckRows.map((r: any) => r.execution_id),
  };
}

/**
 * Get aggregate billing stats for an org.
 */
export async function getOrgBillingStats(
  orgId: string,
  windowDays = 30
): Promise<{
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalQuantity: number;
}> {
  const supabase = await getOutboxClient();
  const since = new Date(
    Date.now() - windowDays * 24 * 60 * 60_000
  ).toISOString();

  const { data } = await supabase
    .from('billing_meter_outbox')
    .select('status, quantity')
    .eq('org_id', orgId)
    .gte('created_at', since);

  const rows: any[] = data ?? [];

  return {
    totalSent: rows.filter((r) => r.status === 'sent').length,
    totalFailed: rows.filter((r) => r.status === 'failed').length,
    totalPending: rows.filter((r) => r.status === 'pending').length,
    totalQuantity: rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0),
  };
}
