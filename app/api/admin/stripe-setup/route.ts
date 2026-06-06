import { NextRequest, NextResponse } from 'next/server';
import { getStripeClient, setupStripeProducts } from '../../../../lib/stripe-products';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// One-time setup route — call once, copy output to Vercel env, then delete this file.
export async function POST(req: NextRequest): Promise<NextResponse> {
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
