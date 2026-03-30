import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';
import { computeLedgerEntryHash } from '../../../../../lib/runtime/ledger';

type Params = { params: { sequence: string } };

export const dynamic = 'force-dynamic';

function toSequence(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

export async function GET(_request: Request, { params }: Params) {
  const sequence = toSequence(params.sequence);
  if (sequence === null) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

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

  const [{ data: entry, error: entryError }, { data: checkpoint, error: checkpointError }] =
    await Promise.all([
      admin
        .from('ledger_entries')
        .select(
          'id, agent_id, request_id, approval_hash, sequence, epoch, action, input_hash, decision, reason, prev_state_hash, next_state_hash, effect_id, logical_ts, prev_entry_hash, entry_hash, metadata, created_at'
        )
        .eq('org_id', profile.org_id)
        .eq('sequence', sequence)
        .maybeSingle(),
      admin
        .from('state_checkpoints')
        .select('sequence, epoch, state_hash, entry_hash, snapshot, created_at')
        .eq('org_id', profile.org_id)
        .lte('sequence', sequence)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (entryError) {
    return NextResponse.json({ ok: false, error: entryError.message }, { status: 500 });
  }
  if (checkpointError) {
    return NextResponse.json({ ok: false, error: checkpointError.message }, { status: 500 });
  }
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'Sequence not found' }, { status: 404 });
  }

  const { data: previousEntry, error: previousError } = await admin
    .from('ledger_entries')
    .select(
      'id, agent_id, request_id, approval_hash, sequence, epoch, action, input_hash, decision, reason, prev_state_hash, next_state_hash, effect_id, logical_ts, prev_entry_hash, entry_hash, metadata, created_at'
    )
    .eq('org_id', profile.org_id)
    .eq('sequence', sequence - 1)
    .maybeSingle();

  if (previousError) {
    return NextResponse.json({ ok: false, error: previousError.message }, { status: 500 });
  }

  const expectedEntryHash = computeLedgerEntryHash({
    org_id: profile.org_id,
    agent_id: entry.agent_id,
    request_id: entry.request_id,
    approval_hash: entry.approval_hash,
    sequence: Number(entry.sequence),
    epoch: Number(entry.epoch),
    action: entry.action,
    input_hash: entry.input_hash,
    decision: entry.decision,
    reason: entry.reason,
    prev_state_hash: entry.prev_state_hash,
    next_state_hash: entry.next_state_hash,
    effect_id: entry.effect_id,
    logical_ts: Number(entry.logical_ts),
    prev_entry_hash: entry.prev_entry_hash,
    metadata: entry.metadata || {},
  });

  const entryHashValid = expectedEntryHash === entry.entry_hash;
  const expectedPrevHash = sequence === 1 ? 'GENESIS' : previousEntry?.entry_hash;
  const chainValid = expectedPrevHash ? entry.prev_entry_hash === expectedPrevHash : false;

  return NextResponse.json({
    ok: true,
    sequence,
    verified: entryHashValid && chainValid,
    entry_hash_valid: entryHashValid,
    chain_valid: chainValid,
    expected_entry_hash: expectedEntryHash,
    entry,
    previous_entry: previousEntry || null,
    execution: null,
    checkpoint: checkpoint || null,
  });
}
