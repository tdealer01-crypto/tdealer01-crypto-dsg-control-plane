import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { StructuredLogger, createLogger, generateRequestId } from '../../../../lib/security/structured-logger';
import { handleDatabaseError } from '../../../../lib/database/error-handler';
import { parseStripeError } from '../../../../lib/billing/stripe-error-handler';

export const dynamic = 'force-dynamic';

async function upsertSubscriptionEntitlement(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  logger: StructuredLogger
) {
  const supabase = getSupabaseAdmin() as any;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  let email: string | null = null;

  if (customerId) {
    try {
      const customer = (await stripe.customers.retrieve(customerId)) as Stripe.Customer | Stripe.DeletedCustomer;
      if ('deleted' in customer && customer.deleted) {
        email = null;
      } else {
        email = (customer as Stripe.Customer).email ?? null;
      }
    } catch (error) {
      const stripeError = parseStripeError(error);
      logger.warn('Failed to retrieve Stripe customer', {
        customerId,
        errorType: stripeError.type,
      });
      // Continue with null email if customer retrieval fails
      email = null;
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
    logger.error(
      'Failed to upsert release gate entitlement',
      new Error(`Database upsert failed: ${error.message}`),
      {
        subscriptionId: subscription.id,
        customerId,
      }
    );
    throw new Error(`failed_to_upsert_release_gate_entitlement:${error.message}`);
  }

  logger.info('Successfully upserted subscription entitlement', {
    subscriptionId: subscription.id,
    customerId,
    status: subscription.status,
  });
}

async function markSubscriptionCanceled(
  subscription: Stripe.Subscription,
  logger: StructuredLogger
) {
  const supabase = getSupabaseAdmin() as any;
  const { error } = await supabase
    .from('release_gate_entitlements')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    logger.error(
      'Failed to mark subscription as canceled',
      new Error(`Database update failed: ${error.message}`),
      {
        subscriptionId: subscription.id,
      }
    );
    throw new Error(`failed_to_cancel_release_gate_entitlement:${error.message}`);
  }

  logger.info('Successfully marked subscription as canceled', {
    subscriptionId: subscription.id,
  });
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const logger = createLogger({
    requestId,
    endpoint: '/api/stripe/webhook',
    method: 'POST',
  });

  try {
    const secret = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret || !webhookSecret) {
      logger.error(
        'Stripe webhook misconfiguration',
        new Error('Missing environment variables'),
        {
          hasSecret: !!secret,
          hasWebhookSecret: !!webhookSecret,
        }
      );
      return NextResponse.json(
        { error: 'stripe_not_configured' },
        { status: 501, headers: { 'X-Request-ID': requestId } }
      );
    }

    const stripe = new Stripe(secret);
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!sig) {
      logger.logSecurityEvent(
        'Stripe webhook missing signature',
        'warn',
        { requestId }
      );
      return NextResponse.json(
        { error: 'invalid_signature' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (err) {
      const stripeError = parseStripeError(err);
      logger.logSecurityEvent(
        'Stripe webhook signature verification failed',
        'warn',
        {
          errorType: stripeError.type,
          message: stripeError.message,
        }
      );
      return NextResponse.json(
        { error: 'invalid_signature' },
        { status: 400, headers: { 'X-Request-ID': requestId } }
      );
    }

    logger.logStripeWebhook(event.id, event.type, true);

    // Handle different webhook event types
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === 'string') {
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await upsertSubscriptionEntitlement(stripe, subscription, logger);
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionEntitlement(stripe, subscription, logger);
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await markSubscriptionCanceled(subscription, logger);
    } else {
      logger.debug('Stripe webhook event ignored', {
        eventType: event.type,
        eventId: event.id,
      });
    }

    return NextResponse.json(
      { received: true },
      { status: 200, headers: { 'X-Request-ID': requestId } }
    );
  } catch (err) {
    logger.error(
      'Stripe webhook processing failed',
      err,
      {
        requestId,
      }
    );

    return NextResponse.json(
      { error: 'entitlement_sync_failed' },
      { status: 500, headers: { 'X-Request-ID': requestId } }
    );
  }
}
