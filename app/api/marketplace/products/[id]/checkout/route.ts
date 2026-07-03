import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logApiError, internalErrorMessage } from '@/lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';

interface Params {
  id: string;
}

// POST /api/marketplace/products/[id]/checkout — create Stripe checkout session
export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { id } = await params;

  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, `product-checkout-${id}`),
    limit: 10,
    windowMs: 3600000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 10);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers }
    );
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('id, org_id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!userProfile?.org_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers });
    }

    // Get product
    const { data: product, error: productError } = await (supabase as any)
      .from('marketplace_products')
      .select('*')
      .eq('id', id)
      .eq('status', 'approved')
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or not approved' },
        { status: 404, headers }
      );
    }

    // Verify Stripe is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Payment processing not configured' },
        { status: 503, headers }
      );
    }

    // Dynamically import Stripe to avoid bundling issues
    const Stripe = require('stripe').default;
    const stripe = new Stripe(stripeSecretKey);

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: product.name,
              description: product.description,
              images: product.image_url ? [product.image_url] : undefined,
            },
            unit_amount: Math.round(product.price * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/marketplace/submit`,
      customer_email: userProfile.email,
      metadata: {
        product_id: product.id,
        org_id: userProfile.org_id,
        user_id: userProfile.id,
      },
    });

    // Store checkout session in database (optional, for audit trail)
    await (supabase as any)
      .from('marketplace_checkout_sessions')
      .insert({
        product_id: product.id,
        org_id: userProfile.org_id,
        user_id: userProfile.id,
        stripe_session_id: session.id,
        amount_cents: Math.round(product.price * 100),
        status: 'pending',
      })
      .catch((err: any) => {
        // Ignore if table doesn't exist yet
        console.warn('Could not save checkout session:', err.message);
      });

    return NextResponse.json(
      {
        ok: true,
        sessionId: session.id,
        url: session.url,
      },
      { headers }
    );
  } catch (err) {
    logApiError('api/marketplace/products/[id]/checkout', err, {});
    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500, headers }
    );
  }
}
