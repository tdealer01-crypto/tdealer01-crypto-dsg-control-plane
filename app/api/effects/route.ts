import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const url = new URL(request.url);
  const effectId = url.searchParams.get('effect_id');
  const admin = getSupabaseAdmin();

  let query = admin
    .from('effects')
    .select('effect_id, request_id, action, status, payload_hash, external_receipt, updated_at')
    .eq('org_id', profile.org_id)
    .order('updated_at', { ascending: false })
    .limit(20);

  if (effectId) {
    query = query.eq('effect_id', effectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: data || [],
  });
}
