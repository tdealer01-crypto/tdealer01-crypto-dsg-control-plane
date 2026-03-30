import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const orgId = String(profile.org_id);

  const [{ data: truth }, { data: approvals }, { data: effects }, { data: ledger }, { data: usage }] =
    await Promise.all([
      admin.from('runtime_truth_state').select('*').eq('org_id', orgId).maybeSingle(),
      admin
        .from('approvals')
        .select('id, status, approved_at, expires_at')
        .eq('org_id', orgId)
        .order('approved_at', { ascending: false })
        .limit(20),
      admin
        .from('effects')
        .select('effect_id, action, status, updated_at')
        .eq('org_id', orgId)
        .order('updated_at', { ascending: false })
        .limit(20),
      admin
        .from('ledger_entries')
        .select('sequence, action, decision, reason, entry_hash, created_at')
        .eq('org_id', orgId)
        .order('sequence', { ascending: false })
        .limit(20),
      admin
        .from('usage_events')
        .select('event_type, quantity, created_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);

  return NextResponse.json({
    ok: true,
    truth_state: truth || null,
    approvals_open: (approvals || []).filter((x) => x.status === 'issued').length,
    approvals_recent: approvals || [],
    effects_recent: effects || [],
    ledger_recent: ledger || [],
    usage_recent: usage || [],
  });
}
