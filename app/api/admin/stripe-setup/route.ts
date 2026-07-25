import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, setupStripeProducts } from '../../../../lib/stripe-products';
import { getRateLimitKey, applyRateLimit, buildRateLimitHeaders } from '../../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One-time setup route — call once, copy output to Vercel env, then delete this file.
export async function POST(req: NextRequest): Promise<NextResponse> {
  // Rate limit: 5 attempts per 15 minutes per IP
  const rateLimitKey = getRateLimitKey(req, 'admin:stripe-setup');
  const rateLimitResult = await applyRateLimit({
    key: rateLimitKey,
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many setup attempts. Try again later.' },
      {
        status: 429,
        headers: buildRateLimitHeaders(rateLimitResult, 5),
      },
    );
  }

  const auth = req.headers.get('authorization') ?? '';
  const secret = process.env.ADMIN_SETUP_SECRET ?? '';

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'STRIPE_SECRET_KEY not set in env' }, { status: 500 });
  }

  try {
    const stripe = getStripeClient();
    const envVars = await setupStripeProducts(stripe);
    return NextResponse.json({ ok: true, envVars });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
