import { sha256Hex } from './canonical';

export async function startEffect(params: {
  supabase: any;
  orgId: string;
  agentId: string;
  requestId: string;
  action: string;
  effectId: string;
  payload: unknown;
}) {
  const nowIso = new Date().toISOString();
  const { error } = await params.supabase.from('effects').insert({
    org_id: params.orgId,
    agent_id: params.agentId,
    request_id: params.requestId,
    action: params.action,
    effect_id: params.effectId,
    payload_hash: sha256Hex(params.payload),
    status: 'started',
    external_receipt: {},
    created_at: nowIso,
    updated_at: nowIso,
  });

  return { ok: !error, error: error?.message || null };
}

export async function settleEffect(params: {
  supabase: any;
  orgId: string;
  effectId: string;
  status: 'committed' | 'failed';
  receipt: Record<string, unknown>;
}) {
  const { error } = await params.supabase
    .from('effects')
    .update({
      status: params.status,
      external_receipt: params.receipt,
      updated_at: new Date().toISOString(),
    })
    .eq('org_id', params.orgId)
    .eq('effect_id', params.effectId);

  return { ok: !error, error: error?.message || null };
}
