import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { runReleaseGate } from '../../../../lib/release-gate/checker';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  // Free mode: allow basic checks
  let isPro = false;

  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status === 'paid') {
        isPro = true;
      }
    } catch (e) {
      console.error('stripe verify failed', e);
    }
  }

  const result = await runReleaseGate(url);

  return NextResponse.json({
    ...result,
    pro: isPro,
    note: isPro ? 'Pro access enabled' : 'Free mode (upgrade for full access)'
  });
}
