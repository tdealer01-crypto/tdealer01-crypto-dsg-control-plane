import { randomUUID } from 'crypto';
import { sha256Hex } from './canonical';

export type IntentEnvelope = {
  request_id: string;
  action: string;
  next_v: Record<string, unknown>;
  next_t: number;
  next_g: string;
  next_i: string;
};

export function ensureRequestId(requestId?: string) {
  return typeof requestId === 'string' && requestId.trim().length > 0 ? requestId.trim() : randomUUID();
}

export function computeInputHash(intent: IntentEnvelope): string {
  return sha256Hex({
    action: intent.action,
    next_v: intent.next_v,
    next_t: intent.next_t,
    next_g: intent.next_g,
    next_i: intent.next_i,
  });
}

export function computeApprovalHash(params: {
  orgId: string;
  agentId: string;
  requestId: string;
  action: string;
  inputHash: string;
  epoch: number;
}): string {
  return sha256Hex({
    org_id: params.orgId,
    agent_id: params.agentId,
    request_id: params.requestId,
    action: params.action,
    input_hash: params.inputHash,
    epoch: params.epoch,
  });
}

export function computeEffectId(params: {
  epoch: number;
  sequence: number;
  action: string;
  payloadHash: string;
}): string {
  return sha256Hex({
    epoch: params.epoch,
    sequence: params.sequence,
    action: params.action,
    payload_hash: params.payloadHash,
  });
}

export async function verifyApprovalForExecution(params: {
  supabase: any;
  orgId: string;
  agentId: string;
  approvalId: string;
  intent: IntentEnvelope;
}) {
  const inputHash = computeInputHash(params.intent);
  const { data: approval, error } = await params.supabase
    .from('approvals')
    .select('*')
    .eq('id', params.approvalId)
    .eq('org_id', params.orgId)
    .eq('agent_id', params.agentId)
    .maybeSingle();

  if (error || !approval) return { ok: false as const, status: 400, error: 'ERR_INVALID_APPROVAL' };
  if (approval.status !== 'issued' || approval.used_at) {
    return { ok: false as const, status: 409, error: 'ERR_REPLAY_ATTACK' };
  }

  if (new Date(approval.expires_at).getTime() < Date.now()) {
    return { ok: false as const, status: 400, error: 'ERR_EXPIRED' };
  }

  if (approval.request_id !== params.intent.request_id) {
    return { ok: false as const, status: 400, error: 'ERR_REQUEST_MISMATCH' };
  }

  if (approval.action !== params.intent.action) {
    return { ok: false as const, status: 400, error: 'ERR_ACTION_MISMATCH' };
  }

  if (approval.input_hash !== inputHash) {
    return { ok: false as const, status: 400, error: 'ERR_INTEGRITY_MISMATCH' };
  }

  return { ok: true as const, approval, inputHash };
}
