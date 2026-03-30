import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';
import { sha256Hex } from '../../../../lib/runtime/canonical';

export const dynamic = 'force-dynamic';

type ReplayTruthState = {
  epoch: number;
  sequence: number;
  v_t: Record<string, unknown>;
  t_t: number;
  g_t: string;
  i_t: string;
  s_star_hash: string;
};

function initialTruthState(): ReplayTruthState {
  const v_t = {
    balance: 1000000,
    invariant_tag: 'transfer',
    last_direction: 0,
  };

  return {
    epoch: 1,
    sequence: 0,
    v_t,
    t_t: 0,
    g_t: 'zone:origin',
    i_t: 'net:bootstrap',
    s_star_hash: sha256Hex(v_t),
  };
}

function hashTruthState(state: ReplayTruthState): string {
  return sha256Hex({
    epoch: state.epoch,
    sequence: state.sequence,
    v_t: state.v_t,
    t_t: state.t_t,
    g_t: state.g_t,
    i_t: state.i_t,
    s_star_hash: state.s_star_hash,
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

  const targetSequence = Number(params.sequence);
  if (!Number.isFinite(targetSequence) || targetSequence < 0) {
    return NextResponse.json({ ok: false, error: 'Invalid sequence' }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const orgId = String(profile.org_id);

  const { data: checkpoint } = await admin
    .from('state_checkpoints')
    .select('sequence, snapshot, state_hash')
    .eq('org_id', orgId)
    .lte('sequence', targetSequence)
    .order('sequence', { ascending: false })
    .limit(1)
    .maybeSingle();

  let replayState: ReplayTruthState = checkpoint?.snapshot
    ? {
        epoch: Number(checkpoint.snapshot.epoch),
        sequence: Number(checkpoint.snapshot.sequence),
        v_t: checkpoint.snapshot.v_t || {},
        t_t: Number(checkpoint.snapshot.t_t),
        g_t: String(checkpoint.snapshot.g_t),
        i_t: String(checkpoint.snapshot.i_t),
        s_star_hash: String(checkpoint.snapshot.s_star_hash),
      }
    : initialTruthState();

  const startSequence = checkpoint ? Number(checkpoint.sequence) + 1 : 1;

  const { data: entries, error: entriesError } = await admin
    .from('ledger_entries')
    .select('sequence, request_id, decision, next_state_hash, entry_hash')
    .eq('org_id', orgId)
    .gte('sequence', startSequence)
    .lte('sequence', targetSequence)
    .order('sequence', { ascending: true });

  if (entriesError) {
    return NextResponse.json({ ok: false, error: entriesError.message }, { status: 500 });
  }

  let executionByRequestId = new Map<string, any>();
  if ((entries || []).length > 0) {
    const { data: executions, error: execError } = await admin
      .from('executions')
      .select('request_payload, context_payload, created_at')
      .eq('org_id', orgId)
      .in('context_payload->>entry_hash', (entries || []).map((e) => e.entry_hash));

    if (execError) {
      return NextResponse.json({ ok: false, error: execError.message }, { status: 500 });
    }

    executionByRequestId = new Map(
      (executions || []).map((row: any) => [String(row.context_payload?.entry_hash || ''), row])
    );
  }

  for (const entry of entries || []) {
    if (entry.decision !== 'ALLOW') {
      continue;
    }

    const execution = executionByRequestId.get(entry.entry_hash);
    const payload = execution?.request_payload;

    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          error: `Missing execution payload for sequence ${entry.sequence}`,
        },
        { status: 500 }
      );
    }

    replayState = {
      epoch: replayState.epoch,
      sequence: Number(entry.sequence),
      v_t: payload.next_v || replayState.v_t,
      t_t: Number(payload.next_t ?? replayState.t_t),
      g_t: String(payload.next_g ?? replayState.g_t),
      i_t: String(payload.next_i ?? replayState.i_t),
      s_star_hash: sha256Hex(payload.next_v || replayState.v_t),
    };
  }

  const replayedStateHash = hashTruthState(replayState);

  const { data: targetEntry, error: targetError } = await admin
    .from('ledger_entries')
    .select('sequence, next_state_hash, decision, entry_hash')
    .eq('org_id', orgId)
    .eq('sequence', targetSequence)
    .maybeSingle();

  if (targetError) {
    return NextResponse.json({ ok: false, error: targetError.message }, { status: 500 });
  }

  if (!targetEntry) {
    return NextResponse.json({ ok: false, error: 'SEQ_NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    sequence: targetSequence,
    replayed_state: replayState,
    replayed_state_hash: replayedStateHash,
    expected_next_state_hash: targetEntry.next_state_hash,
    matches: replayedStateHash === targetEntry.next_state_hash,
    checkpoint_used: checkpoint || null,
    replay_entries: entries || [],
  });
}
