import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { requireVerifiedDsgActor } from '@/lib/dsg/server/context';

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

export async function POST(req: NextRequest) {
  try {
    const priceId = process.env.STRIPE_MCP_PRICE_ID;
    if (!priceId) throw new Error('STRIPE_MCP_PRICE_ID not configured');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) throw new Error('NEXT_PUBLIC_APP_URL not configured');

    const actor = await requireVerifiedDsgActor(req.headers, 'job:read');
    const body = (await req.json()) as { keyId?: string };

    if (!body.keyId) {
      return NextResponse.json(
        { ok: false, error: { code: 'KEY_ID_REQUIRED' } },
        { status: 400 },
      );
    }

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { keyId: body.keyId, actorId: actor.actorId },
      success_url: `${appUrl}/dsg/api-keys?subscribe=success`,
      cancel_url: `${appUrl}/dsg/api-keys?subscribe=cancelled`,
    });

    return NextResponse.json(
      { ok: true, data: { checkoutUrl: session.url, sessionId: session.id } },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SUBSCRIBE_FAILED';
    const status =
      message === 'DSG_AUTH_REQUIRED' || message === 'DSG_PERMISSION_DENIED' ? 403 : 500;
    return NextResponse.json({ ok: false, error: { code: message } }, { status });
  }
}
