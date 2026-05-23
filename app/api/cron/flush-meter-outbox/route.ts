/**
 * Cron: Billing Meter Outbox Flusher
 *
 * Retries pending billing_meter_outbox rows that failed to deliver to Stripe.
 * Runs hourly. Processes rows older than 5 minutes (avoids racing with the
 * in-flight reportMeterEvent call that just wrote the row).
 *
 * Schedule: set in vercel.json — "0 * * * *" (every hour)
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Fail-closed: missing secret returns 503, wrong secret returns 401
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: !cronSecret ? 'Service unavailable' : 'Unauthorized' },
      { status: !cronSecret ? 503 : 401 },
    );
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ ok: true, flushed: 0, message: 'Stripe not configured' });
  }

  const stripe  = new Stripe(stripeKey);
  const supabase = getSupabaseAdmin();

  // Only retry rows that are at least 5 minutes old (let in-flight writes settle)
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: pending, error } = await supabase
    .from('billing_meter_outbox')
    .select('*')
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .limit(100);

  if (error) {
    console.error('[flush-outbox] DB query failed:', error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  if (!pending || pending.length === 0) {
    return NextResponse.json({ ok: true, flushed: 0, message: 'No pending rows' });
  }

  let flushed = 0;
  let failed  = 0;

  for (const row of pending) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const event = await stripe.billing.meterEvents.create(
        {
          event_name: row.event_name,
          payload: {
            stripe_customer_id: row.stripe_customer_id,
            value: String(row.quantity),
          },
          timestamp,
        },
        { idempotencyKey: `dsg-meter-${row.execution_id}` }
      );

      await supabase
        .from('billing_meter_outbox')
        .update({ status: 'sent', stripe_event_id: event.identifier, flushed_at: new Date().toISOString() })
        .eq('id', row.id);

      flushed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[flush-outbox] Failed for execution_id=${row.execution_id}:`, message);

      await supabase
        .from('billing_meter_outbox')
        .update({ status: 'failed', error: message })
        .eq('id', row.id);

      failed++;
    }
  }

  return NextResponse.json({ ok: true, flushed, failed, total: pending.length });
}
