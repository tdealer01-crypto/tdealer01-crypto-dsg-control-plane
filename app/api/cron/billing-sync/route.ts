// app/api/cron/billing-sync/route.ts
// Batch sync pending usage events to Stripe metered billing (every 5 minutes)

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

type SyncResult = {
  total_processed: number;
  synced: number;
  failed: number;
  errors: Array<{ org_id: string; error: string }>;
  duration_ms: number;
};

async function syncPendingUsage(): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = getSupabaseAdmin();
  const stripe = getStripeClient();
  const meterId = process.env.STRIPE_METER_ID;

  if (!meterId) {
    throw new Error('Missing STRIPE_METER_ID');
  }

  const result: SyncResult = {
    total_processed: 0,
    synced: 0,
    failed: 0,
    errors: [],
    duration_ms: 0,
  };

  try {
    // Get pending usage events (not yet synced, older than 1 minute)
    const cutoffTime = new Date(Date.now() - 60000).toISOString();
    const { data: pendingEvents, error: fetchError } = await (supabase as any)
      .from('billing_usage')
      .select('id, org_id, event_name, quantity, timestamp, stripe_meter_event_id')
      .eq('synced_to_stripe', false)
      .lt('timestamp', cutoffTime)
      .order('timestamp', { ascending: true })
      .limit(1000);

    if (fetchError) {
      console.error('[billing-sync] Failed to fetch pending events', fetchError);
      result.errors.push({ org_id: 'system', error: fetchError.message });
      return result;
    }

    if (!pendingEvents || pendingEvents.length === 0) {
      return result; // Nothing to sync
    }

    // Group by org_id, event_name, timestamp (bucket by minute)
    const grouped = new Map<
      string,
      {
        org_id: string;
        event_name: string;
        quantity: number;
        ids: number[];
      }
    >();

    for (const event of pendingEvents) {
      const key = `${event.org_id}_${event.event_name}`;
      const existing = grouped.get(key) || {
        org_id: event.org_id,
        event_name: event.event_name,
        quantity: 0,
        ids: [],
      };
      existing.quantity += event.quantity;
      existing.ids.push(event.id);
      grouped.set(key, existing);
    }

    // Sync each group
    for (const [, group] of grouped) {
      result.total_processed++;

      try {
        // Resolve subscription for org
        const { data: customer, error: customerError } = await (supabase as any)
          .from('billing_customers')
          .select('stripe_subscription_id')
          .eq('org_id', group.org_id)
          .maybeSingle();

        if (customerError || !customer?.stripe_subscription_id) {
          console.warn(`[billing-sync] No subscription found for org ${group.org_id}`);
          // Mark as synced anyway (subscription doesn't exist)
          await markSynced(supabase, group.ids);
          result.synced++;
          continue;
        }

        // Submit to Stripe meter
        const meterEvent = await stripe.billing.meterEvents.create({
          event_name: meterId,
          identifier: customer.stripe_subscription_id,
          value: String(group.quantity),
        });

        // Update audit records
        const { error: updateError } = await (supabase as any)
          .from('billing_usage')
          .update({
            synced_to_stripe: true,
            stripe_meter_event_id: meterEvent.id,
          })
          .in('id', group.ids);

        if (updateError) {
          throw updateError;
        }

        result.synced++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          org_id: group.org_id,
          error: error?.message || 'Unknown error',
        });
        console.error('[billing-sync] Sync failed for org', {
          org_id: group.org_id,
          event_name: group.event_name,
          error: error?.message,
        });
      }
    }
  } catch (error: any) {
    console.error('[billing-sync] Fatal error', error);
    result.errors.push({ org_id: 'system', error: error?.message });
  } finally {
    result.duration_ms = Date.now() - startTime;
  }

  return result;
}

async function markSynced(supabase: any, ids: number[]): Promise<void> {
  const { error } = await supabase.from('billing_usage').update({ synced_to_stripe: true }).in('id', ids);

  if (error) {
    console.error('[billing-sync] Failed to mark records synced', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const cronSecret = request.headers.get('x-vercel-cron-secret') || request.headers.get('cron-secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error('[billing-sync] CRON_SECRET not configured');
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
    }

    if (!cronSecret || cronSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run sync
    const syncResult = await syncPendingUsage();

    // Log summary
    console.log('[billing-sync] Sync complete', {
      total_processed: syncResult.total_processed,
      synced: syncResult.synced,
      failed: syncResult.failed,
      duration_ms: syncResult.duration_ms,
      error_count: syncResult.errors.length,
    });

    return NextResponse.json(
      {
        success: syncResult.failed === 0,
        summary: {
          total_processed: syncResult.total_processed,
          synced: syncResult.synced,
          failed: syncResult.failed,
          duration_ms: syncResult.duration_ms,
        },
        errors: syncResult.errors.length > 0 ? syncResult.errors : null,
      },
      { status: syncResult.failed === 0 ? 200 : 207 },
    );
  } catch (error) {
    return handleApiError(error, {
      route: 'POST /api/cron/billing-sync',
      context: 'metered-billing-sync',
    });
  }
}
