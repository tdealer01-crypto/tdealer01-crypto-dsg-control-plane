import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sha256Hex } from '../../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

function buildEntryHash(entry: any) {
  return sha256Hex({
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
}

export async function GET(_request: Request, { params }: { params: { sequence: string } }) {
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

  const sequence = Number(params.sequence);
  if (!Number.isFinite(sequence) || sequence < 0) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const orgId = String(profile.org_id);

  const { data: entry, error: entryError } = await admin
    .from('ledger_entries')
    .select('*')
    .eq('org_id', orgId)
    .eq('sequence', sequence)
    .single();

  if (entryError || !entry) {
    return NextResponse.json({ ok: false, error: 'SEQ_NOT_FOUND' }, { status: 404 });
  }

  const expectedEntryHash = buildEntryHash(entry);
  const entryHashValid = expectedEntryHash === entry.entry_hash;

  let chainValid = entry.prev_entry_hash === 'GENESIS';
  let previousEntry: any = null;

  if (entry.sequence > 0) {
    const { data: prev, error: prevError } = await admin
      .from('ledger_entries')
      .select('sequence, entry_hash')
      .eq('org_id', orgId)
      .eq('sequence', entry.sequence - 1)
      .maybeSingle();

    if (!prevError && prev) {
      previousEntry = prev;
      chainValid = prev.entry_hash === entry.prev_entry_hash;
    } else {
      chainValid = false;
    }
  }

  const { data: execution } = await admin
    .from('executions')
    .select('id, request_payload, context_payload, decision, reason, created_at')
    .eq('org_id', orgId)
    .contains('context_payload', { entry_hash: entry.entry_hash })
    .maybeSingle();

  const { data: checkpoint } = await admin
    .from('state_checkpoints')
    .select('sequence, state_hash, entry_hash, created_at')
    .eq('org_id', orgId)
    .eq('sequence', entry.sequence)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    sequence: entry.sequence,
    verified: entryHashValid && chainValid,
    entry_hash_valid: entryHashValid,
    chain_valid: chainValid,
    entry,
    previous_entry: previousEntry,
    execution: execution || null,
    checkpoint: checkpoint || null,
    expected_entry_hash: expectedEntryHash,
  });
}
