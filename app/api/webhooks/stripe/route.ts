import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { POST as handleBillingWebhook } from '@/app/api/billing/webhook/route';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { insertRevenueEvent } from '@/lib/revenue/events';
import { isMissingEnvConfigError, logApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

type RevenueWebhookEventType =
  | 'stripe_checkout'
  | 'mcp_subscription'
  | 'subscription_canceled'
  | 'invoice_payment_succeeded'
  | 'stripe_webhook';

type EventContext = {
  orgId: string | null;
  userId: string | null;
  planId: string | null;
  amount: number | null;
  eventType: RevenueWebhookEventType;
  source: string;
};

function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
}

function getWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET');
  }

  return webhookSecret;
}

function centsToUsd(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Number((value / 100).toFixed(2));
}

function extractMetadataValue(input: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
}

async function resolveOrgIdFromCustomerId(customerId: string | null): Promise<string | null> {
  if (!customerId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const result = await (supabase as any)
    .from('billing_customers')
    .select('org_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (result.error || !result.data?.org_id) {
    return null;
  }

  return String(result.data.org_id);
}

async function buildEventContext(event: Stripe.Event): Promise<EventContext> {
  const object = event.data.object as unknown as Record<string, unknown>;
  const metadata = (object.metadata && typeof object.metadata === 'object'
    ? object.metadata
    : {}) as Record<string, unknown>;
  const objectType = String(object.object || '');

  const customerId =
    typeof object.customer === 'string'
      ? object.customer
      : typeof object.customer === 'object' && object.customer && 'id' in object.customer
        ? String((object.customer as { id?: unknown }).id || '')
        : null;

  const orgIdFromMetadata = extractMetadataValue(metadata, 'org_id', 'orgId');
  const orgId = orgIdFromMetadata || await resolveOrgIdFromCustomerId(customerId);
  const userId = extractMetadataValue(metadata, 'user_id', 'userId');

  switch (event.type) {
    case 'checkout.session.completed':
      return {
        orgId,
        userId,
        planId: extractMetadataValue(metadata, 'plan_id', 'planId', 'plan_key'),
        amount: centsToUsd(object.amount_total),
        eventType: 'stripe_checkout',
        source: 'stripe.checkout.session.completed',
      };
    case 'customer.subscription.created':
      return {
        orgId,
        userId,
        planId:
          extractMetadataValue(metadata, 'plan_id', 'planId', 'plan_key') ||
          (objectType === 'subscription'
            ? extractMetadataValue(object as Record<string, unknown>, 'id')
            : null),
        amount: null,
        eventType: 'mcp_subscription',
        source: 'stripe.customer.subscription.created',
      };
    case 'customer.subscription.deleted':
      return {
        orgId,
        userId,
        planId: extractMetadataValue(metadata, 'plan_id', 'planId', 'plan_key'),
        amount: null,
        eventType: 'subscription_canceled',
        source: 'stripe.customer.subscription.deleted',
      };
    case 'invoice.payment_succeeded':
      return {
        orgId,
        userId,
        planId: extractMetadataValue(metadata, 'plan_id', 'planId', 'plan_key'),
        amount: centsToUsd(object.amount_paid),
        eventType: 'invoice_payment_succeeded',
        source: 'stripe.invoice.payment_succeeded',
      };
    default:
      return {
        orgId,
        userId,
        planId: extractMetadataValue(metadata, 'plan_id', 'planId', 'plan_key'),
        amount: centsToUsd(object.amount_total ?? object.amount_paid ?? object.amount),
        eventType: 'stripe_webhook',
        source: `stripe.${event.type}`,
      };
  }
}

async function persistWebhookEvent(event: Stripe.Event) {
  const context = await buildEventContext(event);
  if (!context.orgId) {
    return null;
  }

  return insertRevenueEvent({
    orgId: context.orgId,
    userId: context.userId,
    planId: context.planId,
    amount: context.amount,
    currency: 'USD',
    source: context.source,
    eventType: context.eventType,
    metadata: {
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      payload: event,
    },
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let body = '';

  try {
    const stripe = getStripeClient();
    const webhookSecret = getWebhookSecret();

    body = await request.text();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return new NextResponse('Invalid signature', { status: 400 });
    }

    await persistWebhookEvent(event);

    const delegatedResponse = await handleBillingWebhook(
      new Request(request.url, {
        method: 'POST',
        headers: {
          'content-type': request.headers.get('content-type') || 'text/plain',
          'stripe-signature': signature,
        },
        body,
      })
    );

    if (!delegatedResponse.ok) {
      return delegatedResponse;
    }

    return NextResponse.json({ ok: true, received: true, type: event.type });
  } catch (err) {
    logApiError('api/webhooks/stripe POST', err, { bodyLength: body.length });
    const isConfigError = isMissingEnvConfigError(err, ['STRIPE_WEBHOOK_SECRET', 'STRIPE_SECRET_KEY']);
    const status = isConfigError ? 503 : 500;
    const safeMessage = isConfigError
      ? 'Webhook processing unavailable'
      : 'Webhook processing failed';

    return NextResponse.json({ error: safeMessage }, { status });
  }
}
