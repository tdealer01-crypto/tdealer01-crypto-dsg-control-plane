import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sha256Hex } from '../../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: { sequence: string } }) {
  const sequence = Number(params.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('users')
    .select('org_id, is_active')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (!profile?.org_id || !profile.is_active) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const { data: entry, error } = await admin
    .from('ledger_entries')
    .select('*')
    .eq('org_id', profile.org_id)
    .eq('sequence', sequence)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  if (!entry) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });

  const recomputed = sha256Hex({
    org_id: entry.org_id,
    agent_id: entry.agent_id,
    request_id: entry.request_id,
    approval_hash: entry.approval_hash,
    sequence: entry.sequence,
    epoch: entry.epoch,
    action: entry.action,
    input_hash: entry.input_hash,
    decision: entry.decision,
    reason: entry.reason,
    prev_state_hash: entry.prev_state_hash,
    next_state_hash: entry.next_state_hash,
    effect_id: entry.effect_id,
    logical_ts: entry.logical_ts,
    prev_entry_hash: entry.prev_entry_hash,
    metadata: entry.metadata || {},
  });

  return NextResponse.json({
    ok: true,
    verified: recomputed === entry.entry_hash,
    sequence,
    entry_hash: entry.entry_hash,
    recomputed_entry_hash: recomputed,
    decision: entry.decision,
    lineage: {
      prev_entry_hash: entry.prev_entry_hash,
      prev_state_hash: entry.prev_state_hash,
      next_state_hash: entry.next_state_hash,
    },
  });
}
