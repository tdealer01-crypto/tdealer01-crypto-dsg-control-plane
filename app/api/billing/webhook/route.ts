import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type PriceMapping = {
  planKey: string | null;
  billingInterval: string | null;
};

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
}

function getPriceMap(): Map<string, PriceMapping> {
  const map = new Map<string, PriceMapping>();

  const entries = [
    ['STRIPE_PRICE_PRO_MONTHLY', 'pro', 'monthly'],
    ['STRIPE_PRICE_PRO_YEARLY', 'pro', 'yearly'],
    ['STRIPE_PRICE_BUSINESS_MONTHLY', 'business', 'monthly'],
    ['STRIPE_PRICE_BUSINESS_YEARLY', 'business', 'yearly'],
    ['STRIPE_PRICE_ENTERPRISE_MONTHLY', 'enterprise', 'monthly'],
    ['STRIPE_PRICE_ENTERPRISE_YEARLY', 'enterprise', 'yearly'],
    ['STRIPE_PRICE_PRO', 'pro', 'monthly'],
    ['STRIPE_PRICE_BUSINESS', 'business', 'monthly'],
  ] as const;

  for (const [envName, planKey, billingInterval] of entries) {
    const value = process.env[envName];
    if (value) {
      map.set(value, { planKey, billingInterval });
    }
  }

  return map;
}

function toIso(value: number | null | undefined) {
  if (typeof value !== 'number') return null;
  return new Date(value * 1000).toISOString();
}

async function resolveOrgIdByEmail(supabase: any, email: string | null) {
  if (!email) return null;

  const { data, error } = await supabase
    .from('users')
    .select('org_id')
    .eq('email', email)
    .limit(1);

  if (error || !Array.isArray(data) || !data[0]?.org_id) {
    return null;
  }

  return String(data[0].org_id);
}

async function getBillingCustomer(supabase: any, stripeCustomerId: string | null) {
  if (!stripeCustomerId) return null;

  const { data, error } = await supabase
    .from('billing_customers')
    .select('stripe_customer_id, org_id, email, name')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function recordEvent(supabase: any, event: Stripe.Event) {
  const object = event.data.object as any;

  const stripeCustomerId =
    typeof object?.customer === 'string' ? object.customer : null;

  const stripeSubscriptionId =
    typeof object?.subscription === 'string'
      ? object.subscription
      : object?.object === 'subscription' && typeof object?.id === 'string'
        ? object.id
        : null;

  await supabase.from('billing_events').upsert(
    {
      stripe_event_id: event.id,
      event_type: event.type,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      payload: event as unknown as Record<string, unknown>,
      processed_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_event_id',
    }
  );
}

async function upsertBillingCustomer(
  supabase: any,
  payload: {
    stripe_customer_id: string | null;
    org_id: string | null;
    email: string | null;
    name: string | null;
  }
) {
  if (!payload.stripe_customer_id) return;

  await supabase.from('billing_customers').upsert(
    {
      stripe_customer_id: payload.stripe_customer_id,
      org_id: payload.org_id,
      email: payload.email,
      name: payload.name,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'stripe_customer_id',
    }
  );
}

function subscriptionToRecord(
  subscription: Stripe.Subscription,
  extras: {
    orgId: string | null;
    customerEmail: string | null;
  }
) {
  const item = subscription.items.data[0];
  const priceId = item?.price?.id || null;

  const productValue = item?.price?.product;
  const productId =
    typeof productValue === 'string'
      ? productValue
      : productValue && typeof productValue === 'object' && 'id' in productValue
        ? String(productValue.id)
        : null;

  const priceMap = getPriceMap();
  const derived = priceId ? priceMap.get(priceId) : undefined;

  return {
    stripe_subscription_id: subscription.id,
    stripe_customer_id:
      typeof subscription.customer === 'string'
        ? subscription.customer
        : subscription.customer?.id || null,
    org_id: extras.orgId,
    customer_email: extras.customerEmail,
    status: subscription.status,
    plan_key: subscription.metadata?.plan_key || derived?.planKey || null,
    billing_interval:
      subscription.metadata?.billing_interval || derived?.billingInterval || null,
    price_id: priceId,
    product_id: productId,
    cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
    current_period_start: toIso(subscription.current_period_start),
    current_period_end: toIso(subscription.current_period_end),
    trial_start: toIso(subscription.trial_start),
    trial_end: toIso(subscription.trial_end),
    metadata: subscription.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

async function upsertBillingSubscription(supabase: any, payload: Record<string, unknown>) {
  await supabase.from('billing_subscriptions').upsert(payload, {
    onConflict: 'stripe_subscription_id',
  });
}

export async function POST(request: Request) {
  try {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      return NextResponse.json(
        { error: 'Missing STRIPE_WEBHOOK_SECRET' },
        { status: 500 }
      );
    }

    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const body = await request.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    const supabase = getSupabaseAdmin();

    await recordEvent(supabase, event);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        const stripeCustomerId =
          typeof session.customer === 'string' ? session.customer : null;
        const customerEmail =
          session.customer_details?.email || session.customer_email || null;

        const explicitOrgId = session.metadata?.org_id || null;
        const orgId =
          explicitOrgId || (await resolveOrgIdByEmail(supabase, customerEmail));

        await upsertBillingCustomer(supabase, {
          stripe_customer_id: stripeCustomerId,
          org_id: orgId,
          email: customerEmail,
          name: session.customer_details?.name || null,
        });

        if (typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );

          await upsertBillingSubscription(
            supabase,
            subscriptionToRecord(subscription, {
              orgId,
              customerEmail,
            })
          );
        }

        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const stripeCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : null;

        const billingCustomer = await getBillingCustomer(
          supabase,
          stripeCustomerId
        );

        await upsertBillingSubscription(
          supabase,
          subscriptionToRecord(subscription, {
            orgId: billingCustomer?.org_id || null,
            customerEmail: billingCustomer?.email || null,
          })
        );

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    logApiError('api/billing/webhook', error, { stage: 'unhandled' });
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 400 }
    );
  }
}
