import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  // Placeholder until Stripe keys are configured.
  return NextResponse.json({
    error: 'stripe_not_configured',
    message: 'Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable checkout.',
  }, { status: 501 });
}
