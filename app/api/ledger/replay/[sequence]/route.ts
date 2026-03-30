import { NextResponse } from 'next/server';
import { createClient } from '../../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../../lib/supabase-server';

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

  const [{ data: checkpoint, error: checkpointError }, { data: target, error: targetError }] =
    await Promise.all([
      admin
        .from('state_checkpoints')
        .select('sequence, epoch, state_hash, entry_hash, snapshot, created_at')
        .eq('org_id', profile.org_id)
        .lte('sequence', sequence)
        .order('sequence', { ascending: false })
        .limit(1)
        .maybeSingle(),
      admin
        .from('ledger_entries')
        .select('sequence, prev_state_hash, next_state_hash')
        .eq('org_id', profile.org_id)
        .eq('sequence', sequence)
        .maybeSingle(),
    ]);

  if (checkpointError) {
    return NextResponse.json({ ok: false, error: checkpointError.message }, { status: 500 });
  }
  if (targetError) {
    return NextResponse.json({ ok: false, error: targetError.message }, { status: 500 });
  }
  if (!target) {
    return NextResponse.json({ ok: false, error: 'Sequence not found' }, { status: 404 });
  }

  const startSequence = checkpoint?.sequence ? Number(checkpoint.sequence) + 1 : 1;

  const { data: replayEntries, error: replayError } = await admin
    .from('ledger_entries')
    .select(
      'sequence, action, decision, reason, prev_state_hash, next_state_hash, entry_hash, prev_entry_hash, metadata, created_at'
    )
    .eq('org_id', profile.org_id)
    .gte('sequence', startSequence)
    .lte('sequence', sequence)
    .order('sequence', { ascending: true });

  if (replayError) {
    return NextResponse.json({ ok: false, error: replayError.message }, { status: 500 });
  }

  let currentStateHash = checkpoint?.state_hash || target.prev_state_hash;
  let chainConsistent = true;

  for (const item of replayEntries || []) {
    if (item.prev_state_hash !== currentStateHash) {
      chainConsistent = false;
      break;
    }
    currentStateHash = item.next_state_hash;
  }

  return NextResponse.json({
    ok: true,
    sequence,
    replayed_state_hash: currentStateHash,
    expected_next_state_hash: target.next_state_hash,
    matches: chainConsistent && currentStateHash === target.next_state_hash,
    replayed_state: checkpoint?.snapshot || null,
    checkpoint_used: checkpoint || null,
    replay_entries: replayEntries || [],
  });
}
