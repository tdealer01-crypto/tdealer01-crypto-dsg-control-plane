import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

// Stripe webhook signature verification
const getSigningSecret = (): string | null => {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
};

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    const signingSecret = getSigningSecret();
    if (!signingSecret) {
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 503 }
      );
    }

    let event;

    // Use Stripe SDK to verify signature and construct event
    const StripeLib = require('stripe');
    const stripe = new StripeLib(signingSecret);
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, signingSecret);
    } catch (sigErr: any) {
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${sigErr?.message ?? ''}` },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, admin);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object, admin);
        break;

      case 'charge.dispute.created':
        await handleDisputeCreated(event.data.object, admin);
        break;
    }

    return NextResponse.json({ ok: true, received: true });
  } catch (err) {
    logApiError('api/webhooks/stripe POST', err, {});
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleCheckoutCompleted(session: any, admin: any) {
  try {
    // Update checkout session status
    await admin
      .from('marketplace_checkout_sessions')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)
      .catch(() => {
        // Table might not exist yet, ignore
      });

    const { data: checkoutSession } = await admin
      .from('marketplace_checkout_sessions')
      .select('*')
      .eq('stripe_session_id', session.id)
      .maybeSingle()
      .catch(() => ({ data: null }));

    if (checkoutSession) {
      await admin
        .from('marketplace_payment_audit')
        .insert({
          product_id: checkoutSession.product_id,
          org_id: checkoutSession.org_id,
          user_id: checkoutSession.user_id,
          stripe_session_id: session.id,
          event_type: 'payment_completed',
          amount_cents: checkoutSession.amount_cents,
          metadata: { customer_email: session.customer_email },
        })
        .catch(() => {
          // Audit table might not exist yet
        });
    }
  } catch (err) {
    console.error('Error handling checkout completion:', err);
  }
}

async function handleChargeRefunded(charge: any, admin: any) {
  try {
    // Log refund to audit trail
    await admin
      .from('marketplace_payment_audit')
      .insert({
        stripe_session_id: charge.payment_intent,
        event_type: 'payment_refunded',
        amount_cents: charge.amount_refunded,
        metadata: { reason: charge.refund_reason, charge_id: charge.id },
      })
      .catch(() => {
        // Audit table might not exist
      });
  } catch (err) {
    console.error('Error handling charge refund:', err);
  }
}

async function handleDisputeCreated(dispute: any, admin: any) {
  try {
    // Log dispute to audit trail
    await admin
      .from('marketplace_payment_audit')
      .insert({
        event_type: 'payment_dispute',
        amount_cents: dispute.amount,
        metadata: {
          dispute_id: dispute.id,
          reason_code: dispute.reason,
          status: dispute.status,
        },
      })
      .catch(() => {
        // Audit table might not exist
      });
  } catch (err) {
    console.error('Error handling dispute:', err);
  }
}
