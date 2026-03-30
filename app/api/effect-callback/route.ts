import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { sha256Hex } from '../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

type EffectCallbackBody = {
  request_id?: string;
  effect_id?: string;
  status?: 'started' | 'committed' | 'failed' | 'reconciled';
  receipt?: unknown;
  result?: unknown;
};

function isAuthorized(request: Request) {
  const expected = process.env.SPINE_CALLBACK_TOKEN || '';
  const actual = request.headers.get('x-spine-callback-token') || '';
  return expected.length > 0 && cryptoSafeEqual(expected, actual);
}

function cryptoSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as EffectCallbackBody | null;

  if (!body?.effect_id || !body?.status) {
    return NextResponse.json({ ok: false, error: 'effect_id and status are required' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();
  const resultHash = sha256Hex(body.result ?? body.receipt ?? {});

  const { data: effect, error: effectReadError } = await supabase
    .from('effects')
    .select('*')
    .eq('effect_id', body.effect_id)
    .single();

  if (effectReadError || !effect) {
    return NextResponse.json({ ok: false, error: 'EFFECT_NOT_FOUND' }, { status: 404 });
  }

  const { error: effectUpdateError } = await supabase
    .from('effects')
    .update({
      status: body.status,
      external_receipt: {
        receipt: body.receipt ?? {},
        result: body.result ?? {},
        result_hash: resultHash,
      },
      updated_at: nowIso,
    })
    .eq('id', effect.id);

  if (effectUpdateError) {
    return NextResponse.json({ ok: false, error: effectUpdateError.message }, { status: 500 });
  }

  const { error: usageError } = await supabase.from('usage_events').insert({
    org_id: effect.org_id,
    agent_id: effect.agent_id,
    event_type: 'effect_callback',
    quantity: 1,
    unit: 'callback',
    amount_usd: 0,
    metadata: {
      request_id: effect.request_id,
      effect_id: effect.effect_id,
      status: body.status,
      result_hash: resultHash,
    },
    created_at: nowIso,
  });

  if (usageError) {
    return NextResponse.json({ ok: false, error: usageError.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    effect_id: effect.effect_id,
    request_id: effect.request_id,
    status: body.status,
    result_hash: resultHash,
  });
}
