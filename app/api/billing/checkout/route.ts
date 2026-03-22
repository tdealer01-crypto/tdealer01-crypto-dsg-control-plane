import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

function getPriceId(plan: string) {
  if (plan === 'business') return process.env.STRIPE_PRICE_BUSINESS || '';
  return process.env.STRIPE_PRICE_PRO || '';
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const plan = String(body?.plan || 'pro').toLowerCase();
    const customerEmail = body?.email ? String(body.email) : undefined;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const priceId = getPriceId(plan);

    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price configuration for plan: ${plan}` },
        { status: 500 }
      );
    }

    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/billing?checkout=success`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
      customer_email: customerEmail,
      allow_promotion_codes: true,
      metadata: {
        plan,
        source: 'dsg-control-plane',
      },
    });

    return NextResponse.json({
      ok: true,
      url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}
