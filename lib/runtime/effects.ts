import { getSupabaseAdmin } from '../supabase-server';
import { sha256Hex } from './canonical';

export type EffectStatus = 'started' | 'committed' | 'failed' | 'reconciled';

export async function createEffectJournalEntry(params: {
  orgId: string;
  agentId: string;
  requestId: string;
  action: string;
  effectId: string;
  payloadHash: string;
  status?: EffectStatus;
  externalReceipt?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from('effects')
    .upsert(
      {
        org_id: params.orgId,
        agent_id: params.agentId,
        request_id: params.requestId,
        action: params.action,
        effect_id: params.effectId,
        payload_hash: params.payloadHash,
        status: params.status || 'started',
        external_receipt: params.externalReceipt || {},
        created_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'org_id,effect_id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to write effect journal entry');
  }

  return data;
}

export async function applyEffectCallback(params: {
  effectId: string;
  status: EffectStatus;
  receipt?: unknown;
  result?: unknown;
}) {
  const supabase = getSupabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: effect, error: effectError } = await supabase
    .from('effects')
    .select('*')
    .eq('effect_id', params.effectId)
    .single();

  if (effectError || !effect) {
    throw new Error('EFFECT_NOT_FOUND');
  }

  const resultHash = sha256Hex(params.result ?? params.receipt ?? {});

  const { error: updateError } = await supabase
    .from('effects')
    .update({
      status: params.status,
      external_receipt: {
        receipt: params.receipt ?? {},
        result: params.result ?? {},
        result_hash: resultHash,
      },
      updated_at: nowIso,
    })
    .eq('id', effect.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return {
    effect,
    resultHash,
  };
}
