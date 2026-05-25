import Stripe from 'stripe';
import { getDsgSupabaseRpcConfig, callDsgRpc } from '@/lib/dsg/server/supabase-rpc';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const config = getDsgSupabaseRpcConfig();
    await callDsgRpc(config, 'clear_template_sale', {
      p_stripe_checkout_session_id: session.id,
      p_stripe_payment_intent_id: String(session.payment_intent ?? ''),
    });
  }

  return new Response('ok', { status: 200 });
}
