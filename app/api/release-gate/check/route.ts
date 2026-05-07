import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { runReleaseGate } from '../../../../lib/release-gate/checker';
import { hasReleaseGateProAccess } from '../../../../lib/release-gate/entitlements';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  let isPro = false;
  let accessSource = 'free';

  // ✅ Step 1: Check Stripe session (if provided)
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const email = session.customer_details?.email ?? null;

      if (email && session.payment_status === 'paid') {
        // Payment confirmed in Stripe
        isPro = true;
        accessSource = 'stripe_paid';
      } else if (email) {
        // Check if user has active subscription in DB
        try {
          const hasAccess = await hasReleaseGateProAccess(email);
          if (hasAccess) {
            isPro = true;
            accessSource = 'subscription_active';
          }
        } catch (dbError) {
          console.warn('Database check failed, allowing free tier', dbError);
          // Graceful fallback: allow free tier if DB fails
          isPro = false;
          accessSource = 'free_fallback';
        }
      }
    } catch (stripeError) {
      console.error('Stripe verification failed', stripeError);
      // ✅ Graceful fallback: if Stripe fails, don't block user
      // User can still use free tier
      isPro = false;
      accessSource = 'free_fallback';
    }
  }

  // ✅ Step 2: Run release gate (available to all users)
  let result: any;
  try {
    result = await runReleaseGate(url);
  } catch (e) {
    console.error('Release gate check failed', e);
    return NextResponse.json(
      { error: 'check_failed', message: 'Release gate check failed' },
      { status: 500 }
    );
  }

  // ✅ Step 3: Return result with tier information
  return NextResponse.json({
    ...result,
    pro: isPro,
    accessSource: accessSource,
    note: isPro
      ? 'Pro access enabled - full checks available'
      : 'Free tier - basic checks only. Upgrade to Pro for advanced checks and report history.',
    limitations: isPro
      ? {}
      : {
          reports: 'cannot_save',
          history: 'not_available',
          scheduling: 'not_available',
        },
  });
}
