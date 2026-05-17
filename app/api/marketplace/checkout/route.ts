import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/marketplace/templates';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 501 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const templateId = body?.templateId as string | undefined;
  if (!templateId) {
    return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
  }

  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
  }
  if (template.price === 0) {
    return NextResponse.json({ error: 'template_is_free' }, { status: 400 });
  }

  const stripe = new Stripe(secret);
  const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost:3000';

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: template.name,
            description: template.description,
          },
          unit_amount: template.price,
        },
        quantity: 1,
      },
    ],
    success_url: `${origin}/marketplace/success?session_id={CHECKOUT_SESSION_ID}&templateId=${encodeURIComponent(templateId)}`,
    cancel_url: `${origin}/marketplace`,
    customer_email: session.user.email ?? undefined,
    metadata: {
      templateId,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
