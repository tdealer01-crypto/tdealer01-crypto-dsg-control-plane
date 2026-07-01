import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '../../../../lib/supabase/server';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../../lib/security/rate-limit';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  return new Stripe(secretKey);
}

export async function POST(request: Request) {
  try {
    const rateLimit = await applyRateLimit({
      key: getRateLimitKey(request, 'billing-portal'),
      limit: 20,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.org_id) {
      return NextResponse.json(
        { error: 'Billing profile not found' },
        { status: 404, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const { data: customer, error: customerError } = await supabase
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('org_id', profile.org_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (customerError || !customer?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found for this workspace' },
        { status: 409, headers: buildRateLimitHeaders(rateLimit, 20) }
      );
    }

    const stripe = getStripeClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json(
      { ok: true, url: session.url },
      { headers: buildRateLimitHeaders(rateLimit, 20) }
    );
  } catch (error) {
    return handleApiError('api/billing/portal', error);
  }
}
