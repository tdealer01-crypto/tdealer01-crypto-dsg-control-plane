import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from '../../../lib/security/rate-limit';

export const dynamic = 'force-dynamic';

function generateCode(orgId: string, email: string): string {
  const seed = `${orgId}-${email}`.replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seed.slice(0, 6)}${suffix}`;
}

// GET /api/referrals — get or create referral code for current user (atomic via upsert)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('org_id, email')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile?.org_id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const admin = getSupabaseAdmin();
    const code = generateCode(String(profile.org_id), profile.email ?? '');

    // Insert-only upsert — on conflict (org_id unique), keep the existing row unchanged
    // so previously shared links stay valid; then fetch the canonical row
    await (admin as any)
      .from('referral_codes')
      .upsert(
        { code, org_id: profile.org_id, referrer_email: profile.email },
        { onConflict: 'org_id', ignoreDuplicates: true },
      );

    const { data: referral, error: fetchError } = await (admin as any)
      .from('referral_codes')
      .select('*')
      .eq('org_id', profile.org_id)
      .single();

    if (fetchError) throw fetchError;
    return NextResponse.json({ ok: true, referral });
  } catch (err) {
    logApiError('api/referrals', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// POST /api/referrals — track a referral link click (public, called on landing page load with ?ref=)
export async function POST(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'referral-click'),
    limit: 5,
    windowMs: 60_000,
  });
  const headers = buildRateLimitHeaders(rateLimit, 5);

  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429, headers });
  }

  try {
    const body = await request.json().catch(() => null);
    const code = String(body?.code ?? '').trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false }, { headers });

    const admin = getSupabaseAdmin();
    // Atomic DB-side increment — avoids lost-update race condition
    await (admin as any).rpc('increment_referral_clicks', { p_code: code }).maybeSingle();

    return NextResponse.json({ ok: true }, { headers });
  } catch {
    return NextResponse.json({ ok: false }, { headers });
  }
}
