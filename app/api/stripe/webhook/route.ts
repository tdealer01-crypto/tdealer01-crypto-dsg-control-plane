import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { recordSubscriptionEvent } from '@/lib/release-gate/entitlements';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // ✅ Validate configuration
  if (!secret || !webhookSecret) {
    console.error('Stripe configuration missing');
    return NextResponse.json(
      { error: 'stripe_not_configured' },
      { status: 501 }
    );
  }

  const stripe = new Stripe(secret);
  const sig = req.headers.get('stripe-signature');
  const body = await req.text();

  let event: Stripe.Event;

  // ✅ Validate webhook signature
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  // ✅ Handle subscription events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout completed for session:', session.id);

        // Note: subscription details will come via customer.subscription.updated
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.metadata?.email || sub.customer; // Get email from metadata or customer

        if (typeof email === 'string' && email.includes('@')) {
          const success = await recordSubscriptionEvent(
            email,
            typeof sub.customer === 'string' ? sub.customer : '',
            sub.id,
            (sub.status as any) || 'active',
            new Date(sub.current_period_end * 1000)
          );

          if (success) {
            console.log(
              `✅ Subscription ${event.type} recorded for`,
              email,
              'status:',
              sub.status
            );
          } else {
            console.warn(
              `⚠️ Failed to record subscription ${event.type} for`,
              email
            );
          }
        } else {
          console.warn('⚠️ No valid email found in subscription metadata');
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const email = sub.metadata?.email || sub.customer;

        if (typeof email === 'string' && email.includes('@')) {
          const success = await recordSubscriptionEvent(
            email,
            typeof sub.customer === 'string' ? sub.customer : '',
            sub.id,
            'canceled',
            new Date()
          );

          if (success) {
            console.log('✅ Subscription canceled for', email);
          } else {
            console.warn('⚠️ Failed to record subscription cancellation');
          }
        }
        break;
      }

      default:
        console.log('ℹ️ Unhandled webhook event type:', event.type);
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    // ✅ Still return 200 to avoid Stripe retries
    // but log the error for investigation
  }

  return NextResponse.json({ received: true });
}
