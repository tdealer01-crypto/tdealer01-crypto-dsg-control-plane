import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '../../../../lib/security/rate-limit';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const orgId = String(body.org_id || '').trim();
  if (!email || !orgId) return NextResponse.json({ error: 'email and org_id are required' }, { status: 400 });
  const rl = await consumeRateLimit({ scope: 'access_request_by_email', keyType: 'email', keyValue: email, windowSeconds: 86400, maxAttempts: 3 });
  if (!rl.allowed) return NextResponse.json({ error: 'Too many access requests. Please retry later.', retry_after_seconds: rl.retryAfterSeconds }, { status: 429, headers: { 'retry-after': String(rl.retryAfterSeconds) } });
  const admin = getSupabaseAdmin();
  const { error } = await admin.from('access_requests').insert({ org_id: orgId, email, reason: body.reason || null, status: 'pending' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
