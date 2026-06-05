import Stripe from 'stripe';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const config = getDsgSupabaseRpcConfig();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.mode === 'subscription') {
      const keyId = session.metadata?.keyId;
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : null;

      if (keyId && subscriptionId) {
        const customerId =
          typeof session.customer === 'string' ? session.customer : '';
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        await callDsgRpc(config, 'activate_mcp_subscription', {
          p_key_id: keyId,
          p_stripe_subscription_id: subscriptionId,
          p_stripe_customer_id: customerId,
          p_period_start: now.toISOString(),
          p_period_end: nextMonth.toISOString(),
        });
      }
    } else {
      await callDsgRpc(config, 'clear_template_sale', {
        p_stripe_checkout_session_id: session.id,
        p_stripe_payment_intent_id: String(session.payment_intent ?? ''),
      });
    }
  }

  if (event.type === 'invoice.paid') {
    const invoice = event.data.object as Stripe.Invoice;
    const subRaw = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = subRaw
      ? (typeof subRaw === 'string' ? subRaw : subRaw.id)
      : null;

    if (subscriptionId && invoice.period_start && invoice.period_end) {
      await callDsgRpc(config, 'renew_mcp_subscription_period', {
        p_stripe_subscription_id: subscriptionId,
        p_period_start: new Date(invoice.period_start * 1000).toISOString(),
        p_period_end: new Date(invoice.period_end * 1000).toISOString(),
      });
    }
  }

  return new Response('ok', { status: 200 });
}
