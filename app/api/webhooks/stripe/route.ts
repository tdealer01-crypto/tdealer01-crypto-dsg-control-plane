import { NextResponse } from 'next/server';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { logApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

// Stripe webhook signature verification
const getSigningSecret = (): string | null => {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
};

interface StripeClient {
  webhooks: {
    constructEvent(payload: string, signature: string, secret: string): unknown;
  };
}

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
    // Dynamic import ensures vitest mocks and next/dynamic bundling both work.
    const stripeModule = await import('stripe');
    const StripeClass = (stripeModule.default ?? stripeModule) as unknown as {
      new (secret: string): StripeClient;
    };
    const stripe = new StripeClass(signingSecret);

    try {
      event = stripe.webhooks.constructEvent(body, signature, signingSecret);
    } catch (sigErr: any) {
      const message = typeof sigErr?.message === 'string' ? sigErr.message : 'Invalid signature';
      const isInvalidSignature = message.toLowerCase().includes('invalid') || message.toLowerCase().includes('signature');
      return NextResponse.json(
        { error: isInvalidSignature ? 'Invalid signature' : 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    const admin = getSupabaseAdmin();

    // Handle different event types
    let handlerError: string | null = null;
    try {
      switch ((event as any).type) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted((event as any).data.object, admin);
          break;

        case 'charge.refunded':
          await handleChargeRefunded((event as any).data.object, admin);
          break;

        case 'charge.dispute.created':
          await handleChargeDisputeCreated((event as any).data.object, admin);
          break;

        case 'account.application.deauthorized':
          await handleAppDeauthorized((event as any).data.object);
          break;
      }
    } catch (handlerErr: any) {
      handlerError = handlerErr?.message ?? 'Webhook handler failed';
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
    await admin
      .from('marketplace_checkout_sessions')
      .update({
        status: 'completed',
        stripe_payment_intent_id: session.payment_intent,
        completed_at: new Date().toISOString(),
      })
      .eq('stripe_session_id', session.id)
      .then(() => {
        // eslint-disable-next-line no-void
      })
      .catch(() => {});

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
        .catch(() => {});
    }
  } catch (err) {
    console.error('Error handling checkout completion:', err);
  }
}

async function handleChargeRefunded(charge: any, admin: any) {
  try {
    await admin
      .from('marketplace_payment_audit')
      .insert({
        stripe_session_id: charge.payment_intent,
        event_type: 'payment_refunded',
        amount_cents: charge.amount_refunded,
        metadata: { reason: charge.refund_reason, charge_id: charge.id },
      })
      .catch(() => {});
  } catch (err) {
    console.error('Error handling charge refund:', err);
  }
}

async function handleChargeDisputeCreated(dispute: any, admin: any) {
  try {
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
      .catch(() => {});
  } catch (err) {
    console.error('Error handling dispute:', err);
  }
}

async function handleAppDeauthorized(data: any) {
  try {
    const accountId = data?.account;
    if (!accountId) {
      console.error('Deauthorization event missing account ID');
      return;
    }

    const supabase = getSupabaseAdmin() as any;

    await supabase
      .from('stripe_app_accounts')
      .update({
        status: 'revoked',
        disconnected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        webhook_deauthorized: true,
      })
      .eq('stripe_account_id', accountId)
      .then(({ error }: any) => {
        if (error) {
          console.error('Error handling deauthorization:', error);
        } else {
          console.log(`Deauthorized account: ${accountId}`);
        }
      })
      .catch((error: any) => {
        console.error('Error in deauthorization handler:', error);
      });
  } catch (error) {
    console.error('Error in deauthorization handler:', error);
  }
}
