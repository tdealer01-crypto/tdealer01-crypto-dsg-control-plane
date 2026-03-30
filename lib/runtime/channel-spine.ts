import { getSupabaseAdmin } from '../supabase-server';
import { normalizeRuntimeChannel, type RuntimeChannel } from './channel-contract';
import { computeApprovalHash, computeInputHash, type IntentEnvelope } from './approval';

export type ChannelIntentBody = IntentEnvelope & {
  agent_id: string;
  channel?: RuntimeChannel | string;
  context?: Record<string, unknown>;
};

const APPROVAL_TTL_MS = 10 * 60 * 1000;

export async function issueChannelIntentApproval(params: {
  orgId: string;
  agentId: string;
  body: ChannelIntentBody;
}) {
  const supabase = getSupabaseAdmin();

  const { data: truthState, error: truthError } = await supabase
    .from('runtime_truth_state')
    .select('epoch')
    .eq('org_id', params.orgId)
    .maybeSingle();

  if (truthError) {
    throw new Error(truthError.message);
  }

  const epoch = Number(truthState?.epoch || 1);
  const channel = normalizeRuntimeChannel(params.body.channel);
  const inputHash = computeInputHash(params.body);

  const approvalHash = computeApprovalHash({
    orgId: params.orgId,
    agentId: params.agentId,
    requestId: params.body.request_id,
    action: params.body.action,
    inputHash,
    epoch,
  });

  const expiresAt = new Date(Date.now() + APPROVAL_TTL_MS).toISOString();

  const { data: approval, error: approvalError } = await supabase
    .from('approvals')
    .upsert(
      {
        org_id: params.orgId,
        agent_id: params.agentId,
        request_id: params.body.request_id,
        action: params.body.action,
        input_hash: inputHash,
        approval_hash: approvalHash,
        approved_at: new Date().toISOString(),
        expires_at: expiresAt,
        epoch,
        status: 'issued',
        metadata: {
          channel,
          next_g: params.body.next_g,
          next_i: params.body.next_i,
          context: params.body.context || {},
        },
      },
      { onConflict: 'org_id,request_id' }
    )
    .select('id, approval_hash, expires_at, epoch, status, metadata')
    .single();

  if (approvalError || !approval) {
    throw new Error(approvalError?.message || 'Failed to issue approval');
  }

  const { error: usageError } = await supabase
    .from('usage_events')
    .insert({
      org_id: params.orgId,
      agent_id: params.agentId,
      event_type: 'channel_intent',
      quantity: 1,
      unit: 'intent',
      amount_usd: 0,
      metadata: {
        request_id: params.body.request_id,
        action: params.body.action,
        channel,
        approval_hash: approval.approval_hash,
      },
      created_at: new Date().toISOString(),
    });

  if (usageError) {
    throw new Error(usageError.message);
  }

  return {
    approval_id: approval.id,
    approval_hash: approval.approval_hash,
    input_hash: inputHash,
    expires_at: approval.expires_at,
    epoch: approval.epoch,
    status: approval.status,
    channel,
  };
}
