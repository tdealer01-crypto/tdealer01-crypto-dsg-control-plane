/**
 * @deprecated — NOT the canonical Stripe webhook.
 *
 * The canonical, full billing webhook is `app/api/billing/webhook/route.ts`
 * (signature-verified, idempotent via billing_events, fulfills/revokes
 * organizations.plan, handles invoices + referrals). This route is a narrow
 * legacy "release gate" sync that only writes `release_gate_entitlements`.
 * `plan` is derived from subscription metadata / price id (see
 * resolvePlanKey below), not hardcoded.
 *
 * Keep the Stripe Dashboard webhook endpoint pointed at /api/billing/webhook.
 * This route is kept (not deleted) so any still-configured endpoint keeps
 * returning 2xx instead of erroring; do not add new logic here.
 * Decision recorded in docs/revenue/TRACK_A_ACTIVATION_STATUS.md (2026-07-03).
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_API_VERSION } from '@/lib/stripe-api-version';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

/**
 * Minimal, local price-id -> plan-key map. Deliberately duplicated (not
 * imported) from app/api/billing/webhook/route.ts / lib/billing/pricing-catalog.ts
 * — this route is frozen/deprecated (see file header) and must not gain a
 * dependency on the canonical handler's internals.
 */
function getLocalPriceMap(): Map<string, string> {
  const map = new Map<string, string>();
  const entries: Array<[string, string]> = [
    ['STRIPE_PRICE_PRO_MONTHLY', 'pro'],
    ['STRIPE_PRICE_PRO_YEARLY', 'pro'],
    ['STRIPE_PRICE_BUSINESS_MONTHLY', 'business'],
    ['STRIPE_PRICE_BUSINESS_YEARLY', 'business'],
    ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'enterprise'],
    ['STRIPE_PRICE_ENTERPRISE_YEARLY', 'enterprise'],
    ['STRIPE_PRICE_PRO', 'pro'],
    ['STRIPE_PRICE_BUSINESS', 'business'],
    ['STRIPE_PRICE_ENTERPRISE', 'enterprise'],
  ];

  for (const [envName, planKey] of entries) {
    const value = process.env[envName];
    if (value) {
      map.set(value, planKey);
    }
  }

  return map;
}

/**
 * Resolve the real plan for a subscription instead of hardcoding 'pro'.
 * Priority: subscription.metadata.plan_key -> price id -> STRIPE_PRICE_*
 * env mapping -> 'unknown'. Never silently defaults to 'pro'.
 */
function resolvePlanKey(subscription: Stripe.Subscription): string {
  const metadataPlanKey = (subscription.metadata as Record<string, string> | undefined)?.plan_key;
  if (metadataPlanKey) {
    return metadataPlanKey;
  }

  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (priceId) {
    const derived = getLocalPriceMap().get(priceId);
    if (derived) {
      return derived;
    }
  }

  return 'unknown';
}

async function upsertSubscriptionEntitlement(stripe: Stripe, subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin() as any;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  let email: string | null = null;

  if (customerId) {
    const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer | Stripe.DeletedCustomer;
    if ('deleted' in customer && customer.deleted) {
      email = null;
    } else {
      email = (customer as Stripe.Customer).email ?? null;
    }
  }

  const { error } = await supabase
    .from('release_gate_entitlements')
    .upsert({
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: resolvePlanKey(subscription),
      status: subscription.status,
      current_period_end: (subscription as any).current_period_end
        ? new Date((subscription as any).current_period_end * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'stripe_subscription_id' });

  if (error) {
    throw new Error(`failed_to_upsert_release_gate_entitlement:${error.message}`);
  }
}

async function markSubscriptionCanceled(subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase
    .from('release_gate_entitlements')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    throw new Error(`failed_to_cancel_release_gate_entitlement:${error.message}`);
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 501 });
  }

  const stripe = new Stripe(secret, { apiVersion: STRIPE_API_VERSION });
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscriptionEntitlement(stripe, subscription);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionEntitlement(stripe, subscription);
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await markSubscriptionCanceled(subscription);
    }
  } catch (err) {
    console.error('release gate entitlement sync failed', err);
    return NextResponse.json({ error: 'entitlement_sync_failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
