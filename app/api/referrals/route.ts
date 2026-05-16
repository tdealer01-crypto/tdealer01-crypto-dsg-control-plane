import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

function generateCode(orgId: string, email: string): string {
  const seed = `${orgId}-${email}`.replace(/[^a-z0-9]/gi, '').slice(0, 12).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${seed.slice(0, 6)}${suffix}`;
}

// GET /api/referrals — get or create referral code for current user
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

    // Check existing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (admin as any)
      .from('referral_codes')
      .select('*')
      .eq('org_id', profile.org_id)
      .maybeSingle();

    if (existing) return NextResponse.json({ ok: true, referral: existing });

    // Create new
    const code = generateCode(String(profile.org_id), profile.email ?? '');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: created, error: insertError } = await (admin as any)
      .from('referral_codes')
      .insert({ code, org_id: profile.org_id, referrer_email: profile.email })
      .select()
      .single();

    if (insertError) throw insertError;
    return NextResponse.json({ ok: true, referral: created });
  } catch (err) {
    logApiError('api/referrals', err, {});
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}

// POST /api/referrals/click — track a referral link click (public, called on landing page load with ?ref=)
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const code = String(body?.code ?? '').trim().toUpperCase();
    if (!code) return NextResponse.json({ ok: false });

    const admin = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any).from('referral_codes').select('clicks').eq('code', code).maybeSingle();
    if (row) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from('referral_codes').update({ clicks: (row.clicks ?? 0) + 1 }).eq('code', code);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
