import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET() {
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

  const admin = getSupabaseAdmin();
  const orgId = String(profile.org_id);

  const [
    { data: truthState, error: truthError },
    { data: approvals, error: approvalsError },
    { data: effects, error: effectsError },
    { data: ledger, error: ledgerError },
    { data: usage, error: usageError },
    { data: agents, error: agentsError },
  ] = await Promise.all([
    admin
      .from('runtime_truth_state')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle(),

    admin
      .from('approvals')
      .select('id, request_id, action, status, approved_at, expires_at, used_at')
      .eq('org_id', orgId)
      .order('approved_at', { ascending: false })
      .limit(20),

    admin
      .from('effects')
      .select('effect_id, request_id, action, status, updated_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(20),

    admin
      .from('ledger_entries')
      .select('sequence, action, decision, reason, effect_id, entry_hash, created_at')
      .eq('org_id', orgId)
      .order('sequence', { ascending: false })
      .limit(20),

    admin
      .from('usage_events')
      .select('event_type, quantity, amount_usd, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20),

    admin
      .from('agents')
      .select('id, name, status, last_used_at')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false }),
  ]);

  const firstError =
    truthError ||
    approvalsError ||
    effectsError ||
    ledgerError ||
    usageError ||
    agentsError;

  if (firstError) {
    return NextResponse.json({ ok: false, error: firstError.message }, { status: 500 });
  }

  const approvalsRecent = approvals || [];
  const effectsRecent = effects || [];
  const ledgerRecent = ledger || [];
  const usageRecent = usage || [];
  const agentsRecent = agents || [];

  return NextResponse.json({
    ok: true,
    truth_state: truthState || null,
    approvals: {
      open: approvalsRecent.filter((item) => item.status === 'issued').length,
      used: approvalsRecent.filter((item) => item.status === 'used').length,
      revoked: approvalsRecent.filter((item) => item.status === 'revoked').length,
      recent: approvalsRecent,
    },
    effects: {
      committed: effectsRecent.filter((item) => item.status === 'committed').length,
      recent: effectsRecent,
    },
    ledger: {
      count: ledgerRecent.length,
      recent: ledgerRecent,
    },
    usage: usageRecent,
    agents: agentsRecent,
  });
}
