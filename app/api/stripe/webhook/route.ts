import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

async function upsertSubscriptionEntitlement(stripe: Stripe, subscription: Stripe.Subscription) {
  const supabase = getSupabaseAdmin() as any;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  let email: string | null = null;

  if (customerId) {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) {
      email = customer.email ?? null;
    }
  }

  const { error } = await supabase
    .from('release_gate_entitlements')
    .upsert({
      email,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan: 'pro',
      status: subscription.status,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
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

  const stripe = new Stripe(secret);
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
