// app/api/revenue/events/route.ts
// Handle metered billing usage events → Stripe + Supabase

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

type RevenueEventPayload = {
  org_id: string;
  event_name: string;
  quantity: number;
  timestamp?: string;
  idempotency_key?: string;
};

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey);
}

async function resolveStripeSubscription(
  orgId: string,
): Promise<{ subscription_id: string; meter_id: string } | null> {
  const supabase = getSupabaseAdmin();

  // Get billing customer for org
  const { data: customer, error: customerError } = await (supabase as any)
    .from('billing_customers')
    .select('stripe_subscription_id')
    .eq('org_id', orgId)
    .maybeSingle();

  if (customerError || !customer?.stripe_subscription_id) {
    return null;
  }

  // Meter ID from environment
  const meterId = process.env.STRIPE_METER_ID;
  if (!meterId) {
    throw new Error('Missing STRIPE_METER_ID');
  }

  return {
    subscription_id: customer.stripe_subscription_id,
    meter_id: meterId,
  };
}

async function recordUsageEvent(payload: RevenueEventPayload): Promise<{
  metered_event_id: string;
  recorded_at: string;
} | null> {
  const stripe = getStripeClient();
  const subscription = await resolveStripeSubscription(payload.org_id);

  if (!subscription) {
    // Org not yet subscribed; silently return (will be recorded but not billed)
    return null;
  }

  try {
    // Report to Stripe meter
    const meterEvent = await stripe.billing.meterEvents.create(
      {
        event_name: subscription.meter_id, // Meter ID
        identifier: subscription.subscription_id, // Subscription ID
        quantity: payload.quantity, // Usage quantity
        timestamp: payload.timestamp ? Math.floor(new Date(payload.timestamp).getTime() / 1000) : undefined,
      } as any,
      {
        idempotencyKey: payload.idempotency_key || `${payload.org_id}_${payload.event_name}_${Date.now()}`,
      },
    );

    return {
      metered_event_id: (meterEvent as any).id,
      recorded_at: new Date().toISOString(),
    };
  } catch (error: any) {
    // Log meter error but don't fail the request
    console.error('[metered-billing] Stripe meter submission failed', {
      org_id: payload.org_id,
      event_name: payload.event_name,
      error: error?.message,
    });

    // Still record in Supabase for audit
    return null;
  }
}

async function recordAuditEntry(
  payload: RevenueEventPayload,
  stripe_result: { metered_event_id: string; recorded_at: string } | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Store in billing_usage table
  const { error } = await (supabase as any)
    .from('billing_usage')
    .insert({
      org_id: payload.org_id,
      event_name: payload.event_name,
      quantity: payload.quantity,
      timestamp: payload.timestamp || new Date().toISOString(),
      stripe_meter_event_id: stripe_result?.metered_event_id || null,
      synced_to_stripe: !!stripe_result,
      recorded_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[metered-billing] Failed to record audit entry', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require internal service token or API key
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    // Parse payload
    const payload: RevenueEventPayload = await request.json();

    // Validate
    if (!payload.org_id || !payload.event_name || typeof payload.quantity !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: org_id, event_name, quantity' },
        { status: 400 },
      );
    }

    if (payload.quantity < 0) {
      return NextResponse.json({ error: 'Quantity must be >= 0' }, { status: 400 });
    }

    // Record to Stripe meter
    const stripeResult = await recordUsageEvent(payload);

    // Record to audit trail
    await recordAuditEntry(payload, stripeResult);

    // Response
    return NextResponse.json(
      {
        success: true,
        event_name: payload.event_name,
        org_id: payload.org_id,
        quantity: payload.quantity,
        metered_event_id: stripeResult?.metered_event_id || null,
        recorded_at: stripeResult?.recorded_at || new Date().toISOString(),
        note: stripeResult ? 'Synced to Stripe' : 'Recorded locally (subscription not found)',
      },
      { status: 200 },
    );
  } catch (error) {
    return handleApiError(error, {
      route: 'POST /api/revenue/events',
      context: 'metered-billing',
    });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Health check
    const meterId = process.env.STRIPE_METER_ID;
    const secretKey = process.env.STRIPE_SECRET_KEY;

    return NextResponse.json({
      service: 'revenue-events',
      status: meterId && secretKey ? 'ready' : 'misconfigured',
      stripe_meter_id: meterId ? '✓' : '✗',
      stripe_secret_key: secretKey ? '✓' : '✗',
    });
  } catch (error) {
    return handleApiError(error, {
      route: 'GET /api/revenue/events',
      context: 'health-check',
    });
  }
}
