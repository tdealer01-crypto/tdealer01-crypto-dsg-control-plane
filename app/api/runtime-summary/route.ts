import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import type { RuntimeSummaryCard } from '../../../lib/runtime/dashboard-contract';

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

  const [
    { data: truth },
    { data: approvals },
    { data: effects },
    { data: ledger },
    { data: memory },
    { data: usage },
    { data: agents },
  ] = await Promise.all([
    admin.from('runtime_truth_state').select('*').eq('org_id', orgId).maybeSingle(),
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
      .from('agent_memory')
      .select('id, request_id, memory_key, lineage_hash, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
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
      .order('updated_at', { ascending: false })
      .limit(20),
  ]);

  const approvalItems = approvals || [];
  const effectItems = effects || [];
  const ledgerItems = ledger || [];

  const payload: RuntimeSummaryCard = {
    truth_state: truth || null,
    approvals: {
      open: approvalItems.filter((x) => x.status === 'issued').length,
      used: approvalItems.filter((x) => x.status === 'used').length,
      revoked: approvalItems.filter((x) => x.status === 'revoked').length,
      recent: approvalItems,
    },
    effects: {
      committed: effectItems.filter((x) => x.status === 'committed').length,
      recent: effectItems,
    },
    ledger: {
      count: ledgerItems.length,
      recent: ledgerItems,
    },
    memory: {
      count: (memory || []).length,
      recent: memory || [],
    },
    usage: usage || [],
    agents: agents || [],
  };

  return NextResponse.json({
    ok: true,
    ...payload,
  });
}
