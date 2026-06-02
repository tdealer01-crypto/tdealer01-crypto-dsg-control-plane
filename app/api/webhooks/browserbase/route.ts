/**
 * POST /api/webhooks/browserbase
 * Receives Browserbase session completion webhooks.
 * No auth header required (external service). Validates via shared secret.
 */
import { NextRequest, NextResponse } from 'next/server';
import { reconcileEffectCallback } from '@/lib/runtime/reconcile';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const secret = process.env.BROWSERBASE_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get('x-browserbase-signature') ?? '';
    if (sig !== secret) {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 });

  // Browserbase sends: { id, status, metadata: { effect_id, org_id, ... } }
  const effectId = String(body?.metadata?.effect_id ?? body?.effect_id ?? '');
  const orgId = String(body?.metadata?.org_id ?? body?.org_id ?? '');
  const bbStatus: string = String(body?.status ?? 'completed');
  const status = bbStatus === 'ERROR' || bbStatus === 'failed' ? 'failed' : 'succeeded';

  if (!effectId) {
    // Browserbase ping with no effect_id — just ack
    return NextResponse.json({ ok: true, note: 'no effect_id' });
  }

  try {
    const result = await reconcileEffectCallback({
      effectId,
      orgId,
      status,
      payload: {
        browserbase_session_id: body?.id,
        browserbase_status: bbStatus,
        url: body?.metadata?.url ?? body?.startUrl,
        extract_result: body?.metadata?.extract_result ?? null,
      },
    });

    return NextResponse.json({ ok: true, idempotent: result.alreadyFinal });
  } catch {
    return NextResponse.json({ ok: false, error: 'reconcile failed' }, { status: 500 });
  }
}
