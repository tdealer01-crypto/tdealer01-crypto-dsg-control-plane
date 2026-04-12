import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '../../../lib/authz-runtime';
import { getSupabaseAdmin } from '../../../lib/supabase-server';
import { buildCheckpointHash } from '../../../lib/runtime/checkpoint';
import { internalErrorMessage, logApiError } from '../../../lib/security/api-error';

export async function POST(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'checkpoint');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await request.json().catch(() => null);
    const orgId = String(body?.org_id || '');
    const agentId = String(body?.agent_id || '');
    if (!orgId || !agentId || orgId !== access.orgId) {
      return NextResponse.json({ error: 'org_id and agent_id are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: truth } = await supabase
      .from('runtime_truth_states')
      .select('id, canonical_hash')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: ledger } = await supabase
      .from('runtime_ledger_entries')
      .select('id, ledger_sequence, truth_sequence')
      .eq('org_id', orgId)
      .eq('agent_id', agentId)
      .order('ledger_sequence', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!truth || !ledger) {
      return NextResponse.json({ error: 'Cannot checkpoint without existing truth + ledger lineage' }, { status: 409 });
    }

    const checkpointHash = buildCheckpointHash({
      truthCanonicalHash: truth.canonical_hash,
      latestLedgerId: ledger.id,
      latestLedgerSequence: Number(ledger.ledger_sequence || 0),
      latestTruthSequence: Number(ledger.truth_sequence || 0),
    });

    const { data: checkpoint, error } = await supabase
      .from('runtime_checkpoints')
      .insert({
        org_id: orgId,
        agent_id: agentId,
        truth_state_id: truth.id,
        latest_ledger_entry_id: ledger.id,
        checkpoint_hash: checkpointHash,
        metadata: { source: 'checkpoint_api' },
      })
      .select('id, checkpoint_hash, created_at')
      .single();

    if (error || !checkpoint) {
      logApiError('api/checkpoint', error, { stage: 'insert-checkpoint' });
      return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
    }
    return NextResponse.json(checkpoint);
  } catch (error) {
    logApiError('api/checkpoint', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
