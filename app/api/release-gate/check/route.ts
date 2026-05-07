import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { runReleaseGate } from '../../../../lib/release-gate/checker';
import { hasReleaseGateProAccess } from '../../../../lib/release-gate/entitlements';
import { releaseGatePlans } from '../../../../lib/release-gate/plans';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  const sessionId = req.nextUrl.searchParams.get('session_id');

  if (!url) {
    return NextResponse.json({ error: 'missing_url' }, { status: 400 });
  }

  let isPro = false;
  let accessSource = 'free';
  let userEmail: string | null = null;

  // ✅ Step 1: Check Stripe session (if provided)
  if (sessionId && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const email = session.customer_details?.email ?? null;
      userEmail = email;

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
          // ✅ Graceful fallback: allow free tier if DB fails
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

  // ✅ Step 3: Get plans for upgrade CTA
  const proPlan = releaseGatePlans.find((p) => p.id === 'pro');
  const enterprisePlan = releaseGatePlans.find((p) => p.id === 'enterprise');

  // ✅ Step 4: Build user-friendly response
  const response: any = {
    // Core result
    verdict: result.verdict,
    checks: result.checks,
    timestamp: result.timestamp,

    // Access tier info (user-friendly)
    tier: isPro ? 'pro' : 'free',
    pro: isPro,
    accessSource: accessSource,

    // ✅ User guidance
    message: isPro
      ? 'Pro access enabled - full checks available'
      : `Free tier active - basic checks only${userEmail ? ` (${userEmail})` : ''}. Upgrade to Pro for advanced features.`,

    // ✅ Limitations (clear to user)
    ...(isPro
      ? {
          features: {
            reports: 'Available - Save unlimited reports',
            history: 'Available - View check history',
            scheduling: 'Available - Daily automated checks',
            notifications: 'Available - Email alerts',
            teamAccess: 'Available - Share with team',
          },
        }
      : {
          features: {
            reports: 'ℹ️ Not available - Upgrade to Pro',
            history: 'ℹ️ Not available - Upgrade to Pro',
            scheduling: 'ℹ️ Not available - Upgrade to Pro',
            notifications: 'ℹ️ Not available - Upgrade to Pro',
            teamAccess: 'ℹ️ Not available - Upgrade to Pro',
          },
        }),

    // ✅ Upgrade CTA (if free user)
    ...(isPro
      ? {}
      : {
          upgrade: {
            message: 'Want to save reports and automate checks?',
            proPlan: {
              name: proPlan?.name || 'Pro',
              price: proPlan?.price || '$29/month',
              description: proPlan?.description,
              features: proPlan?.features,
              ctaText: 'Upgrade to Pro',
              ctaLink: '/release-gate/checkout?plan=pro',
            },
            enterprisePlan: {
              name: enterprisePlan?.name || 'Enterprise',
              price: enterprisePlan?.price || 'Custom pricing',
              description: enterprisePlan?.description,
              features: enterprisePlan?.features,
              ctaText: 'Contact Sales',
              ctaLink: '/contact-sales?plan=enterprise',
            },
          },
        }),

    // ✅ Session info for next check (helpful for UX)
    ...(sessionId
      ? {
          sessionInfo: {
            sessionId,
            email: userEmail,
            hint: 'Use this session_id for faster future checks',
          },
        }
      : {
          sessionInfo: {
            hint: 'Include session_id in next request for faster verification',
            example: `${new URL(req.url).pathname}?url=...&session_id=<your-session-id>`,
          },
        }),

    // ✅ Debug info (only if error)
    ...(accessSource === 'free_fallback'
      ? {
          debug: {
            warning:
              'Payment service temporarily unavailable - using free tier as fallback',
            retryable: true,
          },
        }
      : {}),
  };

  return NextResponse.json(response);
}
