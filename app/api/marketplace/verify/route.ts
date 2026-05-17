import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { getTemplate } from '@/lib/marketplace/templates';
import { dsgOneClient } from '@/lib/dsg-one/client';

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
  const { sessionId, templateId } = (body ?? {}) as { sessionId?: string; templateId?: string };
  if (!sessionId || !templateId) {
    return NextResponse.json({ error: 'sessionId and templateId are required' }, { status: 400 });
  }

  const stripe = new Stripe(secret);

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  if (checkoutSession.payment_status !== 'paid') {
    return NextResponse.json({ error: 'payment_not_completed' }, { status: 402 });
  }

  const template = getTemplate(templateId);
  if (!template) {
    return NextResponse.json({ error: 'template_not_found' }, { status: 404 });
  }

  const result = await dsgOneClient.jobs.create(session.access_token, {
    goal: template.goal,
    successCriteria: template.successCriteria.map((description) => ({ description })),
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'job_creation_failed' }, { status: result.status ?? 502 });
  }

  const jobId = (result.data as Record<string, unknown>)?.jobId
    ?? (result.data as Record<string, unknown>)?.id
    ?? null;

  return NextResponse.json({ jobId, templateId, _bridge: 'marketplace' });
}
