import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_RELEASE_GATE_PRO_PRICE_ID;

  if (!secretKey || !priceId) {
    return NextResponse.json({
      error: 'stripe_not_configured',
      message: 'Set STRIPE_SECRET_KEY and STRIPE_RELEASE_GATE_PRO_PRICE_ID to enable checkout.',
    }, { status: 501 });
  }

  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const stripe = new Stripe(secretKey);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/release-gate?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/release-gate?checkout=cancelled`,
    metadata: {
      product: 'release-gate-pro'
    }
  });

  return NextResponse.json({ url: session.url });
}
